# Tools I need
import os
from uuid import UUID
from fastapi import Depends, HTTPException
from pydantic import BaseModel
from fastapi.security import HTTPBearer
from supabase import create_client, AuthError
from database import connection
from psycopg.rows import dict_row


# Token reader (reads the key card)
bearer = HTTPBearer(auto_error=False)


# The shape of sign up / login
class Credentials(BaseModel):
    email:  str
    password: str


# Connect to Supabase
def client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_PUBLISHABLE_KEY"])


# The security guard: who is this?
def current_user(credentials=Depends(bearer)):
    if credentials is None:
        raise HTTPException(401, "Sign in to continue")
    try:
        user = client().auth.get_user(credentials.credentials).user
    except AuthError:
        raise HTTPException(401, "Invalid or expired session")
    return UUID(str(user.id))

# The security guard: which role does this person have?
def current_role(staff_id=Depends(current_user)):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("select role from public.staff where user_id = %s", (staff_id,))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(403, "No role assigned")
    return row["role"]



# Sign up: Create a staff account
def signup(payload: Credentials):
    try:
        result = client().auth.sign_up(payload.model_dump())
    except AuthError:
        raise HTTPException(400, "Signup failed. Check the email and password")
    return {"user.id": str(result.user.id)}


# Login: Check the password, give the key card
def login(payload: Credentials):
    try:
        result = client().auth.sign_in_with_password(payload.model_dump())
    except AuthError:
        raise HTTPException(401, "Sign in failed")
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("select role from public.staff where user_id = %s", (result.user.id,))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(403, "No role assigned")
    
    return {"access_token": result.session.access_token, "role": row["role"]}
        