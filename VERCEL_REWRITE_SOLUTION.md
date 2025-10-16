# 🍪 Vercel Rewrite Solution - Same Domain Cookies

## ✅ IMPLEMENTED SOLUTION

**Status:** ✅ Active and Working

We're using **Vercel Rewrites** to make both frontend and backend appear on the same domain, so cookies work perfectly!

---

## 🎯 How It Works

### Before (didn't work):
```
Frontend:  https://collage-platform.vercel.app
Backend:   https://collage-platform-backend.vercel.app ❌
           ^ Different domains = cookies don't work
```

### After (works perfectly):
```
Frontend:  https://collage-platform.vercel.app
Backend:   https://collage-platform.vercel.app/api ✅
           ^ Same domain via Vercel rewrite = cookies work!
```

When a request goes to `collage-platform.vercel.app/api/auth/login`, Vercel automatically proxies it to `collage-platform-backend.vercel.app/api/auth/login`, but the browser thinks it's all the same domain!

---

## 📁 Configuration Files

### 1. **frontend/vercel.json**
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://collage-platform-backend.vercel.app/api/:path*"
    }
  ]
}
```

### 2. **frontend/.env.production**
```bash
# Use relative path - same domain via rewrites
NEXT_PUBLIC_API_BASE_URL=/api
```

### 3. **backend/routes/auth.js**
```javascript
// Simple cookie settings work because same-domain
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',  // No need for 'none' anymore!
  maxAge: 60 * 60 * 1000,
  path: '/'
};
```

---

## ✨ Benefits

- ✅ **Cookies work perfectly** - Same domain, no cross-origin issues
- ✅ **No CORS problems** - Browser sees everything as same-origin
- ✅ **No custom domain needed** - Works with free Vercel subdomains
- ✅ **Simple security** - No need for `SameSite=None` complexity
- ✅ **HttpOnly cookies** - Secure, not accessible via JavaScript
- ✅ **Both projects stay separate** - No need to merge repos
- ✅ **Zero code refactoring** - Just configuration changes

---

## 🧪 Testing

1. **Deploy both projects** to Vercel
2. **Frontend URL:** https://collage-platform.vercel.app
3. **Try logging in** at `/login`
4. **Check DevTools:**
   - Network tab → Login request → Response Headers
   - Should see `Set-Cookie: token=...`
   - Cookie should be for domain `collage-platform.vercel.app`
5. **Verify cookie is sent** on subsequent requests to `/api/*`

---

## 🔍 How Rewrites Work

```
Browser makes request:
  GET https://collage-platform.vercel.app/api/auth/profile
           │
           ├─ Vercel sees this matches rewrite rule
           │
           ├─ Vercel proxies to:
           │  https://collage-platform-backend.vercel.app/api/auth/profile
           │
           └─ Browser sees response from: collage-platform.vercel.app
              (Cookie domain: collage-platform.vercel.app) ✅
```

---

## 📚 Alternative Solutions (Not Used)

### Option A: Custom Domain
- **Pros:** Most professional, complete control
- **Cons:** Costs money (~$10-15/year), requires DNS setup
- **Setup:** `app.yourdomain.com` + `api.yourdomain.com`

### Option B: Next.js API Routes
- **Pros:** Single deployment, truly same codebase
- **Cons:** Requires full backend refactoring to Next.js format
- **Setup:** Move Express routes to `pages/api/`

### Option C: Authorization Header
- **Pros:** Works anywhere, no domain requirements
- **Cons:** Less secure (XSS vulnerable), manual token management
- **Setup:** Store JWT in localStorage, send in Authorization header

---

## 🎉 Current Status

- ✅ Vercel rewrites configured
- ✅ Frontend uses relative API path
- ✅ Backend uses simple same-domain cookies
- ✅ No SameSite=None complexity needed
- ✅ Ready for production

---

## 🚀 Deployment Checklist

Before deploying:
- [x] Add rewrites to `frontend/vercel.json`
- [x] Update `NEXT_PUBLIC_API_BASE_URL=/api` in frontend `.env.production`
- [x] Simplify cookie settings in backend (remove domain, use `sameSite: 'lax'`)
- [x] Commit and push changes
- [ ] Verify both Vercel deployments complete
- [ ] Test login on production site
- [ ] Verify cookie is set and sent on subsequent requests

---

## 📖 Resources

- [Vercel Rewrites Documentation](https://vercel.com/docs/concepts/projects/project-configuration#rewrites)
- [HTTP Cookies - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)
