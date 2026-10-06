# Deploying Wincrea Loom

Frontend → Vercel · Backend → Render · Database → Aiven (MySQL)

## What was fixed to make this deployable

The uploaded project was missing several files needed to run it anywhere
(including locally). These have been reconstructed by reading the actual
code:

- `backend/package.json` and `backend/src/server.js` — didn't exist at all.
- `backend/schema.sql` — no database schema was included anywhere in the
  project; this was rebuilt by reading every SQL query in the 14 backend
  controllers. **Review it before trusting it in production.**
- `frontend/package.json` and `frontend/postcss.config.js` — didn't exist.
- 17 hardcoded `http://localhost:5055/api` URLs across 12 frontend files —
  replaced with `import.meta.env.VITE_API_URL`, falling back to localhost
  for local dev.
- `backend/src/config/db.js` — added SSL support, since Aiven requires TLS.
- Added `.gitignore` entries, `.env.example` files, `render.yaml`, and
  `vercel.json` (needed so client-side routes don't 404 on refresh).
- The `.git` folder in the upload was corrupted (no `refs`), so it's been
  removed — you'll `git init` fresh below.
- **Security note:** the uploaded `backend/.env` contained a real JWT
  secret and a live Gmail app password. That file was deleted from this
  copy. **Rotate the Gmail app password and generate a new JWT secret**
  before going live, since they were exposed in your upload.

---

## 1. Push to GitHub

Both Vercel and Render deploy from a git repo.

```bash
cd wincrea
git init
git add .
git commit -m "Initial deployable version"
git branch -M main
git remote add origin https://github.com/<you>/wincrea.git
git push -u origin main
```

## 2. Database — Aiven (MySQL)

1. Create a MySQL service in Aiven.
2. From the service **Overview** page, note the host, port, user
   (`avnadmin`), and password, and download the `ca.pem` certificate.
3. Load the schema:
   ```bash
   mysql --host=<host> --port=<port> --user=avnadmin -p \
       --ssl-ca=ca.pem defaultdb < backend/schema.sql
   ```
4. (Optional) Uncomment and edit the seed `INSERT` at the bottom of
   `schema.sql` to create your first admin login, or register through the
   app and manually set that user's `approval_status`/`role` in the DB.

## 3. Backend — Render

1. New **Web Service** → connect your repo → set **root directory** to
   `backend`.
2. Build command: `npm install`  ·  Start command: `npm start`.
3. Add environment variables (see `backend/.env.example`):
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (from Aiven)
   - `DB_SSL=true`, and ideally `DB_SSL_CA` = full contents of `ca.pem`
     (replace real newlines with `\n` if pasting into a single-line field)
   - `JWT_SECRET` = a new random value (`openssl rand -hex 32`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
     `MAIL_FROM` (your **rotated** Gmail app password)
   - `FRONTEND_URL` = your Vercel URL (add after step 4; comma-separate if
     you have more than one, e.g. preview + production)
4. Deploy. Confirm it's up: `https://<your-service>.onrender.com/api/health`
   should return `{"success":true,...}`.

(A `render.yaml` blueprint is included at the repo root if you'd rather use
Render's "Blueprint" import flow.)

## 4. Frontend — Vercel

1. New Project → import your repo → set **root directory** to `frontend`.
2. Framework preset: Vite (build command `npm run build`, output `dist` —
   Vercel usually detects this automatically).
3. Add environment variable:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
4. Deploy. Once you have the Vercel URL, go back to Render and set
   `FRONTEND_URL` to it, then redeploy the backend so CORS allows it.

## Notes / things worth knowing

- **Render free tier spins down when idle** — the first request after
  inactivity can take 30–60s while it wakes up.
- Excel-based inward uploads (`/api/inward/excel*`) use in-memory file
  processing (`multer.memoryStorage()`), so there's no persistent file
  storage requirement — good, since Render's disk is ephemeral.
- The `inward` routes currently aren't behind the `authenticateToken`
  middleware in the reconstructed `server.js`/routes — worth reviewing
  whether that's intentional before going live.
- Double check `schema.sql` against your actual local database if you
  have one already; it was derived from code, not an existing dump, so
  edge cases (extra indexes, slightly different column lengths) may
  differ from what you originally had.
