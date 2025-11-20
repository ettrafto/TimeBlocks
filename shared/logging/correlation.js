// shared/logging/correlation.js
export const newCorrelationId = (prefix = "task") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;













