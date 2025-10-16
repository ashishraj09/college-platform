# 🍪 Cross-Domain Cookie Solution for Vercel Deployment

## ⚠️ The Problem

**Cookies DO NOT work across different domains/subdomains on Vercel!**

Your setup:
- Frontend: `collage-platform.vercel.app`
- Backend: `collage-platform-backend.vercel.app`

When the backend sets a cookie, the browser **WILL NOT send it** to requests from the frontend because they're on different subdomains.

## 🚫 What DOESN'T Work

### ❌ Setting Cookie Domain
```javascript
// This DOES NOT work for Vercel subdomains
res.cookie('token', token, {
  domain: '.vercel.app' // ❌ Vercel doesn't allow this
});
```

### ❌ SameSite=None Alone
```javascript
// This alone is NOT enough
res.cookie('token', token, {
  sameSite: 'none',
  secure: true
  // Still won't work across different Vercel subdomains
});
```

## ✅ Solutions (Choose ONE)

### **Solution 1: Use a Custom Domain (RECOMMENDED)** ⭐

Deploy both frontend and backend under the same custom domain:

```
Frontend:  app.yourdomain.com
Backend:   api.yourdomain.com
```

#### Benefits:
- ✅ Cookies work perfectly
- ✅ More professional
- ✅ Better security
- ✅ SEO friendly

#### Setup Steps:

1. **Buy a custom domain** (e.g., from Namecheap, Google Domains)

2. **In Vercel Dashboard:**
   
   **Frontend Project:**
   - Go to Settings → Domains
   - Add custom domain: `app.yourdomain.com`
   - Add DNS records as instructed by Vercel
   
   **Backend Project:**
   - Go to Settings → Domains
   - Add custom domain: `api.yourdomain.com`
   - Add DNS records as instructed by Vercel

3. **Update Environment Variables:**
   
   **Backend (.env.production or Vercel Dashboard):**
   ```bash
   FRONTEND_URL=https://app.yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   COOKIE_DOMAIN=.yourdomain.com  # Note the leading dot
   ```
   
   **Frontend (.env.production or Vercel Dashboard):**
   ```bash
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
   ```

4. **Update Backend Cookie Configuration:**
   ```javascript
   const cookieOptions = {
     httpOnly: true,
     secure: true,
     sameSite: 'lax', // Can use 'lax' with same base domain
     maxAge: 60 * 60 * 1000,
     domain: '.yourdomain.com' // Cookies shared across subdomains
   };
   ```

5. **Redeploy both projects**

---

### **Solution 2: Deploy Backend as API Route in Frontend (Alternative)**

Instead of separate deployments, move your backend to Next.js API routes.

#### Structure:
```
frontend/
  pages/
    api/          ← Backend API routes here
      auth/
        login.ts
        register.ts
      courses/
        index.ts
      ...
  src/
    components/   ← React components
```

#### Benefits:
- ✅ Same domain - cookies work automatically
- ✅ Simpler deployment (single project)
- ✅ No CORS issues
- ✅ Better integration

#### Drawbacks:
- ❌ Requires refactoring backend to Next.js API format
- ❌ Serverless function size limits
- ❌ Less separation of concerns

---

### **Solution 3: Use Authorization Header (Current Workaround)**

If you can't use a custom domain, use JWT in Authorization header instead of cookies.

#### Already implemented in your code:
- Frontend sends token in `Authorization: Bearer <token>` header
- Backend verifies token from header

#### To make this work:

1. **Backend returns token in response:**
   ```javascript
   res.json({
     message: 'Login successful',
     token: accessToken, // Add this
     user: userResponse
   });
   ```

2. **Frontend stores token:**
   ```typescript
   const response = await authAPI.login(data);
   localStorage.setItem('accessToken', response.token);
   ```

3. **Frontend sends token in requests:**
   ```typescript
   // Already implemented in api.ts interceptor
   config.headers['Authorization'] = `Bearer ${accessToken}`;
   ```

#### Drawbacks:
- ❌ Less secure (XSS vulnerable)
- ❌ No HttpOnly protection
- ❌ Manual token management

---

## 🎯 Recommended Approach

**For Production: Use Solution 1 (Custom Domain)**

**Cost:** ~$10-15/year for domain
**Setup Time:** ~30 minutes
**Security:** Best
**User Experience:** Professional

---

## 📝 Current Status

- **Local Development:** ✅ Works (same domain: localhost)
- **Vercel Production:** ❌ Cookies don't work (different subdomains)
- **Current Workaround:** None implemented yet

---

## 🚀 Quick Fix for Testing (Temporary)

While you decide on the proper solution, you can test with Authorization header:

1. Uncomment token return in backend:
   ```javascript
   res.json({
     message: 'Login successful',
     user: userResponse,
     token: accessToken // Add this line
   });
   ```

2. Store token in frontend login:
   ```typescript
   if (response.token) {
     localStorage.setItem('accessToken', response.token);
   }
   ```

This will let you test the app while you set up the custom domain.

---

## 📚 References

- [MDN: Using HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/custom-domains)
- [SameSite Cookie Explained](https://web.dev/samesite-cookies-explained/)
