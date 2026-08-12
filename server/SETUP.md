# MiqorAI API Server Setup

This backend is the shared production API for every MiqorAI portal.

It now expects:

- one PostgreSQL database
- one Redis instance
- one real SMTP provider for patient verification emails, password resets, and staff invitations
- one public base URL for the API itself
- one public URL for each deployed portal

## 1. Copy environment variables

```powershell
cd server
copy .env.example .env
```

Edit `.env` and replace every placeholder before starting the API.

## 2. Required production environment variables

At minimum, configure:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `FILE_SIGNING_SECRET`
- `QR_SECRET`
- `CORS_ORIGINS`
- `BASE_URL`
- `PATIENT_PORTAL_URL`
- `HOSPITAL_PORTAL_URL`
- `INSURANCE_PORTAL_URL`
- `PHARMACY_PORTAL_URL`
- `ADMIN_PORTAL_URL`

## 3. Patient email verification and password reset

Patient self-signup now uses email OTP verification.

Patient forgot-password now uses:

- an emailed 6-digit reset code
- a secure reset token
- a password reset email with a direct link back to the patient portal

Because of that, SMTP is no longer optional for production.

Configure:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

For Gmail app-password based SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

## 4. SMS delivery

The backend can still send OTP-style SMS messages, but in production it now expects a real SMS provider.

If you want SMS flows live in production, configure:

- `SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `SMS_FROM_NUMBER`

If you do not configure SMS and a production path tries to send SMS, that request now fails instead of silently logging.

## 5. Database and Prisma

Run the schema deployment against your target database:

```powershell
cd server
npx prisma generate
npx prisma db push
```

If you want the existing demo and integration data:

```powershell
npm run db:seed
```

## 6. Local development

Install dependencies:

```powershell
npm install
```

Start the API:

```powershell
npm run dev
```

Default local API URL:

```text
http://localhost:3000
```

## 7. Production validation

Before launch, verify all of these:

- backend starts without missing env errors
- SMTP verification succeeds
- patient signup sends email OTPs
- patient password reset sends reset emails and codes
- invitations reach hospital, pharmacy, insurer, and admin users
- Redis is reachable
- Prisma can connect to the production database
- every frontend uses the deployed backend URL rather than localhost

## 8. Security notes

- Never commit `.env`
- Never commit SMTP passwords, Twilio secrets, JWT secrets, or database passwords
- Use strong secrets for JWT, encryption, signing, and QR generation
- Keep `AUTH_CHALLENGE_MAX_ATTEMPTS` low
- Keep `AUTH_CHALLENGE_RESEND_COOLDOWN_SECONDS` enabled
- Keep `PASSWORD_RESET_EXPIRES_MINUTES` reasonably short
