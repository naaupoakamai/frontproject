# BESPEAK deployment notes (Railway)

This repository is prepared for a two-service Railway setup:

- `backend` (Django + DRF)
- `frontend` (Angular build served by `serve`)

## 1) Backend service (`backend`)

Use these commands in Railway:

- Build command: `pip install -r requirements.txt && python manage.py collectstatic --no-input`
- Start command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4`

Or enable Procfile mode (`backend/Procfile`) with:

- `web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4`

Required env vars:

- `DJANGO_SECRET_KEY` (required)
- `DJANGO_DEBUG=false`
- `DATABASE_URL` (from Railway Postgres)
- `FRONTEND_URL=https://<frontend-domain>`
- `OPENAI_API_KEY` (optional)

One-time after connecting DB:

- `python manage.py migrate`

## 2) Frontend service (`frontend`)

Use these commands in Railway:

- Build command: `npm install --no-audit --no-fund && npm run build`
- Start command: `npm run start:render`

Or enable Procfile mode (`frontend/Procfile`) with:

- `web: npm run start:render`

`start:render` serves `dist/bespeak` as an SPA (`serve ... -s`).

## 3) API base URL in production

Set `frontend/src/environments/environment.prod.ts`:

- `apiBaseUrl: 'https://<your-backend-domain>/api'`

If Railway gives a different backend URL, update this value and redeploy frontend.
