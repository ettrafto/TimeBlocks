import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { registerDebugShortcut } from '../shared/logging/shortcut.js'

// Register debug shortcut (Ctrl/Cmd + Shift + L)
registerDebugShortcut();

// Dev-only noise filter for Chrome extension warnings
if (import.meta.env.DEV) {
  import("./dev/consoleNoiseFilter").then((m) => m.installDevConsoleNoiseFilter?.());
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

