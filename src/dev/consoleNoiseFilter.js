// src/dev/consoleNoiseFilter.js
// Dev-only console noise filter & diagnosis for Chrome extension port-close warnings.

const TARGET_TEXT = "The message port closed before a response was received";

let warnedOnce = false;
function maybeDiagnosticNote(args) {
  // If any arg includes a chrome-extension URL, print a one-time hint.
  const argStr = args.map(String).join(" ");
  if (!warnedOnce && /chrome-extension:\/\//.test(argStr)) {
    warnedOnce = true;
    // eslint-disable-next-line no-console
    console.info(
      "[diagnostic] Detected errors originating from a browser extension (chrome-extension://...). " +
      "They are harmless for your app. To verify, open the Console's stack trace and look for chrome-extension:// URLs, " +
      "or try disabling extensions one-by-one."
    );
  }
}

// Wrap only in development
export function installDevConsoleNoiseFilter() {
  if (import.meta.env.PROD) return;

  const originalError = console.error.bind(console);
  console.error = (...args) => {
    // Filter only the known extension noise; pass everything else through.
    const first = args[0];
    const isTarget =
      typeof first === "string" && first.includes(TARGET_TEXT);

    if (isTarget) {
      maybeDiagnosticNote(args);
      return; // swallow this noisy line
    }
    originalError(...args);
  };

  // Also filter global errors/unhandled rejections that surface same message
  const onErr = (ev) => {
    if (typeof ev?.message === "string" && ev.message.includes(TARGET_TEXT)) {
      maybeDiagnosticNote([ev.message, ev.filename]);
      ev.preventDefault(); // dev-only swallow
    }
  };
  const onRej = (ev) => {
    const reasonStr = String(ev?.reason ?? "");
    if (reasonStr.includes(TARGET_TEXT)) {
      maybeDiagnosticNote([reasonStr]);
      ev.preventDefault(); // dev-only swallow
    }
  };

  window.addEventListener("error", onErr);
  window.addEventListener("unhandledrejection", onRej);

  // Return an optional disposer if you ever want to uninstall in hot-reload scenarios
  return () => {
    console.error = originalError;
    window.removeEventListener("error", onErr);
    window.removeEventListener("unhandledrejection", onRej);
  };
}

