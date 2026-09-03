## Plan: Babyly - Veilige Babysite Met Twee Losse Flows

We bouwen een eenvoudige Nederlandstalige website met twee functioneel losse onderdelen: (A) babyvoorspelling en (B) adresregistratie voor geboortekaart. Beide flows gebruiken dezelfde veilige toegang (toegangscode + e-mailverificatie), maar blijven optioneel t.o.v. elkaar. Na afronding van een flow tonen we een niet-blokkerende, eenmalige uitnodiging voor de andere flow. Eerst worden requirements en security-architectuur expliciet vastgelegd, daarna pas implementatie.

**Steps**
1. Scope en requirements vastzetten in Instructions.md met expliciete scheiding tussen Feature A en B, plus cross-prompting regels en acceptance criteria.  
   Afhankelijkheid: geen.
2. Datamodel en auth-model ontwerpen (participant, prediction, address, magic token, admin allowlist) inclusief server-side limieten/constraints.  
   Afhankelijkheid: stap 1.
3. Security ontwerp uitwerken met trust boundaries en controls: rate limiting, token hashing + expiry + single-use, CSRF, sessiecookies, logging redaction, generieke foutmeldingen.  
   Afhankelijkheid: stap 2.
4. API/server actions ontwerp per flow uitwerken met autorisatiegrenzen en anti-enumeration gedrag.  
   Afhankelijkheid: stap 2 en 3.
5. UX-flow specificeren voor mobiele en desktop gebruikers, inclusief eenmalige cross-prompt na succesvolle afronding van A of B, altijd overslaan toegestaan.  
   Parallel: kan deels parallel met stap 4.
6. Admin-scope definiëren: 2 allowlisted ouder-accounts via admin magic link, dashboard, CSV-export, verwijderen/resetten van deelnemersdata, handmatige data purge knop.  
   Afhankelijkheid: stap 2 en 3.
7. Teststrategie opstellen met prioriteit op security en regressies (auth bypass, replay, edit-limit race conditions, ongeautoriseerde toegang, validatie).  
   Afhankelijkheid: stap 3 en 4.
8. Handoffpakket voor implementatie-agents opleveren: definitieve requirements, architectuur, datamodel, endpointcontracten, testmatrix en scopegrenzen.  
   Afhankelijkheid: stap 1 t/m 7.

**Relevant files**
- e:/code/Baby/Instructions.md — herschrijven voor ondubbelzinnige scope, 2-feature scheiding en acceptance criteria.
- docs/architecture.md (nieuw) — trust boundaries, componenten, sessie- en auth-sequenties.
- docs/data-model.md (nieuw) — tabellen, constraints, indexen, bewaarbeleid per tabel.
- docs/security-controls.md (nieuw) — securitymaatregelen en misbruikpreventie.
29|- docs/flows/prediction-flow.md (nieuw) — end-to-end flow A.
- docs/flows/address-flow.md (nieuw) — end-to-end flow B inclusief validatie en consent.
- docs/flows/cross-prompting.md (nieuw) — wanneer/wat tonen, frequentie, skip-gedrag.
- docs/admin.md (nieuw) — admin auth, dashboard, export, delete/reset/purge-acties.
- docs/test-plan.md (nieuw) — testmatrix met unit/integration/e2e/security checks.

**Verification**
1. Requirements review: elke MUST-eis uit Instructions.md mapt naar exact 1+ ontwerpsectie in documentatie.
2. Threat review: controle op brute force, replay, enumeratie, CSRF, IDOR, privilege escalation, race conditions.
3. Data minimization review: alleen noodzakelijke persoonsgegevens, geen tracking cookies, geen gevoelige data in logs.
4. Flow review: gebruiker kan A of B apart afronden; cross-prompt verschijnt na submit maar is nooit blokkerend.
5. Admin review: alleen 2 allowlisted e-mails krijgen admin sessie; publieke endpoints lekken geen aggregaten of persoonsgegevens.
6. Test readiness review: alle kritieke regels hebben concrete testcases en verwachte uitkomsten.

**Decisions**
- Beide flows zijn aanbevolen maar optioneel; geen harde blokkade tussen flows.
- Adresflow gebruikt dezelfde beveiligingsketen als voorspelflow (toegangscode + e-mailverificatie).
- Verplicht adresminimum: naam ontvanger, straat + huisnummer, postcode, woonplaats, land.
- Maximaal één adresregistratie per geverifieerd e-mailadres.
- Bewaartermijn: handmatige verwijdering via admin-purge functionaliteit.
- Admin-toegang: exact 2 vaste e-mailadressen op allowlist.
- Voorspelling kan onbeperkt vaak worden aangepast tot deadline.

**Scope boundaries**
- In scope: publieke landing, beveiligde deelnemersflows A/B, cross-prompting, admin magic-link, export, delete/reset/purge, privacytekst, security-first architectuur.
- Buiten scope: sociale login, wachtwoordaccounts voor gasten, publieke scoreborden/statistieken, advertenties/trackers, complexe multi-role IAM.

**Further considerations**
1. Aanbevolen extra: optionele herinneringsmail (1x) voor de niet-ingevulde tweede flow, met duidelijke opt-out.
2. Aanbevolen extra: configureerbare automatische retentie-optie naast handmatige purge (later in te schakelen).