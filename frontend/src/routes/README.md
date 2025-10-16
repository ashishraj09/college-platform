# DEPRECATED - React Router Routes

⚠️ **This folder contains React Router configuration which is NOT compatible with Next.js.**

## Migration Status
This project has been migrated from React (with React Router) to Next.js.

### What Changed:
- React Router → Next.js File-based Routing
- Routes defined in `src/routes/AppRoutes.tsx` → Pages in `src/pages/`
- `<Link>` from react-router-dom → `<Link>` from next/link
- `useNavigate()` → `useRouter()` from next/router
- `useLocation()` → `useRouter()` from next/router

### Current State:
- The `ClientRouter` component wraps the app to maintain compatibility temporarily
- This is a **temporary solution** and should be removed in future refactoring

### TODO for Complete Migration:
1. Remove React Router dependency from package.json
2. Convert all `useNavigate()` to `useRouter().push()`
3. Convert all `useLocation()` to `useRouter()`
4. Convert all `<Link to="">` to `<Link href="">`
5. Remove `ClientRouter` wrapper from `_app.tsx`
6. Delete this `routes/` folder
7. Update routing logic to use Next.js patterns

### References:
- [Next.js Routing Documentation](https://nextjs.org/docs/routing/introduction)
- [Migrating from React Router](https://nextjs.org/docs/migrating/from-react-router)
