# Architectuur

## Doel
Eenvoudige, veilige Nederlandstalige website met twee losse gebruikersflows:
1. Feature A: voorspelling.
2. Feature B: adresregistratie voor geboortekaart.

## Componenten
1. Frontend: Next.js pagina's en formulieren.
2. Backend: server actions of API routes voor alle mutaties.
3. Database: PostgreSQL met relationeel model.
4. E-mailservice: transactionele provider voor magic links.
5. Rate limit store: Redis of gelijkwaardig.

## Trust Boundaries
1. Browser is niet vertrouwd.
2. Backend is bron van waarheid voor auth, autorisatie en validatie.
3. Database wordt alleen via backend benaderd.
4. E-maillinks zijn tijdelijk en eenmalig.

## Runtime security

1. Next middleware zet de CSRF-cookie voordat server-rendered formulieren
	worden opgebouwd.
2. Server Components lezen de token alleen; mutaties valideren de token
	server-side.
3. De Next-configuratie zet centrale security headers op alle routes.
4. Playwright global setup kan optioneel een geïsoleerde E2E-deelnemer en
	tijdelijke sessie aanmaken en na afloop verwijderen.

## Identity En Sessies
1. Deelnemer identificeert via geverifieerde e-mail.
2. Sessiecookie bevat minimale claims en is HttpOnly/Secure/SameSite.
3. Admin heeft aparte sessie en aparte routes.

## High-level Flow
1. Toegangscode controle.
2. E-mail magic link aanvragen.
3. Verificatie van token.
4. Toegang tot gekozen flow A of B.
5. Na afronding: niet-blokkerende cross-prompt naar andere flow.

## Scheiding Publiek/Admin
1. Publieke routes voor deelname.
2. Admin routes voor inzicht, export en beheeracties.
3. Nooit data uit admin beschikbaar maken via publieke endpoints.

## Deployment Notes
1. HTTPS verplicht.
2. Secrets via environment variables.
3. Logging zonder PII en zonder tokens.
4. GitHub Actions gebruikt een ephemeral PostgreSQL-service voor volledige
	database-backed E2E-tests; productiecredentials worden daar niet gebruikt.
5. Productie draait als Docker Compose-stack op een Debian 13 Linode met
	Caddy als reverse proxy en PostgreSQL op het interne netwerk.
