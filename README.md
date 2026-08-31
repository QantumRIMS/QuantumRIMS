# Research Publication Portal

A full-stack web application for college faculty to submit Scopus-indexed research papers, with an admin dashboard to view and export data to Excel.

---

## Tech Stack

- **Frontend + Backend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (Postgres + Auth)
- **Storage:** Supabase Storage (`proofs` bucket)
- **Excel Export:** ExcelJS

---

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region closest to your institution
3. Note your **Project URL** and **anon key** from **Project Settings → API**

### 2. Run the Database Schema

1. In your Supabase project, open **SQL Editor**
2. Copy and paste the entire contents of `supabase/schema.sql`
3. Click **Run** — this creates:
   - `master_faculty` table (staff list)
   - `submissions` table (paper submissions)
   - RLS policies (restricted access)
   - `proofs` storage bucket
   - Sample seed rows for testing

### 3. Create Admin User

In the Supabase Dashboard → **Authentication → Users → Invite user**, invite your admin email. They set their password via the email link.

Or use SQL Editor:
```sql
-- Run in Supabase SQL Editor
SELECT supabase_admin.create_user(
  '{"email": "admin@yourcollege.edu", "password": "SecurePass123!", "email_confirm": true}'::jsonb
);
```

### 4. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your values from Supabase → Project Settings → API:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

> ⚠️ **Never** commit `.env.local` to git. The `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side API routes.

### 5. Load Your Staff List

Once you have the Excel file with all faculty:

```bash
# Install the import script dependency (one-time)
npm install xlsx

# Run the seed script (after creating it from your Excel file)
node scripts/seed-faculty.js
```

Or manually insert rows in Supabase SQL Editor:
```sql
INSERT INTO master_faculty (emp_id, dept, name, designation, type) VALUES
('FAC001', 'CSE', 'Dr. Name Here', 'Professor', 'Full-time');
```

### 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

| Route | Description |
|-------|-------------|
| `/` | Public submission form |
| `/login` | Admin login |
| `/admin` | Admin dashboard (protected) |

---

## Deploying to Vercel

1. Push your code to GitHub
2. Connect the repo in [Vercel](https://vercel.com)
3. Add all three env variables in **Vercel → Project → Settings → Environment Variables**
4. Deploy — Vercel auto-detects Next.js

---

## Row-Level Security Design

| Operation | Table | Who |
|-----------|-------|-----|
| SELECT | `master_faculty` | Public (anon) — needed for the Employee ID lookup autofill |
| INSERT | `submissions` | Public (anon) — anyone can submit a form |
| SELECT | `submissions` | Authenticated only — admin via Bearer token |
| INSERT | `storage.objects` (proofs bucket) | Public — needed for file uploads during form submit |
| SELECT | `storage.objects` (proofs bucket) | Public — needed to serve uploaded files |

> **Note:** The `master_faculty` public SELECT is intentional — the form needs it for the Employee ID autofill. The API route (`/api/faculty/[emp_id]`) only exposes `name` and `dept`, never `designation` or `type`.

---

## Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role secret |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Public submission form
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── login/page.tsx            # Admin login
│   ├── admin/page.tsx            # Admin dashboard
│   └── api/
│       ├── faculty/[emp_id]/     # Employee ID lookup
│       ├── check-doi/            # DOI duplicate check
│       ├── admin/submissions/    # Protected: list submissions
│       └── admin/export/         # Protected: download .xlsx
└── lib/
    ├── supabase.ts               # Supabase clients
    └── types.ts                  # TypeScript types
supabase/
└── schema.sql                    # Full DB setup SQL
```
