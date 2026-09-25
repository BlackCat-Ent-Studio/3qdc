// signup-limit.mjs — how often one visitor address may try to sign up. Every attempt counts (new, repeated or wrong
// numbers alike), so nobody can pour in made-up numbers or test which numbers are on the list at speed.
// The limit is generous on purpose: phones on a mobile network often share one public address (carrier NAT), and a
// crowd behind one address must still be able to sign up. It lives in memory only; a restart clears it.

const WINDOW_MS = 10 * 60e3;
const PER_WINDOW = 10;
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

// forget addresses that have been quiet for a whole window
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of tries) if (!times.some((t) => now - t < WINDOW_MS)) tries.delete(ip);
}, WINDOW_MS).unref();
