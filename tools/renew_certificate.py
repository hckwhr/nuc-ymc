"""Check/renew nuc-ymc.com HTTPS using ACME HTTP-01 and its existing OSS bucket.

Install: python -m pip install --target .cache/cert-tools -r tools/requirements-certificates.txt
Check:   python tools/renew_certificate.py
Renew:   python tools/renew_certificate.py --renew
"""

import argparse
import base64
import configparser
import hashlib
import hmac
import os
from pathlib import Path
import socket
import ssl
import sys
import time
from datetime import datetime, timedelta, timezone
from email.utils import formatdate
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".cache" / "cert-tools"))

from acme import challenges, client, errors, messages
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
import josepy

DOMAIN = "nuc-ymc.com"
BUCKET = "nuc-ymc-site"
ENDPOINT = "oss-cn-hongkong.aliyuncs.com"
DIRECTORY = "https://acme-v02.api.letsencrypt.org/directory"
STATE = ROOT / ".certificates"
RENEW_BEFORE = timedelta(days=30)


def log(message):
    print(message, flush=True)


def fetch(request, context=None):
    with urlopen(request, timeout=30, context=context) as response:
        return response.read()


def tls_context(algorithm, verify=True):
    context = ssl.create_default_context()
    # TLS 1.2 cipher selection lets us inspect both OSS certificate slots.
    # A default handshake may select RSA and conceal an expired ECDSA cert.
    context.maximum_version = ssl.TLSVersion.TLSv1_2
    suite = "ECDSA" if algorithm == "ecdsa" else "RSA"
    context.set_ciphers(f"ECDHE-{suite}-AES128-GCM-SHA256:ECDHE-{suite}-AES256-GCM-SHA384")
    if not verify:
        # Diagnostic only: never use this context for API calls or success checks.
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    return context


def live_certificate(verify=True, algorithm="ecdsa"):
    context = tls_context(algorithm, verify)
    with socket.create_connection((DOMAIN, 443), timeout=20) as tcp:
        with context.wrap_socket(tcp, server_hostname=DOMAIN) as connection:
            return x509.load_der_x509_certificate(connection.getpeercert(binary_form=True))


def remaining(cert):
    return cert.not_valid_after_utc - datetime.now(timezone.utc)


class OSS:
    def __init__(self):
        config = configparser.ConfigParser()
        config.read(ROOT / "ossutilconfig", encoding="utf-8-sig")
        credentials = config["Credentials"]
        if credentials["endpoint"].removeprefix("https://").rstrip("/") != ENDPOINT:
            raise RuntimeError("OSS endpoint differs from the confirmed project deployment")
        self.key_id = credentials["accessKeyID"]
        self.secret = credentials["accessKeySecret"].encode()

    def request(self, method, path="/", query="", body=None, content_type="", headers=None):
        date = formatdate(usegmt=True)
        resource = f"/{BUCKET}{path}" + (f"?{query}" if query else "")
        signing = f"{method}\n\n{content_type}\n{date}\n{resource}"
        signature = base64.b64encode(hmac.new(self.secret, signing.encode(), hashlib.sha1).digest()).decode()
        request_headers = {"Date": date, "Authorization": f"OSS {self.key_id}:{signature}"}
        if content_type:
            request_headers["Content-Type"] = content_type
        request_headers.update(headers or {})
        url = f"https://{BUCKET}.{ENDPOINT}{path}" + (f"?{query}" if query else "")
        try:
            return fetch(Request(url, data=body, headers=request_headers, method=method))
        except HTTPError as error:
            # Do not log request headers, certificate keys, or raw error bodies.
            document = ET.fromstring(error.read())
            raise RuntimeError(f"OSS {method} failed: HTTP {error.code}, {document.findtext('Code')}") from None

    def binding(self):
        document = ET.fromstring(self.request("GET", query="cname"))
        for binding in document.findall("Cname"):
            if binding.findtext("Domain") == DOMAIN and binding.findtext("Status") == "Enabled":
                return binding
        raise RuntimeError("The expected enabled domain binding was not found; refusing changes")

    def deploy(self, chain, private_key, previous_id):
        if not previous_id:
            raise RuntimeError("Missing previous certificate ID; refusing an unconditional overwrite")
        root = ET.Element("BucketCnameConfiguration")
        cname = ET.SubElement(root, "Cname")
        ET.SubElement(cname, "Domain").text = DOMAIN
        certificate = ET.SubElement(cname, "CertificateConfiguration")
        for name, value in {"Certificate": chain, "PrivateKey": private_key,
                            "PreviousCertId": previous_id, "Force": "false"}.items():
            ET.SubElement(certificate, name).text = value
        self.request("POST", query="cname&comp=add", body=ET.tostring(root), content_type="application/xml")


def save_private(path, data):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb") as output:
        output.write(data)


def pem(key):
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                             serialization.NoEncryption())


def issue(oss, algorithm):
    account_path = STATE / "account-key.pem"
    if not account_path.exists():
        save_private(account_path, pem(rsa.generate_private_key(public_exponent=65537, key_size=2048)))
    key = serialization.load_pem_private_key(account_path.read_bytes(), password=None)
    account_key = josepy.JWKRSA(key=key)
    network = client.ClientNetwork(account_key, user_agent="nuc-ymc-certificate-renewal/1", timeout=30)
    acme = client.ClientV2(messages.Directory.from_json(network.get(DIRECTORY).json()), network)
    account_file = STATE / "account.json"
    if account_file.exists():
        acme.query_registration(messages.RegistrationResource.json_loads(account_file.read_text()))
    else:
        try:
            registration = acme.new_account(messages.NewRegistration.from_data(terms_of_service_agreed=True))
        except errors.ConflictError as error:
            registration = acme.query_registration(messages.RegistrationResource(
                uri=error.location, body=messages.Registration()))
        save_private(account_file, registration.json_dumps().encode())

    issued_dir = STATE / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    issued_dir.mkdir(mode=0o700)
    cert_key = (ec.generate_private_key(ec.SECP256R1()) if algorithm == "ecdsa" else
                rsa.generate_private_key(public_exponent=65537, key_size=2048))
    save_private(issued_dir / "private-key.pem", pem(cert_key))
    csr = (x509.CertificateSigningRequestBuilder()
           .subject_name(x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, DOMAIN)]))
           .add_extension(x509.SubjectAlternativeName([x509.DNSName(DOMAIN)]), critical=False)
           .sign(cert_key, hashes.SHA256()))
    order = acme.new_order(csr.public_bytes(serialization.Encoding.PEM))
    uploaded = []
    try:
        for authorization in order.authorizations:
            if authorization.body.identifier.value != DOMAIN:
                raise RuntimeError("Unexpected ACME authorization domain")
            if authorization.body.status == messages.STATUS_VALID:
                continue
            challenge = next(c for c in authorization.body.challenges if isinstance(c.chall, challenges.HTTP01))
            response, validation = challenge.response_and_validation(account_key)
            path = "/.well-known/acme-challenge/" + challenge.chall.encode("token")
            body = validation.encode()
            oss.request("PUT", path, body=body, content_type="text/plain",
                        headers={"Cache-Control": "no-store"})
            uploaded.append(path)
            if fetch(f"http://{DOMAIN}{path}") != body:
                raise RuntimeError("Public HTTP-01 response does not match; validation aborted")
            log("HTTP-01 challenge is publicly accessible; requesting domain validation")
            acme.answer_challenge(challenge, response)
        order = acme.poll_and_finalize(order, deadline=datetime.now() + timedelta(minutes=3))
        save_private(issued_dir / "fullchain.pem", order.fullchain_pem.encode())
        log(f"Certificate issued; local recovery files: {issued_dir.relative_to(ROOT)}")
        return issued_dir
    finally:
        for path in uploaded:
            # Remove only the exact temporary challenge object created by this run.
            oss.request("DELETE", path)
        if uploaded:
            log("Temporary HTTP-01 challenge objects removed")


def validate_candidate(directory, algorithm="ecdsa"):
    chain = (directory / "fullchain.pem").read_bytes()
    private_key = (directory / "private-key.pem").read_bytes()
    cert = x509.load_pem_x509_certificate(chain)
    key = serialization.load_pem_private_key(private_key, password=None)
    if algorithm == "ecdsa" and (not isinstance(key, ec.EllipticCurvePrivateKey) or
                                 not isinstance(key.curve, ec.SECP256R1)):
        raise RuntimeError("Expected a P-256 ECDSA certificate matching the site's original algorithm")
    if algorithm == "rsa" and not isinstance(key, rsa.RSAPrivateKey):
        raise RuntimeError("Expected an RSA certificate for the RSA certificate slot")
    domains = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value.get_values_for_type(x509.DNSName)
    if domains != [DOMAIN] or cert.public_key().public_numbers() != key.public_key().public_numbers():
        raise RuntimeError("Certificate domain or private key mismatch")
    if cert.not_valid_before_utc > datetime.now(timezone.utc) or remaining(cert) <= RENEW_BEFORE:
        raise RuntimeError("Candidate certificate is not valid for the renewal window")
    return cert, chain.decode(), private_key.decode()


def check_and_renew(renew, algorithm):
    try:
        current = live_certificate(algorithm=algorithm)
        trusted = True
    except ssl.SSLCertVerificationError as error:
        if error.verify_code != 10:  # Only an expired cert can be renewed via this fallback.
            raise
        current = live_certificate(verify=False, algorithm=algorithm)
        trusted = False
    log(f"{DOMAIN} ({algorithm}): expires {current.not_valid_after_utc.isoformat()}, trusted={trusted}, days={remaining(current).days}")
    if remaining(current) > RENEW_BEFORE and trusted:
        return 0
    if not renew:
        log("Renewal required: run with --renew")
        return 1
    STATE.mkdir(mode=0o700, exist_ok=True)
    lock = STATE / "renew.lock"
    save_private(lock, str(os.getpid()).encode())
    try:
        oss = OSS()
        binding = oss.binding()
        previous_id = binding.findtext("Certificate/CertId")
        candidate = None
        # Reuse an issued certificate if a previous deployment was interrupted.
        for directory in sorted(STATE.glob("*/fullchain.pem"), reverse=True):
            try:
                validate_candidate(directory.parent, algorithm)
                candidate = directory.parent
                break
            except (ValueError, RuntimeError, FileNotFoundError):
                continue
        candidate = candidate or issue(oss, algorithm)
        cert, chain, private_key = validate_candidate(candidate, algorithm)
        bound_fingerprint = (binding.findtext("Certificate/Fingerprint") or "").replace(":", "").lower()
        if bound_fingerprint != cert.fingerprint(hashes.SHA1()).hex():
            oss.deploy(chain, private_key, previous_id)
            log("OSS certificate binding updated; checking trusted HTTPS")
        else:
            log("Issued certificate is already bound; checking public propagation")
        verified = 0
        for attempt in range(60):
            try:
                live = live_certificate(algorithm=algorithm)
                if live.fingerprint(hashes.SHA256()) == cert.fingerprint(hashes.SHA256()):
                    fetch(f"https://{DOMAIN}/", context=tls_context(algorithm))
                    verified += 1
                    if verified >= 3:
                        log(f"SUCCESS: trusted HTTPS, expires {live.not_valid_after_utc.isoformat()}")
                        return 0
                else:
                    verified = 0
            except (OSError, HTTPError):
                verified = 0
            if attempt % 6 == 0:
                log("Waiting for the new certificate to propagate to the public OSS endpoint")
            time.sleep(5)
        raise RuntimeError("Binding submitted but live certificate not yet verified; rerun the check")
    finally:
        lock.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--renew", action="store_true", help="renew and deploy only if within 30 days of expiry")
    parser.add_argument("--algorithm", choices=["both", "ecdsa", "rsa"], default="both")
    args = parser.parse_args()
    algorithms = ["ecdsa", "rsa"] if args.algorithm == "both" else [args.algorithm]
    results = []
    for algorithm in algorithms:
        try:
            results.append(check_and_renew(args.renew, algorithm))
        except ssl.SSLError as error:
            # An ECDSA-only OSS listener rejects RSA-only cipher negotiation.
            # Never ignore an expired/untrusted RSA cert or other network errors.
            if (args.algorithm == "both" and algorithm == "rsa" and results == [0] and
                    error.reason == "SSLV3_ALERT_HANDSHAKE_FAILURE"):
                log("RSA-only negotiation is unavailable; ECDSA is verified")
            else:
                raise
    return max(results)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        log(f"ERROR: {type(error).__name__}: {error}")
        sys.exit(1)
