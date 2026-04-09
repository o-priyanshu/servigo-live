# ServiGo Product Document

## Vision
Build a geo-based secure marketplace connecting customers with verified domestic workers in their local area.

## Problem Statement
- Quick onboarding platforms often have weak verification.
- Low transparency around worker background and accountability.
- Safety concerns reduce trust at hyperlocal level.

## Core Idea
- Open registration for providers.
- Strict verification before going live.
- Customers discover only verified providers within local radius.

## Target Market (Phase 1)
- Single city launch.
- Urban households.
- Categories: electrician, plumber, cleaner, carpenter, appliance repair.

## Core Features

### Customer App
- Email/password signup, Google OAuth login.
- Email verification before booking/chat/review access.
- Nearby verified workers with badges.
- Worker profile, booking, in-app chat, ratings, report workflow.

### Provider App
- Open registration.
- Upload ID proof, selfie, optional police certificate.
- Service category + service radius + availability toggle.
- Accept/reject jobs and earnings view.

### Verification
- Level 1: phone OTP, email verification, ID + selfie, admin approval.
- Level 2: police certificate and background-check partner API.

## Geo-Based System
- GPS-based location detection.
- Radius filtering (for example, 5 km).
- Results limited to online + verified + in-range providers.

## Security Architecture
- Firebase Auth and session-cookie based authentication.
- Firestore role-based rules with document-level boundaries.
- Server-only role assignment and moderation updates.
- Firebase Storage with signed URL access patterns.
- HTTPS transport + encryption at rest.

## AI Integration
- Face match: ID photo vs selfie.
- Fraud detection: multi-account, cancellation spikes, repeat complaints.
- Smart matching: distance + rating + response-time ranking.

## Tech Stack
- Frontend: Next.js App Router, TypeScript, Tailwind, Vercel.
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions.
- Planned scale stack: NestJS, PostgreSQL, Redis, Maps API, payments, notifications, observability.

## Admin Dashboard
- Approve/reject providers.
- Suspend accounts.
- Review complaints and booking analytics.

## Revenue Model
- Booking commission.
- Featured listing.
- Provider subscriptions.
- Emergency booking premium.

## Risk Management
- Focus on safety incidents, fake documents, and legal compliance risk.
- Countermeasures: strict verification, emergency reporting, quick suspension controls.

## Legal Requirements (India)
- GST registration.
- Terms and Conditions.
- Privacy policy and data protection compliance.
