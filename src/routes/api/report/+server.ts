import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };
import { reverseGeocode } from '$lib/server/geocoding';
import { generateReport } from '$lib/server/ai-report';
import { checkRateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const { allowed, retryAfter } = checkRateLimit(ip);
	if (!allowed) {
		return json(
			{ error: 'Too many requests. Please wait before generating another report.' },
			{ status: 429, headers: { 'Retry-After': String(retryAfter) } }
		);
	}

	try {
		const body = await request.json();

		const { lat, lng, business_description, radius_m } = body;

		// Validate
		if (typeof lat !== 'number' || typeof lng !== 'number') {
			return json({ error: 'Invalid coordinates' }, { status: 400 });
		}
		if (!business_description || typeof business_description !== 'string') {
			return json({ error: 'Business description is required' }, { status: 400 });
		}
		if (business_description.length > 1000) {
			return json({ error: 'Business description too long (max 1000 chars)' }, { status: 400 });
		}

		const clampedRadius = Math.max(500, Math.min(10000, Number(radius_m) || 2000));

		// Reverse geocode
		const address = await reverseGeocode(lat, lng);

		// Generate report (handles AI tool-calling loop internally)
		const result = await generateReport(lat, lng, clampedRadius, business_description, address);

		return json({
			report: result.report,
			address,
			radius_m: clampedRadius,
			queries_used: result.queries_used,
			places: result.places
		});
	} catch (err) {
		console.error('Report generation error:', err);
		return json(
			{ error: 'Failed to generate report. Please try again.' },
			{ status: 500 }
		);
	}
};
