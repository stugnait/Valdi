# Backend (Django API)

## Quick start

1. Create and activate venv.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy env template:

```bash
cp .env.example .env
```

4. Configure DB variables in `.env` (`DATABASE_URL` for Supabase is recommended).
5. Apply migrations **before** calling auth endpoints:

```bash
python manage.py migrate
```

6. Run server:

```bash
python manage.py runserver
```

If you see `no such table: auth_user`, it means migrations were not applied to the active database.

## Important for Supabase

- This Django setup uses the default Django auth model, so users are stored in `auth_user` (not `users`).
- If you do not see `auth_user` in Supabase, your app is likely connected to another DB (or local SQLite).
- SQLite fallback is disabled by default now. To avoid silent local DB usage, keep `ALLOW_SQLITE_FALLBACK=False`.
