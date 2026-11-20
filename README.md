# Workshop Job Tracker

A web app for car workshops. Staff update each car's repair status and quotation; customers check their car's progress and approve or decline extra work from their phone.

Built by me as the capstone project of the Python Bootcamp by Jom Code (Jom Hack), November 2026.

## The problem

In a workshop, the same question costs hours every day: "Is my car ready?" Customers call, staff stop working to check, and extra repairs found during the job lead to surprise bills.

This app answers the status question once, in one place, and lets the customer decide on extra work within their own budget.

## Features

**For customers (no login)**
- Track a car with the plate number plus the last 4 digits of the phone number
- See the live status, the workshop's note and the last update time
- See the quotation with SST 8% and the total
- Approve or decline extra work found during the repair; the total updates straight away

**For staff (login required)**
- Admin: add jobs, update status and notes, set quotations, delete jobs entered by mistake
- Foreman: update the status only
- Active and Completed lists; collected cars move to Completed as service history
- Summary of cars in the workshop by status

**Security**
- Supabase Auth login; every staff request carries a bearer token
- Roles (Admin, Foreman) checked on the server, so hiding a button is never the only lock (401 vs 403)
- Customer data is only shown when the plate and phone digits both match
- All SQL uses parameters (`%s`) to block SQL injection
- Row level security on every table; secrets stay in `.env`, never in Git

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, JavaScript, CSS |
| Backend | Python, FastAPI, Uvicorn, Pydantic |
| Database | PostgreSQL on Supabase, psycopg |
| Auth | Supabase Auth |

## How a request flows

```
Page (React) -> api.js -> main.py -> routers/ -> auth.py (guard) -> jobs.py (SQL) -> database.py -> Supabase
```

## Project structure

```
backend/
  main.py          app, CORS, routers
  auth.py          sign up, login, token and role guards
  jobs.py          all SQL
  database.py      database connection
  schema.sql       tables and rules
  routers/         health, accounts, job_routes
frontend/src/
  App.jsx          switches between the two pages
  TrackPage.jsx    customer page
  StaffPage.jsx    staff board
  api.js           one helper for every request
  statuses.js      statuses, colours, SST rate
```

## Run it locally

**Backend**
```
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn "psycopg[binary]" supabase python-dotenv
cd backend
cp .env.example .env      # then fill in your own Supabase values
uvicorn main:app --reload
```
Run `backend/schema.sql` once in the Supabase SQL Editor, then add each staff member's role to the `staff` table. API docs: http://127.0.0.1:8000/docs

**Frontend**
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Roadmap (phase 2)

- Download the quotation as a PDF
- Itemised quotations (parts and labour lines)
- Admin page to add staff and choose their role
- WhatsApp or SMS update when the status changes
- AI assistant: describe a symptom, get likely causes and a rough quote range
