import { env } from '$env/dynamic/private';

const GOOGLE_API_KEY = env.GOOGLE_API_KEY ?? '';
import type { PlaceItem } from '$lib/types';

const MAX_RESULTS_PER_QUERY = 6;

interface NearbySearchResult {
	places?: Array<{
		displayName?: { text: string };
		types?: string[];
		location?: { latitude: number; longitude: number };
		rating?: number;
		userRatingCount?: number;
	}>;
}

export async function searchNearby(
	lat: number,
	lng: number,
	radius_m: number,
	query: string
): Promise<PlaceItem[]> {
	const url = 'https://places.googleapis.com/v1/places:searchNearby';

	const body = {
		includedTypes: [query],
		maxResultCount: MAX_RESULTS_PER_QUERY,
		locationRestriction: {
			circle: {
				center: { latitude: lat, longitude: lng },
				radius: radius_m
			}
		}
	};

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': GOOGLE_API_KEY,
			'X-Goog-FieldMask':
				'places.displayName,places.types,places.location,places.rating,places.userRatingCount'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		// If the type isn't recognized, try a text search instead
		return searchNearbyText(lat, lng, radius_m, query);
	}

	const data: NearbySearchResult = await res.json();

	if (!data.places) return [];

	return data.places.map((p) => ({
		name: p.displayName?.text ?? 'Unknown',
		types: p.types ?? [],
		lat: p.location?.latitude ?? lat,
		lng: p.location?.longitude ?? lng,
		rating: p.rating,
		userRatingsTotal: p.userRatingCount
	}));
}

async function searchNearbyText(
	lat: number,
	lng: number,
	radius_m: number,
	query: string
): Promise<PlaceItem[]> {
	const url = 'https://places.googleapis.com/v1/places:searchText';

	const body = {
		textQuery: query,
		maxResultCount: MAX_RESULTS_PER_QUERY,
		locationBias: {
			circle: {
				center: { latitude: lat, longitude: lng },
				radius: radius_m
			}
		}
	};

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': GOOGLE_API_KEY,
			'X-Goog-FieldMask':
				'places.displayName,places.types,places.location,places.rating,places.userRatingCount'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) return [];

	const data: NearbySearchResult = await res.json();
	if (!data.places) return [];

	return data.places.map((p) => ({
		name: p.displayName?.text ?? 'Unknown',
		types: p.types ?? [],
		lat: p.location?.latitude ?? lat,
		lng: p.location?.longitude ?? lng,
		rating: p.rating,
		userRatingsTotal: p.userRatingCount
	}));
}

export async function searchMultiple(
	lat: number,
	lng: number,
	radius_m: number,
	queries: string[]
): Promise<{ query: string; items: PlaceItem[] }[]> {
	const limited = queries.slice(0, 5);

	const results = await Promise.all(
		limited.map(async (query) => {
			const items = await searchNearby(lat, lng, radius_m, query);
			return { query, items };
		})
	);

	return results;
}
