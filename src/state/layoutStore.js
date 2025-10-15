// src/state/layoutStore.js
const KEY_WIDTH_PX = 'tb.sidebarWidthPx';
const KEY_OPEN = 'tb.sidebarOpen';

function readPx(defaultPx = 320) {
  const n = Number(localStorage.getItem(KEY_WIDTH_PX));
  return Number.isFinite(n) ? Math.max(0, n) : defaultPx;
}
function readOpen() {
  const v = localStorage.getItem(KEY_OPEN);
  return v === null ? true : v === 'true';
}

export function createLayoutStore() {
  let sidebarOpen = readOpen();
  let sidebarWidthPx = readPx();       // authoritative width in px
  let containerWidthPx = 0;            // measured by SplitPane
  let isResizingSidebar = false;

  const subs = new Set();
  const get = () => ({ sidebarOpen, sidebarWidthPx, containerWidthPx, isResizingSidebar });
  const notify = () => subs.forEach(fn => fn(get()));
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

  const setOpen = (open) => { sidebarOpen = !!open; localStorage.setItem(KEY_OPEN, String(sidebarOpen)); notify(); };
  const toggle = () => setOpen(!sidebarOpen);

  const setContainerWidthPx = (px) => { 
    containerWidthPx = Math.max(0, px|0); 
    // clamp current width to max 50% whenever container changes
    const maxPx = Math.round(containerWidthPx * 0.5);
    if (sidebarWidthPx > maxPx) sidebarWidthPx = maxPx;
    notify();
  };

  const setWidthPx = (px) => {
    const maxPx = Math.round(containerWidthPx * 0.5);
    const clamped = Math.max(0, Math.min(px|0, maxPx || px|0)); // allow before measure
    sidebarWidthPx = clamped;
    localStorage.setItem(KEY_WIDTH_PX, String(sidebarWidthPx));
    notify();
  };

  const setResizing = (v) => { isResizingSidebar = !!v; notify(); };

  return {
    get, subscribe,
    setOpen, toggle, setWidthPx, setContainerWidthPx, setResizing,
  };
}

export const layoutStore = createLayoutStore();
