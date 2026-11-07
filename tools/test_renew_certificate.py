"""Offline checks for certificate deployment boundaries; never contacts OSS/ACME."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import ssl
import tempfile
import unittest
from unittest.mock import Mock, patch

import renew_certificate as renewal
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa


class RenewalTests(unittest.TestCase):
    def test_valid_certificate_does_not_access_cloud_credentials(self):
        cert = Mock(not_valid_after_utc=datetime.now(timezone.utc) + timedelta(days=60))
        with patch.object(renewal.sys, "argv", ["renew", "--renew", "--algorithm", "ecdsa"]), \
             patch.object(renewal, "live_certificate", return_value=cert), \
             patch.object(renewal, "OSS") as oss:
            self.assertEqual(renewal.main(), 0)
            oss.assert_not_called()

    def test_expired_check_reports_failure_without_writes(self):
        error = ssl.SSLCertVerificationError("expired")
        error.verify_code = 10
        cert = Mock(not_valid_after_utc=datetime.now(timezone.utc) - timedelta(days=1))
        with patch.object(renewal.sys, "argv", ["renew", "--algorithm", "ecdsa"]), \
             patch.object(renewal, "live_certificate", side_effect=[error, cert]), \
             patch.object(renewal, "OSS") as oss:
            self.assertEqual(renewal.main(), 1)
            oss.assert_not_called()

    def test_other_trust_failures_do_not_trigger_renewal(self):
        error = ssl.SSLCertVerificationError("hostname mismatch")
        error.verify_code = 62
        with patch.object(renewal.sys, "argv", ["renew", "--renew", "--algorithm", "ecdsa"]), \
             patch.object(renewal, "live_certificate", side_effect=error) as live, \
             patch.object(renewal, "OSS") as oss:
            with self.assertRaises(ssl.SSLCertVerificationError):
                renewal.main()
            self.assertEqual(live.call_count, 1)
            oss.assert_not_called()

    def test_missing_previous_id_prevents_certificate_replacement(self):
        oss = object.__new__(renewal.OSS)
        with patch.object(oss, "request") as request:
            with self.assertRaises(RuntimeError):
                oss.deploy("certificate", "private key", None)
            request.assert_not_called()

    def test_already_bound_certificate_is_not_redeployed_during_propagation(self):
        error = ssl.SSLCertVerificationError("expired")
        error.verify_code = 10
        expired = Mock(not_valid_after_utc=datetime.now(timezone.utc) - timedelta(days=1))
        cert = Mock(not_valid_after_utc=datetime.now(timezone.utc) + timedelta(days=60))
        cert.fingerprint.return_value = b"a"
        binding = renewal.ET.fromstring(
            "<Cname><Certificate><CertId>existing</CertId><Fingerprint>61</Fingerprint></Certificate></Cname>")
        with tempfile.TemporaryDirectory() as temporary:
            state = Path(temporary)
            candidate = state / "issued"
            candidate.mkdir()
            renewal.save_private(candidate / "fullchain.pem", b"mock certificate")
            with patch.object(renewal, "STATE", state), \
                 patch.object(renewal.sys, "argv", ["renew", "--renew", "--algorithm", "ecdsa"]), \
                 patch.object(renewal, "live_certificate", side_effect=[error, expired, cert, cert, cert]), \
                 patch.object(renewal, "OSS") as oss, \
                 patch.object(renewal, "validate_candidate", return_value=(cert, "chain", "key")), \
                 patch.object(renewal, "issue") as issue, \
                 patch.object(renewal, "fetch"), patch.object(renewal.time, "sleep"):
                oss.return_value.binding.return_value = binding
                self.assertEqual(renewal.main(), 0)
                oss.return_value.deploy.assert_not_called()
                issue.assert_not_called()
                self.assertFalse((state / "renew.lock").exists())

    def test_candidate_rejects_wrong_domain_key_and_expiry(self):
        key = ec.generate_private_key(ec.SECP256R1())
        other_key = ec.generate_private_key(ec.SECP256R1())
        now = datetime.now(timezone.utc)
        cases = [(renewal.DOMAIN, key, 60, True), ("example.com", key, 60, False),
                 (renewal.DOMAIN, other_key, 60, False), (renewal.DOMAIN, key, 10, False)]
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for domain, saved_key, days, valid in cases:
                with self.subTest(domain=domain, days=days, valid=valid):
                    name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, domain)])
                    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
                            .public_key(key.public_key()).serial_number(x509.random_serial_number())
                            .not_valid_before(now - timedelta(minutes=1))
                            .not_valid_after(now + timedelta(days=days))
                            .add_extension(x509.SubjectAlternativeName([x509.DNSName(domain)]), False)
                            .sign(key, hashes.SHA256()))
                    (directory / "fullchain.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
                    (directory / "private-key.pem").write_bytes(renewal.pem(saved_key))
                    if valid:
                        renewal.validate_candidate(directory)
                    else:
                        with self.assertRaises(RuntimeError):
                            renewal.validate_candidate(directory)

    def test_rsa_candidate_cannot_hide_the_expired_ecdsa_certificate(self):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        now = datetime.now(timezone.utc)
        name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, renewal.DOMAIN)])
        cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
                .public_key(key.public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now - timedelta(minutes=1)).not_valid_after(now + timedelta(days=60))
                .add_extension(x509.SubjectAlternativeName([x509.DNSName(renewal.DOMAIN)]), False)
                .sign(key, hashes.SHA256()))
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "fullchain.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
            (directory / "private-key.pem").write_bytes(renewal.pem(key))
            with self.assertRaisesRegex(RuntimeError, "P-256 ECDSA"):
                renewal.validate_candidate(directory)
            renewal.validate_candidate(directory, "rsa")

    def test_default_checks_both_certificate_algorithms(self):
        with patch.object(renewal.sys, "argv", ["renew"]), \
             patch.object(renewal, "check_and_renew", side_effect=[0, 1]) as check:
            self.assertEqual(renewal.main(), 1)
            self.assertEqual([call.args for call in check.call_args_list], [(False, "ecdsa"), (False, "rsa")])

    def test_ecdsa_only_endpoint_does_not_require_an_rsa_certificate(self):
        error = ssl.SSLError("RSA-only handshake rejected")
        error.reason = "SSLV3_ALERT_HANDSHAKE_FAILURE"
        with patch.object(renewal.sys, "argv", ["renew"]), \
             patch.object(renewal, "check_and_renew", side_effect=[0, error]):
            self.assertEqual(renewal.main(), 0)


if __name__ == "__main__":
    unittest.main()
