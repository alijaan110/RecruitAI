from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.schemas import APIResponse, PaginatedResponse, CandidateListOut, CandidateDetailOut, CandidateNoteOut
from app.dependencies import get_current_user, require_admin, CurrentUser
from app.models import Candidate, Application, CandidateNote
from app.services.storage_service import StorageService
from pydantic import BaseModel

router = APIRouter(prefix="/candidates", tags=["candidates"])

class CandidateNoteCreate(BaseModel):
    application_id: str
    content: str
    note_type: str = "general"
    is_private: bool = False

@router.get("", response_model=APIResponse[PaginatedResponse[CandidateListOut]])
async def list_candidates(
    search: str | None = None,
    source: str | None = None,
    page: int = 1,
    limit: int = 20,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Candidate).where(Candidate.tenant_id == user.tenant_id)
    
    if search:
        query = query.where(or_(Candidate.full_name.ilike(f"%{search}%"), Candidate.email.ilike(f"%{search}%")))
    if source:
        query = query.where(Candidate.source == source)
        
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    query = query.order_by(Candidate.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    candidates = list(result.scalars().all())
    
    items = []
    for c in candidates:
        app_res = await db.execute(select(func.count(Application.id), func.max(Application.overall_score)).where(Application.candidate_id == c.id))
        app_count, highest_score = app_res.first()
        items.append(CandidateListOut.model_validate({**c.__dict__, "total_applications": app_count, "highest_score": highest_score}))

    pages = max(1, (total + limit - 1) // limit)
    return APIResponse(success=True, data=PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages))

@router.get("/{id}", response_model=APIResponse[CandidateDetailOut])
async def get_candidate(id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate).where(Candidate.id == id, Candidate.tenant_id == user.tenant_id))
    candidate = result.scalars().first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    app_res = await db.execute(
        select(Application).where(Application.candidate_id == id).options(selectinload(Application.job))
    )
    apps = list(app_res.scalars().all())

    apps_out = [
        {
            "id": a.id,
            "job_id": a.job_id,
            "job_title": a.job.title if a.job else None,
            "stage": a.stage,
            "overall_score": float(a.overall_score) if a.overall_score is not None else None,
            "score_breakdown": a.score_breakdown or {},
            "is_starred": a.is_starred,
            "is_disqualified": a.is_disqualified,
            "disqualify_reason": a.disqualify_reason,
            "applied_at": a.applied_at,
            "last_stage_at": a.last_stage_at,
        }
        for a in apps
    ]

    return APIResponse(success=True, data=CandidateDetailOut.model_validate({**candidate.__dict__, "applications": apps_out}))

@router.post("/{id}/notes", response_model=APIResponse[CandidateNoteOut])
async def create_note(id: str, req: CandidateNoteCreate, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c_res = await db.execute(select(Candidate).where(Candidate.id == id, Candidate.tenant_id == user.tenant_id))
    if not c_res.scalars().first():
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    app_res = await db.execute(select(Application).where(Application.id == req.application_id, Application.candidate_id == id))
    if not app_res.scalars().first():
        raise HTTPException(status_code=404, detail="Application not found for this candidate")
        
    note = CandidateNote(
        application_id=req.application_id,
        tenant_id=user.tenant_id,
        author_id=user.id,
        author_name=user.full_name,
        note_type=req.note_type,
        content=req.content,
        is_private=req.is_private
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return APIResponse(success=True, data=CandidateNoteOut.model_validate(note))

@router.get("/{id}/notes", response_model=APIResponse[list[CandidateNoteOut]])
async def list_notes(id: str, application_id: str | None = None, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(CandidateNote).join(Application).where(Application.candidate_id == id, Application.tenant_id == user.tenant_id)
    if application_id:
        query = query.where(CandidateNote.application_id == application_id)
    
    result = await db.execute(query.order_by(CandidateNote.created_at.desc()))
    all_notes = result.scalars().all()
    filtered = [n for n in all_notes if not n.is_private or n.author_id == user.id]
    
    return APIResponse(success=True, data=[CandidateNoteOut.model_validate(n) for n in filtered])

@router.delete("/{id}", response_model=APIResponse[dict])
async def anonymize_candidate(id: str, user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate).where(Candidate.id == id, Candidate.tenant_id == user.tenant_id))
    candidate = result.scalars().first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    if candidate.cv_file_path:
        await StorageService.delete(candidate.cv_file_path)
        
    candidate.full_name = "Deleted User"
    candidate.email = f"deleted_{candidate.id}@deleted"
    candidate.phone = None
    candidate.linkedin_url = None
    candidate.portfolio_url = None
    candidate.raw_cv_text = None
    candidate.cv_file_path = None
    candidate.cv_file_name = None
    candidate.parsed_data = {}
    
    await db.commit()
    return APIResponse(success=True, data={"anonymized": True})
