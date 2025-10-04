# Authentication Implementation

## Overview

This document describes the JWT-based authentication system implemented in the AREA backend.

## Changes Summary

### 1. JWT Authentication Guard

**File:** `src/common/guards/jwt-auth.guard.ts`

A global JWT authentication guard that:
- Validates JWT tokens from the `Authorization: Bearer <token>` header
- Supports `@Public()` decorator to bypass authentication on specific routes
- Includes development mode bypass via `DISABLE_AUTH_IN_DEV` environment variable
- Attaches user payload to the request object for use in controllers

### 2. Decorators

#### @Public()
**File:** `src/common/decorators/public.decorator.ts`

Marks routes as public, bypassing JWT authentication.

Usage:
```typescript
@Public()
@Get('public-endpoint')
publicRoute() { ... }
```

#### @GetUser()
**File:** `src/common/decorators/get-user.decorator.ts`

Extracts authenticated user from JWT payload.

Usage:
```typescript
@Get('profile')
getProfile(@GetUser() user: JwtPayload) {
  return { userId: user.sub, email: user.email };
}

// Or extract specific field:
@Get('profile')
getProfile(@GetUser('sub') userId: string) {
  return { userId };
}
```

### 3. Protected Routes

#### Authentication Routes (Public)
All routes under `/auth/*` are public:
- `POST /auth/register` - User registration
- `POST /auth/login` - Email/password login (returns JWT)
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification` - Resend verification code
- `POST /auth/:provider/id-token` - OAuth ID token login
- `GET /auth/:provider/login` - Start OAuth login flow
- `GET /auth/:provider/login/callback` - OAuth login callback
- `GET /auth/:provider/callback` - OAuth linking callback

#### AREA Management Routes (Protected)
All routes under `/manager/*` require authentication:
- `GET /manager/actions` - List available actions
- `GET /manager/reactions` - List available reactions
- `POST /manager/areas` - Create area (uses authenticated user)
- `GET /manager/areas` - Get user's areas (uses authenticated user)
- `DELETE /manager/areas/:areaId` - Delete area (ownership verified)

#### User Management Routes (Protected)
Most routes under `/users/*` require authentication:
- `GET /users/me` - Get authenticated user profile
- `GET /users/:id` - Get user (only own profile)
- `POST /users` - Create user (public, deprecated - use `/auth/register`)
- `PUT /users/:id` - Update user (only own profile)
- `DELETE /users/:id` - Delete user (only own profile)

#### OAuth Linking Routes (Protected/Mixed)
- `GET /auth/:provider/url` - Get OAuth URL (authenticated)
- `GET /auth/:provider` - Start OAuth linking (authenticated)
- `DELETE /auth/:provider/link` - Unlink provider (authenticated)

### 4. Login Response

The login endpoint now returns a JWT token:

**Before:**
```json
{
  "message": "Login successful",
  "userId": "user-id"
}
```

**After:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user-id",
  "email": "user@example.com"
}
```

### 5. Swagger Integration

Swagger UI now includes JWT Bearer authentication:
- Click the "Authorize" button in Swagger UI
- Enter your JWT token (without "Bearer" prefix)
- All authenticated requests will include the token

### 6. Development Mode Bypass

For development convenience, authentication can be bypassed:

**Environment Variable:**
```env
DISABLE_AUTH_IN_DEV="true"  # Bypass auth in development
NODE_ENV="development"       # Must be set to development
```

**Warning:** ⚠️ This should NEVER be enabled in production!

When enabled:
- All routes become accessible without authentication
- A mock user is injected: `{ sub: '00000000-0000-0000-0000-000000000000', email: 'dev@localhost', provider: 'dev' }`
- A warning is displayed on startup

### 7. Ownership Verification

**AREA Routes:**
- Users can only view/modify/delete their own AREAs
- Ownership is automatically verified using the JWT payload

**User Routes:**
- Users can only access/modify their own profile
- Attempts to access other users' profiles return `403 Forbidden`

## Security Features

1. **JWT Validation**: All tokens are verified using the `JWT_SECRET`
2. **Token Expiration**: Tokens expire after 1 hour (configurable in `auth.module.ts`)
3. **State Validation**: OAuth flows include state parameter for CSRF protection
4. **Ownership Checks**: Users can only access/modify their own resources
5. **Password Hashing**: Passwords are hashed using bcrypt (10 rounds)

## Testing

All tests have been updated to work with the new authentication system:
- Mock JWT tokens are used in tests
- Protected routes are tested with proper authentication
- `111 tests passing`

## Migration Guide for Frontend

### 1. Login Flow

```typescript
// Old login flow
const response = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { userId } = await response.json();

// New login flow
const response = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { accessToken, userId, email } = await response.json();

// Store token
localStorage.setItem('jwt', accessToken);
```

### 2. Authenticated Requests

```typescript
// Include JWT in all authenticated requests
const token = localStorage.getItem('jwt');

const response = await fetch('/manager/areas', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. OAuth Login

OAuth login endpoints also return JWT tokens:
- `POST /auth/:provider/id-token` (Google One Tap)
- `GET /auth/:provider/login/callback` (OAuth code flow)

### 4. Area Management

AREA endpoints no longer require `userId` in the URL:

```typescript
// Old
POST /manager/areas/:userId
GET /manager/areas/:userId

// New (userId from JWT)
POST /manager/areas
GET /manager/areas
```

## Files Modified

### New Files
- `src/common/guards/jwt-auth.guard.ts`
- `src/common/decorators/public.decorator.ts`
- `src/common/decorators/get-user.decorator.ts`

### Modified Files
- `src/main.ts` - Added global guard and Swagger JWT config
- `src/modules/auth/auth.service.ts` - Modified `validateUser` to return JWT
- `src/modules/auth/auth.email.controller.ts` - Added `@Public()` decorators
- `src/modules/auth/controllers/auth.identity.controller.ts` - Added `@Public()` decorators
- `src/modules/auth/controllers/auth.linking.controller.ts` - Added authentication and `@GetUser()`
- `src/modules/manager/manager.controller.ts` - Added authentication and ownership checks
- `src/modules/users/users.controller.ts` - Added authentication and ownership checks
- `.env` - Added `DISABLE_AUTH_IN_DEV` variable
- `test/auth/auth.controller.spec.ts` - Updated tests
- `test/auth/auth.service.spec.ts` - Updated tests

## Environment Variables

```env
# JWT Configuration
JWT_SECRET="your-secret-key-here"

# Development Auth Bypass (NEVER use in production!)
DISABLE_AUTH_IN_DEV="false"
NODE_ENV="development"
```

## Future Improvements

1. **Refresh Tokens**: Implement refresh token mechanism for longer sessions
2. **Rate Limiting**: Add rate limiting to prevent brute force attacks
3. **2FA**: Add two-factor authentication support
4. **Role-Based Access**: Add roles (admin, user) for more granular permissions
5. **Token Revocation**: Implement token blacklist for logout functionality
