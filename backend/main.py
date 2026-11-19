# Tools I need
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, accounts, job_routes


# Read the .env settings
load_dotenv()
ORIGINS = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173").split(",")


# Create the app
app = FastAPI(title = "Workshop Job Tracker")
# CORS: Let my React app call the API
app.add_middleware(CORSMiddleware, allow_origins=[origin.strip() for origin in ORIGINS],
                   allow_methods = ["GET","POST", "PUT", "DELETE"], allow_headers = ["Authorization", "Content-Type"])


# Plug in the routers 
app.include_router(health.router)
app.include_router(accounts.router)
app.include_router(job_routes.router)