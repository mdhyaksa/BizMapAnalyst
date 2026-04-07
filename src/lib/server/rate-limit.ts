const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const store = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
	const now = Date.now();
	const timestamps = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
	if (timestamps.length >= MAX_REQUESTS) {
		const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
		store.set(key, timestamps);
		return { allowed: false, retryAfter };
	}
	timestamps.push(now);
	store.set(key, timestamps);
	return { allowed: true, retryAfter: 0 };
}
