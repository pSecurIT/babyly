# Testplan

## Prioriteit
Security en privacy krijgen hoogste prioriteit.

## Unit Tests
1. Schema validatie van voorspelling en adresvelden.
2. Token helper: hashing, expiry checks, single-use guard.
3. Edit-limit business rules.

## Integratietests
1. Ongeldige toegangscode wordt afgewezen.
2. Rate limiting op toegangscode en magic-link requests.
3. Magic link verificatie werkt eenmaal.
4. Verlopen token wordt geweigerd.
5. Replay van token wordt geweigerd.
6. Eerste voorspelling slaagt.
7. Eerste wijziging slaagt.
8. Tweede wijziging faalt.
9. Maximaal één adresrecord per participant.

## Autorisatietests
1. Publieke gebruiker kan geen andere data lezen.
2. Ongeautoriseerde admin requests worden geweigerd.
3. Alleen allowlisted admin e-mails krijgen adminsessie.
4. Externe `next`-URL's worden na verificatie geweigerd.
5. Verlopen, gebruikte en opnieuw aangeboden magic links worden geweigerd.
6. Deelnemerleesroutes gebruiken uitsluitend de participant-ID uit de
	geverifieerde sessie.
7. Een gastsessie krijgt geen toegang tot admin-leespagina's.
8. Admin-leespagina's lezen pas data na een geldige adminsessie.

## UX Gedragstests
1. Feature A afrondbaar zonder Feature B.
2. Feature B afrondbaar zonder Feature A.
3. Cross-prompt verschijnt na afronding en blijft overslaanbaar.

## Browser E2E-tests

De Playwright-tests staan in `web/e2e/` en worden uitgevoerd met:

```powershell
cd E:\code\Baby\web
npm run test:e2e
```

De standaardtests controleren de publieke authpagina, het CSRF-token in de
browser en de bescherming van beide deelnemerflows. De volledige submission-
en cross-prompttests vereisen een geïsoleerde testdatabase en worden opt-in
gestart met `E2E_RUN_FULL=1`. De Playwright global setup maakt hiervoor een
unieke testdeelnemer en tijdelijke sessie aan in `e2e/.auth/guest.json`, en
ruimt beide na afloop op. Dit bestand is genegeerd door Git; gebruik nooit
een productiecookie of productiedatabase.

De GitHub Actions-workflow in `.github/workflows/ci.yml` start automatisch een
ephemeral PostgreSQL-service, initialiseert het schema, installeert Chromium
en voert unit-, security- en volledige E2E-tests uit met `E2E_RUN_FULL=1`.
De CI-credentials zijn uitsluitend testwaarden en bevatten geen secrets.

## Lokale e-mailtest

Voor een directe Resend-test zonder de volledige authflow:

1. Voeg lokaal aan `web/.env` toe:

```env
EMAIL_DELIVERY_MODE="provider"
EMAIL_TEST_RECIPIENT="jouw-eigen-e-mailadres"
```

2. Controleer dat `EMAIL_FROM` en `RESEND_API_KEY` ook lokaal zijn ingesteld.
3. Herstart de developmentserver na een wijziging van `.env`.
4. Open `http://localhost:3000/test/email` precies eenmaal.

De pagina verstuurt bij laden één eenvoudige testmail. Een refresh verstuurt
opnieuw een mail. De pagina werkt niet in productie. De serverlog gebruikt
alleen `[email-test] sending`, `[email-test] sent` met een Resend message-id,
of `[email-test] provider_failed`; ontvanger, API-key en mailinhoud worden niet
gelogd.

De actuele browserchecks zijn:

- publieke authpagina met CSRF-token;
- weigering van een CSRF-loze auth-request;
- blokkade van beide deelnemerflows zonder sessie;
- volledige prediction- en address-submission met cross-prompt in een
	geïsoleerde database.

De laatste twee tests worden alleen uitgevoerd met `E2E_RUN_FULL=1`.

## Beveiligingsdekking

De unit- en integrationtests dekken daarnaast tokenreplay, verlopen tokens,
open redirects, XSS-outputescaping, mass assignment, session fixation, IDOR,
admin-autorisatie, exportdataminimalisatie, logredactie en dynamische CSRF-
dekking van alle formulierpagina's.

## Security Regression Checklist
1. CSRF op gast- en admin-magic-linkformulieren.
2. CSRF op deelnemer- en admin-server actions.
3. Elke pagina met een muterend formulier wordt dynamisch gevonden en bevat
	een server-tokenveld.
4. IDOR.
5. XSS.
6. SQL injection via ORM/parameterized queries.
7. Mass assignment.
8. Session fixation.
9. E-mail enumeratie.
10. Open redirect via `next`-parameter.
11. XSS via participant- en formulierinvoer.
12. Mass assignment via onbekende formuliervelden.
