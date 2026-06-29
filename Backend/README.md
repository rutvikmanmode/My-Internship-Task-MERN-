it # Node.js + Express Backend

Backend API for the full-stack React app in `RJ_Rutvik_Manmode`. It provides contact inquiry management, authentication with JWT, OTP flows (registration + password reset), profile management, and profile photo upload via Cloudinary.

## Features

- **Authentication:** Register/login with bcrypt password hashing and JWT tokens.
- **OTP Workflows:** Email-based OTP for registration and forgot-password reset.
- **HMAC Request Signing:** App-level request validation for auth, profile, and photo routes.
- **Contact Management:** CRUD for inquiries plus email replies using SMTP.
- **Profile Management:** Extended profile fields (role, about, skills, location, avatar).
- **Profile Photo Upload:** Cloudinary upload from base64/URL image data.

## Project Structure

- `server.js` � Express server entry point and MongoDB connection
- `models/`
- `models/Contact.js` � Inquiry schema (status, inquire number, timestamps)
- `models/Otp.js` � OTP schema with TTL index
- `models/User.js` � User schema with profile fields and avatar
- `routes/`
- `routes/authRoutes.js` � Auth, OTP registration, forgot-password flows
- `routes/contactRoutes.js` � Contact CRUD + reply/resolve email
- `routes/profile.js` � Profile get/update (extended fields)
- `routes/photoRoutes.js` � Profile photo upload to Cloudinary
- `routes/otpHelper.js` � OTP generation and email helper
- `middleware/`
- `middleware/hmacMiddleware.js` � HMAC request verification
- `middleware/jwtMiddleware.js` � JWT auth for protected routes

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- MongoDB connection string (`MONGODB_URI`)
- SMTP credentials for OTP + contact emails
- Cloudinary credentials for profile photo uploads

## Setup

1. Open the backend folder:

```powershell
cd d:\Rutvik\BE_Rutvik_Manmode
```

2. Install dependencies:

```powershell
npm install
```

3. Create or update `.env`:

```text
MONGODB_URI=<mongodb_connection_string>
PORT=5000

# SMTP for OTP + contact replies
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<smtp_user>
SMTP_PASS=<smtp_password>
SMTP_FROM="Contact support <support@example.com>"
SMTP_REPLY_TO=<optional_reply_to>
CONTACT_SIGNATURE="Best regards,"

# Auth + HMAC
JWT_SECRET=<jwt_secret>
APP_KEY=<app_key_for_clients>
APP_HMAC_SECRET=<hmac_secret>

# Cloudinary (profile photo)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

4. Start the server:

```powershell
npm run dev
```

Expected logs:

```text
Server running on port 5000
MongoDB connected
```

## HMAC Request Signing

All routes under `routes/authRoutes.js`, `routes/profile.js`, and `routes/photoRoutes.js` require HMAC headers:

- `x-app-key`: must match `APP_KEY`
- `x-timestamp`: Unix time in seconds (must be within �60s)
- `x-signature`: HMAC SHA-256 of:

```
{timestamp}:{METHOD}:{path}:{bodyHash}
```

Where `bodyHash` is `sha256(JSON.stringify(body || {}))`, and `path` is the full request path (for example `/api/auth/login`).

## API Endpoints

Base URL: `http://localhost:5000`

**Health**
- `GET /` � server status

**Auth (`/api/auth`)** (HMAC required)
- `POST /register` � register (email, password, name)
- `POST /login` � login, returns JWT
- `GET /profile` � basic profile (JWT required)
- `PUT /profile` � update name/phone (JWT required)

**Registration OTP (`/api/auth`)** (HMAC required)
- `POST /register/send-otp` � send OTP and store pending registration
- `POST /register/verify-otp` � verify OTP and create account

**Forgot Password (`/api/auth`)** (HMAC required)
- `POST /forgot-password/send-otp` � send reset OTP
- `POST /forgot-password/verify-otp` � verify OTP and return reset token
- `POST /forgot-password/reset` � reset password with token

**Profile (`/api/profile`)** (HMAC + JWT required)
- `GET /` � full profile fields
- `PUT /` � update role, about, skills, location, avatar, etc.

**Photos (`/api/photos`)** (HMAC + JWT required)
- `PUT /profile` � upload profile photo (`imageData`)

**Contact (`/api/contact`)**
- `GET /` � list inquiries (optional `page`, `limit`)
- `GET /:id` � get inquiry by id
- `POST /` � create inquiry
- `PUT /:id` � update inquiry
- `PATCH /:id/resolve` � mark resolved and email reply
- `POST /:id/email` � send custom reply email
- `DELETE /:id` � delete inquiry

## Frontend Integration

Point the frontend API base URL to `http://localhost:5000`. Protected routes require both HMAC headers and a `Bearer` JWT token.
