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

## UX Gedragstests
1. Feature A afrondbaar zonder Feature B.
2. Feature B afrondbaar zonder Feature A.
3. Cross-prompt verschijnt na afronding en blijft overslaanbaar.

## Security Regression Checklist
1. CSRF.
2. IDOR.
3. XSS.
4. SQL injection via ORM/parameterized queries.
5. Mass assignment.
6. Session fixation.
7. E-mail enumeratie.
