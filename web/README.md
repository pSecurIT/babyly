# Babyly

## Overzicht
Babyly is een privacy-vriendelijke website voor een babyproject met twee afzonderlijke invulflows:
1. **Voorspelling** — geslacht, gewicht, lengte en verwachte geboortedatum/tijd van de baby
2. **Adresregistratie** — adres voor het versturen van de geboortekaart

Beide flows delen dezelfde toegangsketen: een geheime toegangscode + e-mailverificatie via een one-time magic link. De flows zijn functioneel los van elkaar, maar de app moedigt een gebruiker aan om na een succesvolle inzending eenmalig de andere flow ook in te vullen.

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Prisma + PostgreSQL + Tailwind CSS v4 + Resend

## Doel van de App
Een veilige, eenvoudige en Nederlandse ervaring bieden waar deelnemers:
- Hun voorspelling kunnen invullen (één keer, max één wijziging)
- Hun adres kunnen registreren (één keer per deelnemer)
- Alleen toegang krijgen via veilige e-mail magic link (geen wachtwoorden)
- Geen publieke scoreborden of open data zien
- Admin-console gebruiken voor export, reset, verwijdering en purge

## Documentatie
| Document | Beschrijving |
|----------|--------------|
| [Instructions.md](../Instructions.md) | Complete requirements & acceptance criteria |
| [plan.md](../plan.md) | Project plan met stappen & beslissingen |
| [docs/architecture.md](docs/architecture.md) | Architectuur, trust boundaries, deployment |
| [docs/data-model.md](docs/data-model.md) | Database schema, constraints, indexes |
| [docs/security-controls.md](docs/security-controls.md) | Alle beveiligingsmaatregelen & implementatie |
| [docs/flows/prediction-flow.md](docs/flows/prediction-flow.md) | Feature A end-to-end flow |
| [docs/flows/address-flow.md](docs/flows/address-flow.md) | Feature B end-to-end flow |
| [docs/flows/cross-prompting.md](docs/flows/cross-prompting.md) | Cross-flow uitnodiging logica |
| [docs/admin.md](docs/admin.md) | Admin auth, dashboard, acties, export |
| [docs/test-plan.md](docs/test-plan.md) | Unit, integratie, E2E, security regression |
| [docs/gap-assessment.md](docs/gap-assessment.md) | Openstaande gaps voor productie |
| [docs/production-deployment.md](docs/production-deployment.md) | Server provisioning, DNS, backups, secrets |

## Lokale Ontwikkeling

### Vereisten
- Node.js 22+
- npm
- PostgreSQL (via Prisma dev database of lokaal)

### Setup
```powershell
cd E:\code\Baby\web
npm install
```

Maak `.env` op basis van `.env.example`:
```env
DATABASE_URL="postgresql://USER:***@HOST:PORT/DATABASE?schema=public"
APP_BASE_URL="http://localhost:3000"
ACCESS_CODE="kies-een-unieke-toegangscode"
SESSION_SECRET="minimaal-32-willekeurige-tekens"
MAGIC_LINK_TTL_MINUTES="1440"
EMAIL_DELIVERY_MODE="console"
ADMIN_EMAILS="ouder1@example.com,ouder2@example.com"
PRIVACY_CONTACT_EMAIL="privacy@example.com"
PREDICTION_DEADLINE_DATE="2025-12-31"
```

### Starten
```powershell
cd E:\code\Baby\web
npm run dev
```
Open: http://localhost:3000

### Prisma Handmatig
```powershell
cd E:\code\Baby\web
npx prisma dev ls
npx prisma dev start default
npx prisma db push
```

### Stoppen
```powershell
cd E:\code\Baby\web
npx prisma dev stop default
```

## Testen
```powershell
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright) - basis
npm run test:e2e

# E2E tests - full (vereist test DB, CI doet dit automatisch)
E2E_RUN_FULL=1 npm run test:e2e

# Lint
npm run lint
```

## Productie Deployment
Zie [docs/production-deployment.md](docs/production-deployment.md) voor volledige procedure:
1. Linode aanmaken (Debian 13, Amsterdam)
2. Provisioning script (`scripts/provision-debian13.sh`)
3. Deploy key voor private GitHub repo
4. `.env.production` vullen op server
5. `docker compose up -d --build`
6. Caddy HTTPS (Let's Encrypt)
7. Backups + restore test
8. Resend productieconfig + SPF/DKIM/DMARC

## Security Highlights
- Access code hash only in DB
- Magic links: crypto random, SHA-256 hash, 24h TTL, single-use
- CSRF: double-submit cookie (middleware + Server Actions)
- Sessions: HMAC-SHA256 signed, HttpOnly, Secure, SameSite
- Rate limiting: IP-based (in-memory, Redis voor multi-instance)
- Admin: allowlist (2 e-mails), separate session scope
- Security headers: CSP, HSTS, Referrer-Policy, Permissions-Policy
- No PII in logs, generic error responses (anti-enumeration)
- CSV export: formula injection neutralization, no-cache headers

## Project Structuur
```
E:\code\Baby\
├── .hermes.md                 # Hermes project rules (agent context)
├── Instructions.md            # Requirements & acceptance criteria
├── plan.md                    # Project plan
├── docs/                      # Alle technische documentatie
│   ├── architecture.md
│   ├── data-model.md
│   ├── security-controls.md
│   ├── admin.md
│   ├── test-plan.md
│   ├── gap-assessment.md
│   ├── production-deployment.md
│   └── flows/
│       ├── prediction-flow.md
│       ├── address-flow.md
│       └── cross-prompting.md
├── scripts/
│   └── provision-debian13.sh  # Server provisioning
└── web/                       # Next.js applicatie
    ├── src/
    │   ├── app/               # App Router pages + Server Actions
    │   │   ├── api/           # API routes
    │   │   ├── admin/         # Admin dashboard + actions
    │   │   ├── deelnemen/     # Gast flows (voorspelling/adres)
    │   │   ├── layout.tsx
    │   │   ├── page.tsx       # Landing
    │   │   └── globals.css
    │   ├── components/        # UI componenten
    │   └── lib/               # Core utilities
    │       ├── access-code.ts
    │       ├── csrf.ts
    │       ├── db.ts
    │       ├── email.ts
    │       ├── env.ts
    │       ├── rate-limit.ts
    │       ├── security.ts
    │       ├── session.ts
    │       └── validation.ts
    ├── prisma/
    │   └── schema.prisma
    ├── e2e/                   # Playwright tests
    ├── .env.example
    ├── .env.production.example
    ├── next.config.ts
    ├── package.json
    └── middleware.ts
```

## Belangrijke Commando's Samenvatting

| Actie | Commando |
|-------|----------|
| Dev server | `cd web && npm run dev` |
| Build | `cd web && npm run build` |
| DB push | `cd web && npx prisma db push` |
| Prisma Studio | `cd web && npx prisma studio` |
| Tests | `cd web && npm run test` |
| E2E basis | `cd web && npm run test:e2e` |
| E2E full | `cd web && E2E_RUN_FULL=1 npm run test:e2e` |
| Lint | `cd web && npm run lint` |
| Docker build | `cd web && docker compose build` |
| Docker up | `cd web && docker compose up -d` |