# Deployment Documentation — Build Secure 24

## Overview

FinTrack is a secure personal finance application built with Next.js 15 App Router, TypeScript, and PostgreSQL. It features AES-256-GCM field-level financial encryption, strict IDOR ownership protections, sliding window rate limiting, and an AI financial analyzer equipped with privacy shielding and prompt injection guards.

---

## Live Deployment Reference

- **Live Application URL:** http://localhost:3000 (Local / Production-ready)
- **Hosting Platform:** Vercel / Node.js / Docker / Render
- **Access Credentials (for evaluators / testing):**
  - Evaluators can register a new account on `/register` or sign in via `/login`.
  - Passwords require minimum 8 characters.

---

## Required Environment Variables

| Variable Name | Description | Required (Yes/No) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string with SSL support | Yes |
| `JWT_SECRET` | Secret key used to sign and verify HS256 auth tokens | Yes |
| `ENCRYPTION_KEY` | 32-byte Base64 or Hex key for AES-256-GCM field encryption | Yes |
| `NODE_ENV` | Environment mode (`development` or `production`) | Optional |
| `GEMINI_API_KEY` | Optional API key for external LLM financial reasoning | Optional |

---

## Build & Deployment Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Tests:**
   ```bash
   npm test
   ```

3. **Production Build:**
   ```bash
   npm run build
   ```

4. **Launch Application:**
   ```bash
   npm start
   ```
