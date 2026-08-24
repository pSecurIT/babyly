# Babyly

## Overzicht

Babyly is een privacy-vriendelijke website voor een babyproject met twee afzonderlijke invulflows:

1. een voorspelling van het geslacht, gewicht, lengte en verwachte geboorte-moment van de baby;
2. een adreskaart voor de geboortekaart of cadeauzending.

Beide flows delen dezelfde toegangsketen: een geheime toegangscode plus een e-mailverificatie via een one-time magic link. De flows zijn functioneel los van elkaar, maar de app moedigt een gebruiker aan om na een succesvolle inzending eenmalig de andere flow ook in te vullen.

Het project is gebouwd met Next.js, Prisma en PostgreSQL, met een focus op veilige deelname, beperkte dataretentie en eenvoudige adminbewerkingen.

## Doel van de app

De app moet een veilige, eenvoudige en Nederlandse ervaring bieden voor deelnemers die op een privacy-aware manier:

- hun voorspelling kunnen invullen;
- hun adres kunnen registreren;
- alleen eenmalig toegang krijgen met een veilige e-mail-link;
- geen publieke scorebord of open data kunnen blootleggen;
- een admin-console kunnen gebruiken om inzendingen te exporteren of te wissen.

## Huidige functionaliteit

De huidige implementatie bevat de kern van de geplande app:

- publieke landing page met toegangscode + e-mail login;
- veilige magic-link flow voor gasten en admins;
- sessiebeheer voor geverifieerde deelnemers;
- invoerformulieren voor voorspelling en adres;
- beperking op één voorspelling met maximaal één wijziging;
- admin dashboard met overzicht, reset, verwijdering en CSV-export;
- rate limiting, token-hashing, server-side validation en persisted access code logic.

## Lokale ontwikkeling

### Vereisten

- Node.js 22+
- npm
- PostgreSQL of een lokale Prisma dev database

### Setup

```powershell
cd E:\code\Baby\web
npm install
```

Maak vervolgens een `.env`-bestand op basis van de projectinstellingen. Zorg ervoor dat minimaal deze variabelen aanwezig zijn:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
APP_BASE_URL="http://localhost:3000"
ACCESS_CODE="kies-een-unieke-toegangscode"
SESSION_SECRET="minimaal-32-willekeurige-tekens"
MAGIC_LINK_TTL_MINUTES="15"
EMAIL_DELIVERY_MODE="console"
ADMIN_EMAILS="ouder1@example.com,ouder2@example.com"
```

### Starten

```powershell
cd E:\code\Baby\web
npm run dev
```

Open vervolgens:

- http://localhost:3000

### Prisma handmatig

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

## Gap assessment tegen plan.md

De beoordeling hieronder vergelijkt de huidige status met de doelen in [plan.md](../plan.md).

| Onderdeel | Status | Opmerking |
| --- | --- | --- |
| Scope en requirements vastleggen | Gedeeltelijk | De app heeft de kernfunctionaliteit, maar geen volledig formele requirements- of acceptatie-dossier in de repo dat volledig voldoet aan het plan. |
| Datamodel voor participant/prediction/address/magic token/admin allowlist | Compleet | Prisma schema bevat alle kernmodellen en relaties. |
| Security-architectuur | Gedeeltelijk | De code bevat hashing, rate limiting, sessies, one-time tokens, admin allowlist en inputvalidatie, maar de planmatige threat review / security-controls documentatie is nog niet volledig afgedekt. |
| Voorspelflow | Compleet | Invoer, validatie, create/update, one-edit regel, locked state en bedankt pagina zijn aanwezig. |
| Adresflow | Compleet | Adresinvoer, unieke adreskaart per deelnemer en redirect na opslag zijn geïmplementeerd. |
| Cross-prompting | Gedeeltelijk | De app bevat een cross-prompt/redirect-patroon na succesvolle inzending, maar de ervaring is niet volledig uitgewerkt als een afgeronde, expliciete "volgende stap"-flow uit het plan. |
| Admin auth + dashboard | Compleet | Admin login, sessiecontrole, dashboard, reset en purgen zijn aanwezig. |
| CSV-export | Compleet | Admin export endpoint genereert een CSV met deelnemerdata. |
| Purge/delete/reset acties | Compleet | De admin acties voor reset, verwijderen en volledige purge zijn actief. |
| Privacy/anti-enumeration gedrag | Gedeeltelijk | De app probeert privacy te beschermen, maar formele documentatie en volledige negatieve-testcases ontbreken. |
| Teststrategie en security tests | Gedeeltelijk | Er zijn tests aanwezig voor validatie, acties en sessies, maar geen volledig testmatrix volgens het plan. |
| Documentatie / handoff pakket | Gedeeltelijk | Er bestaan docs in de repo, maar de implementatie is nog niet volledig “plan-complete” in de zin van het handoffpakket in [plan.md](../plan.md). |

## Conclusie

De meeste kernfeatures zijn al gebouwd en werkend:

- magische linkauthenticatie;
- beide deelnemerflows;
- admin-beheer;
- export en data purge.

Wat nog niet volledig afgerond is volgens het plan, is vooral het laatste “release-ready” niveau:

- volledige documentatie en architectuurafstemming;
- expliciete cross-prompt UX voor beide flows;
- uitgebreide security review en testmatrix;
- volledig traceerbare mapping van elke planvereiste naar geïmplementeerde code.

## Aanbevolen volgende stappen

1. Controleer de docs in de map `docs/` en vul ontbrekende secties aan voor architecture, security controls en flows.
2. Maak de cross-prompting meer expliciet in de UX en in de redirect logic.
3. Vervang de huidige ad-hoc testset door een complete testmatrix volgens de planvereisten.
4. Verifieer de admin- en privacyregels met security-focused tests.

## Opmerking

Voer de app altijd vanuit de `web`-map uit, niet vanuit de repo-root, anders krijg je de bekende `ENOENT`-fout omdat er in de root geen `package.json` staat.
