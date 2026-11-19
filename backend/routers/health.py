# Tools I need
from fastapi import APIRouter

# This file's router
router = APIRouter(tags = ["Health"])

# Health check: is the server alive?
@router.get("/health")
def health():
    return {"ok": True}