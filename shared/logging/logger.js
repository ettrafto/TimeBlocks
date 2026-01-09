// shared/logging/logger.js
let enabled = false;

const isBrowser = typeof window !== "undefined";

const getFlag = () => {
  if (isBrowser) {
    const url = new URL(window.location.href);
    if (url.searchParams.get("debug") === "1") return true;
    if (window.localStorage?.getItem("TB_DEBUG") === "1") return true;
    // Vite/Frontend env
    if (import.meta?.env?.VITE_TB_DEBUG === "1") return true;
  } else {
    // Backend env (Node.js)
    if (typeof process !== "undefined" && process?.env?.TB_DEBUG === "1") return true;
  }
  return false;
};

export const TBLog = {
  enable() { enabled = true; },
  disable() { enabled = false; },
  on() { return enabled || getFlag(); },

  group(label, cid) {
    if (!this.on()) return { end: () => {} };
    console.groupCollapsed(`🧭 ${label}${cid ? ` [cid:${cid}]` : ""}`);
    return { end: () => console.groupEnd() };
  },

  info(...args) { if (this.on()) console.info("ℹ️", ...args); },
  warn(...args) { if (this.on()) console.warn("⚠️", ...args); },
  error(...args) { if (this.on()) console.error("🛑", ...args); },

  kv(title, obj) {
    if (!this.on()) return;
    console.log(`📋 ${title}`);
    console.table(obj);
  }
};















