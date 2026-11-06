// write-limit.mjs — a cap on how many changes one person's Claude may make in an hour (all of that person's codes
// together), kept in memory: a restart of the server starts the count again. Each kind of tool has its own limiter, so the
// owner's rights tools (strict) and the everyday work tools (generous) never eat each other's allowance.
const HOUR = 3600e3;

/** makeWriteLimiter({ max, what }) → { take(username) → '' when allowed (and counted) or the reason in words, reset() }. */
export function makeWriteLimiter({ max, what = 'thay đổi', ms = HOUR }) {
  const writes = new Map(); // username → times (ms) of the writes in the last hour
  return {
    take(username) {
      const now = Date.now();
      const recent = (writes.get(username) || []).filter((t) => now - t < ms);
      if (recent.length >= max) {
        writes.set(username, recent);
        const wait = Math.ceil((recent[0] + ms - now) / 60e3);
        return `Đã đủ ${max} lần ${what} trong 1 giờ cho tài khoản này, tính chung mọi mã (giới hạn an toàn). Thử lại sau khoảng ${wait} phút.`;
      }
      recent.push(now);
      writes.set(username, recent);
      if (writes.size > 200) for (const [k, v] of writes) if (!v.some((t) => now - t < ms)) writes.delete(k);
      return '';
    },
    reset() { writes.clear(); },
  };
}
