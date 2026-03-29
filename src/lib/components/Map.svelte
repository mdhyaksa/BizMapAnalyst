<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';
	import { mapState } from '$lib/stores/map-state.svelte';

	let mapEl: HTMLDivElement;
	let map: google.maps.Map;
	let marker: google.maps.marker.AdvancedMarkerElement | null = null;
	let circle: google.maps.Circle | null = null;

	export function panTo(lat: number, lng: number) {
		if (map) {
			map.panTo({ lat, lng });
			placeMarker(lat, lng);
		}
	}

	export function getMap() {
		return map;
	}

	function placeMarker(lat: number, lng: number) {
		mapState.setLocation(lat, lng);

		if (marker) {
			marker.position = { lat, lng };
		}

		if (circle) {
			circle.setCenter({ lat, lng });
		}
	}

	function updateCircle() {
		if (circle && mapState.lat !== null && mapState.lng !== null) {
			circle.setRadius(mapState.radius_m);
		}
	}

	$effect(() => {
		mapState.radius_m;
		updateCircle();
	});

	// Show nearby places as markers when report is generated
	let placeMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

	$effect(() => {
		// Clear old place markers
		for (const m of placeMarkers) {
			m.map = null;
		}
		placeMarkers = [];

		if (mapState.places.length > 0 && map) {
			const colors: Record<string, string> = {};
			const palette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

			for (const category of mapState.places) {
				if (!colors[category.query]) {
					colors[category.query] = palette[Object.keys(colors).length % palette.length];
				}
				const color = colors[category.query];

				for (const place of category.items) {
					const pin = document.createElement('div');
					pin.style.width = '12px';
					pin.style.height = '12px';
					pin.style.borderRadius = '50%';
					pin.style.backgroundColor = color;
					pin.style.border = '2px solid white';
					pin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
					pin.title = `${place.name} (${category.query})`;

					const m = new google.maps.marker.AdvancedMarkerElement({
						position: { lat: place.lat, lng: place.lng },
						map,
						content: pin,
						title: place.name
					});
					placeMarkers.push(m);
				}
			}
		}
	});

	onMount(async () => {
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_KEY;
		if (!apiKey) {
			console.error('VITE_GOOGLE_MAPS_CLIENT_KEY not set');
			return;
		}

		const loader = new Loader({
			apiKey,
			libraries: ['places', 'marker']
		});

		const [mapsLib] = await Promise.all([
			loader.importLibrary('maps'),
			loader.importLibrary('marker')
		]);

		map = new mapsLib.Map(mapEl, {
			center: { lat: -6.2, lng: 106.8 },
			zoom: 14,
			mapId: 'bizmapanalyst',
			disableDefaultUI: false,
			zoomControl: true,
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: false
		});

		// Click to place marker
		map.addListener('click', (e: google.maps.MapMouseEvent) => {
			if (e.latLng) {
				const lat = e.latLng.lat();
				const lng = e.latLng.lng();

				if (!marker) {
					marker = new google.maps.marker.AdvancedMarkerElement({
						position: { lat, lng },
						map,
						gmpDraggable: true,
						title: 'Selected Location'
					});

					marker.addListener('dragend', () => {
						if (marker?.position) {
							const pos = marker.position as google.maps.LatLngLiteral;
							mapState.setLocation(pos.lat, pos.lng);
							if (circle) circle.setCenter(pos);
						}
					});
				} else {
					marker.position = { lat, lng };
				}

				if (!circle) {
					circle = new google.maps.Circle({
						map,
						center: { lat, lng },
						radius: mapState.radius_m,
						fillColor: '#2563eb',
						fillOpacity: 0.1,
						strokeColor: '#2563eb',
						strokeOpacity: 0.4,
						strokeWeight: 2
					});
				} else {
					circle.setCenter({ lat, lng });
				}

				mapState.setLocation(lat, lng);
			}
		});
	});
</script>

<div bind:this={mapEl} class="h-full w-full"></div>
