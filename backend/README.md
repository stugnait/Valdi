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

## Google Sign-In setup

To enable Google auth end-to-end, set these environment variables:

### Backend (`backend/.env`)

```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
# optional: comma-separated list if you have multiple frontend apps
# GOOGLE_CLIENT_IDS=web-client-1.apps.googleusercontent.com,web-client-2.apps.googleusercontent.com
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### Google Cloud Console

1. Create OAuth 2.0 Client ID (type: **Web application**).
2. Add **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
3. Add **Authorized redirect URIs** if your flow needs them.
4. Use the same Client ID in both env files above.

After that, restart backend and frontend.
