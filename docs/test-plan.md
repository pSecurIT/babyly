# Testplan

## Prioriteit
Security en privacy krijgen hoogste prioriteit. Alle tests moeten herhaalbaar zijn in CI.

## Unit Tests (`npm run test` — Vitest)

### Validatie Schemas (`src/lib/validation.test.ts`)
- [ ] `accessRequestSchema`: geldige/ongeldige accessCode, name, email
- [ ] `predictionInputSchema`: alle velden, grenzen (gewicht 0.5-10kg, lengte 20-80cm, gender enum, datum/tijd)
- [ ] `addressInputSchema`: alle velden, required, max lengtes

### Token Helpers (`src/lib/security.test.ts`)
- [ ] `generateRandomToken`: 32 bytes → 64 char hex
- [ ] `sha256Hex`: deterministisch, 64 char hex
- [ ] `hmacSha256Hex`: keyed hash, constant-time compare via `safeEqualHex`
- [ ] `safeEqualHex`: timing-safe equality

### Sessie (`src/lib/session.test.ts`)
- [ ] `createSessionValue` / `parseSessionValue`: roundtrip, expiry check, signature validatie
- [ ] `markCrossPromptSeen`: flag wordt gezet, cookie hersignd
- [ ] Scope scheiding: `guest` vs `admin` payloads

### Rate Limiting (`src/lib/rate-limit.test.ts`)
- [ ] `rateLimit(key, max, window)`: teller werkt, reset na window, verschillende keys geïsoleerd

### Access Code (`src/lib/access-code.test.ts`)
- [ ] `syncAccessCodeFromEnv`: env var → DB hash (upsert)
- [ ] `isValidAccessCode`: hash vergelijking, case-sensitive

## Integratietests (Database-backed)

### Auth Flow
- [ ] Ongeldige toegangscode → generieke redirect `/?mail=1`
- [ ] Rate limit toegangscode (`code:{ip}`) → 15/10min blokkade
- [ ] Rate limit magic link (`mail:{ip}`) → 10/10min blokkade
- [ ] Geldige magic link verificatie → sessie cookie + redirect `/`
- [ ] Verlopen token (>24h) → `/?auth=failed`
- [ ] Replay token (al gebruikt) → `/?auth=failed`
- [ ] Admin magic link: allowlist check → toegang / afwijzing

### Feature A: Voorspelling
- [ ] Eerste voorspelling indienen → create in DB
- [ ] Wijzigen → update in DB
- [ ] Deadline check → na deadline submit geblokkeerd
- [ ] Validatie: gewicht/lengte/geslacht/datumgrenzen
- [ ] CSRF ontbrekend/ongeldig → redirect `?error=ongeldig`
- [ ] Zonder sessie → redirect `/?auth=1`

### Feature B: Adres
- [ ] Eerste adres indienen → create in DB
- [ ] Bestaand adres wijzigen → update in DB (upsert)
- [ ] Validatie: alle required velden
- [ ] CSRF/sessie checks identiek aan voorspelling

### Cross-prompting
- [ ] Na voorspelling: bedankpagina toont adres-knop
- [ ] Na adres: bedankpagina toont voorspel-knop
- [ ] Sessie flag `crossPromptSeen` wordt gezet per richting

## Autorisatietests
- [ ] Gast kan geen andere deelnemer data lezen (enkel eigen `session.sub`)
- [ ] Ongeautoriseerde admin requests → redirect `/admin/login`
- [ ] Alleen allowlisted admin e-mails krijgen adminsessie
- [ ] Externe `next` URLs na verificatie geweigerd (open redirect preventie)
- [ ] Verlopen/gebruikte/heraangeboden magic links geweigerd
- [ ] Deelnemer leesroutes gebruiken uitsluitend `session.sub`
- [ ] Gastsessie krijgt geen toegang tot admin leesroutes
- [ ] Admin leesroutes lezen pas data na geldige adminsessie

## UX Gedragstests
- [ ] Feature A afrondbaar zonder Feature B
- [ ] Feature B afrondbaar zonder Feature A
- [ ] Cross-prompt verschijnt na afronding en is overslaanbaar (knop blijft bereikbaar)

## Browser E2E Tests (`npm run test:e2e` — Playwright)

### Standalone (geen DB)
- [ ] Publieke authpagina laadt met CSRF-token in formulier
- [ ] CSRF-loze auth-request wordt geweigerd
- [ ] Beide deelnemerflows geblokkeerd zonder sessie

### Full E2E (`E2E_RUN_FULL=1` — vereist geïsoleerde test DB)
Global setup (`e2e/global-setup.ts`):
- Maakt unieke testdeelnemer aan
- Voert volledige auth flow uit
- Slaat sessie op in `e2e/.auth/guest.json` (gitignored)
- Cleanup na test run

Tests:
- [ ] Volledige prediction submission + cross-prompt
- [ ] Volledige address submission + cross-prompt
- [ ] Admin login + dashboard + export + delete/reset/purge

### CI Pipeline (`.github/workflows/ci.yml`)
- `quality`: lint, TypeScript (`npx tsc --noEmit`), unit/security tests
- `e2e`: ephemeral PostgreSQL 16 service, Prisma migrations, Chromium install
	and `npm run test:e2e` met `E2E_RUN_FULL=1`
- `build`: Next.js production build and Docker image build
- Playwright reports and traces are retained for 7 days on the E2E job
- Test credentials = dummy waarden (geen secrets)
- Production deployment is approval-gated in GitHub Environment `production`

## Lokale E-mail Test
```bash
cd E:\code\Baby\web
# .env aanpassen:
EMAIL_DELIVERY_MODE="provider"
EMAIL_TEST_RECIPIENT="jouw@email.com"
EMAIL_FROM="test@lokaal"
RESEND_API_KEY="re_..."
# Herstart dev server
npm run dev
# Open http://localhost:3000/test/email (alleen non-production)
```

## Beveiligingsdekking (Regression Checklist)

### CSRF
- [ ] Gast magic link formulier (`/api/auth/request-link`)
- [ ] Admin magic link formulier (`/api/auth/admin-request-link`)
- [ ] Deelnemer server actions (`submitPredictionAction`, `submitAddressAction`)
- [ ] Admin server actions (`deleteParticipantAction`, `resetPredictionAction`, `purgeAllAction`)
- [ ] Elke pagina met muterend formulier: dynamisch CSRF token in hidden input

### IDOR
- [ ] Prediction/adres lezen/schrijven: enkel via `session.sub`
- [ ] Admin acties: `participantId` uit form, maar server-side admin sessie check

### XSS
- [ ] Output escaping: React auto-escapes in JSX
- [ ] CSV export: formule neutralisatie (`=`, `+`, `-`, `@` prefix)

### SQL Injection
- [ ] Alleen Prisma ORM / parameterized queries — geen raw SQL

### Mass Assignment
- [ ] Zod schemas definiëren exact toegestane velden
- [ ] Server Actions destructuren expliciet uit `formData`

### Session Fixation
- [ ] Nieuwe sessie cookie na verificatie (nieuwe signature)
- [ ] `usedAt` op token voorkomt replay

### E-mail Enumeratie
- [ ] Magic link aanvraag: altijd generieke response
- [ ] Verificatie: altijd generieke redirect

### Open Redirect
- [ ] `safeNextPath()` valideert `next` param: moet met `/` beginnen, geen `//`

### Race Conditions
- [ ] Prediction create/update: Prisma `$transaction`
- [ ] Magic link `usedAt`: `updateMany` where `usedAt: null` (atomisch)

## Testmatrix Traceerbaarheid

| Requirement (Instructions.md) | Test Type | Status |
|-------------------------------|-----------|--------|
| Toegangscode hash, rate limit | Unit + Integration | ✓ |
| Magic link: crypto random, TTL, single-use, hash only | Unit + Integration | ✓ |
| Sessie cookies: HttpOnly, Secure, SameSite | Unit (session.ts) | ✓ |
| CSRF double-submit | Integration + E2E | ✓ |
| Security headers | Unit (next.config.ts) | ✓ |
| Anti-enumeratie | Integration | ✓ |
| Geen PII in logs | Code review | ✓ |
| Max 1 prediction per participant | Integration (transaction) | ✓ |
| Onbeperkte wijzigingen tot deadline | Integration (transaction) | ✓ |
| Max 1 adres per deelnemer | Integration (unique FK) | ✓ |
| Admin allowlist (2 e-mails) | Integration | ✓ |
| CSV export beveiliging | Unit (export route) | ✓ |
| Cross-prompt 1x per sessie | Integration | ✓ |
| Feature A/B optioneel | E2E | ✓ |
| Privacy: geen tracking cookies | Code review | ✓ |
| Admin purge handmatig | Integration | ✓ |

## Gaps in Huidige Test Coverage
1. **Honeypot veld** in formulieren — niet geïmplementeerd
2. **Cooldown** op verdachte requests — niet geïmplementeerd
3. **Admin rate limiting** apart van gast — niet geïmplementeerd
4. **Negatieve tests** voor alle validatiegrenzen (boundary values)
5. **Load/stress tests** voor rate limiting
6. **Multi-instance rate limiting** (Redis) — niet getest