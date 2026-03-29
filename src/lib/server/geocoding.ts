import { env } from '$env/dynamic/private';

const GOOGLE_API_KEY = env.GOOGLE_API_KEY ?? '';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
	const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
	url.searchParams.set('latlng', `${lat},${lng}`);
	url.searchParams.set('key', GOOGLE_API_KEY);
	url.searchParams.set('language', 'en');

	const res = await fetch(url);
	const data = await res.json();

	if (data.status === 'OK' && data.results.length > 0) {
		return data.results[0].formatted_address;
	}

	return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
