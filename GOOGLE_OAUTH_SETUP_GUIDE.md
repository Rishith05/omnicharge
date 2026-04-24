# Google OAuth 2.0 Setup Guide for OmniCharge

## Overview

This guide will help you set up Google OAuth 2.0 authentication so users can login directly using their Google accounts.

## Architecture

```
User → Frontend (Angular) → API Gateway → User Service
                ↓
         Google OAuth 2.0
         (Get ID Token)
```

**Flow:**
1. User clicks "Sign in with Google" on frontend
2. Frontend redirects to Google OAuth consent screen
3. User authorizes the app
4. Google returns ID Token to frontend
5. Frontend sends ID Token to backend: `POST /api/auth/google`
6. Backend verifies ID Token with Google
7. Backend creates/finds user and returns JWT access token

---

## Part 1: Create Google OAuth 2.0 Credentials

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create a New Project (or Select Existing)

1. Click on the project dropdown at the top
2. Click "New Project"
3. Enter project details:
   - **Project Name**: `OmniCharge` (or your app name)
   - **Organization**: Leave as default
4. Click "Create"
5. Wait for project creation (takes a few seconds)
6. Select the newly created project

### Step 3: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click on **Google+ API**
4. Click **Enable**

### Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for testing with any Google account)
3. Click **Create**

**Fill in the required fields:**


**App Information:**
- **App name**: `OmniCharge` (your app name)
- **User support email**: Your email address
- **App logo**: (Optional) Upload your app logo

**Developer contact information:**
- **Email addresses**: Your email address

4. Click **Save and Continue**

**Scopes:**
5. Click **Add or Remove Scopes**
6. Select these scopes:
   - `email` - See your primary Google Account email address
   - `profile` - See your personal info, including any personal info you've made publicly available
   - `openid` - Authenticate using OpenID Connect
7. Click **Update**
8. Click **Save and Continue**

**Test Users (Optional for Testing):**
9. Click **Add Users**
10. Add your test email addresses
11. Click **Save and Continue**

12. Review the summary and click **Back to Dashboard**

### Step 5: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**

**Configure the Web Application:**


**Name**: `OmniCharge Web Client`

**Authorized JavaScript origins** (for frontend):
```
http://localhost:4200
http://localhost:3000
https://yourdomain.com (for production)
```

**Authorized redirect URIs** (for frontend callback):
```
http://localhost:4200/auth/callback
http://localhost:4200
https://yourdomain.com/auth/callback (for production)
```

4. Click **Create**

### Step 6: Save Your Credentials

You'll see a popup with your credentials:

```
Client ID: 123456789-abcdefghijklmnop.apps.googleusercontent.com
Client Secret: GOCSPX-abcdefghijklmnopqrstuvwxyz
```

**IMPORTANT:** 
- Copy the **Client ID** - you'll need this for backend configuration
- Copy the **Client Secret** - you'll need this for frontend (optional)
- You can always view these later in the Credentials page

---

## Part 2: Configure Backend (User Service)

### Step 1: Update application.properties


**File**: `user-service/src/main/resources/application.properties`

```properties
# Google OAuth2 Configuration
google.client-id=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

**Example:**
```properties
google.client-id=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

### Step 2: Update Config Server (Recommended)

**File**: `config-server/src/main/resources/config/user-service.properties`

```properties
# Google OAuth Configuration
google.client-id=${GOOGLE_CLIENT_ID:your-google-client-id-placeholder}
```

**Update to:**
```properties
# Google OAuth Configuration
google.client-id=${GOOGLE_CLIENT_ID:123456789-abcdefghijklmnop.apps.googleusercontent.com}
```

### Step 3: Set Environment Variable (Production)

For production, use environment variable:

**Windows:**
```cmd
set GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

**Linux/Mac:**
```bash
export GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

### Step 4: Restart Services

1. Stop Config Server
2. Start Config Server
3. Stop User Service
4. Start User Service

Verify in logs:
```
GoogleOAuth2Config: Google Client ID configured
```

---

## Part 3: Frontend Integration (Angular Example)


### Step 1: Install Google Sign-In Library

```bash
npm install @abacritt/angularx-social-login
```

### Step 2: Configure in app.config.ts (or app.module.ts)

```typescript
import { GoogleLoginProvider, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com'
            )
          }
        ]
      } as SocialAuthServiceConfig,
    }
  ]
};
```

### Step 3: Create Auth Service

**File**: `src/app/services/auth.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(
    private http: HttpClient,
    private socialAuthService: SocialAuthService
  ) {}

  loginWithGoogle(): Observable<any> {
    return new Observable(observer => {
      this.socialAuthService.authState.subscribe((user) => {
        if (user) {
          // Send ID token to backend
          this.http.post(`${this.apiUrl}/google`, {
            idToken: user.idToken
          }).subscribe({
            next: (response) => observer.next(response),
            error: (error) => observer.error(error)
          });
        }
      });
    });
  }
}
```

### Step 4: Create Login Component

**File**: `src/app/components/login/login.component.ts`


```typescript
import { Component } from '@angular/core';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  
  constructor(
    private socialAuthService: SocialAuthService,
    private authService: AuthService
  ) {}

  signInWithGoogle(): void {
    this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID)
      .then(() => {
        this.authService.loginWithGoogle().subscribe({
          next: (response) => {
            // Save tokens
            localStorage.setItem('access_token', response.data.accessToken);
            localStorage.setItem('refresh_token', response.data.refreshToken);
            
            // Redirect to dashboard
            console.log('Login successful:', response);
          },
          error: (error) => {
            console.error('Login failed:', error);
          }
        });
      });
  }
}
```

**File**: `src/app/components/login/login.component.html`

```html
<div class="login-container">
  <h2>Login to OmniCharge</h2>
  
  <!-- Google Sign-In Button -->
  <button (click)="signInWithGoogle()" class="google-btn">
    <img src="assets/google-icon.svg" alt="Google">
    Sign in with Google
  </button>
  
  <!-- OR Divider -->
  <div class="divider">
    <span>OR</span>
  </div>
  
  <!-- Traditional Login Form -->
  <form>
    <!-- Your email/password form here -->
  </form>
</div>
```

---

## Part 4: Testing with Postman


### Method 1: Using OAuth 2.0 Playground (Easiest)

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

2. Click the **Settings** icon (gear) in top right

3. Check **"Use your own OAuth credentials"**

4. Enter your credentials:
   - **OAuth Client ID**: Your Client ID
   - **OAuth Client secret**: Your Client Secret

5. In the left panel, select:
   - **Google OAuth2 API v2**
   - Check: `https://www.googleapis.com/auth/userinfo.email`
   - Check: `https://www.googleapis.com/auth/userinfo.profile`

6. Click **"Authorize APIs"**

7. Sign in with your Google account and authorize

8. Click **"Exchange authorization code for tokens"**

9. You'll get an **id_token** - copy this!

### Method 2: Test in Postman

**Endpoint:** `POST http://localhost:8080/api/auth/google`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjU5MmU5Y..."
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzM4NCJ9...",
    "refreshToken": "uuid-refresh-token",
    "tokenType": "Bearer",
    "expiresIn": 1800,
    "role": "ROLE_USER",
    "fullName": "John Doe",
    "email": "john.doe@gmail.com",
    "authProvider": "GOOGLE",
    "isProfileComplete": false
  },
  "timestamp": "2026-03-19T20:00:00"
}
```

---

## Part 5: How It Works (Backend)


### Authentication Flow

1. **Frontend sends ID Token**:
   ```
   POST /api/auth/google
   { "idToken": "google-id-token" }
   ```

2. **Backend verifies token with Google**:
   ```java
   GoogleIdToken idToken = googleIdTokenVerifier.verify(request.getIdToken());
   ```

3. **Extract user info from token**:
   ```java
   String googleId = payload.getSubject();
   String email = payload.getEmail();
   String name = payload.get("name");
   ```

4. **Find or create user**:
   - Check if user exists by `googleId`
   - If not, check if email exists (prevent duplicate)
   - Create new user with `authProvider=GOOGLE`
   - No password stored for Google users

5. **Generate JWT tokens**:
   - Access token (30 minutes)
   - Refresh token (7 days)

6. **Return tokens to frontend**

### Database Schema

**User Table:**
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  password VARCHAR(255),        -- NULL for Google users
  google_id VARCHAR(255) UNIQUE, -- Set only for Google users
  mobile_number VARCHAR(15),
  auth_provider VARCHAR(20),    -- 'LOCAL' or 'GOOGLE'
  role VARCHAR(20),
  is_active BOOLEAN,
  created_date TIMESTAMP
);
```

**Example Google User:**
```sql
INSERT INTO users VALUES (
  3,
  'john.doe@gmail.com',
  'John Doe',
  NULL,                          -- No password
  '108234567890123456789',       -- Google ID
  NULL,                          -- Mobile can be added later
  'GOOGLE',
  'ROLE_USER',
  true,
  NOW()
);
```

---

## Part 6: Important Notes


### Security Considerations

1. **ID Token Verification**:
   - Backend ALWAYS verifies ID token with Google
   - Never trust frontend-provided user info without verification
   - Token signature is validated using Google's public keys

2. **Client ID Validation**:
   - Token audience (`aud`) must match your Client ID
   - Prevents token reuse from other apps

3. **Token Expiration**:
   - Google ID tokens expire quickly (usually 1 hour)
   - Backend generates its own JWT tokens for session management

4. **No Password Storage**:
   - Google users have `password=NULL`
   - They cannot use password reset flow
   - They must use Google Sign-In

### User Experience

**First-time Google User:**
1. User clicks "Sign in with Google"
2. Redirected to Google consent screen
3. Authorizes app (email, profile access)
4. Account created automatically
5. Logged in with JWT tokens
6. `isProfileComplete=false` (may need to add mobile number)

**Returning Google User:**
1. User clicks "Sign in with Google"
2. Recognized by Google (no consent needed)
3. Logged in immediately
4. Existing profile loaded

**Email Conflict:**
- If email already exists with `authProvider=LOCAL`, login fails
- Error: "Email already registered with different provider"
- User must use password login or link accounts (future feature)

### Profile Completion

Google users may need to complete their profile:

```json
{
  "isProfileComplete": false
}
```

**Missing fields:**
- Mobile number (required for recharges)

**Update profile:**
```
PUT /api/users/profile
{
  "fullName": "John Doe",
  "mobileNumber": "9876543210"
}
```

---

## Part 7: Troubleshooting


### Issue 1: "Invalid Google ID token"

**Cause:** Token verification failed

**Solutions:**
1. Check Client ID is correct in `application.properties`
2. Ensure token is fresh (not expired)
3. Verify token was generated for your Client ID
4. Check internet connectivity (backend needs to reach Google)

**Debug:**
```bash
# Check logs
tail -f user-service/logs/application.log | grep "Google"
```

### Issue 2: "Email already registered"

**Cause:** User already exists with `authProvider=LOCAL`

**Solutions:**
1. User should login with email/password instead
2. Implement account linking (future feature)
3. Use different email for Google login

### Issue 3: "redirect_uri_mismatch"

**Cause:** Frontend redirect URI not authorized

**Solutions:**
1. Go to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add your frontend URL to "Authorized redirect URIs"
4. Example: `http://localhost:4200/auth/callback`

### Issue 4: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen not configured

**Solutions:**
1. Complete OAuth consent screen configuration
2. Add test users if app is in "Testing" mode
3. Publish app for production use

### Issue 5: Backend can't verify token

**Cause:** Network issues or Google API unavailable

**Solutions:**
1. Check internet connectivity
2. Verify firewall allows outbound HTTPS
3. Check Google API status: https://status.cloud.google.com/

---

## Part 8: Production Deployment


### Step 1: Update OAuth Consent Screen

1. Go to Google Cloud Console → OAuth consent screen
2. Change from "Testing" to "In Production"
3. Submit for verification (if required)

### Step 2: Add Production URLs

**Authorized J