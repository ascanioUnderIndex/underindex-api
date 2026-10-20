// Free daily allowance per client, in memory. Lets people try a record without a wallet.
//
// Why a cap this low: the dataset is 60 records, so any free allowance eventually hands it out.
// At 3 a day one client needs 20 days to collect everything; the paid route stays the normal path.
// Counters reset at midnight UTC and on every restart, which is fine for a trial allowance.

/**
 * @param {{ limit: number, now?: () => number }} options  limit 0 disables the allowance
 */
export function createFreeQuota({ limit, now = Date.now }) {
  let day = null;
  let used = new Map(); // client key -> records taken today

  const today = () => new Date(now()).toISOString().slice(0, 10);
  const resetAt = () => {
    const d = new Date(now());
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  };
  const roll = () => {
    const d = today();
    if (d !== day) {
      day = d;
      used = new Map();
    }
  };

  return {
    limit,
    /** Counts one record against `key` if any allowance is left. */
    take(key) {
      roll();
      const n = used.get(key) ?? 0;
      if (n >= limit) return { allowed: false, remaining: 0, resetAt: resetAt() };
      used.set(key, n + 1);
      return { allowed: true, remaining: limit - n - 1, resetAt: resetAt() };
    },
    /** How many clients used the allowance today (for the log line, no identities). */
    clientsToday() {
      roll();
      return used.size;
    },
  };
}
