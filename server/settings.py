import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    environment: str = "production"
    data_dir: Path = Path("/data")
    secret: str = ""
    owner_username: str = "hck"
    origins: tuple[str, ...] = ("https://nuc-ymc.com", "https://api.nuc-ymc.com")
    oss_endpoint: str = "https://oss-cn-hongkong.aliyuncs.com"
    oss_bucket: str = ""
    oss_key: str = ""
    oss_secret: str = ""
    storage: str = "oss"
    log_days: int = 180

    @classmethod
    def from_env(cls):
        return cls(
            environment=os.getenv("APP_ENV", "production"),
            data_dir=Path(os.getenv("DATA_DIR", "/data")),
            secret=os.getenv("APP_SECRET", ""),
            owner_username=os.getenv("OWNER_USERNAME", "hck").strip().lower(),
            origins=tuple(x.strip() for x in os.getenv("ALLOWED_ORIGINS", "https://nuc-ymc.com,https://api.nuc-ymc.com").split(",") if x.strip()),
            oss_endpoint=os.getenv("OSS_ENDPOINT", "https://oss-cn-hongkong.aliyuncs.com"),
            oss_bucket=os.getenv("OSS_BUCKET", ""), oss_key=os.getenv("OSS_ACCESS_KEY_ID", ""),
            oss_secret=os.getenv("OSS_ACCESS_KEY_SECRET", ""), storage=os.getenv("STORAGE", "oss"),
            log_days=int(os.getenv("LOG_RETENTION_DAYS", "180")),
        )

    def validate(self):
        if len(self.secret) < 32:
            raise ValueError("APP_SECRET must contain at least 32 random characters")
        if self.environment not in {"production", "development", "test"}:
            raise ValueError("Invalid APP_ENV")
        if self.storage not in {"oss", "local"}:
            raise ValueError("Invalid STORAGE")
        if self.environment == "production":
            if not self.origins or any(not x.startswith("https://") or x.endswith("/") for x in self.origins):
                raise ValueError("Production origins must be exact HTTPS origins without trailing slashes")
            if self.storage != "oss" or not all((self.oss_bucket, self.oss_key, self.oss_secret)):
                raise ValueError("Production requires private OSS storage credentials")
        if not 180 <= self.log_days <= 730:
            raise ValueError("LOG_RETENTION_DAYS must be between 180 and 730")
