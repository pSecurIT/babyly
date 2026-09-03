# Feature A Flow: Voorspelling

## Doel
Geverifieerde deelnemer vult veilige babyvoorspelling in. Onbeperkt wijzigen mogelijk tot deadline.

## Stappen

1. **Landing** (`/`): toegangscode + naam + e-mail invoeren
2. **Magic link aanvragen** (POST `/api/auth/request-link`):
   - CSRF check (middleware cookie + form token)
   - Rate limit: `code:{ip}` (15/10min), `mail:{ip}` (10/10min)
   - Access code hash vergelijking
   - Participant upsert (email unique, name update)
   - Magic link token genereren (32 bytes random) → SHA-256 hash opslaan
   - E-mail versturen via Resend/console met verify URL
3. **Verificatie** (GET `/api/auth/verify?token=...&email=...&scope=guest`):
   - Token hash lookup + expiry check + `usedAt` null check
   - Atomische `usedAt` update (single-use)
   - Participant `emailVerifiedAt` zetten
   - Signed `baby_session` cookie (scope=guest, 24h)
   - Redirect naar `/` (nu met sessie)
4. **Keuzepagina** (`/` met sessie): toont "Mijn voorspelling invullen" + "Mijn adres achterhalen"
5. **Voorspelformulier** (`/deelnemen/voorspelling/formulier`):
   - Server Component: laadt bestaande prediction (indien) voor defaults
   - CSRF token in hidden input
   - Velden: gegokte naam, geslacht, gewicht (kg), lengte (cm), geboortedatum, tijdstip
6. **Submit** (Server Action `submitPredictionAction`):
   - Sessie check (`readGuestSession`)
   - CSRF validatie
   - Zod validatie (`predictionInputSchema`)
   - Deadline check (`PREDICTION_DEADLINE_DATE`)
   - Transactie:
     - Geen prediction? → `create`
     - Bestaat? → `update`
   - `markCrossPromptSeen("predictionToAddress")` in sessie
   - Redirect `/deelnemen/voorspelling/bedankt`
7. **Bedankpagina** (`/deelnemen/voorspelling/bedankt`):
   - Toont bevestiging + deadline herinnering
   - Knop "Voorspelling wijzigen" (als deadline nog niet passed)
   - Knop "Mijn adres toevoegen" → cross-prompt naar Feature B

## Server-side Regels
1. Max 1 prediction per participant (unique FK constraint)
2. Onbeperkt wijzigen mogelijk tot deadline
3. Alle checks transactioneel (Prisma `$transaction`)
4. Deadline server-side afgedwongen
5. Geen publieke inzage in voorspellingen

## Foutgevallen
| Fout | Response |
|------|----------|
| Ongeldige toegangscode | Generieke redirect `/?mail=1` (geen detail) |
| Rate limit | Generieke redirect `/?mail=1` |
| Verlopen/gebruikte magic link | `/?auth=failed` |
| Ongeldige CSRF | Redirect formulier `?error=ongeldig` |
| Validatiefout | Redirect formulier `?error=validatie` |
| Ongeldige datum/tijd | Redirect formulier `?error=datumtijd` |
| Deadline passed | Formulier getoond met waarschuwing, submit geblokkeerd |

## Implementatiedetails
- Formulier: Server Component met `defaultValue` uit bestaande prediction
- CSRF: `getCsrfToken()` via middleware header/cookie
- Validatie: `predictionInputSchema` (Zod) + `toPredictedBirthAt` helper
- Cross-prompt: `markCrossPromptSeen` zet flag in sessie cookie
- Bedankpagina: checkt `isDeadlinePassed` voor wijzig-knop