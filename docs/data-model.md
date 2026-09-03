# Data Model

## Overzicht
Minimaal relationeel model met harde server-side constraints. Beheerd via Prisma (`prisma/schema.prisma`).

## Tabellen

### participants
| Veld | Type | Constraints |
|------|------|-------------|
| id | String | PK, `@default(cuid())` |
| name | String? | Optioneel |
| email | String | `@unique`, genormaliseerd (lowercase, trim) |
| emailVerifiedAt | DateTime? | Tijdstip verificatie |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

**Relaties**: `prediction?`, `addressCard?`, `magicTokens[]`

### predictions
| Veld | Type | Constraints |
|------|------|-------------|
| id | String | PK, `@default(cuid())` |
| participantId | String | `@unique`, FK → participants.id (Cascade delete) |
| predictedName | String | `@default("")` (gegokte babynaam) |
| gender | Gender | Enum: `boy` \| `girl` |
| weightGrams | Int | Gewicht in gram (opslag), 500-10000 |
| heightCm | Int | Lengte in cm, 20-80 |
| predictedBirthAt | DateTime | Verwachte geboortedatum + tijdstip |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

**Index**: `participantId`

### address_cards
| Veld | Type | Constraints |
|------|------|-------------|
| id | String | PK, `@default(cuid())` |
| participantId | String | `@unique`, FK → participants.id (Cascade delete) |
| recipientName | String | Naam ontvanger |
| street | String | Straat |
| houseNumber | String | Huisnummer |
| postalCode | String | Postcode |
| city | String | Woonplaats |
| country | String | Land |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

**Index**: `participantId`

### magic_link_tokens
| Veld | Type | Constraints |
|------|------|-------------|
| id | String | PK, `@default(cuid())` |
| email | String | E-mailadres |
| tokenHash | String | SHA-256 hex van token |
| purpose | TokenPurpose | Enum: `guest_login` \| `admin_login` |
| expiresAt | DateTime | TTL (default 24h) |
| usedAt | DateTime? | Null = nog niet gebruikt |
| createdAt | DateTime | `@default(now())` |
| participantId | String? | Optionele FK → participants.id (SetNull on delete) |

**Indexes**: `(email, purpose, expiresAt)`, `tokenHash`

### access_codes
| Veld | Type | Constraints |
|------|------|-------------|
| id | String | PK, single row (`id = "singleton"`) |
| codeHash | String | SHA-256 hash van toegangscode |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

Synced met `ACCESS_CODE` env var op startup (`syncAccessCodeFromEnv`)

### admin_allowlist
| Veld | Type | Constraints |
|------|------|-------------|
| id | String | PK, `@default(cuid())` |
| email | String | `@unique`, exact 2 entries |
| createdAt | DateTime | `@default(now())` |

## Constraints (server-side afgedwongen)
1. Unieke participant per e-mail (`@unique`)
2. Maximaal 1 prediction per participant (unique FK)
3. Maximaal 1 address card per participant (unique FK)
4. Prediction create/update: transactioneel
5. Magic link: single-use via atomische `usedAt` update

## Indexes
- `participants(email)`
- `predictions(participantId)`
- `address_cards(participantId)`
- `magic_link_tokens(email, purpose, expiresAt)`
- `magic_link_tokens(tokenHash)`

## Retentie
1. Magic link tokens: periodiek opruimen (verlopen/gebruikt)
2. Deelnemersdata: handmatig purgeable via admin (`purgeAllAction`)
3. Geen automatische retentie — operationele keuze, documenteer startdatum bewaartermijn

## Validatiegrenzen (Zod, `src/lib/validation.ts`)
- Gewicht: 0.5 - 10 kg (opslag als gram: 500 - 10000)
- Lengte: 20 - 80 cm
- Geslacht: `boy` \| `girl`
- Datum/tijd: geldige ISO combinatie, redelijke range
- Naam/adresvelden: redelijke max lengte
- E-mail: geldige structuur + normalisatie (lowercase, trim)