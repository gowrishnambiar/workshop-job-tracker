# Tools I need
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from auth import current_user, current_role
from datetime import datetime
from jobs import set_ready
import jobs

# This file's router
router = APIRouter(tags=["Jobs"])


# The shape of a new Job (drop-off form)
class NewJob(BaseModel):
    plate_number: str = Field(min_length=1, max_length=12)
    car_model: str = Field(min_length=1, max_length=60)
    customer_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=6, max_length=20)
    service_type: str = Field(min_length=1, max_length=80)


# The shape of an update
class JobUpdate(BaseModel):
    status: str
    notes: str = Field(default="", max_length=500)


# The shape of track request
class TrackRequest(BaseModel):
    plate_number: str
    last4: str = Field(min_length=4, max_length=4)


# The shape of a quote
class QuoteUpdate(BaseModel):
    quote: float = Field(ge=0)
    extra_quote: float = Field(default=0, ge=0, le=100000)
    extra_reason: str = Field(default="", max_length=300)


# The shape of customer decision
class DecisionRequest(BaseModel):
    plate_number: str
    last4: str = Field(min_length=4, max_length=4)
    decision: str


# The pickup time form
class ReadyUpdate(BaseModel):
    ready_at: datetime | None = None


# CUSTOMER: track a car by plate
@router.post("/track")
def track(payload: TrackRequest):
    return jobs.track(payload.plate_number, payload.last4)


# CUSTOMER: approve or decline extra quote
@router.post('/track/decision')
def decide(payload: DecisionRequest):
    if payload.decision not in ["Approved", "Declined"]:
        raise HTTPException(422, "Approve or Decline the extra quote")
    return jobs.decide(payload.plate_number, payload.last4, payload.decision)


# STAFF: list the jobs
@router.get("/jobs")
def list_jobs(view: str = "active", staff_id: UUID = Depends(current_user)):
    return jobs.list_jobs(view)


# STAFF: add a new job
@router.post("/jobs", status_code=201)
def create(payload: NewJob, staff_id: UUID = Depends(current_user), role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    return jobs.create_job(staff_id, payload.plate_number, payload.car_model, payload.customer_name, payload.phone, payload.service_type)


# STAFF: update a job
@router.put("/jobs/{job_id}")
def update(job_id: int, payload: JobUpdate, staff_id: UUID = Depends(current_user), role: str = Depends(current_role)):
    if role == "Foreman":
        return jobs.update_status(job_id, payload.status)
    return jobs.update_job(job_id, payload.status, payload.notes)


# ADMIN: set the quotes
@router.put("/jobs/{job_id}/quote")
def quote_job(job_id: int, payload: QuoteUpdate, role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    return jobs.set_quote(job_id, payload.quote, payload.extra_quote, payload.extra_reason)


# ADMIN / FOREMAN: set pickup time
@router.put("/jobs/{job_id}/ready")
def save_ready(job_id: int, payload: ReadyUpdate, role=Depends(current_role)):
    return set_ready(job_id, payload.ready_at)
    


# STAFF: delete a job
@router.delete("/jobs/{job_id}", status_code=204)
def delete(job_id: int, staff_id: UUID = Depends(current_user), role: str = Depends(current_role)):
    if role != "Admin":
        raise HTTPException(403, "Admin only")
    jobs.delete_job(job_id)
    return Response(status_code=204)
    