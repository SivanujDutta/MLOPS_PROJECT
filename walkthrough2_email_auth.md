# Email Verification & Password Reset Implementation Complete!

I have built the complete email verification and password reset flow using database tokens and Nodemailer!

## What was built:

1. **Email Utility (`lib/email.ts`)**: 
   - Configured Nodemailer to connect to any standard SMTP server using environment variables.
   - Built helper functions `sendVerificationEmail` and `sendPasswordResetEmail` which format the emails as HTML containing the magic links.

2. **Verify Email API**:
   - `POST /api/auth/verify-email/send`: Generates a random 32-byte hex token, saves it to the database with a 24-hour expiration (`verifyEmailToken`), and fires off the email.
   - `POST /api/auth/verify-email/confirm`: When the user clicks the link, this route takes the token from the URL, validates it against the database, checks if it's expired, and finally sets `isEmailVerified = true` in Postgres.

3. **Forgot Password API**:
   - `POST /api/auth/forgot-password`: Generates a token, saves it with a 1-hour expiration (`forgotPasswordToken`), and sends the password reset email.
   - `POST /api/auth/reset-password`: Accepts the token and the `newPassword`. It verifies the token's validity, hashes the new password with `bcryptjs`, and saves the new hash to the database, instantly nullifying the token so it cannot be used again!

> [!IMPORTANT]
> To test this locally, you must provide real SMTP credentials in your `.env` file!

```env
# SMTP Email Configuration (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your.email@gmail.com"
SMTP_PASS="your-app-password-here"
SMTP_FROM="noreply@mlops-factory.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
*(If you are using Gmail, you cannot use your regular password. You must go to your Google Account -> Security -> 2-Step Verification -> App Passwords to generate an App Password!)*
