# Admin

## Auth
1. Admin login via magic link.
2. Alleen 2 allowlisted e-mails krijgen toegang.
3. Aparte adminsessie en strengere rate limiting.

## Dashboard
1. Aantal deelnemers.
2. Aantal voorspellingen.
3. Optioneel verdeling jongen/meisje.
4. Overzichtstabel met voorspellingen.

## Beheeracties
1. CSV-export van alleen relevante deelnemer-, voorspelling- en adresgegevens.
2. Deelnemer verwijderen inclusief gekoppelde records.
3. Prediction resetten zodat deelnemer opnieuw kan indienen.
4. Handmatige purge van alle deelnemergegevens.

## Veiligheidsregels
1. Geen adminrechten vanuit clientclaims.
2. Alle adminroutes server-side autoriseren.
3. Auditlog voor verwijder, reset en export-acties.

## Exportbeveiliging

De exportroute is uitsluitend toegankelijk voor een admin-sessie. De response
wordt niet gecachet, verwijst niet door naar de vorige pagina en gebruikt
`nosniff`. CSV-velden die als spreadsheetformule kunnen worden geïnterpreteerd
worden geneutraliseerd. De route en deze eigenschappen zijn getest; periodieke
controle van admin-toegang blijft een operationele verantwoordelijkheid.
