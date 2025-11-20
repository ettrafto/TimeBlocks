# Frontend App Structure Analysis

## Current Problem

The `App` component violates React's Rules of Hooks because:
1. Many hooks are called unconditionally at the top, but...
2. Data-loading effects (loadTypes, eventsStore.initialize, scheduleStore.loadRange) run even when unauthenticated, causing 401s
3. The hook order may change between renders when auth status changes

## Current App.jsx Structure (BROKEN)

```javascript
function App() {
  // ========================================
  // ALL HOOKS CALLED FIRST (Lines ~2005-2250)
  // ========================================
  
  // Router hooks
  const location = useLocation();
  const navigate = useNavigate();

  // Auth hooks
  useHydrateAuth();
  const authStatus = useAuthStore((state) => state.status);

  // Sidebar resize hook
  const { onPointerDown, proxyState } = useSidebarResizeController(320);

  // Date store hooks
  const { selectedDate, weekStartsOn, viewMode, includeWeekends } = useDateStore();
  const { setDate, setViewMode, setIncludeWeekends, nextWindow, prevWindow, goToday } = dateStore.actions;
  const { getDisplayedDays, getVisibleKeys, getDateKey } = dateStore.utils;
  const displayedDays = useMemo(() => getDisplayedDays(), [selectedDate, viewMode, includeWeekends]);
  const visibleKeys = useMemo(() => getVisibleKeys(), [selectedDate, viewMode, includeWeekends]);
  const dateKey = getDateKey();

  // Schedule store hooks
  const schedStore = useScheduleStore();
  const _schedRenderTick = useScheduleStore(state => state.byOccId);
  
  // Events store hooks
  const { byId, byDate, getEventsForDate, moveEventToDay, updateEventTime, upsertEvent, findConflictsSameDay, removeEvent } = useEventsStore();

  // State hooks (many useState calls)
  const [types, setTypes] = useState([]);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState([]);
  // ... many more useState hooks

  // Effects that load data (PROBLEM: run even when unauthenticated)
  React.useEffect(() => {
    if (!isAuthenticated) return; // ❌ This check happens INSIDE the effect
    // loadTypes() - calls GET /api/types
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    eventsStore.initialize?.(); // ❌ Calls GET /api/calendars/.../events
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    schedStore.loadRange(...); // ❌ Calls GET /api/schedules
  }, [isAuthenticated]);

  // ========================================
  // CONDITIONAL RENDERING (Lines ~2345-2440)
  // ========================================
  
  if (isAuthRoute) {
    return <LoginPage />; // Early return
  }
  
  if (!isPublicRoute && isLoading) {
    return <LoadingScreen />; // Early return
  }
  
  if (!isPublicRoute && isUnauthenticated) {
    return <RedirectingScreen />; // Early return
  }

  // ========================================
  // AUTHENTICATED APP CONTENT (Lines ~2440+)
  // ========================================
  
  // All the main app UI with DndContext, calendar, etc.
  // This section has many more hooks (useCallback, useMemo, etc.)
}
```

## Issues Identified

1. **Hooks order violation**: While hooks are at the top, the data-loading effects run even when unauthenticated, causing 401s
2. **Data loading before auth**: Effects check `isAuthenticated` inside, but they still execute and may fire requests before cookies are set
3. **Mixed concerns**: App handles both auth routing AND authenticated app logic

## Final Structure (IMPLEMENTED)

```javascript
// main.jsx - Router wrapper (no hooks)
<BrowserRouter>
  <App />
</BrowserRouter>

// App.jsx - AppRoot is the default export
export default AppRoot;

// AppRoot - Auth bootstrap only (minimal hooks)
function AppRoot() {
  // 1. Unconditional hooks (always called in same order)
  useHydrateAuth();
  const authStatus = useAuthStore((state) => state.status);
  
  // 2. Derive flags (not hooks)
  const isLoading = authStatus === 'loading' || authStatus === 'idle';
  const isAuthenticated = authStatus === 'authenticated';
  const isUnauthenticated = authStatus === 'unauthenticated';
  
  // 3. Conditional rendering (NO hooks below this line)
  if (isLoading) return <LoadingScreen />;
  if (isUnauthenticated) return <UnauthenticatedShell />;
  return <AuthenticatedShell />;
}

// UnauthenticatedShell - Login/signup pages (minimal hooks)
function UnauthenticatedShell() {
  // Minimal hooks for routing
  const location = useLocation();
  const navigate = useNavigate();
  
  // Redirect logic (inside effects, not conditional hooks)
  React.useEffect(() => {
    const authStatus = useAuthStore.getState().status;
    if (authStatus === 'authenticated' && isAuthRoute) {
      navigate('/', { replace: true });
    }
  }, [isAuthRoute, navigate]);
  
  // Render auth pages
  switch (location.pathname) {
    case '/login': return <LoginPage />;
    case '/signup': return <SignupPage />;
    // ... etc
  }
}

// AuthenticatedShell - Data loading gate
function AuthenticatedShell() {
  // 1. Unconditional hooks
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';
  
  // 2. Data loading effects (gated INSIDE the effect, not conditionally called)
  React.useEffect(() => {
    if (!isAuthenticated) return;
    eventsStore.initialize?.();
  }, [isAuthenticated]);
  
  // 3. Render authenticated app content
  return <AuthenticatedAppContent />;
}

// AuthenticatedAppContent - All main app logic (many hooks, but stable order)
function AuthenticatedAppContent() {
  // All hooks called unconditionally
  const location = useLocation();
  const navigate = useNavigate();
  const { onPointerDown, proxyState } = useSidebarResizeController(320);
  // ... all other hooks (useState, useMemo, useCallback, etc.)
  
  // Data loading effects (gated INSIDE the effect)
  React.useEffect(() => {
    if (!isAuthenticated) return;
    loadTypes(); // Only runs when authenticated
  }, [isAuthenticated]);
  
  // ... rest of authenticated app (calendar, DndContext, etc.)
}
```

## Key Changes Made

1. **Split App into AppRoot, UnauthenticatedShell, AuthenticatedShell, AuthenticatedAppContent**
   - AppRoot: Only auth bootstrap, minimal hooks
   - UnauthenticatedShell: Auth pages only
   - AuthenticatedShell: Data loading gate
   - AuthenticatedAppContent: All main app logic

2. **Fixed credentials in API requests**
   - Added `credentials: 'include'` to `apiRequest` in `src/services/api.js`
   - This ensures cookies (ACCESS/REFRESH tokens) are sent with all requests

3. **Stable hook order**
   - Each component calls its hooks unconditionally in a fixed order
   - Data loading is gated INSIDE effects, not by conditionally calling hooks

4. **Removed auth routing from AuthenticatedAppContent**
   - Since it's only rendered when authenticated, no need for auth route checks

## Data Loading Locations

1. **loadTypes** (GET /api/types):
   - Currently: App.jsx ~line 2127
   - Should move to: AuthenticatedShell

2. **eventsStore.initialize** (GET /api/calendars/.../events):
   - Currently: App.jsx ~lines 2117, 2181, 2200, 2225
   - Should move to: AuthenticatedShell

3. **scheduleStore.loadRange** (GET /api/schedules):
   - Currently: App.jsx ~line 2237
   - Should move to: AuthenticatedShell

