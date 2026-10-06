# Project Approach: FinTrack

## 1. Problem Breakdown
The goal is to build a secure personal finance tracker that allows users to manage income, expenses, budgets, savings goals, accounts, and recurring transactions while receiving AI-powered financial advice grounded strictly in user-authorized data.

## 2. Architectural Decisions


### Tech Stack
- **Next.js 15 (App Router)**: Unified frontend/backend architecture with React Server Components and Route Handlers.
- **PostgreSQL**: Relational database supporting ACID transactions, UUID primary keys, and foreign-key constraints.
- **JWT + HTTP-Only Cookies**: Signed using HS256 with environment-derived keys; transmitted via SameSite=Lax, HttpOnly, and Secure cookies.
- **Tailwind CSS v4 & Lucide Icons**: Responsive, accessible personal finance UI.

### Security Controls (The "Build Secure" Edge)
- **Field-Level Encryption**: Transaction amounts are encrypted server-side with AES-256-GCM. Keys are derived/parsed safely from Base64 or Hex without leaking errors or credentials.
- **Strict IDOR Ownership Checks**: Every read, update, and delete query enforces `user_id = $auth_user_id` in conjunction with resource IDs.
- **Timing Attack Mitigation**: Login verification runs a constant-time dummy password check when an email is not found to prevent user enumeration.
- **Multi-Tier Rate Limiting**: Per-IP in-memory sliding window rate limits protect auth endpoints (20 req/min) and AI analysis (15 req/min) with automatic memory cleanup.
- **Privacy Shield & Prompt Injection Defense**: Personal identifiers (names, emails, IDs) are stripped before sending financial context to AI; input is capped at 500 characters and shielded against prompt override attempts.
- **Enterprise Security Headers**: Strict Content-Security-Policy (CSP), X-Frame-Options (DENY), nosniff, Referrer-Policy, and HSTS.

## 3. Milestones
- [x] Phase 1: Project Scaffolding & DB Schema Hardening (Accounts, Budgets, Goals, Recurring, Indexes)
- [x] Phase 2: Secure Authentication System (JWT, HttpOnly cookie, Register/Login/Logout, getAuthUser)
- [x] Phase 3: Transaction Management (Full CRUD, IDOR Prevention, Server Validation)
- [x] Phase 4: Field-Level AES-256-GCM Encryption & Decryption Handling
- [x] Phase 5: Rate Limiting & Anti-Brute Force Protection
- [x] Phase 6: AI Finance Assistant Privacy Shield & Prompt Hardening
- [x] Phase 7: Interactive Dashboard & UI Enhancements (Modals, Budgets, Goals, Savings Rate)
- [x] Phase 8: Search, Filtering & Pagination
- [x] Phase 9: CSV Export & Monthly Reporting
- [x] Phase 10: Security Headers & Production Build Verification
- [x] Phase 11: Budgets & Savings Goals Persistence (Full REST CRUD, PostgreSQL table constraints, spending aggregation from expense transactions, progress calculation, duplicate prevention)
- [x] Phase 12: Unified Category Ownership & Authorization Architecture (User-isolated + global default categories, IDOR protection, in-dialog validation, and persistent multi-worker local SQL engine)

