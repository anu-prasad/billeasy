const config = require('../config/env');

const TTL_MS = Number(config.SESSION_CACHE_TTL_MS) || 60 * 1000;
const MAX_ENTRIES = Number(config.SESSION_CACHE_MAX) || 2000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const cache = new Map();

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value) {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

const timer = setInterval(() => {
  const cutoff = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= cutoff) cache.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
if (typeof timer.unref === 'function') timer.unref();

module.exports = { get, set };