# ⚡ Financial Service Backend: Secure Wallet & Paystack Integration

This repository contains a secure, feature-complete backend service built with **NestJS** and **TypeScript**. It implements a core wallet system, manages API key-based access, and integrates atomically with Paystack for deposits.

## 🎯 Objectives & Verified Features

The goal of this project was to build a robust financial service backend with strict security and data integrity. All core project requirements have been met and verified through end-to-end testing.

| Feature | Status | Verification |
| :--- | :---: | :--- |
| **JWT Auth (Google SSO)** | ✅ | Verified login, token generation, and user creation. |
| **API Key System** | ✅ | Verified key creation, permission enforcement, and access via `X-API-KEY`. |
| **Atomic Deposits (Paystack)** | ✅ | Verified payment initialization and secure, idempotent crediting via webhook. |
| **Atomic Transfers** | ✅ | Verified simultaneous debit/credit between wallets within a single database transaction lock. |
| **Data Integrity** | ✅ | Wallet creation hook and TypeORM transactions ensure data consistency. |

## 🚀 Getting Started

### Prerequisites

* Node.js (LTS version)
* PostgreSQL Database instance
* Paystack account (Test Mode)
* Google OAuth Client ID

### 1. Environmental Variables (`.env`)

Create a `.env` file in the root directory. **(Replace all placeholder values).**

```env
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=auth_wallet_db

# Security & JWT
JWT_SECRET=YOUR_RANDOM_SECURE_JWT_SECRET
JWT_EXPIRATION=1d # e.g., 1h, 1d

# Google OAuth (Client)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Application URL (Use Ngrok for local testing, or Render URL for deployment)
APP_URL=[https://your-domain.ngrok-free.app](https://your-domain.ngrok-free.app) 

# Google OAuth (Callback) - MUST be registered in Google Cloud Console
GOOGLE_CALLBACK_URL=${APP_URL}/auth/google/callback 

# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_xxxxx # Your actual Paystack Secret Key
PAYSTACK_WEBHOOK_SECRET=YOUR_CUSTOM_WEBHOOK_SECRET # Used to verify Paystack webhooks
PAYSTACK_CALLBACK_URL=${APP_URL}/wallet/deposit/callback
```
## 2. Installation and Startup

```bash
# Install dependencies
npm install

# Run the application in development mode
# This uses ts-node and watches for changes
npm run start:dev

```
## 🧪 Testing and Endpoints (Postman Flows)

The entire application relies on a custom `CombinedAuthGuard` that accepts either a **JWT Bearer Token** or an **`X-API-KEY`** header.

### A. Authentication Flow (JWT)

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| **GET** | `/auth/google` | **Run in browser.** Redirects to Google, creates user/wallet, and returns the JWT. |
| **POST** | `/auth/login` | Traditional login for non-SSO users. |

### B. API Key Management

**Security:** Requires a valid JWT in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Body Example | Rules Enforced |
| :---: | :---: | :---: | :--- |
| **POST** | `/keys/create` | `{ "name": "wallet-app", "permissions": ["read", "deposit"], "expiry": "1M" }` | Max 5 keys, Valid permissions, Duration conversion. |
| **POST** | `/keys/rollover` | `{ "expired_key_id": "UUID-of-key", "expiry": "1M" }` | Key must be expired, preserves permissions. |

### C. Wallet Operations

#### 1. Deposit Initiation (Paystack)

Initiates a transaction and creates a PENDING record in the database. 

| Method | Endpoint | Auth | Body | Response |
| :---: | :---: | :---: | :---: | :--- |
| **POST** | `/wallet/deposit` | JWT or API Key (`deposit`) | `{"amount": 500}` | `{"reference": "DEP-...", "authorization_url": "https://..."}` |

#### 2. Paystack Webhook (Critical Flow)

This webhook is the **only component allowed to credit the wallet** to ensure idempotency and atomic updates. 

* **Endpoint:** `POST /wallet/paystack/webhook`
* **Action:** Server verifies the signature (`PAYSTACK_WEBHOOK_SECRET`), finds the pending transaction, and atomically updates the wallet balance.

#### 3. Wallet Transfer (Atomic Verification)

The service utilizes a TypeORM QueryRunner with a `pessimistic_write` lock for database safety.

| Method | Endpoint | Auth | Body |
| :---: | :---: | :---: | :--- |
| **POST** | `/wallet/transfer` | JWT or API Key (`transfer`) | `{"recipientWalletNumber": "WL-UUID...", "amount": 100}` |

#### 4. Balance and History

| Method | Endpoint | Auth | Response Example |
| :---: | :---: | :---: | :---: |
| **GET** | `/wallet/balance` | JWT or API Key (`read`) | `{"walletNumber": "WL-UUID...", "balance": 400}` |
| **GET** | `/wallet/transactions` | JWT or API Key (`read`) | `[...]` |