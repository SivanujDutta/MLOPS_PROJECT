# Custom Authentication System Implementation

This plan outlines the steps to build a 100% custom authentication system in your Next.js App Router project using your existing Prisma PostgreSQL database, `bcryptjs` for secure password hashing, and HTTP-only cookies for session management.

## Proposed Changes

We will implement a stateless session architecture. When a user logs in, we generate a JSON Web Token (JWT) containing their `userId`, sign it, and place it inside a secure HTTP-Only cookie. This cookie is automatically sent by the browser on every request but cannot be accessed by client-side JavaScript, protecting against XSS attacks.

### 1. Dependencies
- Install `bcryptjs` (and `@types/bcryptjs`) for password hashing. We use `bcryptjs` instead of `bcrypt` as it is pure JavaScript and avoids native node-gyp build errors on Windows.
- Install `jose` for generating and verifying JWTs. We use `jose` instead of `jsonwebtoken` because `jose` fully supports the Next.js Edge Runtime, allowing us to verify tokens inside Next.js Middleware.

### 2. Utilities
#### [NEW] `lib/auth.ts`
Create helper functions to abstract the complexity:
- `hashPassword(password: string): Promise<string>`
- `verifyPassword(password: string, hash: string): Promise<boolean>`
- `signToken(payload: object): Promise<string>` (using `jose`)
- `verifyToken(token: string): Promise<any>` (using `jose`)

### 3. API Routes
#### [NEW] `app/api/auth/signup/route.ts`
- Accepts `email`, `password`, `fullName` (or similar fields).
- Checks if the user already exists in the database.
- Hashes the password using `bcryptjs`.
- Creates the `User` in the database.
- Generates a JWT and sets an HTTP-Only cookie.

#### [NEW] `app/api/auth/login/route.ts`
- Accepts `email` and `password`.
- Fetches the user by email.
- Compares the provided password against `passwordHash` using `bcryptjs`.
- Generates a JWT and sets an HTTP-Only cookie.

#### [NEW] `app/api/auth/logout/route.ts`
- Clears the HTTP-Only auth cookie, effectively ending the session.

#### [NEW] `app/api/auth/me/route.ts`
- Reads the HTTP-Only cookie.
- Verifies the JWT.
- Returns the authenticated user's database profile (excluding the password hash).

### 4. Route Protection
#### [NEW] `middleware.ts` (in the root directory)
- Next.js Middleware that runs before a request completes.
- It will read the auth cookie.
- If the user tries to access a protected route (e.g., `/dashboard`, `/api/datasets`) without a valid token, it will intercept the request and redirect them to `/login` (or return `401 Unauthorized` for API calls).

## Verification Plan
1. Send a POST request to `/api/auth/signup` to create a new user. Verify the user appears in your Neon database with a hashed password, not plain text.
2. Verify the response contains a `Set-Cookie` header with the `auth_token`.
3. Send a POST request to `/api/auth/login` with correct credentials to ensure a new cookie is issued.
4. Send a POST request to `/api/auth/login` with incorrect credentials to verify it is rejected with a 401 error.
5. Hit `/api/auth/me` to ensure the session is correctly decoded.

> [!NOTE]
> Since we are using Custom Auth, we must ensure we set a `JWT_SECRET` in our `.env` file to cryptographically sign our session cookies. I will remind you to do this during execution.
