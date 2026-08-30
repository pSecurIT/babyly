## Opdracht

Bouw een eenvoudige, moderne en veilige Nederlandstalige website voor een aanstaande baby.

De website bevat twee losse functionaliteiten:

1. Feature A: babyvoorspelling (gokgedeelte).
2. Feature B: adresregistratie voor het versturen van geboortekaartjes.

Beide functionaliteiten zijn onafhankelijk afrondbaar, maar na afronding van een van beide wordt de gebruiker uitgenodigd om ook de andere functionaliteit te doen.

## Product Scope

### MUST

1. Publieke landingspagina met twee duidelijke acties:
   1. Mijn voorspelling invullen.
   2. Mijn adres achterlaten voor geboortekaart.
2. Feature A en Feature B zijn beide beveiligd met dezelfde flow:
   1. toegangscode,
   2. e-mailverificatie via magic link of verificatiecode,
   3. pas daarna toegang tot het formulier.
3. Beide flows zijn optioneel ten opzichte van elkaar:
   1. gebruiker mag A afronden zonder B,
   2. gebruiker mag B afronden zonder A.
4. Na succesvolle afronding van A of B verschijnt een niet-blokkerende uitnodiging naar de andere flow.
5. Geen klassieke registratie/login met wachtwoord voor gasten.

### SHOULD

1. Eenvoudige, mobiele-first UX met minimale stappen.
2. Heldere fout- en succesmeldingen in het Nederlands.

### MAY

1. Een optionele eenmalige herinneringsmail om de tweede flow af te ronden.

---

## Feature A: Voorspelling

### Gegevens

1. Naam.
2. Geslacht: jongen of meisje.
3. Gewicht in kg (opslag in gram).
4. Lengte in cm.
5. Verwachte geboortedatum.
6. Verwacht tijdstip.

### Regels

1. Een deelnemer mag exact een eerste voorspelling indienen.
2. Een deelnemer mag maximaal een keer wijzigen.
3. Na eerste wijziging wordt de voorspelling definitief.
4. Alle limieten worden server-side afgedwongen met transacties/constraints.
5. Voorspellingen zijn nooit publiek zichtbaar.

---

## Feature B: Adresregistratie

### Verplichte velden

1. Naam ontvanger.
2. Straat en huisnummer.
3. Postcode.
4. Woonplaats.
5. Land.

### Regels

1. Maximaal een adresregistratie per geverifieerd e-mailadres.
2. Server-side validatie en autorisatie verplicht.
3. Geen publieke inzage in adressen.

---

## Cross-Prompting Regels

### MUST

1. Na succesvol afronden van Feature A: toon uitnodiging naar Feature B.
2. Na succesvol afronden van Feature B: toon uitnodiging naar Feature A.
3. Deze uitnodiging is altijd overslaanbaar.
4. De uitnodiging mag het afronden van de huidige flow nooit blokkeren.

### SHOULD

1. Toon de cross-prompt maximaal eenmaal per richting per sessie.
2. Houd berichten kort, vriendelijk en duidelijk.

---

## Security Baseline

Behandel beveiliging als kernvereiste. Belangrijke controles zijn uitsluitend server-side geldig.

### Toegangscode

1. Geen hardcoded toegangscode in frontend.
2. Bewaar alleen een veilige hash in backend/config.
3. Rate-limit op foutieve pogingen.
4. Gebruik generieke foutmeldingen zonder uitlek van detail.

### E-mailverificatie

1. Gebruik cryptografisch veilige, willekeurige, eenmalige tokens/codes.
2. Verlooptijd: maximaal 24 uur.
3. Token is single-use.
4. Sla token niet in plaintext op; bewaar hash.
5. Rate-limit op aanvragen en retries.
6. Voorkom account/e-mail enumeratie via response- en timingpatronen.

### Sessies en web-security

1. Veilige sessiecookies: HttpOnly, Secure, SameSite.
2. CSRF-bescherming op relevante muterende requests.
3. Correcte security headers.
4. HTTPS in productie.

### Anti-bot

1. Start zonder zware CAPTCHA.
2. Gebruik combinatie van:
   1. toegangscode,
   2. e-mailverificatie,
   3. rate limiting,
   4. honeypot,
   5. server-side validatie,
   6. optionele korte vertraging bij verdachte requests.

---

## Privacy En GDPR

### MUST

1. Verzamel alleen noodzakelijke persoonsgegevens.
2. Geen tracking- of advertentiecookies.
3. Geen persoonsgegevens of tokens in logs/analytics/URL's.
4. Publiceer een korte Nederlandstalige privacytekst met:
   1. welke gegevens worden verzameld,
   2. waarom,
   3. wie toegang heeft,
   4. dat data niet publiek is,
   5. hoe verwijdering kan worden gevraagd.
5. Voorzie admin-functionaliteit voor handmatige volledige purge.

### SHOULD

1. Documenteer bewaarbeleid en verwijderproces expliciet in beheerinterface en documentatie.

---

## Data Model (Conceptueel)

Gebruik een eenvoudige relationele database met foreign keys, indexes en unique constraints.

### Participant

1. id
2. name
3. email (unique)
4. email_verified_at
5. created_at
6. updated_at

### Prediction

1. id
2. participant_id (unique fk)
3. gender
4. weight_grams
5. height_cm
6. predicted_birth_at
7. edit_count
8. locked_at
9. created_at
10. updated_at

### AddressCard

1. id
2. participant_id (unique fk)
3. recipient_name
4. street
5. house_number
6. postal_code
7. city
8. country
9. created_at
10. updated_at

### MagicLinkToken

1. id
2. email
3. token_hash
4. purpose (guest/admin)
5. expires_at
6. used_at
7. created_at

---

## Admin

### Toegang

1. Adminomgeving is volledig gescheiden van publieke flow.
2. Login via admin magic link.
3. Alleen 2 vaste allowlisted ouder-e-mails krijgen admin toegang.
4. Nooit vertrouwen op client-claims zoals isAdmin.

### Mogelijkheden

1. Dashboard met:
   1. aantal deelnemers,
   2. aantal voorspellingen,
   3. optioneel percentage jongen/meisje,
   4. lijst voorspellingen.
2. CSV-export van relevante gegevens.
3. Deelnemer verwijderen inclusief gekoppelde data.
4. Voorspelling resetten voor een deelnemer.
5. Handmatige purge van alle deelnemergegevens.

---

## Architectuur En Techniek

### MUST

1. Duidelijke scheiding tussen frontend, backend/server actions/API, database en e-mailservice.
2. Alle muterende acties server-side geautoriseerd en gevalideerd.
3. Geen endpoint dat ongeautoriseerd bulkdata van deelnemers toont.
4. Secrets alleen via environment variables.
5. Commit geen echte secrets.
6. Voeg een .env.example toe.

### Aanbevolen stack

1. Next.js
2. TypeScript
3. PostgreSQL
4. Prisma of vergelijkbare ORM
5. Tailwind CSS
6. Betrouwbare transactionele e-mailprovider

Vermijd onnodige microservices en over-engineering.

---

## Inputvalidatie

Valideer op frontend en backend, met backend als bron van waarheid.

Voorbeelden van grenzen:

1. Gewicht: 0,5-10 kg (opslag in gram).
2. Lengte: 20-80 cm.
3. Datum en tijd: geldig formaat en redelijke range.
4. Geslacht: uitsluitend boy of girl.
5. Naam en adresvelden: redelijke maximale lengte.
6. E-mail: geldige structuur + normalisatie.

---

## UX Richtlijnen

1. Volledig Nederlandstalig.
2. Warme, rustige en moderne uitstraling.
3. Zachte neutrale kleuren, veel witruimte, afgeronde kaarten.
4. Toegankelijk en goed leesbaar.
5. Geen overmatige animaties.
6. Werkt goed op smartphone en desktop.

Voorbeeldheadline:

Wanneer komt onze kleine spruit?

---

## Testmatrix (Minimaal)

1. Ongeldige toegangscode.
2. Rate limiting op toegangscode en magic-link-aanvraag.
3. Geldige magic-link-verificatie.
4. Verlopen magic link.
5. Hergebruik van magic link blokkeren.
6. Eerste voorspelling indienen.
7. Eerste wijziging toestaan.
8. Tweede wijziging blokkeren (ook via directe API-call).
9. Ongeautoriseerde toegang tot voorspellingen blokkeren.
10. Ongeautoriseerde admin API-requests blokkeren.
11. Inputvalidatie voor alle formulieren.
12. CSRF/session-beveiliging waar van toepassing.
13. Feature A afronden zonder Feature B.
14. Feature B afronden zonder Feature A.
15. Cross-prompt verschijnt na afronding en is niet-blokkerend.

---

## Acceptatiecriteria

1. De applicatie ondersteunt twee losse flows (A en B) met gedeelde beveiliging.
2. Gebruiker kan elke flow onafhankelijk afronden.
3. Na afronding van een flow wordt de andere flow voorgesteld zonder verplichting.
4. Voorspellingen en adressen zijn nooit publiek zichtbaar.
5. Admin is alleen toegankelijk voor 2 allowlisted ouder-e-mails via magic link.
6. Een voorspelling kan slechts een keer worden aangepast.
7. Er is een admin-optie om alle deelnemergegevens handmatig te purgen.
8. Geen tracking/advertising cookies.

---

## Niet-doen

Vermijd:

1. Gastenaccounts met wachtwoorden.
2. Sociale login.
3. Publieke profielen of scoreborden.
4. Onnodige rollenstructuren.
5. Overbodige third-party trackers en advertenties.
6. Complexe CAPTCHA tenzij echt nodig.

Prioriteit:

1. Security.
2. Privacy.
3. Gebruiksgemak.
4. Betrouwbaarheid.
5. Eenvoud.

Als een beveiligingsmaatregel niet betrouwbaar kan worden geïmplementeerd, leg dan uit waarom en kies een veiligere eenvoudige oplossing.

**Begin nu met het projectplan en de architectuur. Vraag alleen om verduidelijking als iets echt noodzakelijk is om veilig te kunnen bouwen.**
