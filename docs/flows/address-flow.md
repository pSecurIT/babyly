# Feature B Flow: Adresregistratie

## Doel
Geverifieerde deelnemer laat adres achter voor geboortekaart. Maximaal 1 adres per deelnemer.

## Stappen

1. **Landing** (`/`): toegangscode + naam + e-mail invoeren (gedeeld met Feature A)
2. **Magic link aanvragen** (POST `/api/auth/request-link`): identiek aan Feature A
3. **Verificatie** (GET `/api/auth/verify?token=...&email=...&scope=guest`): identiek aan Feature A
4. **Keuzepagina** (`/` met sessie): toont "Mijn voorspelling invullen" + "Mijn adres achterhalen"
5. **Adresformulier** (`/deelnemen/adres/formulier`):
   - Server Component: laadt bestaand adres (indien) voor defaults
   - CSRF token in hidden input
   - Velden: naam ontvanger, straat, huisnummer, postcode, woonplaats, land
6. **Submit** (Server Action `submitAddressAction`):
   - Sessie check (`readGuestSession`)
   - CSRF validatie
   - Zod validatie (`addressInputSchema`)
   - Bestaat adres? → `update`; anders → `create`
   - `markCrossPromptSeen("addressToPrediction")` in sessie
   - Redirect `/deelnemen/adres/bedankt`
7. **Bedankpagina** (`/deelnemen/adres/bedankt`):
   - Toont bevestiging
   - Knop "Voorspelling invullen of aanpassen" → cross-prompt naar Feature A
   - Knop "Mijn adres aanpassen" (heropen formulier)

## Server-side Regels
1. Max 1 adresrecord per participant (unique FK constraint)
2. Alleen geverifieerde sessie (`scope=guest`) mag schrijven
3. Geen publieke uitleesroute voor adressen
4. Alle validatie server-side (Zod)

## Foutgevallen
| Fout | Response |
|------|----------|
| Ongeldige toegangscode | Generieke redirect `/?mail=1` |
| Rate limit | Generieke redirect `/?mail=1` |
| Verlopen/gebruikte magic link | `/?auth=failed` |
| Ongeldige CSRF | Redirect formulier `?error=ongeldig` |
| Validatiefout | Redirect formulier `?error=validatie` |
| Dubbele inzending | Idempotent: update bestaand record |

## Implementatiedetails
- Formulier: Server Component met `defaultValue` uit bestaand `addressCard`
- CSRF: `getCsrfToken()` via middleware header/cookie
- Validatie: `addressInputSchema` (Zod)
- Cross-prompt: `markCrossPromptSeen` zet flag in sessie cookie
- Upsert logica: `findUnique` → `update` of `create`