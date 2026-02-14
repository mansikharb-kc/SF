import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def reset_and_reprocess():
    try:
        # Connect to Postgres
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("🗑️ Deleting all records from crm_leads...")
        cur.execute("DELETE FROM crm_leads")

        print("📥 Fetching all leads from starting point...")
        cur.execute("SELECT sheet_id, full_name, brand_name, company_name, email, phone, select_your_category_ FROM leads ORDER BY _created_at ASC")
        leads = cur.fetchall()

        print(f"⚙️ Processing {len(leads)} leads...")

        for lead in leads:
            source_id, full_name, brand_name, company_name, email, phone, category_l1 = lead
            
            # Split full name
            first_name = ""
            last_name = "Unknown"
            
            if full_name:
                parts = full_name.strip().split()
                if len(parts) > 1:
                    first_name = parts[0]
                    last_name = " ".join(parts[1:])
                else:
                    last_name = parts[0]

            # Company mapping
            company = brand_name or company_name or "Individual"
            
            # Clean phone
            clean_phone = ''.join(filter(str.isdigit, str(phone))) if phone else None

            # Insert into staging
            cur.execute("""
                INSERT INTO crm_leads (source_id, first_name, last_name, company, email, phone, category_l1, insert_time, crm_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 'Pending')
            """, (source_id, first_name, last_name, company, email, clean_phone, category_l1))

        # Commit changes
        conn.commit()
        print("✅ All records re-processed successfully via Python logic.")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    reset_and_reprocess()
