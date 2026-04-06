import { env } from '$env/dynamic/private';
import type { PlaceItem } from '$lib/types';

const AWS_REGION = 'ap-southeast-1';
const BASE_URL = `https://places.geo.${AWS_REGION}.amazonaws.com`;
const MAX_RESULTS_PER_QUERY = 6;

// Maps query terms (English + Indonesian) to valid AWS place category IDs.
// Full list: https://docs.aws.amazon.com/location/latest/developerguide/places-filtering.html#place-categories
// Used for: SearchNearby IncludeCategories filter + deduplication.
// Terms not in this map fall back to SearchText (free text).
const CATEGORY_MAP: Record<string, string[]> = {
	// Food & Drink
	coffee: ['coffee_shop', 'coffee-tea'],
	kopi: ['coffee_shop', 'coffee-tea'],
	cafe: ['coffee_shop', 'coffee-tea'],
	kafe: ['coffee_shop', 'coffee-tea'],
	'kafe kopi': ['coffee_shop', 'coffee-tea'],
	'coffee shop': ['coffee_shop'],
	'bubble tea': ['coffee_shop', 'coffee-tea'],
	restaurant: ['restaurant'],
	restoran: ['restaurant'],
	'casual dining': ['casual_dining'],
	'fine dining': ['fine_dining'],
	'fast food': ['fast_food'],
	bakery: ['bakery_and_baked_goods_store'],
	roti: ['bakery_and_baked_goods_store'],
	bar: ['bar_or_pub'],
	pub: ['bar_or_pub'],
	'bar or pub': ['bar_or_pub'],
	bistro: ['bistro'],
	deli: ['deli'],
	'food market': ['food_market-stall'],
	'sweet shop': ['sweet_shop'],
	'tea house': ['tea_house'],
	taqueria: ['taqueria'],

	// Lodging
	hotel: ['hotel'],
	motel: ['motel'],
	hostel: ['hostel'],
	'guest house': ['guest_house'],
	'bed and breakfast': ['bed_and_breakfast'],
	apartment: ['apartment_rental-flat_rental'],
	apartemen: ['apartment_rental-flat_rental'],
	'student housing': ['student_housing'],

	// Residential
	perumahan: ['residential_area-building'],
	residential: ['residential_area-building'],
	kos: ['residential_area-building'],

	// Health & Wellness
	spa: ['wellness_center_and_services'],
	'spa massage': ['wellness_center_and_services'],
	wellness: ['wellness_center_and_services'],
	gym: ['fitness-health_club'],
	fitness: ['fitness-health_club'],
	'fitness club': ['fitness-health_club'],
	hospital: ['hospital'],
	'rumah sakit': ['hospital'],
	clinic: ['medical_services-clinics'],
	klinik: ['medical_services-clinics'],
	pharmacy: ['pharmacy'],
	apotek: ['pharmacy'],
	drugstore: ['drugstore_or_pharmacy'],
	doctor: ['medical_services-clinics', 'family-general_practice_physicians'],
	dokter: ['medical_services-clinics', 'family-general_practice_physicians'],
	dentist: ['dentist-dental_office'],
	'urgent care': ['urgent_care_center'],
	salon: ['hair_salon'],
	barbershop: ['barber'],
	'nail salon': ['nail_salon'],

	// Education
	university: ['higher_education'],
	universitas: ['higher_education'],
	kampus: ['higher_education'],
	college: ['higher_education'],
	school: ['school'],
	sekolah: ['school'],
	'primary school': ['primary_school'],
	'secondary school': ['secondary_school'],
	kindergarten: ['kindergarten_and_childcare'],

	// Office & Business
	office: ['business_facility'],
	kantor: ['business_facility'],
	menara: ['building', 'business_facility'],
	tower: ['building', 'business_facility'],
	'office tower': ['business_facility'],
	coworking: ['business_facility'],
	'coworking space': ['business_facility'],
	building: ['building'],

	// Retail
	mall: ['shopping_mall'],
	'shopping mall': ['shopping_mall'],
	supermarket: ['grocery'],
	minimarket: ['convenience_store'],
	'convenience store': ['convenience_store'],
	grocery: ['grocery'],
	bookstore: ['bookstore'],
	'clothing store': ['clothing_and_accessories'],
	'department store': ['department_store'],
	'specialty store': ['specialty_store'],

	// Finance
	bank: ['bank'],
	atm: ['atm'],
	'money transfer': ['money_transferring_service'],

	// Transport
	'bus stop': ['bus_stop'],
	halte: ['bus_stop'],
	'bus station': ['bus_station'],
	'train station': ['train_station', 'commuter_rail_station'],
	stasiun: ['train_station', 'commuter_rail_station'],
	'commuter rail': ['commuter_rail_station'],
	subway: ['underground_train-subway'],
	parking: ['parking'],
	parkir: ['parking'],
	'parking lot': ['parking_lot'],
	'gas station': ['petrol-gasoline_station'],
	'ev charging': ['ev_charging_station'],

	// Recreation & Leisure
	park: ['park-recreation_area'],
	taman: ['park-recreation_area'],
	'sports complex': ['sports_complex-stadium'],
	cinema: ['cinema'],
	bioskop: ['cinema'],
	'night club': ['night_club'],
	nightclub: ['night_club'],
	karaoke: ['karaoke'],
	'amusement park': ['amusement_park'],
	museum: ['museum'],
	library: ['library'],
	perpustakaan: ['library'],

	// Religion
	mosque: ['mosque'],
	masjid: ['mosque'],
	church: ['church'],
	temple: ['temple'],
	vihara: ['temple'],

	// Government & Services
	'post office': ['post_office'],
	'police station': ['police_station'],
	'fire department': ['fire_department'],
	'city hall': ['city_hall'],
	embassy: ['embassy']
};

/** All valid query terms accepted by searchNearby (keys of CATEGORY_MAP). */
export const VALID_QUERY_TERMS = Object.keys(CATEGORY_MAP);

interface AwsResultItem {
	Title?: string;
	Position?: [number, number]; // [longitude, latitude]
	Categories?: Array<{ LocalizedName?: string; Id?: string }>;
}

interface AwsSearchResponse {
	ResultItems?: AwsResultItem[];
}

function mapItems(items: AwsResultItem[], fallbackLat: number, fallbackLng: number): PlaceItem[] {
	return items.map((item) => ({
		name: item.Title ?? 'Unknown',
		types: (item.Categories ?? []).map((c) => c.LocalizedName ?? c.Id ?? '').filter(Boolean),
		lng: item.Position?.[0] ?? fallbackLng,
		lat: item.Position?.[1] ?? fallbackLat
	}));
}

function buildUrl(path: string): string {
	const url = new URL(`${BASE_URL}${path}`);
	url.searchParams.set('key', env.AWS_MAPS_API_KEY ?? '');
	return url.toString();
}

export async function searchNearby(
	lat: number,
	lng: number,
	radius_m: number,
	query: string
): Promise<PlaceItem[]> {
	const key = env.AWS_MAPS_API_KEY ?? '';
	if (!key) {
		console.error('[places] AWS_MAPS_API_KEY is not set');
		return [];
	}

	const normalized = query.toLowerCase().trim();
	const categoryIds = CATEGORY_MAP[normalized];

	if (categoryIds) {
		return searchNearbyByCategory(lat, lng, radius_m, query, categoryIds);
	}
	return searchByText(lat, lng, radius_m, query);
}

// POST /v2/search-nearby — category-based, no query text needed
async function searchNearbyByCategory(
	lat: number,
	lng: number,
	radius_m: number,
	query: string,
	categoryIds: string[]
): Promise<PlaceItem[]> {
	const url = buildUrl('/v2/search-nearby');
	console.log(`[places] SearchNearby (categories: ${categoryIds.join(',')}) for "${query}"`);

	const body = {
		QueryPosition: [lng, lat], // [longitude, latitude]
		QueryRadius: radius_m,
		MaxResults: MAX_RESULTS_PER_QUERY,
		Filter: { IncludeCategories: categoryIds }
	};

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		console.error(`[places] SearchNearby failed for "${query}" (${res.status}): ${errText}`);
		// Fall back to text search on failure
		return searchByText(lat, lng, radius_m, query);
	}

	const data: AwsSearchResponse = await res.json();
	return mapItems(data.ResultItems ?? [], lat, lng);
}

// POST /v2/search-text — text-based fallback for terms not in CATEGORY_MAP
async function searchByText(
	lat: number,
	lng: number,
	radius_m: number,
	query: string
): Promise<PlaceItem[]> {
	const url = buildUrl('/v2/search-text');
	console.log(`[places] SearchText (fallback) for "${query}"`);

	const body = {
		QueryText: query,
		MaxResults: MAX_RESULTS_PER_QUERY,
		Filter: {
			Circle: {
				Center: [lng, lat], // [longitude, latitude]
				Radius: radius_m
			}
		}
	};

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		console.error(`[places] SearchText failed for "${query}" (${res.status}): ${errText}`);
		return [];
	}

	const data: AwsSearchResponse = await res.json();
	return mapItems(data.ResultItems ?? [], lat, lng);
}

export async function searchMultiple(
	lat: number,
	lng: number,
	radius_m: number,
	queries: string[]
): Promise<{ query: string; items: PlaceItem[] }[]> {
	// Deduplicate: if two queries resolve to the same primary category, skip the second
	const seenCategories = new Set<string>();
	const deduped: string[] = [];
	for (const query of queries.slice(0, 5)) {
		const cats = CATEGORY_MAP[query.toLowerCase().trim()];
		const dedupeKey = cats ? cats[0] : query.toLowerCase().trim();
		if (!seenCategories.has(dedupeKey)) {
			seenCategories.add(dedupeKey);
			deduped.push(query);
		}
	}

	const results = await Promise.all(
		deduped.map(async (query) => {
			const items = await searchNearby(lat, lng, radius_m, query);
			return { query, items };
		})
	);

	return results;
}
