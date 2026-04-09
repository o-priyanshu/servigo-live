# ServiGo Customer Authentication and Secure Onboarding

## 1) Text Architecture Diagram

```text
[Next.js Client]
  | 1. Email/Password or Google OAuth
  v
[Firebase Auth]
  | 2. Returns ID Token
  v
[Next.js API /api/auth/bootstrap] --(Admin SDK)--> [Firestore /users/{uid}]
  |  - server-side role="customer"
  |  - sync emailVerified, isBlocked, lastLogin
  |  - write fraud flags + security_signals
  v
[Next.js API /api/sessions] --(Admin SDK)--> creates HTTP-only __session cookie
  |
  v
[Next.js Middleware]
  |  - verify session JWT
  |  - redirect unauthenticated to /auth/login
  |  - redirect unverified from /booking,/chat,/reviews to /verify-email
  |  - redirect blocked users (with claims mode) to /blocked
  v
[Protected Pages + Firestore Rules]
```

## 2) Firestore Schema

`/users/{uid}`

```ts
{
  uid: string
  name: string
  email: string
  role: "customer" | "provider" | "admin"
  emailVerified: boolean
  createdAt: timestamp
  isBlocked: boolean
  lastLogin: timestamp
  status: "pending_verification" | "active" | "blocked"
  isProfileComplete: boolean
  authProviders: string[]
  fraudFlags: {
    disposableEmail: boolean
    multiSignupDevice: boolean
  }
}
```

`/security_signals/{id}` (backend-only telemetry)

## 3) Firestore Role vs Custom Claims

- Firestore role (MVP recommended):
  - Source of truth in `/users/{uid}.role`.
  - Flexible for dashboards/admin panels.
  - Firestore rules can enforce per-document permissions.
  - Limitation: middleware cannot reliably read Firestore at edge on every request.

- Custom claims (advanced):
  - Put `role`, `blocked`, `email_verified` in Firebase token claims.
  - Best for middleware/microservices authorization without DB reads.
  - Must sync claims server-side whenever role/block/verification changes.
  - Requires token refresh to propagate immediately.

Recommended hybrid: Firestore as source of truth + claim sync trigger for fast enforcement.

## 4) Email Verification Enforcement

- Auth UI blocks progression for unverified email accounts.
- Middleware blocks `/booking`, `/chat`, `/reviews` if `email_verified` is false.
- `/api/auth/bootstrap` syncs trusted verification state from Firebase Auth user record into Firestore.
- Firestore rules and server APIs enforce authorization server-side, so direct client API calls cannot bypass verification checks.

## 5) Rate Limiting, reCAPTCHA, Fraud Signals

- Rate limiting strategy:
  - Add per-IP and per-device counters in `security_signals`.
  - For hard limits, front `/api/auth/*` with Cloud Armor or API Gateway rate policies.
- reCAPTCHA:
  - Add Firebase App Check (reCAPTCHA Enterprise on web) for abuse resistance.
  - Verify App Check token in sensitive API routes.
- Fraud flags:
  - `disposableEmail` based on denylist domain match.
  - `multiSignupDevice` when one device crosses signup threshold.

## 6) Middleware Logic

- Redirect unauthenticated users from protected routes to `/auth/login`.
- Redirect blocked users to `/blocked`.
- Redirect unverified users from booking/chat/reviews to `/verify-email`.
- Admin path additionally checks role claim when claims mode is enabled.

## 7) Threat Model

- Account takeover:
  - Firebase Auth handles password hashing and secure sessions.
  - Require email verification before transactional actions.
  - Revoke refresh tokens on blocked users.
- Role escalation:
  - Role assignment is server-only in `/api/auth/bootstrap`.
  - Firestore rules disallow customer edits to `role` and `isBlocked`.
- Token manipulation:
  - Middleware verifies signed session JWT against Google JWKS.
  - Session cookie is HTTP-only and secure in production.
- API abuse:
  - Device/IP telemetry + disposable email flagging.
  - Add reCAPTCHA Enterprise + external rate limits for production scale.

## 8) Edge Cases

- Auth deleted but Firestore doc remains:
  - Run scheduled cleanup job to remove orphaned `/users/{uid}` docs.
- Email changes:
  - On next bootstrap/login, sync new email and set `emailVerified` from Firebase Auth record.
- Email signup then Google login:
  - Same UID if linked providers; else merge account flow needed with `linkWithCredential`.
- User blocked by admin:
  - Set `isBlocked=true`; claims sync function revokes refresh tokens.
- Token expiration:
  - Session cookie expiry + middleware invalidates and redirects to login.
- Suspended account login:
  - `/api/sessions` returns 403 and does not issue cookie.

## 9) Scalability Path (100k+ users)

- Stay on Firebase Auth + Firestore while:
  - auth patterns are standard,
  - role/permission model remains document-centric,
  - query patterns fit Firestore indexes.
- Move to NestJS + PostgreSQL when:
  - complex relational queries/joins dominate,
  - cross-entity transactions become frequent,
  - fine-grained policy logic exceeds Firestore rule ergonomics.
- Keep stateless auth for microservices:
  - Use short-lived JWT/session verification per service.
  - Centralize claim issuance and revocation events.
  - Keep user-role source of truth and claim-sync pipeline deterministic.
