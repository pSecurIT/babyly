# Gap assessment: openstaande gaps

## Status

De functionele scope is geïmplementeerd en gedocumenteerd in de toepasselijke
documenten. Dit bestand bevat alleen nog openstaande gaps.

## Openstaande gaps

### P0: vóór publiek livegaan

- **Productieconfiguratie:** hosting- en deploymentmodel, databaseprovider en
  transactionele e-mailprovider zijn nog niet gekozen. SPF, DKIM en DMARC
  moeten nog worden geconfigureerd.
- **Secrets en beheer:** de twee echte admin-e-mailadressen,
  productiecredentials en het privacycontactadres moeten in de production
  secret store worden ingesteld en gecontroleerd.
- **Backups en herstel:** backups, encryptie, toegangsbeheer, restoreprocedure
  en minimaal één succesvolle restore-test moeten nog worden ingericht.
- **Bewaarbeleid:** leg de startdatum van de bewaartermijn van één jaar vast
  en documenteer hoe verwijdering en purge met backups omgaan.
- **Juridische privacyreview:** laat de publieke privacytekst controleren vóór
  livegang.

### P1: release readiness

- **CI-validatie:** de workflow en geïsoleerde PostgreSQL-service zijn
  ingericht, maar de volledige database-backed E2E-run moet nog succesvol in
  CI worden uitgevoerd en bewaakt.
- **Threat review:** voer een formele review uit van brute force, replay,
  IDOR, CSRF, XSS, privilege escalation en race conditions.
- **Testmatrix:** breid de bestaande tests uit tot volledige negatieve en
  operationele tests, inclusief exportcontrole en toekomstige routes.
- **Documentatie-traceerbaarheid:** map requirements, security-controls,
  implementatie, tests en operationele eigenaarschap expliciet aan elkaar.
- **Exportbeheer:** leg vast wie exports periodiek mag gebruiken, hoe ze
  worden gedeeld en hoe toegang wordt gecontroleerd.

### P2: na eerste release

- **Gedeelde rate limiting:** vervang de in-memory `Map` door Redis of Valkey
  zodra meerdere processen of instances worden gebruikt.
- **Monitoring en incidentrespons:** voeg health checks, foutsignalering
  zonder PII, alertdrempels, een on-call-eigenaar, incidentlog en periodieke
  hersteltests toe.

## Eerstvolgende acties

1. Laat de CI-workflow de volledige database-backed E2E-suite uitvoeren en
   bevestig dat cleanup van de testdeelnemer werkt.
2. Kies productieproviders en leg secrets, e-mailauthenticatie, backups,
   restore en retentie vast.
3. Voer de formele threat review en juridische privacyreview uit.