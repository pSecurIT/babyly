# Cross-Prompting

## Doel
Na succesvolle afronding van een flow, gebruiker vriendelijk uitnodigen om ook de andere flow in te vullen — zonder verplichting, niet-blokkerend, maximaal 1x per richting per sessie.

## Regels
1. Na succesvolle Feature A (voorspelling): toon prompt naar Feature B (adres)
2. Na succesvolle Feature B (adres): toon prompt naar Feature A (voorspelling)
3. Prompt is **niet-blokkerend** — gebruiker kan direct sluiten/overslaan
4. Prompt **maximaal 1x per richting per sessie** (bijgehouden in `baby_session` cookie)

## UX Tekstvoorstel

### Na Voorspelling (A → B)
> Bedankt voor je voorspelling. Wil je ook je adres achterlaten zodat we je het geboortekaartje kunnen sturen?
> [Link: "Mijn adres toevoegen" → `/deelnemen/adres/formulier`]

### Na Adres (B → A)
> Bedankt voor je adres. Wil je ook een voorspelling invullen?
> [Link: "Voorspelling invullen of aanpassen" → `/deelnemen/voorspelling/formulier`]

## Tracking Zonder Profiling
Alleen functionele status in sessie cookie (`crossPromptSeen`):
- `predictionToAddress: boolean` — prompt A→B getoond
- `addressToPrediction: boolean` — prompt B→A getoond

Geen:
- Tracking cookies
- Marketing profielen
- Persistente opslag na sessie einde
- Analytics events

## Implementatie

### Sessie uitbreiding (`src/lib/session.ts`)
```typescript
type SessionPayload = {
  sub: string;
  scope: "guest" | "admin";
  exp: number;
  crossPromptSeen?: {
    predictionToAddress?: boolean;
    addressToPrediction?: boolean;
  };
};
```

### Markeren (`markCrossPromptSeen`)
```typescript
export async function markCrossPromptSeen(
  direction: "predictionToAddress" | "addressToPrediction"
) {
  const session = await readGuestSession();
  if (!session) return;
  const remainingSeconds = Math.max(1, session.exp - Math.floor(Date.now() / 1000));
  const crossPromptSeen = { ...session.crossPromptSeen, [direction]: true };
  // hersigneer cookie met nieuwe payload
}
```

### Tonen in Bedankpagina's
- `voorspelling/bedankt/page.tsx`: toont knop "Mijn adres toevoegen" + checkt `crossPromptSeen.predictionToAddress` (UI laat knop altijd zien, sessie voorkomt herhaling van prompt-bericht)
- `adres/bedankt/page.tsx`: toont knop "Voorspelling invullen of aanpassen"

**Let op**: Huidige implementatie toont de cross-prompt knoppen altijd op bedankpagina's; de sessie-flag voorkomt enkel herhaling van een expliciete "prompt" banner. De knoppen blijven bereikbaar voor herhaald gebruik.

## Test Scenarios
1. Voorspelling invullen → bedankpagina toont adres-knop ✓
2. Adres invullen → bedankpagina toont voorspel-knop ✓
3. Dezelfde sessie: tweede keer voorspelling bedankpagina → adres-knop nog steeds zichtbaar (OK, is link geen prompt)
4. Nieuwe sessie: flow A afrond → prompt getoond ✓
5. Geen tracking cookies / localStorage gebruikt ✓