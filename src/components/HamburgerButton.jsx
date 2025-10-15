// src/components/HamburgerButton.jsx
import { layoutStore } from '../state/layoutStore';

export default function HamburgerButton() {
  return (
    <button
      aria-label="Toggle menu"
      onClick={() => layoutStore.toggle()}
      className="inline-flex items-center justify-center rounded-lg border px-2.5 py-2 hover:bg-neutral-800/40 transition shadow-sm"
    >
      <span className="sr-only">Toggle menu</span>
      {/* simple hamburger icon */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

