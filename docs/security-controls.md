# Security Controls

## Authenticatie

### Toegangscode
1. Enkelvoudige toegangscode in `ACCESS_CODE` env var
2. Op startup gesynct naar `AccessCode` tabel (SHA-256 hash)
3. Alleen hash in DB, nooit plaintext
4. Rate limit: 15 pogingen / 10 min per IP (`code:{ip}`)
5. Generieke foutmelding bij foutieve code (geen detail)

### Magic Links
1. Token: 32 cryptografisch willekeurige bytes → 64-char hex
2. Alleen SHA-256 hash opslaan (`tokenHash`)
3. TTL: `MAGIC_LINK_TTL_MINUTES` (default 1440 = 24h)
4. Single-use: atomische `usedAt` update met `updateMany` where `usedAt: null`
5. Doelgebonden: `guest_login` of `admin_login` (apart tokens)
6. Verlopen/gebruikte tokens worden periodiek opgeruimd

### E-mailverificatie

1. Magic link bevat token, email, scope, next-redirect
2. Verificatie endpoint: token hash lookup + expiry check + single-use guard
3. Admin scope: extra allowlist check (`adminEmailSet()`)
4. Generieke redirect bij elke fout (geen enumeratie)
5. Na succes: signed sessie cookie (`baby_session`) + redirect

## Autorisatie

1. **Gast**: alleen eigen data via `session.sub` (participant ID)
2. **Admin**: alleen via allowlisted e-mails (2 vaste adressen)
3. **Scheiding**: aparte sessie scopes (`guest` vs `admin`), aparte cookies
4. **Server-side**: elke Server Action checkt sessie + scope voordat mutatie
5. **Geen client claims**: `isAdmin` o.i.d. nooit vertrouwd

## Rate Limiting

In-memory `Map` (key → `{ count, resetAt }`). Keys:
- `code:{ip}` — toegangscode pogingen: 15 / 10 min
- `mail:{ip}` — magic link aanvragen: 10 / 10 min
- `verify:{ip}` — verificatie pogingen: (via magic link token expiry)

**Let op**: in-memory werkt niet over meerdere instances. Voor productie met schaling: Redis/Valkey.

## Inputvalidatie

Alle validatie via Zod schemas (`src/lib/validation.ts`):
- `accessRequestSchema`: accessCode, name, email
- `predictionInputSchema`: name, gender, weightKg, heightCm, birthDate, birthTime
- `addressInputSchema`: recipientName, street, houseNumber, postalCode, city, country
- Server-side = bron van waarheid; frontend validatie = UX only

Grenzen:
- Gewicht: 0.5–10 kg (opslag in gram: 500–10000)
- Lengte: 20–80 cm
- Geslacht: `boy` | `girl`
- Datum/tijd: geldig formaat, redelijke range
- Tekstvelden: redelijke max lengte, trim
- E-mail: geldige structuur + normalisatie (lowercase, trim)

## Web Security

### CSRF (Double-submit cookie)
1. **Middleware** (`middleware.ts`): genereert 32-byte token → hex (64 chars) → `baby_csrf` cookie (HttpOnly, Secure in prod, SameSite=strict, path=/, maxAge=8h) + header `x-baby-csrf-token`
2. **Server Components**: lezen token via header/cookie → `getCsrfToken()` → hidden input in formulieren
3. **Server Actions**: `validateCsrfToken(csrfTokenFromForm(formData))` — constant-time hex compare van SHA-256 hashes
4. **Local bypass**: `ENVIRONMENT_NAME="baby-local" CSRF_BYPASS_LOCAL_ONLY="true"` (alleen dev, nooit prod)

### Security Headers (`next.config.ts`)
| Header | Waarde |
|--------|--------|
| Content-Security-Policy | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' <APP_BASE_URL>; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' ('unsafe-eval' in dev); style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` (alleen prod) |

### Cookies
- `baby_csrf`: HttpOnly, Secure (prod), SameSite=strict, 8h
- `baby_session`: HttpOnly, Secure (prod), SameSite=lax, 24h, HMAC-SHA256 signed

### Gevoelige data
- Geen tokens/codes/PII in URLs
- Geen PII in logs (alleen `[event_name]` audit events)
- CSV export: formula injection neutralization (`=`, `+`, `-`, `@` prefix → quote), `no-store`, `no-referrer`, `nosniff`

## Anti-enumeratie

1. Magic link aanvraag: altijd generieke "check je mail" response
2. Verificatie: generieke "link ongeldig/verlopen" response
3. Geen timingverschillen tussen bestaand/niet-bestaand e-mail (alleen DB lookup)
4. Rate limiting op IP-basis voor beide endpoints

## Logging & Audit

**Niet loggen**: IP, e-mail, toegangscode, tokens, participant IDs, namen, adressen

**Wel loggen** (console.info/warn):
- `[request-link] csrf_rejected | input_rejected | rate_limited | access_code_check_started | access_code_rejected | access_code_accepted | token_created | completed`
- `[email] provider_accepted | provider_failed | provider_rejected`
- `[admin-audit] participant_deleted | prediction_reset | participant_data_purged | csv_exported`
- `[email-test] sending | sent <message-id> | provider_failed`

## Misbruikpreventie

1. **Honeypot**: verborgen veld in formulieren (niet geïmplementeerd in huidige code — TODO)
2. **Cooldown**: optionele vertraging op verdachte requests (niet geïmplementeerd — TODO)
3. **Geen bulk endpoints**: geen publieke route voor lijst/export van deelnemersdata
4. **Admin export**: alleen noodzakelijke velden, formule-neutralisatie, beveiligde headers

## Bekende Gaps (volgens `gap-assessment.md`)

### P0 (vóór livegang)
- Productie server inrichten + hardening
- Resend productieconfig + SPF/DKIM/DMARC
- Secrets op server zetten
- Backups + restore test
- Bewaartermijn vastleggen (1 jaar)
- Juridische privacyreview

### P1 (release readiness)
- CI: volledige E2E run succesvol
- Formele threat review (brute force, replay, IDOR, CSRF, XSS, privilege escalation, race conditions)
- Testmatrix uitbreiden (negatieve/operationele tests)
- Documentatie traceerbaarheid (req → design → impl → test → owner)
- Exportbeheer procedure

### P2 (na v1)
- Rate limiting → Redis/Valkey
- Monitoring + incident response (health checks, alerting, on-call, incident log, hersteltests)

## Implementatie Bestanden

| Control | Locatie |
|---------|---------|
| Middleware CSRF | `middleware.ts` |
| CSRF validatie | `src/lib/csrf.ts` |
| Sessie handling | `src/lib/session.ts` |
| Access code | `src/lib/access-code.ts` |
| Rate limiting | `src/lib/rate-limit.ts` |
| Crypto helpers | `src/lib/security.ts` |
| Validatie schemas | `src/lib/validation.ts` |
| Env validatie | `src/lib/env.ts` |
| Email verzending | `src/lib/email.ts` |
| Server Actions (gast) | `src/app/deelnemen/actions.ts` |
| Server Actions (admin) | `src/app/admin/actions.ts` |
| Auth API routes | `src/app/api/auth/**/route.ts` |
| Admin API routes | `src/app/api/admin/**/route.ts` |
| Security headers | `next.config.ts` |
| Prisma schema | `prisma/schema.prisma` |