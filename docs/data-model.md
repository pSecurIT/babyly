# Data Model

## Overzicht
Minimaal relationeel model met harde server-side constraints.

## Tabellen

### participants
1. id (pk)
2. name
3. email (unique, normalized)
4. email_verified_at
5. created_at
6. updated_at

### predictions
1. id (pk)
2. participant_id (fk -> participants.id, unique)
3. gender (enum: boy, girl)
4. weight_grams (int)
5. height_cm (int)
6. predicted_birth_at (timestamp)
7. edit_count (int default 0)
8. locked_at (nullable timestamp)
9. created_at
10. updated_at

### address_cards
1. id (pk)
2. participant_id (fk -> participants.id, unique)
3. recipient_name
4. street
5. house_number
6. postal_code
7. city
8. country
9. created_at
10. updated_at

### magic_link_tokens
1. id (pk)
2. email
3. token_hash
4. purpose (enum: guest_login, admin_login)
5. expires_at
6. used_at (nullable)
7. created_at

## Constraints
1. Unieke participant per e-mail.
2. Maximaal één prediction per participant.
3. Maximaal één address card per participant.
4. Update prediction alleen transactioneel met edit_count check.

## Indexes
1. participants(email)
2. predictions(participant_id)
3. address_cards(participant_id)
4. magic_link_tokens(email, purpose, expires_at)

## Retentie
1. Tokens kort bewaren en periodiek opruimen.
2. Deelnemersdata handmatig purgeable via adminfunctie.
