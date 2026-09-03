# Security Testing Plan — Babyly Production (https://baby.pietermertens.be)

**Goal**: Identify and fix vulnerabilities before external testers (friends) test the app.

**Test Environment**: Production URL — https://baby.pietermertens.be  
**Test Accounts**: Create 2-3 test participant accounts + 1 admin account (allowlisted emails)

---

## Test Categories

### 1. Authentication & Magic Link Flow

| Test | Steps | Expected |
|------|-------|----------|
| **A1** Valid magic link flow | 1. Enter access code + email<br>2. Click magic link<br>3. Verify redirect to `/` | Session cookie set, access to flows |
| **A2** Expired magic link | Use link >24h after request | Redirect to `/?auth=failed` |
| **A3** Reused magic link | Click same link twice | Second use → `/?auth=failed` |
| **A4** Invalid access code | Enter wrong code | Generic "check mail" (no detail) |
| **A5** Rate limit: access code | 15+ attempts from same IP in 10min | Blocked, generic response |
| **A6** Rate limit: magic link req | 10+ requests from same IP in 10min | Blocked, generic response |
| **A7** Admin magic link (non-allowlisted) | Request admin link with non-allowlisted email | Generic "check mail" (no enumeration) |
| **A8** Admin magic link (allowlisted) | Request with allowlisted email | Magic link sent, admin session created |
| **A9** Open redirect via `next` param | `verify?next=//evil.com` | Redirects to `/` only |

---

### 2. CSRF Protection

| Test | Steps | Expected |
|------|-------|----------|
| **C1** Valid form submission | Fill prediction form → submit | Success |
| **C2** Missing CSRF token | Submit form without token (dev tools) | Redirect `?error=ongeldig` |
| **C3** Mismatched CSRF token | Change token value in form | Redirect `?error=ongeldig` |
| **C4** CSRF on admin actions | Delete participant without token | Redirect `?error=ongeldig` |
| **C5** CSRF on address form | Submit address without token | Redirect `?error=ongeldig` |
| **C6** Token regeneration | New session → new CSRF token | Each form has unique token |

---

### 3. XSS (Cross-Site Scripting)

| Test | Steps | Expected |
|------|-------|----------|
| **X1** Prediction name XSS | Submit `<script>alert(1)</script>` as name | Rendered as text, not executed |
| **X2** Address fields XSS | Submit `<img src=x onerror=alert(1)>` in street | Rendered as text |
| **X3** Recipient name XSS | Submit `"><script>alert(1)</script>` | Rendered as text |
| **X4** Reflected XSS in errors | Visit `/?auth=failed` with payload | No reflection in response |
| **X5** Stored XSS in admin export | Submit payload → export CSV → open in Excel | Formula neutralized (`'=...`) |

---

### 4. Injection Attacks

| Test | Steps | Expected |
|------|-------|----------|
| **I1** SQL injection via form fields | `' OR 1=1--` in all inputs | Handled by Prisma (parameterized) |
| **I2** NoSQL injection | `{"$gt": ""}` in JSON fields | Not applicable (no raw JSON parsing) |
| **I3** Command injection | `; rm -rf /` in text fields | Treated as literal string |
| **I4** LDAP injection | `*)(uid=*))(|(userPassword=*` | Not applicable |

---

### 5. Authorization & IDOR

| Test | Steps | Expected |
|------|-------|----------|
| **Z1** Access other participant's prediction | Login as user A, try `/deelnemen/voorspelling/formulier` with user B's ID | Only user A's data shown |
| **Z2** Access other participant's address | Same as Z1 for address | Only user A's data |
| **Z3** Admin endpoint without auth | GET `/admin` without login | Redirect `/admin/login` |
| **Z4** Admin API without auth | GET `/api/admin/export` | 401 Unauthorized |
| **Z5** Admin actions as guest | POST delete/reset/purge with guest session | Redirect `/admin/login` |
| **Z6** Participant ID tampering | Change `participantId` in admin forms | Server validates admin session only |

---

### 6. Session Management

| Test | Steps | Expected |
|------|-------|----------|
| **S1** Session expiry | Wait 24h + 1min after login | Redirect to login |
| **S2** Session tampering | Modify cookie signature | Session invalid → login |
| **S3** HttpOnly flag | Check cookie in dev tools | `HttpOnly: true` |
| **S4** Secure flag (HTTPS) | Check cookie on production | `Secure: true` |
| **S5** SameSite=lax | Check cookie | `SameSite: lax` |
| **S6** Cross-prompt tracking | Complete prediction → check session | `predictionToAddress: true` |
| **S7** Session scope separation | Admin session vs guest session | Different scopes, no crossover |

---

### 7. Rate Limiting

| Test | Steps | Expected |
|------|-------|----------|
| **R1** Access code brute force | 16 rapid requests with wrong code | Blocked after 15 |
| **R2** Magic link spam | 11 rapid requests same email | Blocked after 10 |
| **R3** Admin login spam | 6 rapid requests | Blocked after 5 |
| **R4** Rate limit window reset | Wait 10min + retry | Allowed again |
| **R5** IP isolation | Test from different IP | Separate buckets |

---

### 8. Data Exposure & Privacy

| Test | Steps | Expected |
|------|-------|----------|
| **D1** Public prediction list | Visit `/api/...` or guess URLs | 404 or redirect |
| **D2** Public address list | Same as D1 | 404 or redirect |
| **D3** Admin export without auth | Direct GET `/api/admin/export` | 401 |
| **D4** PII in logs | Check server logs after actions | No emails, names, tokens |
| **D5** CSV export formula injection | Export after XSS payloads | Neutralized (`'=...`) |
| **D6** Email enumeration | Different emails on login | Identical generic responses |

---

### 9. Security Headers

| Test | Tool | Expected |
|------|------|----------|
| **H1** CSP | `curl -I https://baby.pietermertens.be` | `Content-Security-Policy` present |
| **H2** HSTS | Same | `Strict-Transport-Security: max-age=31536000` |
| **H3** X-Frame-Options | Same | `DENY` |
| **H4** X-Content-Type-Options | Same | `nosniff` |
| **H5** Referrer-Policy | Same | `strict-origin-when-cross-origin` |
| **H6** Permissions-Policy | Same | `camera=(), microphone=(), geolocation=()` |

---

### 10. Business Logic

| Test | Steps | Expected |
|------|-------|----------|
| **B1** Unlimited prediction edits | Submit prediction → edit 5x → verify all saved | All edits persisted |
| **B2** Prediction deadline | After `PREDICTION_DEADLINE_DATE` | Form shows warning, submit blocked |
| **B3** Single address per participant | Submit address → submit again | Updates existing (upsert) |
| **B4** Cross-prompt once per session | Complete prediction → check address page → complete address → check prediction page | Prompt shown once per direction |
| **B5** Admin purge | Admin → "Alles purgen" | All participant data deleted |
| **B6** Admin reset prediction | Admin → "Reset" on participant | Prediction deleted, user can re-enter |

---

## Test Execution Order (Priority)

### Phase 1: Critical (Run First)
1. A1-A9 — Auth flow (gatekeeper for everything)
2. C1-C6 — CSRF (blocks most mutations)
3. Z1-Z6 — Authorization (data isolation)
4. X1-X5 — XSS (high impact)

### Phase 2: Important
5. I1-I4 — Injection
6. S1-S7 — Session security
7. R1-R5 — Rate limiting
8. H1-H6 — Headers

### Phase 3: Business Logic & Privacy
9. D1-D6 — Data exposure
10. B1-B6 — Business rules

---

## Test Tools

| Tool | Purpose |
|------|---------|
| Browser DevTools | Cookie inspection, network requests, console |
| curl | Header checks, automated requests |
| OWASP ZAP / Burp Suite | Automated scanning (optional) |
| Custom scripts | Rate limit testing, CSRF token extraction |

---

## Reporting Template

For each vulnerability found:
```
**ID**: [e.g., X2]
**Severity**: Critical/High/Medium/Low
**Description**: What happens
**Steps to Reproduce**: Numbered steps
**Expected**: Secure behavior
**Actual**: Vulnerable behavior
**Fix**: Code change needed
```

---

## Pre-Test Setup

```bash
# 1. Create test accounts
# - Participant 1: test1@example.com
# - Participant 2: test2@example.com
# - Admin: admin1@allowlisted.com, admin2@allowlisted.com

# 2. Note access code from .env.production
# 3. Configure email delivery (Resend) for magic links
# 4. Verify HTTPS + headers
curl -I https://baby.pietermertens.be
```

---

## Post-Test Actions

1. **Fix Critical/High** immediately before friends test
2. **Document Medium/Low** with fix timeline
3. **Update gap-assessment.md** with findings
4. **Re-run full test suite** after fixes
5. **Deploy fixes** to production