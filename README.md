# Ludhiana Ad Service CRM

Full-stack CRM SaaS for businesses receiving leads from Facebook / Instagram ads and WhatsApp. The repository can run immediately as an interactive demo and can switch to authenticated multi-tenant production mode using Supabase, Meta Lead Ads and the official WhatsApp Business Platform.

## Product areas included

- Public marketing website with free-trial / plan positioning
- Signup, login, password reset and protected CRM routes
- Multi-tenant organizations, users and Row Level Security
- Super Admin company / trial / plan / suspension controls
- Lead Manager: add, search, filter, status change, CSV import/export
- Drag-and-drop sales pipeline
- Follow-up and overdue-lead workspace
- Lead response-time / silence tracking
- Round-robin, least-active or manual lead assignment rules
- Team invitations and live agent performance counts
- Campaign and conversion reports
- Meta Lead Ads integration settings and signed webhook ingestion
- Actual Meta lead-detail retrieval into the CRM lead table
- Official WhatsApp Cloud API outbound replies
- WhatsApp inbound webhook persistence into CRM conversations/messages
- Shared WhatsApp inbox with live database history
- Tenant-specific provider credentials encrypted server-side with AES-256-GCM
- CRM settings, billing/plan screen, privacy, terms and health endpoint
- Responsive desktop/mobile navigation
- Vercel-ready Next.js application

## Stack

- Next.js 16 App Router + TypeScript
- React 19
- Supabase PostgreSQL + Auth + Row Level Security
- Meta Graph API / Lead Ads webhooks
- WhatsApp Business Cloud API
- Vercel

## Run the interactive demo

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. With `NEXT_PUBLIC_DEMO_MODE=true`, the app uses browser demo data and does not require Supabase or Meta credentials.

## Production database setup

Create a Supabase project and run **all migrations in order**:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_production_hardening.sql`
3. `supabase/migrations/003_admin_and_team.sql`
4. `supabase/migrations/004_crm_rules.sql`
5. `supabase/migrations/005_integrations_and_messaging.sql`

Then add the environment variables from `.env.example` and set:

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_URL=https://YOUR-LIVE-DOMAIN
```

## Meta / WhatsApp activation

Create/configure the Meta app owned by the business and set the callback endpoints after deployment:

- Meta Lead Ads: `https://YOUR-DOMAIN/api/meta/webhook`
- WhatsApp: `https://YOUR-DOMAIN/api/whatsapp/webhook`

Set `META_VERIFY_TOKEN`, `META_APP_SECRET` and `INTEGRATION_ENCRYPTION_KEY` in Vercel. Each CRM owner/manager can then store its Page ID / WhatsApp Phone Number ID and provider token from **Dashboard → Integrations**. Tokens are encrypted before being stored and are not returned to the browser.

### Generate an encryption key locally

One example:

```bash
openssl rand -base64 32
```

Store the generated value only as a Vercel/Supabase server secret. Never commit it.

## Deployment

The repository is designed for Vercel Git integration:

1. Import this GitHub repository into Vercel.
2. Keep demo mode enabled for a public demo deployment, or configure Supabase and switch demo mode off for the real CRM.
3. Deploy.
4. Add Meta webhook callback URLs only after the live domain exists.

## What still requires account-owner setup

The source code cannot create or approve third-party business accounts by itself. Real customer traffic requires the account owner to supply/authorize:

- Supabase project and database migrations
- Meta App / Facebook Page permissions for Lead Ads
- WhatsApp Business number / Cloud API permissions
- Vercel environment variables
- A payment gateway account if automatic paid checkout is required

The current billing page and plan model are ready for product positioning, but payment checkout is intentionally not hard-coded to a provider until the payment account/provider is selected.

## Security notes

- Production CRM routes require Supabase authentication.
- Tenant tables use Supabase Row Level Security.
- Service-role keys, Meta app secrets and provider tokens are server-only.
- Tenant provider tokens are stored in the `integration_secrets` table encrypted with AES-256-GCM.
- `integration_secrets` has no browser RLS policy and is accessed only by service-role server routes.
- Meta/WhatsApp webhooks verify `X-Hub-Signature-256` in production.
- Incoming provider message/lead IDs are stored idempotently to reduce duplicate processing.
- Never commit `.env.local`, service-role keys, access tokens, or encryption keys.
