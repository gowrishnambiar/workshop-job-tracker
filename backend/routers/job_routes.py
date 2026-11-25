# ===== SETUP =====

# Tools I need
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from auth import current_user, current_role
from datetime import datetime
import jobs

# This file's router
router = APIRouter(tags=["Jobs"])



# ===== 1. JOBS =====


# SHAPE: new job (drop-off form)
class NewJob(BaseModel):
    plate_number: str = Field(min_length=1, max_length=12)
    car_model: str = Field(min_length=1, max_length=60)
    customer_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=6, max_length=20)
    service_type: str = Field(min_length=1, max_length=80)


# SHAPE: status and note update
class JobUpdate(BaseModel):
    status: str
    notes: str = Field(default="", max_length=500)


# CREATE (Admin): add a new job
@router.post("/jobs", status_code=201)
def create(payload: NewJob, staff_id: UUID = Depends(current_user), role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    return jobs.create_job(staff_id, payload.plate_number, payload.car_model, payload.customer_name, payload.phone, payload.service_type)


# READ (Staff): list active or completed jobs
@router.get("/jobs")
def list_jobs(view: str = "active", staff_id: UUID = Depends(current_user)):
    return jobs.list_jobs(view)


# UPDATE (Admin + Foreman): status and note (Foreman:status only)
@router.put("/jobs/{job_id}")
def update(job_id: int, payload: JobUpdate, staff_id: UUID = Depends(current_user), role: str = Depends(current_role)):
    if role == "Foreman":
        return jobs.update_status(job_id, payload.status)
    return jobs.update_job(job_id, payload.status, payload.notes)


# DELETE (Admin): remove a job
@router.delete("/jobs/{job_id}", status_code=204)
def delete(job_id: int, staff_id: UUID = Depends(current_user), role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    jobs.delete_job(job_id)
    return Response(status_code=204)


# ===== 2. TRACK MY CAR =====


# SHAPE: track request (plate + last 4)
class TrackRequest(BaseModel):
    plate_number: str
    last4: str = Field(min_length=4, max_length=4)


# READ (Customer): track a car by plate + last 4
@router.post("/track")
def track(payload: TrackRequest):
    return jobs.track(payload.plate_number, payload.last4)


# ===== 3. PICKUP TIME =====


# SHAPE: pickup time
class ReadyUpdate(BaseModel):
    ready_at: datetime | None = None


# UPDATE (Admin + Foreman): set pickup time
@router.put("/jobs/{job_id}/ready")
def save_ready(job_id: int, payload: ReadyUpdate, role=Depends(current_role)):
    return jobs.set_ready(job_id, payload.ready_at)


# ===== 4. QUOTATION + EXTRAS =====


# SHAPE: quotation (parts + labour)
class QuoteUpdate(BaseModel):
    quote: float = Field(ge=0)
    labour: float = Field(default=0, ge=0, le=100000)


# SHAPE: new extra
class NewExtra(BaseModel):
    description: str = Field(min_length=1, max_length=120)
    parts: float = Field(default=0, ge=0, le=100000)
    labour: float = Field(default=0, ge=0, le=100000)


# SHAPE: customer decision on one extra
class ExtraDecision(BaseModel):
    plate_number: str
    last4: str = Field(min_length=4, max_length=4)
    decision: str


# UPDATE (Admin): set the quotation
@router.put("/jobs/{job_id}/quote")
def quote_job(job_id: int, payload: QuoteUpdate, role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    return jobs.set_quote(job_id, payload.quote, payload.labour)


# CREATE (Admin): add an extra to a job
@router.post("/jobs/{job_id}/extras", status_code=201)
def create_extra(job_id: int, payload: NewExtra, role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    return jobs.create_extra(job_id, payload.description, payload.parts, payload.labour)


# DELETE (Admin): remove one extra
@router.delete("/extras/{extra_id}",  status_code=204)
def delete_extra(extra_id: int, role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    jobs.delete_extra(extra_id)
    return Response(status_code=204)


# UPDATE (Customer): approve or decline one extra
@router.post("/track/extras/{extra_id}/decision")
def decide_extra(extra_id: int, payload: ExtraDecision):
    if payload.decision not in ["Approved", "Declined"]:
        raise HTTPException(422, "Approve or Decline the extra quote")
    return jobs.decide_extra(extra_id, payload.plate_number, payload.last4, payload.decision)