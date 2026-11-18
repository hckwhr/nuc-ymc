import io
import warnings
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 24_000_000


def clean_image(data: bytes) -> bytes:
    if not data or len(data) > 8 * 1024 * 1024:
        raise ValueError("每张图片须小于 8 MB")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"} or getattr(source, "n_frames", 1) != 1:
                    raise ValueError("仅支持静态 JPG、PNG、WebP 图片")
                source.load()
                picture = ImageOps.exif_transpose(source).convert("RGBA")
                picture.thumbnail((4096, 4096))
                background = Image.new("RGB", picture.size, "white")
                background.paste(picture, mask=picture.getchannel("A"))
                output = io.BytesIO()
                background.save(output, format="JPEG", quality=88, optimize=True)
                return output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError("图片无效或分辨率超过 2400 万像素") from None


class Storage:
    def __init__(self, settings):
        self.local: Path | None = None
        if settings.storage == "local":
            self.local = settings.data_dir / "images"
            self.local.mkdir(parents=True, exist_ok=True)
        else:
            import oss2
            self.bucket = oss2.Bucket(oss2.Auth(settings.oss_key, settings.oss_secret),
                                      settings.oss_endpoint, settings.oss_bucket)

    def put(self, key, data):
        if self.local:
            (self.local / key.rsplit("/", 1)[-1]).write_bytes(data)
        else:
            self.bucket.put_object(key, data, headers={"x-oss-object-acl": "private", "Content-Type": "image/jpeg"})

    def put_document(self, key, data):
        if self.local:
            (self.local / key.rsplit('/', 1)[-1]).write_bytes(data)
        else:
            self.bucket.put_object(key, data, headers={'x-oss-object-acl': 'private', 'Content-Type': 'application/octet-stream'})

    def document_range(self, key, start, end):
        if self.local:
            with (self.local / key.rsplit('/', 1)[-1]).open('rb') as source:
                source.seek(start)
                return source.read(end - start + 1)
        return self.bucket.get_object(key, byte_range=(start, end)).read()

    def get(self, key, thumbnail=False):
        if self.local:
            data = (self.local / key.rsplit("/", 1)[-1]).read_bytes()
            if thumbnail:
                with Image.open(io.BytesIO(data)) as picture:
                    picture.thumbnail((640, 640))
                    output = io.BytesIO()
                    picture.convert('RGB').save(output, format='JPEG', quality=75)
                    return output.getvalue()
            return data
        process = 'image/resize,m_lfit,w_640,h_640/quality,q_75/format,jpg' if thumbnail else None
        return self.bucket.get_object(key, process=process).read()

    def delete(self, key):
        if self.local:
            (self.local / key.rsplit("/", 1)[-1]).unlink(missing_ok=True)
        else:
            self.bucket.delete_object(key)
