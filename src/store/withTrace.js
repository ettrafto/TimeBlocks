// src/store/withTrace.js
import { TBLog } from "../../shared/logging/logger.js";
import { newCorrelationId } from "../../shared/logging/correlation.js";

export const withTrace = (fnLabel, fn) => (...args) => {
  const cid = newCorrelationId("store");
  const g = TBLog.group(`Store: ${fnLabel}`, cid);
  try {
    TBLog.kv("Args", { args });
    const result = fn(...args);
    TBLog.kv("Result", { result });
    return result;
  } finally {
    g.end();
  }
};











