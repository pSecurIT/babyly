# Feature A Flow: Voorspelling

## Doel
Gebruiker vult veilige babyvoorspelling in en mag maximaal eenmaal wijzigen.

## Stappen
1. Gebruiker opent de publieke landingspagina en voert eerst de toegangscode en e-mail in.
2. Backend verstuurt magic link en toont generieke bevestiging.
3. Gebruiker verifieert via de link en komt terug op de landingspagina, nu als kiezer tussen voorspelling en adres.
4. Gebruiker kiest voorspelling.
5. Gebruiker vult voorspelformulier in.
6. Backend valideert en slaat op.
7. Gebruiker ziet bevestiging en melding: nog één wijziging mogelijk.
8. Eventuele wijziging verhoogt edit_count naar 1 en zet record definitief.
9. Na afronding wordt cross-prompt naar adresflow getoond (overslaan toegestaan).

## Server-side regels
1. Max 1 initiële prediction per participant.
2. Max 1 edit.
3. Alle checks transactioneel uitvoeren.

## Foutgevallen
1. Ongeldige toegangscode: generieke fout.
2. Verlopen of gebruikte magic link: afwijzen, optie nieuwe link.
3. Tweede editpoging: blokkeren met duidelijke melding.
