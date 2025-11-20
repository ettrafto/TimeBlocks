# App.jsx Hooks Order Violation Analysis

## Problem

The `App` component violates React's Rules of Hooks by calling hooks conditionally based on auth state and route.

## Current Structure (BROKEN)

```javascript
function App() {
  // ✅ Always called (lines 2006-2045)
  React.useEffect(() => { /* policies */ }, []);
  const location = useLocation();
  const navigate = useNavigate();
  useHydrateAuth();
  const authStatus = useAuthStore(...);
  React.useEffect(() => { /* auth gate debug */ }, [...]);
  React.useEffect(() => { /* redirect if authenticated on auth route */ }, [...]);
  React.useEffect(() => { /* redirect if unauthenticated */ }, [...]);

  // ❌ Early returns - skip remaining hooks
  if (isAuthRoute) return <LoginPage />;
  if (loading) return <LoadingScreen />;
  if (unauthenticated) return <RedirectingScreen />;

  // ❌ These hooks are ONLY called if we didn't return early
  React.useEffect(() => { /* eventsStore.initialize */ }, [authStatus]); // Line 2091
  const { onPointerDown, proxyState } = useSidebarResizeController(320); // Line 2097
  const { selectedDate, ... } = useDateStore(); // Line 2099
  const displayedDays = useMemo(...); // Line 2103
  const schedStore = useScheduleStore(); // Line 2108
  const { byId, ... } = useEventsStore(); // Line 2120
  const [types, setTypes] = useState([]); // Line 2127
  // ... many more hooks (useState, useEffect, etc.)
}
```

## Why This Breaks

When auth status changes:
- **Before login**: Early returns skip hooks at lines 2091+
- **After login**: All hooks are called
- React detects different hook counts between renders → error

## Solution

1. **Move ALL hooks to the top** - Call every hook unconditionally at the start
2. **Extract authenticated content** - Create `<AuthenticatedApp>` component
3. **Use conditional rendering** - Return different components, but hooks are stable

## Target Structure

```javascript
function App() {
  // ✅ ALL hooks called unconditionally in fixed order
  React.useEffect(() => { /* policies */ }, []);
  const location = useLocation();
  const navigate = useNavigate();
  useHydrateAuth();
  const authStatus = useAuthStore(...);
  const { onPointerDown, proxyState } = useSidebarResizeController(320);
  const { selectedDate, ... } = useDateStore();
  // ... ALL other hooks here, always called

  // ✅ Derive values (not hooks)
  const isAuthRoute = authRoutes.includes(location.pathname);
  const isLoading = authStatus === 'loading' || authStatus === 'idle';
  const isAuthenticated = authStatus === 'authenticated';

  // ✅ Conditional RENDERING (not conditional hooks)
  if (isAuthRoute) {
    return <AuthRoutes location={location} />;
  }
  if (isLoading && !isPublicRoute) {
    return <LoadingScreen />;
  }
  if (!isAuthenticated && !isPublicRoute) {
    return <RedirectingScreen />;
  }
  return <AuthenticatedApp {...allProps} />;
}
```

## Implementation Status

✅ **COMPLETED**: All hooks have been moved to the top of the App component, before any early returns.

### Changes Made:
1. Moved all `useState`, `useEffect`, `useMemo`, `useCallback`, and custom hooks to the top section
2. Removed duplicate hooks that appeared after early returns
3. Removed duplicate early returns
4. Ensured all hooks are called unconditionally in a fixed order
5. Early returns for auth routes and loading states now come after all hooks

### Final Structure:
- **Lines ~2005-2250**: All hooks (useState, useEffect, useMemo, useCallback, custom hooks)
- **Lines ~2250-2345**: Memoized values and handlers
- **Lines ~2345-2440**: Early returns for auth routes and loading states
- **Lines ~2440+**: Authenticated app content

The app should now render without React Hooks order violations.

