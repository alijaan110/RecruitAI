import urllib.parse
import hmac
import json
import hashlib
from time import time
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models import Candidate
from app.services.storage_service import StorageService
from app.config import settings
from app.schemas import APIResponse

router = APIRouter(prefix="/files", tags=["files"])

@router.get("/cv/{candidate_id}", response_model=APIResponse[dict])
async def get_cv_url(candidate_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id, Candidate.tenant_id == user.tenant_id))
    candidate = result.scalars().first()
    if not candidate or not candidate.cv_file_path:
        raise HTTPException(status_code=404, detail="CV not found")
        
    url = await StorageService.get_signed_url(candidate.cv_file_path)
    return APIResponse(success=True, data={"url": url, "expires_in": settings.SIGNED_URL_EXPIRY, "filename": candidate.cv_file_name})

@router.get("/download")
async def download_file(path: str = Query(...), sig: str = Query(...), exp: int = Query(...)):
    # Validate expiry
    if time() > exp:
        raise HTTPException(status_code=403, detail="URL expired")
        
    # Validate signature
    payload = {"path": path, "exp": exp}
    expected_sig = hmac.new(
        settings.SIGNED_URL_SECRET.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=403, detail="Invalid signature")

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(path=path, filename=os.path.basename(path))
