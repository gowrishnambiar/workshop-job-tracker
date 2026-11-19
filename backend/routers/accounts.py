# Tools I need
from fastapi import APIRouter
from auth import signup, login

# This file's router
router = APIRouter(tags=["Accounts"])

# The sign up and login routes
router.post("/signup")(signup)
router.post("/login")(login)