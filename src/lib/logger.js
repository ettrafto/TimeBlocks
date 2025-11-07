// src/lib/logger.js

const isDev = typeof window !== 'undefined' && import.meta && import.meta.env && import.meta.env.DEV;

function formatTag(tags) {
  return Array.isArray(tags) && tags.length ? `[${tags.join('][')}]` : '';
}

export const log = {
  info(tags, message, meta) {
    if (!isDev) return;
    const prefix = formatTag(tags);
    if (meta !== undefined) {
      console.info(prefix, message, meta);
    } else {
      console.info(prefix, message);
    }
  },
  warn(tags, message, meta) {
    const prefix = formatTag(tags);
    if (meta !== undefined) {
      console.warn(prefix, message, meta);
    } else {
      console.warn(prefix, message);
    }
  },
  error(tags, message, meta) {
    const prefix = formatTag(tags);
    if (meta !== undefined) {
      console.error(prefix, message, meta);
    } else {
      console.error(prefix, message);
    }
  }
};

export default log;


