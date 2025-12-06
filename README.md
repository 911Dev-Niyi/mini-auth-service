# Task 3: Mini Auth & API Key System

A secure backend service built with NestJS that handles User Authentication (JWT) and Service-to-Service Access (API Keys).

## 🚀 Setup
1.  Clone the repo.
2.  `npm install`
3.  Create a MySQL database named `stage7_auth_db`.
4. Create a `.env` file (copy `.env.example` structure).
5.  `npm run start:dev`

## 🧪 Features
1.  **User Auth:** Signup/Login returns JWT.
2.  **API Key Management:** Generate and Revoke keys (hashed in DB).
3.  **Service Access:** Protect routes using `X-API-KEY` header.

## 🧪 How to Test (Postman)

### 1. User Auth
* **Signup:** `POST /auth/signup` (Body: email, password)
* **Login:** `POST /auth/login` (Body: email, password) -> Returns `access_token`

### 2. API Key Management
* **Generate Key:** `POST /keys/create` (Auth: Bearer Token) -> Returns `apiKey`
* **List Keys:** `GET /keys/create` (Auth: Bearer Token)
* **Revoke Key:** `DELETE /keys/create/:id` (Auth: Bearer Token)

### 3. Service Access
* **Protected Route:** `GET /service/data`
* **Headers:** `X-API-KEY: <your_api_key>`

## 🛠️ Technologies
* **NestJS:** Framework.
* **Passport-HeaderAPIKey:** For API Key extraction strategy.
* **Bcrypt:** For secure hashing.
* **Class-Validator:** For DTO validation.