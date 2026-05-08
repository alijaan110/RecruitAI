import os
import hmac
import json
import hashlib
from time import time
import structlog
from app.config import settings

logger = structlog.get_logger()

class StorageService:
    @staticmethod
    async def upload(file_bytes: bytes, filename: str, tenant_id: str, candidate_id: str, uuid_str: str) -> str:
        if settings.STORAGE_MODE == "local":
            path = os.path.join(settings.LOCAL_STORAGE_PATH, tenant_id, candidate_id)
            os.makedirs(path, exist_ok=True)
            
            ext = os.path.splitext(filename)[1]
            file_path = os.path.join(path, f"{uuid_str}{ext}")
            
            with open(file_path, "wb") as f:
                f.write(file_bytes)
            return file_path
        else:
            # TODO: S3 implementation
            logger.warning("S3 mode not implemented, failing back to None")
            return ""

    @staticmethod
    async def get_signed_url(file_path: str) -> str:
        if not file_path:
            return ""
        if settings.STORAGE_MODE == "local":
            exp = int(time() + settings.SIGNED_URL_EXPIRY)
            payload = {"path": file_path, "exp": exp}
            sig = hmac.new(settings.SIGNED_URL_SECRET.encode(), json.dumps(payload).encode(), hashlib.sha256).hexdigest()
            # Assuming backend uses api prefix, encode path
            import urllib.parse
            encoded_path = urllib.parse.quote(file_path)
            # Route matches: GET /api/v1/files/download
            return f"{settings.SIGNED_URL_BASE}{settings.API_PREFIX}/files/download?path={encoded_path}&sig={sig}&exp={exp}"
        else:
            # TODO: S3 signed URL
            return ""

    @staticmethod
    async def delete(file_path: str) -> bool:
        if not file_path:
            return True
        if settings.STORAGE_MODE == "local":
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                return True
            except Exception as e:
                logger.error("Failed to delete local file", file_path=file_path, error=str(e))
                return False
        return False
