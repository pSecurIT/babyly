# Admin

## Authenticatie
1. **Magic link apart van gasten**: `scope=admin`, eigen token tabel (`purpose=admin_login`)
2. **Allowlist**: exact 2 e-mailadressen in `ADMIN_EMAILS` env var + `AdminAllowlist` tabel
3. **Aparte sessie**: `scope=admin` cookie, 24h TTL, SameSite=lax
4. **Strengere rate limiting**: op admin auth endpoints (niet geïmplementeerd als apart limit — TODO)
5. **Geen client claims**: `isAdmin` o.i.d. nooit gebruikt; check altijd server-side via allowlist

## Dashboard (`/admin`, `src/app/admin/page.tsx`)
### Metrics
- Aantal deelnemers (`prisma.participant.count()`)
- Aantal voorspellingen (`prisma.prediction.count()`)
- Verdeling jongen/meisje (percentage berekend uit predictions)

### Tabel: Voorspellingen Overzicht
Kolommen: Deelnemer naam, E-mail, Gegokte naam, Geslacht, Gewicht (kg), Lengte (cm), Geboortemoment, Acties

### Acties per rij
- **Reset**: `resetPredictionAction` → verwijdert prediction → deelnemer kan opnieuw invullen
- **Verwijder**: `deleteParticipantAction` → cascade delete participant + prediction + address + tokens

### Bulk Acties
- **CSV Export**: `GET /api/admin/export` → `text/csv`, `no-store`, `no-referrer`, `nosniff`, formule-neutralisatie
- **Alles Purgen**: `purgeAllAction` → transaction: `magicLinkToken.deleteMany()` + `participant.deleteMany()` (cascade)

## Beheeracties (Server Actions, `src/app/admin/actions.ts`)

| Actie | Functie | Validatie |
|-------|---------|-----------|
| `deleteParticipantAction` | `prisma.participant.delete({ where: { id } })` | Admin sessie + CSRF + participantId |
| `resetPredictionAction` | `prisma.prediction.deleteMany({ where: { participantId } })` | Admin sessie + CSRF + participantId |
| `purgeAllAction` | Transaction: delete all magicLinkTokens + participants | Admin sessie + CSRF |

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

## Adressen Overzicht (`/admin/adressen`)
Niet volledig geïmplementeerd in huidige code — placeholder in dashboard linkt naar `/admin/adressen` maar pagina ontbreekt. TODO: implementeren of link verwijderen.

## Implementatie Bestanden
| Bestand | Doel |
|---------|------|
| `src/app/admin/page.tsx` | Dashboard Server Component |
| `src/app/admin/actions.ts` | Server Actions (delete, reset, purge) |
| `src/app/api/admin/export/route.ts` | CSV export endpoint |
| `src/lib/session.ts` | `readAdminSession`, `createSessionValue` |
| `src/lib/csrf.ts` | CSRF validatie |
| `prisma/schema.prisma` | `AdminAllowlist` model |