# PG Management System

A full-stack PG (Hostel) management platform built with **FastAPI + Supabase + Vanilla JS**.

- **Backend** (FastAPI / Python 3.11) → deploy on Render
- **Database** (PostgreSQL via Supabase)
- **Frontend** (static HTML/CSS/JS) → deploy on Vercel / Netlify / any static host

---

## Repository layout

```
pg-management-system/
├── backend/                    # FastAPI service
│   ├── main.py                 # App factory + middleware
│   ├── config.py               # Settings (Pydantic)
│   ├── database.py             # Supabase client
│   ├── auth.py                 # JWT + bcrypt helpers
│   ├── deps.py                 # FastAPI dependencies (current_worker)
│   ├── schemas.py              # Pydantic request/response models
│   ├── requirements.txt        # Python deps
│   ├── render.yaml             # Render deployment config
│   ├── runtime.txt             # Pin Python version
│   ├── supabase_schema.sql     # Tables + indexes + RLS
│   ├── .env.example            # Template env vars
│   └── routers/
│       ├── auth.py             # POST /auth/login
│       ├── workers.py          # /workers
│       ├── rooms.py            # /rooms
│       ├── students.py         # /students
│       ├── payments.py         # /payments
│       └── reports.py          # /reports
└── frontend/                   # Static dashboard
    ├── index.html              # Dashboard
    ├── login.html              # Login page
    ├── css/style.css
    └── js/
        ├── api.js              # Fetch wrapper to the API
        └── app.js              # UI controller
```

---

## 1. Set up Supabase

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor** → paste the contents of `backend/supabase_schema.sql` → **Run**.
3. Copy **Project URL** and **anon/service_role key** from **Settings → API**.
4. (Optional) Insert a default admin manually so first-login doesn't auto-seed:
   ```sql
   -- leave the password blank; the app seeds admin / admin123 on first login,
   -- and immediately re-hashes it to bcrypt.
   ```

## 2. Run the backend locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
cp .env.example .env            # fill in SUPABASE_URL, SUPABASE_KEY, SECRET_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Visit <http://127.0.0.1:8000/docs> for the interactive Swagger UI.

## 3. Run the frontend locally

Open `frontend/login.html` in a browser, **or** serve the folder with a static server:

```bash
cd frontend
python -m http.server 5500
# Visit http://127.0.0.1:5500/login.html
```

Edit `js/api.js` and set `API_BASE_URL` to your local backend (`http://127.0.0.1:8000`)
or to the deployed Render URL.

## 4. Deploy

### Backend (Render)

The repo includes `backend/render.yaml` (Blueprint) which auto-creates a Web Service.

- Render detects the blueprint → asks for **Root Directory = backend**.
- Fill the required env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `SECRET_KEY`.
- After deploy, the service URL is something like  
  `https://pg-management-backend.onrender.com`.

Smoke-test:

```
curl https://pg-management-backend.onrender.com/health
```

### Frontend (Vercel)

```bash
vercel --prod           # from inside frontend/
```

Or import the repository in the Vercel dashboard, set **Root Directory = frontend**.
After deploy, open the URL it gives you — `login.html` is the entrypoint.

Update `API_BASE_URL` in `frontend/js/api.js` to point to your Render backend.

---

## Default credentials

After the very first login the API auto-creates a default admin:

| Username | Password   |
|----------|------------|
| `admin`  | `admin123` |

**Change this password immediately** by inserting a new worker and updating roles.

---

## API Endpoints (summary)

| Method | Path                | Auth   | Purpose                       |
|--------|---------------------|--------|-------------------------------|
| POST   | `/auth/login`       | no     | Authenticate, return JWT      |
| GET    | `/workers`          | bearer | List workers                  |
| POST   | `/workers`          | bearer | Create worker                 |
| GET    | `/rooms`            | bearer | List rooms                    |
| POST   | `/rooms`            | bearer | Create room                   |
| DELETE | `/rooms/{id}`       | bearer | Delete room if empty          |
| GET    | `/students`         | bearer | List students                 |
| POST   | `/students`         | bearer | Register student              |
| DELETE | `/students/{id}`    | bearer | Unregister student            |
| GET    | `/payments`         | bearer | List payments                 |
| POST   | `/payments`         | bearer | Record a payment              |
| GET    | `/reports`          | bearer | List reports                  |
| POST   | `/reports`          | bearer | File a report                 |
| GET    | `/docs`             | no     | Swagger UI                    |
| GET    | `/redoc`            | no     | ReDoc                         |
| GET    | `/health`           | no     | Liveness probe                |

---

## Security notes

- `SECRET_KEY` **must** be a long random string in production. Generate with
  `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- Set `ALLOWED_ORIGINS=https://your-frontend.vercel.app` for production CORS.
- Service-role key is recommended for the backend (it bypasses RLS).
- All write endpoints require a valid JWT (`Authorization: Bearer <token>`).
- Worker passwords are stored **only** as bcrypt hashes — legacy plaintext
  records are auto-rehashed on the first successful login.
