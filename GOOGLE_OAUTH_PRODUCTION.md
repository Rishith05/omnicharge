# Google OAuth 2.0 - Production Deployment

## Production Checklist

### 1. Update OAuth Consent Screen
- Change from "Testing" to "In Production"
- Submit for Google verification if needed
- Add privacy policy URL
- Add terms of service URL

### 2. Add Production URLs

**Authorized JavaScript origins:**
```
https://yourdomain.com
https://www.yourdomain.com
```

**Authorized redirect URIs:**
```
https://yourdomain.com/auth/callback
https://www.yourdomain.com/auth/callback
```

### 3. Environment Variables

**Backend (User Service):**
```bash
export GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
```

**Frontend:**
```typescript
environment.production.ts:
export const environment = {
  production: true,
  googleClientId: 'your-production-client-id.apps.googleusercontent.com',
  apiUrl: 'https://api.yourdomain.com'
};
```

### 4. Security Best Practices

1. **Never commit Client ID/Secret to Git**
2. **Use environment variables**
3. **Enable HTTPS only in production**
4. **Implement rate limiting**
5. **Monitor failed login attempts**
6. **Log all authentication events**

---

## Quick Reference

### Backend Endpoint
```
POST https://api.yourdomain.com/api/auth/google
Content-Type: application/json

{
  "idToken": "google-id-token-from-frontend"
}
```

### Response
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "uuid",
    "tokenType": "Bearer",
    "expiresIn": 1800,
    "role": "ROLE_USER",
    "fullName": "User Name",
    "email": "user@gmail.com",
    "authProvider": "GOOGLE",
    "isProfileComplete": false
  }
}
```

---

## Testing Checklist

- [ ] User can sign in with Google
- [ ] New user account is created automatically
- [ ] Existing user can sign in
- [ ] JWT tokens are generated correctly
- [ ] User profile is retrieved
- [ ] Email conflict is handled
- [ ] Token expiration works
- [ ] Logout works
- [ ] Refresh token works

---

**Setup Complete!** Users can now login with Google OAuth 2.0.
