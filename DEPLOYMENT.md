# Deploying Wincrea Loom

The frontend runs on Vercel, the API on Render, and MySQL on Aiven.

## Before deploying these fixes

1. Back up the database using your existing Aiven workflow.
2. Existing databases need `backend/migrations/001_customer_details.sql` applied once.
   It adds `customers.contact`, `customers.city`, and `customers.segment`; it does not
   rewrite existing customer data. Check those columns first if the migration may
   already have been applied. Do not run the entire schema against production.
3. Deploy the frontend and backend together: private API routes now require a
   valid login token. The updated frontend sends it on JSON and Excel upload requests.
4. Confirm the existing `JWT_SECRET` is configured. Keep its current value to avoid
   unnecessarily invalidating sessions. The API no longer accepts a public fallback secret.

The migration is a prepared file; creating this file does not apply it to Aiven.

## Database configuration

Copy `backend/.env.example` to `backend/.env` for local development and fill in your
existing Aiven values. Keep credentials and certificates out of Git.

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: existing Aiven connection.
- `DB_SSL_CA`: inline Aiven CA certificate; literal `\n` sequences are accepted.
- Alternatively, `DB_SSL_CA_FILE`: path to the downloaded CA file. If that path is
  unavailable locally, the API checks `backend/src/config/ca.pem`.
- Certificate verification remains enabled. A missing certificate produces an
  explicit configuration error. `DB_SSL=false` is only for an intentional non-TLS
  local database, not Aiven.

For a new empty database, use `backend/schema.sql`. It includes the PI confirmation
fields, PEGASUS category, ORDERED purchase status, roll metadata, and import batches.
The existing Aiven database already contained those features; only the new customer
fields need the migration above.

## Render backend

Root directory: `backend`. Build: `npm ci`. Start: `npm start`.

Configure the DB variables above plus:

- `JWT_SECRET`: existing private signing key.
- `RESEND_API_KEY` and `RESEND_FROM`: verified sender configuration.
  `RESEND_FROM_EMAIL` is accepted as an alias for existing local configuration.
- `FRONTEND_URL`: comma-separated allowed frontend origins.
- `PORT`: supplied by Render (local default is 5055).

`render.yaml` lists the required settings. SMTP settings are not used by this API.
Check `/api/health` after deployment; it checks API availability, not DB connectivity.

## Vercel frontend

Root directory: `frontend`. Build: `npm run build`. Output: `dist`.
Set `VITE_API_URL` to your Render API URL ending in `/api`.
`vercel.json` supports client-side routes and public share links.

## Verification

Run `npm test --prefix backend`, `npm test --prefix frontend`, and
`npm run build --prefix frontend`. Tests use fixtures and do not connect to Aiven.

After deployment, verify login, public share links, a customer save, and inventory
reads. Stock mutations and invoice rate edits require a logged-in user; user
management requires an admin. Share-link revocation is restricted to its owner or
an admin. Old ownerless links can be revoked by an admin if their IDs are known.

New transaction and purchase-order numbers use database IDs, so gaps and a jump
from older per-type numbering are expected. Returns are limited to outstanding
quantity from the roll's latest dispatch and available physical capacity; damaged
stock is not counted as dispatched stock.
