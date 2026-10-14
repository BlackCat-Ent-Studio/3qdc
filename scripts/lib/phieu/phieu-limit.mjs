// phieu-limit.mjs — how often one visitor address may sign in or send on the ticket page. Very generous (120 per 10 min),
// because a crowd of phones on one mobile network shares one public address; sending still needs a Google sign-in and
// one ticket per email per day, so this only stops scripts hammering the page. Memory only.
const WINDOW_MS = 10 * 60e3;
const PER_WINDOW = 120;
const tries = new Map(); // address → times of the attempts inside the window

// true = go ahead (the attempt is counted), false = too many from this address just now
export function allowAttempt(ip, now = Date.now()) {
  const recent = (tries.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) {
    tries.set(ip, recent);
    return false;
  }
  recent.push(now);
  tries.set(ip, recent);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of tries) if (!times.some((t) => now - t < WINDOW_MS)) tries.delete(ip);
}, WINDOW_MS).unref();
