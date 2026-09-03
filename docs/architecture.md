# Architectuur

## Doel
Eenvoudige, veilige Nederlandstalige website met twee losse gebruikersflows:
1. Feature A: voorspelling (baby geslacht, gewicht, lengte, geboortedatum/tijd).
2. Feature B: adresregistratie voor geboortekaart.

## Componenten
1. **Frontend**: Next.js 16 App Router (React 19), Server Components + Server Actions
2. **Backend**: Server Actions (`src/app/deelnemen/actions.ts`, `src/app/admin/actions.ts`) + API routes (`src/app/api/`)
3. **Database**: PostgreSQL via Prisma ORM (schema in `prisma/schema.prisma`)
4. **E-mailservice**: Resend (production), console log (development)
5. **Rate limiting**: In-memory `Map` (dev/CI); Redis/Valkey recommended for multi-instance production

## Trust Boundaries
1. Browser is niet vertrouwd — alle validatie/autorisatie server-side
2. Backend is bron van waarheid voor auth, autorisatie, validatie, business logic
3. Database alleen via Prisma (backend) benaderd
4. Magic links: tijdelijk (24h default), eenmalig, hash-only storage
5. Admin: apart sessiescope, allowlist-check server-side

## Runtime Security
1. **Middleware** (`middleware.ts`): zet `baby_csrf` cookie (HttpOnly, Secure in prod, SameSite=strict, 8h) op elke request; header `x-baby-csrf-token` voor Server Components
2. **Server Actions**: valideren CSRF via `validateCsrfToken(csrfTokenFromForm(formData))` + sessie check (`readGuestSession`/`readAdminSession`)
3. **Next config** (`next.config.ts`): CSP, HSTS (prod), Referrer-Policy, Permissions-Policy, X-Content-Type-Options, X-Frame-Options op alle routes
4. **Playwright global setup**: geïsoleerde testdeelnemer + tijdelijke sessie (`e2e/.auth/guest.json`), cleanup na afloop

## Identity & Sessies
- **Cookie**: `baby_session` (HMAC-SHA256 gesigneerd met `SESSION_SECRET`)
- **Payload**: `{ sub, scope: "guest"|"admin", exp, crossPromptSeen?: { predictionToAddress?, addressToPrediction? } }`
- **TTL**: 24h, HttpOnly, Secure (prod), SameSite=lax, path=/
- **Cross-prompt tracking**: in sessie opgeslagen, 1x per richting per sessie

## High-level Flow
1. Landing page: toegangscode + naam + e-mail invoeren
2. POST `/api/auth/request-link` → rate limit → access code check → participant upsert → magic link token (hash) opslaan → e-mail versturen
3. GET `/api/auth/verify?token=...&email=...&scope=guest|admin` → token hash lookup → atomic `usedAt` update → sessie cookie zetten → redirect
4. Geverifieerd: keuze tussen voorspelling (`/deelnemen/voorspelling/formulier`) en adres (`/deelnemen/adres/formulier`)
5. Formulier POST → Server Action → validatie + CSRF + sessie → DB transactie → cross-prompt markeren → bedankpagina
6. Bedankpagina toont niet-blokkerende link naar andere flow (1x per sessie)

## Scheiding Publiek/Admin
- Publiek: `/`, `/deelnemen/**`, `/api/auth/**`
- Admin: `/admin/**`, `/api/admin/**` (alleen allowlisted e-mails, aparte adminsessie)
- Geen data lek van admin naar publiek

## Deployment
- **Host**: Linode Shared CPU 2GB, Amsterdam, Debian 13
- **Stack**: Docker Compose (Next.js standalone + PostgreSQL) + Caddy reverse proxy
- **DNS**: Cloudflare DNS-only → later Proxied (Full strict SSL)
- **Secrets**: `.env.production` op server (nooit committen), deploy key voor GitHub
- **Backups**: gecodeerde PG dumps → private S3-compatible storage, cron + restore-test
- **CI**: GitHub Actions met ephemeral PostgreSQL, volledige E2E suite