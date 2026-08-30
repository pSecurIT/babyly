# Security Controls

## Authenticatie
1. Toegangscode hash vergelijken op server.
2. Magic link token cryptografisch random.
3. Alleen token-hash opslaan.
4. Token TTL maximaal 24 uur houden; een geverifieerde sessie blijft eveneens
    maximaal 24 uur geldig.
5. Token single-use afdwingen met atomaire update.

## Autorisatie
1. Publieke gebruiker ziet alleen eigen data.
2. Admin alleen via allowlisted e-mails.
3. Adminsessie volledig gescheiden van deelnemerssessie.

## Rate Limiting
1. Op toegangscodepogingen.
2. Op magic-link aanvragen.
3. Op verificatiepogingen.
4. Op gevoelige admin-auth requests.

## Inputvalidatie
1. Server-side schema validatie voor alle velden.
2. Whitelisting van toegestane waarden.
3. Lengte- en rangechecks.

## Web Security
1. CSRF-bescherming voor muterende requests via een server-generated,
   HttpOnly double-submit cookie en een verborgen formulierveld.
2. Middleware maakt de CSRF-cookie aan vóór Server Components formulieren
    renderen; Server Components wijzigen zelf geen cookies.
3. De server vergelijkt beide waarden constant-time en weigert ontbrekende,
   ongeldige of gemanipuleerde tokens vóór database- of e-mailmutaties.
4. Secure cookies: HttpOnly, Secure, SameSite.
5. Security headers instellen.
6. Geen gevoelige data in URL parameters.

### Geïmplementeerde details

- Middleware maakt vóór rendering een CSRF-cookie aan met 32 cryptografisch
    willekeurige bytes. Server Components schrijven zelf geen cookies.
- Alle muterende formulieren bevatten een verborgen CSRF-token. Auth-POST's,
    deelnemer-server actions en admin-server actions vergelijken dit token
    server-side met de cookie.
- De centrale Next.js-configuratie zet CSP, HSTS in productie, referrer policy,
    permissions policy, `nosniff` en framingbescherming op alle routes.
- De admin-export gebruikt `no-store`, `no-referrer` en `nosniff`, selecteert
    alleen noodzakelijke velden en neutraliseert spreadsheetformules.

## Anti-enumeratie
1. Generieke responses bij magic-link aanvraag.
2. Geen onderscheid in foutmeldingen tussen bestaand/niet-bestaand e-mailadres.
3. Timingverschillen minimaliseren waar mogelijk.

## Logging
1. Geen PII in standaard logs.
2. Geen tokens of toegangscodes loggen.
3. Alleen minimale audit-events voor adminacties.

De huidige admin- en rate-limitlogs gebruiken generieke eventnamen en bevatten
geen IP-adressen, e-mailadressen, tokens, toegangscodes of participant-ID's.

## Misbruikpreventie
1. Honeypot veld in formulieren.
2. Optionele cooldown op verdachte verzoeken.
3. Geen publieke endpoint voor bulkdata.
