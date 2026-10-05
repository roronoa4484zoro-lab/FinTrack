# Project Approach: FinTrack

## 1. Problem Breakdown
The goal is to build a secure personal finance tracker that allows users to manage income, expenses, and budgets while receiving AI-powered financial advice.

## 2. Architectural Decisions

### Tech Stack
- **Next.js (App Router)**: Chosen for unified frontend/backend development and fast deployment.
- **PostgreSQL**: Essential for financial data integrity (ACID compliance).
- **JWT + HTTP-Only Cookies**: Used to prevent XSS-based token theft.

### Security Controls (The "Build Secure" Edge)
- **Field-Level Encryption**: The `amount` column in the `transactions` table will be encrypted using AES-256-GCM.
- **Strict Ownership Checks**: Every API request will verify that the `user_id` of the requested resource matches the authenticated `user_id`.
- **Input Validation**: Using Zod for schema validation on all API inputs to prevent injection attacks.
- **Data Anonymization**: Before sending data to the AI API, personal identifiers (names, emails) will be stripped.

## 3. Milestones
- [ ] Phase 1: Project Scaffolding & DB Schema (Current)
- [ ] Phase 2: Secure Authentication System (JWT)
- [ ] Phase 3: Transaction Management (CRUD)
- [ ] Phase 4: Dashboard & Data Visualization
- [ ] Phase 5: AI Financial Assistant Integration
- [ ] Phase 6: Security Hardening & Final Audit
