# Feature B Flow: Adresregistratie

## Doel
Gebruiker laat adres achter voor geboortekaart, veilig en eenmalig per e-mailadres.

## Stappen
1. Gebruiker opent de publieke landingspagina en doorloopt eerst toegangscode + e-mailverificatie.
2. Gebruiker verifieert via de magic link en komt terug op de landingspagina, nu als kiezer tussen voorspelling en adres.
3. Gebruiker kiest adresregistratie.
4. Gebruiker vult adresvelden in:
   1. naam ontvanger,
   2. straat,
   3. huisnummer,
   4. postcode,
   5. woonplaats,
   6. land.
5. Backend valideert en slaat op.
6. Gebruiker ziet bevestiging.
7. Na afronding wordt cross-prompt naar voorspelflow getoond (overslaan toegestaan).

## Server-side regels
1. Maximaal één adresrecord per participant.
2. Alleen geverifieerde sessie mag schrijven.
3. Geen publieke uitleesroute voor adressen.

## Foutgevallen
1. Ongeldige of incomplete velden: veldspecifieke validatiefouten.
2. Dubbele inzending: blokkeren of idempotent upsert volgens gekozen beleid.

## Implementatiedetails

1. Het adresformulier bevat een servergegenereerd CSRF-token.
2. De server koppelt het adres uitsluitend aan de geverifieerde
   participant-sessie en valideert alle velden opnieuw.
3. Na opslag toont de bedankpagina de optionele voorspelling-cross-prompt; de
   ondertekende sessie voorkomt herhaling binnen dezelfde sessie.
