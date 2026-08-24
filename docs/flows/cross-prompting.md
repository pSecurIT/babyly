# Cross-Prompting

## Doel
Gebruiker vriendelijk uitnodigen om ook de andere flow in te vullen, zonder verplichting.

## Regels
1. Na succesvolle afronding van Feature A: toon prompt naar Feature B.
2. Na succesvolle afronding van Feature B: toon prompt naar Feature A.
3. Prompt is niet-blokkerend en kan worden overgeslagen.
4. Prompt maximaal eenmalig per richting per sessie.

## UX Tekstvoorstel
1. Na A:
   Bedankt voor je voorspelling. Wil je ook je adres achterlaten zodat we je het geboortekaartje kunnen sturen?
2. Na B:
   Bedankt voor je adres. Wil je ook een voorspelling invullen?

## Tracking Zonder Profiling
1. Alleen functionele status opslaan: flow_a_completed, flow_b_completed, prompt_a_to_b_shown, prompt_b_to_a_shown.
2. Geen trackingcookies of marketingprofielen.
