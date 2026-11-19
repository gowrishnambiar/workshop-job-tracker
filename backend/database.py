# Tools that i need
import os
import psycopg

# Open the database
def connection():
    return psycopg.connect(os.environ["SUPABASE_DB_URL"])