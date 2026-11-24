# Tools I need
from fastapi import HTTPException
from psycopg.rows import dict_row
from database import connection


# RULE: the six allowed statuses
STATUSES = ["Received", "Checking", "Waiting for parts", "Repairing", "Ready for pickup", "Collected"]


# HELPER: clean up a plate number
def clean_plate(text):
    plate = text.replace(" ", "").upper()
    if not 2 <= len(plate) <= 12:
        raise HTTPException(422, "Enter a valid plate number")
    return plate


# HELPER: check the status is allowed
def check_status(status):
    if status not in STATUSES:
        raise HTTPException(422, "Unknown Status")
    return status


# CREATE (Admin): add a new job
def create_job(staff_id, plate, car_model, customer_name, phone, service_type):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""insert into public.workshop_jobs
            (staff_id, plate_number, car_model, customer_name, phone_number, service_type)
            values (%s, %s, %s, %s, %s, %s) returning *""",
            (staff_id, clean_plate(plate), car_model.strip(), customer_name.strip(), phone.strip(), service_type.strip()))
        return cur.fetchone()


# READ (Staff): list active or completed jobs
def list_jobs(view):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        if view == "completed":
            cur.execute("""select * from public.workshop_jobs
                where status = 'Collected' order by updated_at desc""")
        else:
            cur.execute("""select * from public.workshop_jobs
                where status != 'Collected' order by created_at""")
        return cur.fetchall()


# READ (Customer): track a car by plate + last 4
def track(plate, last4):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""select plate_number, car_model, customer_name, service_type, status, notes, updated_at, ready_at, quote, extra_quote, extra_reason, extra_decision from public.workshop_jobs
            where plate_number = %s and right(phone_number, 4) = %s 
            order by id desc limit 1""",
            (clean_plate(plate), last4))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "No job found for this car")
    return row


# UPDATE (Admin): status and note
def update_job(job_id, status, notes):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""update public.workshop_jobs
            set status = %s, notes = %s, updated_at = now()
            where id = %s returning *""",
            (check_status(status), notes.strip(), job_id))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "Job not found")
    return row


# UPDATE (Foreman): status only
def update_status(job_id, status):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""update public.workshop_jobs
            set status = %s, updated_at = now()
            where id = %s returning *""",
            (check_status(status), job_id))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "Job not found")
    return row


# UPDATE (Admin): set the quotation
def set_quote(job_id, quote, extra_quote, extra_reason):
    if extra_quote > 0:
        decision = "Pending"
    else:
        decision = "None"
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""update public.workshop_jobs
            set quote = %s, extra_quote = %s, extra_reason = %s, extra_decision = %s, updated_at = now()
            where id = %s returning *""",
            (quote, extra_quote, extra_reason, decision, job_id))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "Job not found")
    return row


# UPDATE (Customer): approve or decline the extra quote
def decide(plate, last4, decision):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""update public.workshop_jobs
            set extra_decision = %s, updated_at = now()
            where plate_number = %s and right(phone_number, 4) = %s and extra_decision = 'Pending' returning extra_decision""",
            (decision, clean_plate(plate), last4))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "No pending decision")
    return row
        
        
# DELETE (Admin): remove a job
def delete_job(job_id):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("delete from public.workshop_jobs where id = %s", (job_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Job not found")
           
    
# UPDATE (Admin + Foreman): set pickup time
def set_ready(job_id, ready_at):
    with connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("update public.workshop_jobs set ready_at = %s, updated_at = now() where id = %s returning *",
                    (ready_at, job_id),)
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "Job not found")
    return row   