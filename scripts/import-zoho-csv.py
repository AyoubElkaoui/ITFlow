#!/usr/bin/env python3
import csv
import os
import sys
import re
from datetime import datetime

try:
    import psycopg2
except ImportError:
    print("psycopg2 niet gevonden. Installeren...")
    os.system("pip install psycopg2-binary -q")
    import psycopg2

DATABASE_URL = "postgres://postgres.myfdihreeluczggfslak:kcJh2zdicmlVH9wG@aws-1-eu-central-2.pooler.supabase.com:5432/postgres?sslmode=require"

# Account ID → Company ID (afgeleid uit emails in CSV)
ACCOUNT_COMPANY_MAP = {
    "164117000000532006": "cmmditq57000ebfebieieod6m",  # Het Zorg Bureau
    "164117000000531009": "cmmditpyc000bbfeb23lnalei",  # Elmar Services
    "164117000000636031": "cmmditpdj0002bfebdqhuh1ks",  # Altum TS
    "164117000003328001": "cmmditpyc000bbfeb23lnalei",  # Elmar Services (elmarnl.onmicrosoft.com)
}

# Email domain fallback
DOMAIN_COMPANY_MAP = {
    "hetzorgbureau.nl": "cmmditq57000ebfebieieod6m",
    "elmarservices.com": "cmmditpyc000bbfeb23lnalei",
    "elmarnl.onmicrosoft.com": "cmmditpyc000bbfeb23lnalei",
    "altum-ts.nl": "cmmditpdj0002bfebdqhuh1ks",
}

CREATED_BY_ID = "cmmditp690000bfebze8eqx2r"  # Ayoub Elkaoui


def strip_html(html):
    if not html:
        return None
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'</p>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'</div>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<[^>]+>', '', html)
    html = html.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ')
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip() or None


def map_status(status):
    mapping = {
        "Open": "OPEN",
        "Closed": "CLOSED",
        "Te facturen": "BILLABLE",
    }
    return mapping.get(status.strip(), "OPEN")


def get_company_id(account_id, email):
    if account_id and account_id in ACCOUNT_COMPANY_MAP:
        return ACCOUNT_COMPANY_MAP[account_id]
    if email and "@" in email:
        domain = email.split("@")[1].lower()
        if domain in DOMAIN_COMPANY_MAP:
            return DOMAIN_COMPANY_MAP[domain]
    return None


def parse_dt(s):
    if not s or not s.strip():
        return None
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d %H:%M:%S")
    except Exception:
        return None


def generate_cuid():
    import time, random, string
    ts = hex(int(time.time() * 1000))[2:]
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    return f"c{ts}{rand}"


def main():
    csv_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Cases__1.csv")

    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cur = conn.cursor()

    imported = 0
    skipped = []

    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)

        for row_num, row in enumerate(reader, start=2):
            if len(row) < 8:
                continue

            account_id = row[1].strip()
            email = row[3].strip()
            subject = row[5].strip()
            description_raw = row[6].strip()
            status_raw = row[7].strip()
            created_time = row[12].strip() if len(row) > 12 else ""
            closed_time = row[13].strip() if len(row) > 13 else ""

            if not subject:
                continue

            company_id = get_company_id(account_id, email)

            if not company_id:
                skipped.append({
                    "row": row_num,
                    "subject": subject,
                    "account_id": account_id or "(geen)",
                    "email": email or "(geen)",
                })
                continue

            description = strip_html(description_raw)
            status = map_status(status_raw)
            created_at = parse_dt(created_time) or datetime.now()
            closed_at = parse_dt(closed_time)
            resolved_at = closed_at if status in ("CLOSED", "BILLABLE") else None

            ticket_id = generate_cuid()

            try:
                cur.execute("""
                    INSERT INTO "Ticket" (
                        id, "companyId", subject, description,
                        status, priority, category,
                        "createdById", "createdAt", "updatedAt",
                        "resolvedAt", "closedAt"
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s::"TicketStatus", %s::"Priority", %s::"TicketCategory",
                        %s, %s, %s,
                        %s, %s
                    )
                """, (
                    ticket_id, company_id, subject, description,
                    status, "NORMAL", "OTHER",
                    CREATED_BY_ID, created_at, created_at,
                    resolved_at, closed_at,
                ))
                conn.commit()
                imported += 1
                print(f"✓ [{row_num}] {subject[:60]} → {status}")
            except Exception as e:
                conn.rollback()
                skipped.append({
                    "row": row_num,
                    "subject": subject,
                    "account_id": account_id,
                    "email": email,
                    "error": str(e),
                })

    print(f"\n{'='*50}")
    print(f"✓ Geïmporteerd: {imported} tickets")

    if skipped:
        print(f"✗ Overgeslagen: {len(skipped)} tickets\n")
        for s in skipped:
            print(f"  Rij {s['row']}: \"{s['subject'][:60]}\"")
            if "error" in s:
                print(f"    DB fout: {s['error']}")
            else:
                print(f"    Account ID: {s['account_id']}, Email: {s['email']}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
