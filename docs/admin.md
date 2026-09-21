# Admin

## Authenticatie
1. **Magic link apart van gasten**: `scope=admin`, eigen token tabel (`purpose=admin_login`)
2. **Allowlist**: exact 2 e-mailadressen in `ADMIN_EMAILS` env var + `AdminAllowlist` tabel
3. **Aparte sessie**: `scope=admin` cookie, 24h TTL, SameSite=lax
4. **Strengere rate limiting**: op admin auth endpoints (niet geïmplementeerd als apart limit — TODO)
5. **Geen client claims**: `isAdmin` o.i.d. nooit gebruikt; check altijd server-side via allowlist

## Dashboard (`/admin`, `src/app/admin/page.tsx`)
Overzichtspagina met statistieken (geen ruwe tabellen meer); ruwe data staat in de tabbladen `/admin/voorspellingen` en `/admin/adressen`.

### Metrics & visualisaties
- Aantal deelnemers, voorspellingen en adressen (tegels)
- Geslachtsverdeling (donut, `computeGenderSplit`)
- Voorspelde geboortedata per dag (bar chart, `computeDateBuckets`)
- Gewicht/lengte gemiddelde + min/max (`computeRangeStats`)
- Populairste voorspelde namen (tag cloud, `computeNameFrequency`)
- Aanmeldingen per dag, laatste 14 dagen (bar chart, `computeLastNDayBuckets`)
- Adressen-invulgraad (progress bar, `computeFillRate`)

Stat-berekeningen zijn pure functies in `src/lib/admin-stats.ts` (los van Prisma, eenvoudig te testen).

### Gevarenzone
- **Alles Purgen**: `purgeAllAction` → transaction: `magicLinkToken.deleteMany()` + `participant.deleteMany()` (cascade); vereist getypte bevestigingszin `VERWIJDER ALLES` (client én server gevalideerd)

## Tabblad Voorspellingen (`/admin/voorspellingen`, `src/app/admin/voorspellingen/page.tsx`)
### Tabel: Voorspellingen Overzicht
Kolommen: Deelnemer naam, E-mail, Gegokte naam, Geslacht, Gewicht (kg), Lengte (cm), Geboortemoment, Acties

### Acties per rij
- **Reset**: `resetPredictionAction` → verwijdert prediction → deelnemer kan opnieuw invullen
- **Verwijder**: `deleteParticipantAction` → cascade delete participant + prediction + address + tokens

### Bulk acties
- **CSV Export**: `GET /api/admin/export/predictions` → `text/csv`, `no-store`, `no-referrer`, `nosniff`, formule-neutralisatie
- **Mail CSV naar admins**: `mailPredictionsCsvAction` → verstuurt CSV als bijlage naar alle adressen in `ADMIN_EMAILS` via Resend
- **Voorspellingen wissen**: `clearPredictionsAction` → `prisma.prediction.deleteMany({})`; vereist getypte bevestigingszin `VERWIJDER VOORSPELLINGEN` (client én server gevalideerd). Deelnemers en adressen blijven bestaan.

## Tabblad Adressen (`/admin/adressen`, `src/app/admin/adressen/page.tsx`)
### Tabel: Adressen Overzicht
Kolommen: Naam ontvanger, Adres, Postcode, Woonplaats, Land, Deelnemer, Ingevuld op

### Bulk acties
- **CSV Export**: `GET /api/admin/export/addresses` → zelfde beveiligingsheaders als hierboven
- **Mail CSV naar admins**: `mailAddressesCsvAction` → verstuurt CSV als bijlage naar alle adressen in `ADMIN_EMAILS`
- **Adressen wissen**: `clearAddressesAction` → `prisma.addressCard.deleteMany({})`; vereist getypte bevestigingszin `VERWIJDER ADRESSEN`. Deelnemers en voorspellingen blijven bestaan.

## Beheeracties (Server Actions, `src/app/admin/actions.ts`)

| Actie | Functie | Validatie |
|-------|---------|-----------|
| `deleteParticipantAction` | `prisma.participant.delete({ where: { id } })` | Admin sessie + CSRF + participantId |
| `resetPredictionAction` | `prisma.prediction.deleteMany({ where: { participantId } })` | Admin sessie + CSRF + participantId |
| `purgeAllAction` | Transaction: delete all magicLinkTokens + participants | Admin sessie + CSRF + bevestigingszin |
| `clearPredictionsAction` | `prisma.prediction.deleteMany({})` | Admin sessie + CSRF + bevestigingszin |
| `clearAddressesAction` | `prisma.addressCard.deleteMany({})` | Admin sessie + CSRF + bevestigingszin |
| `mailPredictionsCsvAction` | Bouwt CSV + `sendCsvEmail` naar `adminEmailSet()` | Admin sessie + CSRF |
| `mailAddressesCsvAction` | Bouwt CSV + `sendCsvEmail` naar `adminEmailSet()` | Admin sessie + CSRF |

## Veiligheidsregels
1. **Alle admin routes**: `readAdminSession()` check vóór elke actie
2. **CSRF**: elke mutatie valideert `validateCsrfToken(csrfTokenFromForm(formData))`
3. **Audit logging**: `console.info("[admin-audit] <event>")` — geen PII
4. **Export beveiliging**:
   - Alleen admin sessie
   - `Cache-Control: no-store, max-age=0`
   - `Pragma: no-cache`
   - `Referrer-Policy: no-referrer`
   - `X-Content-Type-Options: nosniff`
   - Formule neutralisatie: waarden beginnend met `=`, `+`, `-`, `@` → prefix `'`
   - Alleen noodzakelijke velden (geen interne IDs, timestamps, tokens)
5. **Destructieve bulk-acties**: vereisen een getypte bevestigingszin (client- én server-side gevalideerd) om accidentele dataverwijdering te voorkomen

## Implementatie Bestanden
| Bestand | Doel |
|---------|------|
| `src/app/admin/page.tsx` | Statistieken-dashboard (Server Component) |
| `src/app/admin/voorspellingen/page.tsx` | Tabblad met ruwe voorspellingendata |
| `src/app/admin/adressen/page.tsx` | Tabblad met ruwe adresdata |
| `src/app/admin/actions.ts` | Server Actions (delete, reset, purge, clear, mail-csv) |
| `src/lib/admin-stats.ts` | Pure statistiekberekeningen voor het dashboard |
| `src/lib/csv.ts` | Gedeelde CSV-bouwfuncties (predictions/addresses) |
| `src/components/admin/charts.tsx` | Donut/bar chart/tag cloud/progress bar componenten |
| `src/components/admin/AdminTabs.tsx` | Tabnavigatie tussen overzicht/voorspellingen/adressen |
| `src/components/admin/ConfirmClearForm.tsx` | Client component voor getypte bevestiging bij wissen |
| `src/app/api/admin/export/predictions/route.ts` | CSV export endpoint (voorspellingen) |
| `src/app/api/admin/export/addresses/route.ts` | CSV export endpoint (adressen) |
| `src/app/api/admin/export/route.ts` | Legacy gecombineerde CSV export endpoint |
| `src/lib/session.ts` | `readAdminSession`, `createSessionValue` |
| `src/lib/csrf.ts` | CSRF validatie |
| `prisma/schema.prisma` | `AdminAllowlist` model |