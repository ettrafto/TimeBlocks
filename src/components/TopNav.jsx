import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Simple SVG icon components
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const CreateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 1 1 15 0v.75H4.5v-.75z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

// Navigation button component
const NavButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center p-2 rounded-lg transition-all duration-200
      ${isActive 
        ? 'text-white bg-neutral-800' 
        : 'text-gray-300 hover:text-white hover:bg-neutral-800/50'
      }
    `}
    title={label}
    aria-label={label}
  >
    <Icon />
  </button>
);

// Main TopNav component
export default function TopNav({ activeView, onViewChange, onQuickAdd, onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const showDiagnostics = import.meta.env.VITE_SHOW_DIAGNOSTICS === 'true';
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const goProfile = () => { setUserMenuOpen(false); try { navigate('/profile'); } catch {} };
  const goSettings = () => { setUserMenuOpen(false); try { navigate('/settings'); } catch {} };
  const doLogout = () => {
    setUserMenuOpen(false);
    try { console.log('[TopNav] Logout clicked'); } catch {}
    // Placeholder: wire to auth when available
  };
  
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'create', icon: CreateIcon, label: 'Create' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-neutral-900 shadow-md">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Hamburger + App Name */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">TimeBlocks</h1>
        </div>

        {/* Right: Navigation Icons */}
        <div className="flex items-center gap-4">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeView === item.id}
              onClick={() => onViewChange(item.id)}
            />
          ))}
          
          {/* Diagnostics Link - Only shown when flag is enabled */}
          {showDiagnostics && (
            <NavButton
              icon={SettingsIcon}
              label="Diagnostics"
              isActive={location.pathname === '/admin/diagnostics'}
              onClick={() => navigate('/admin/diagnostics')}
            />
          )}
          
          {/* Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              onKeyDown={(e) => { if (e.key === 'Escape') setUserMenuOpen(false); }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 transition-all duration-200"
              title="User menu"
              aria-label="User menu"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen ? 'true' : 'false'}
            >
              <ProfileIcon />
            </button>
            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-40 rounded-md bg-white text-gray-700 shadow-lg ring-1 ring-black/5 overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={goProfile}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Profile
                </button>
                <button
                  role="menuitem"
                  onClick={goSettings}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Settings
                </button>
                <button
                  role="menuitem"
                  onClick={doLogout}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

