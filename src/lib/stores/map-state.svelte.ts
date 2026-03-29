import type { PlaceCategory } from '$lib/types';

class MapState {
	lat = $state<number | null>(null);
	lng = $state<number | null>(null);
	radius_m = $state(2000);
	business_description = $state('');
	report = $state<string | null>(null);
	address = $state<string | null>(null);
	queries_used = $state<string[]>([]);
	places = $state<PlaceCategory[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	setLocation(lat: number, lng: number) {
		this.lat = lat;
		this.lng = lng;
	}

	reset() {
		this.report = null;
		this.address = null;
		this.queries_used = [];
		this.places = [];
		this.error = null;
	}
}

export const mapState = new MapState();
