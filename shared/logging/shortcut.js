// shared/logging/shortcut.js
export const registerDebugShortcut = () => {
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", (e) => {
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && e.shiftKey && e.key.toLowerCase() === "l") {
      const val = window.localStorage.getItem("TB_DEBUG") === "1" ? "0" : "1";
      window.localStorage.setItem("TB_DEBUG", val);
      // eslint-disable-next-line no-alert
      alert(`TB_DEBUG ${val === "1" ? "enabled" : "disabled"}. Reload to apply.`);
    }
  });
  
  // Add help function to window
  if (typeof window !== "undefined") {
    window.TB_DEBUG_HELP = () => {
      console.log(`
🧭 TimeBlocks Pipeline Trace - Debug Help

How to enable/disable:
1. localStorage: localStorage.setItem("TB_DEBUG", "1") or localStorage.setItem("TB_DEBUG", "0")
2. URL query: Add ?debug=1 to the URL
3. Keyboard shortcut: Ctrl/Cmd + Shift + L (then reload)
4. Environment variable: Set VITE_TB_DEBUG=1 in .env.local (frontend) or TB_DEBUG=1 (backend)

What gets logged:
- 🧭 Grouped logs for each pipeline step (UI → API → Backend → DB → Store)
- 📋 Key-value tables showing request/response data
- ℹ️ Info messages for successful operations
- ⚠️ Warnings for issues
- 🛑 Errors for failures
- Correlation IDs ([cid:...]) to track requests across layers

Current status: ${window.localStorage.getItem("TB_DEBUG") === "1" ? "ENABLED" : "DISABLED"}
      `);
    };
  }
};

