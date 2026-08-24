# Security Controls

## Authenticatie
1. Toegangscode hash vergelijken op server.
2. Magic link token cryptografisch random.
3. Alleen token-hash opslaan.
4. Token TTL kort houden, bijvoorbeeld 15 minuten.
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
1. CSRF-bescherming voor muterende requests.
2. Secure cookies: HttpOnly, Secure, SameSite.
3. Security headers instellen.
4. Geen gevoelige data in URL parameters.

## Anti-enumeratie
1. Generieke responses bij magic-link aanvraag.
2. Geen onderscheid in foutmeldingen tussen bestaand/niet-bestaand e-mailadres.
3. Timingverschillen minimaliseren waar mogelijk.

## Logging
1. Geen PII in standaard logs.
2. Geen tokens of toegangscodes loggen.
3. Alleen minimale audit-events voor adminacties.

## Misbruikpreventie
1. Honeypot veld in formulieren.
2. Optionele cooldown op verdachte verzoeken.
3. Geen publieke endpoint voor bulkdata.
