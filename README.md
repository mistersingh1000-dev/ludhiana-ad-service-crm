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

## Lead Intelligence + Auto Responder (2026-10-22)

New CRM add-ons:
- Meta Instant Form answers are stored per lead and classified by a rule-based qualification engine (Hot/Warm/Cold, intent, suggested CRM stage, recommended next action and reply draft).
- The individual Lead Detail page lets staff edit up to five question/answer pairs, call the lead, set the actual stage, schedule follow-up and open a prefilled **manual-send** WhatsApp reply.
- Lead Intelligence page tests custom form answers and incoming messages and lets company managers configure keyword-to-reply rules with human handoff.
- Company-isolated follow-up tasks are recorded and can be marked Done.
- WhatsApp inbound auto-replies require **official Cloud API**, an owner/manager-enabled switch (OFF by default), a matched rule and a new inbound customer message. Opt-outs do not receive replies. Duplicate webhook messages are ignored to reduce double sends.
- Meta lead-form submissions create a qualified lead and human action task, **not** unsolicited WhatsApp messages. Proactive WhatsApp messages require contact permissions and approved templates.
- This is **rule-based qualification**, NOT a trained generative AI chatbot. Automatic phone calls, booked appointments, payments, outbound template campaigns, browser-only WhatsApp Business App automation and scheduled email/push notifications are not implemented.

Database setup: apply `supabase/migrations/006_lead_intelligence.sql` **after migrations 001–005**. New functionality needs real Supabase/Meta/WhatsApp credentials and a successful Vercel production build, which has not yet been verified.

Without official API, customers can use WhatsApp Business App's built-in greeting/away messages and this CRM's prepared WhatsApp drafts, but not CRM-controlled unattended WhatsApp auto responses.

Apply `supabase/migrations/007_auto_reply_safety.sql` after migration 006 to enable the anti-spam cooldown timestamp.

### Reply safety and limitations
Automatic WhatsApp replies are OFF by default and require tenant-specific official Cloud API credentials plus a fresh inbound message. Delayed messages (over 23 hours) are not auto-replied. Bot replies are throttled per lead (10 minutes). Human-handoff rules get priority. Sending unsolicited free-form WhatsApp messages from Meta Instant Form leads is deliberately blocked. Approved template messaging, paid checkout, and scheduled push notifications are separate future integrations.
