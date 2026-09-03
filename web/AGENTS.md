# Hermes Agent Rules — Babyly Web App

This file is loaded by Hermes when running in `E:\code\Baby\web\` or any subdirectory.

## Quick Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (from `E:\code\Baby\web`) |
| Build | `npm run build` |
| Test (unit) | `npm run test` |
| Test (E2E) | `npm run test:e2e` |
| Lint | `npm run lint` |
| DB push | `npx prisma db push` |
| Prisma Studio | `npx prisma studio` |

## Architecture Snapshot

- **Framework**: Next.js 16 App Router + React 19 + TypeScript
- **Database**: PostgreSQL via Prisma (`prisma/schema.prisma`)
- **Auth**: Access code + magic link (guest) / admin allowlist (magic link)
- **Email**: Resend (prod), console (dev)
- **Styling**: Tailwind CSS v4
- **Deploy**: Docker Compose + Caddy on Linode (Debian 13)

## Key Patterns (follow these)

### Server Actions
All mutations in `src/app/deelnemen/actions.ts` and `src/app/admin/actions.ts`:
- Start with `"use server"`
- Validate CSRF: `validateCsrfToken(csrfTokenFromForm(formData))`
- Check session: `readGuestSession()` or `readAdminSession()`
- Redirect on failure with `?error=...` params
- Use Prisma `$transaction` for atomic writes

### CSRF Protection
- Middleware (`middleware.ts`) sets `baby_csrf` cookie on every request
- Forms include `<input type="hidden" name="csrfToken" value={csrfToken} />`
- Server validates via `isValidCsrfToken(formToken, cookieToken)` (constant-time)
- Local bypass: `ENVIRONMENT_NAME="baby-local" CSRF_BYPASS_LOCAL_ONLY="true"` (dev only)

### Sessions
- Cookie `baby_session` signed with HMAC-SHA256 (`SESSION_SECRET`)
- Payload: `{ sub, scope: "guest"|"admin", exp, crossPromptSeen? }`
- 24h TTL, HttpOnly, Secure (prod), SameSite=lax

### Rate Limiting
- In-memory `Map` (replace with Redis for multi-instance)
- Keys: `code:{ip}` (15/10min), `mail:{ip}` (10/10min)

## Data Model (Prisma)

```
Participant (id, name, email@unique, emailVerifiedAt, createdAt, updatedAt)
  └─ Prediction? (participantId@unique, predictedName, gender, weightGrams, heightCm, predictedBirthAt)
  └─ AddressCard? (participantId@unique, recipientName, street, houseNumber, postalCode, city, country)
  └─ MagicLinkToken[] (email, tokenHash, purpose, expiresAt, usedAt?)
AccessCode (id="singleton", codeHash)
AdminAllowlist (email@unique)
```

## Environment Variables (see `.env.example`)

Required: `DATABASE_URL`, `APP_BASE_URL`, `ACCESS_CODE`, `SESSION_SECRET`, `EMAIL_DELIVERY_MODE`, `ADMIN_EMAILS`, `PRIVACY_CONTACT_EMAIL`, `PREDICTION_DEADLINE_DATE`

If `EMAIL_DELIVERY_MODE=provider`: `RESEND_API_KEY`, `EMAIL_FROM`

Dev only: `CSRF_BYPASS_LOCAL_ONLY`, `ENVIRONMENT_NAME="baby-local"`

## Security Checklist (verify on every change)

- [ ] No secrets in code / logs / URLs
- [ ] All mutations: CSRF + session check
- [ ] Rate limits on auth endpoints
- [ ] Magic links: hash only, single-use, TTL, generic errors
- [ ] Admin: allowlist check server-side, separate session scope
- [ ] Security headers via `next.config.ts` (CSP, HSTS, etc.)
- [ ] CSV export: formula injection neutralization, no-cache headers
- [ ] No PII in logs (only `[event_name]` audit events)

## Documentation

Full docs in `../docs/`:
- `architecture.md` — trust boundaries, deployment
- `data-model.md` — schema, constraints, indexes
- `security-controls.md` — all controls + implementation files
- `flows/prediction-flow.md` — Feature A detail
- `flows/address-flow.md` — Feature B detail
- `flows/cross-prompting.md` — cross-flow invitation logic
- `admin.md` — admin auth, dashboard, actions
- `test-plan.md` — unit/integration/E2E/security regression
- `gap-assessment.md` — open items before production
- `production-deployment.md` — server setup, DNS, backups