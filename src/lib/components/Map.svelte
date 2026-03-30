<script lang="ts">
	import { onMount } from 'svelte';
	import { mapState } from '$lib/stores/map-state.svelte';

	let mapEl: HTMLDivElement;
	let map: google.maps.Map;
	let marker: google.maps.Marker | null = null;
	let circle: google.maps.Circle | null = null;
	let placeMarkers: google.maps.Marker[] = [];

	export function panTo(lat: number, lng: number) {
		if (map) {
			map.panTo({ lat, lng });
			placeMarkerAt(lat, lng);
		}
	}

	function placeMarkerAt(lat: number, lng: number) {
		mapState.setLocation(lat, lng);
		if (marker) {
			marker.setPosition({ lat, lng });
		} else {
			marker = new google.maps.Marker({ position: { lat, lng }, map, draggable: true });
			marker.addListener('dragend', () => {
				const pos = marker!.getPosition();
				if (pos) {
					mapState.setLocation(pos.lat(), pos.lng());
					circle?.setCenter({ lat: pos.lat(), lng: pos.lng() });
				}
			});
		}
		if (circle) {
			circle.setCenter({ lat, lng });
		} else {
			circle = new google.maps.Circle({
				map,
				center: { lat, lng },
				radius: mapState.radius_m,
				fillColor: '#059669',
				fillOpacity: 0.12,
				strokeColor: '#059669',
				strokeOpacity: 0.5,
				strokeWeight: 2
			});
		}
	}

	$effect(() => {
		mapState.radius_m;
		if (circle && mapState.lat !== null && mapState.lng !== null) {
			circle.setRadius(mapState.radius_m);
		}
	});

	$effect(() => {
		for (const m of placeMarkers) m.setMap(null);
		placeMarkers = [];

		if (mapState.places.length > 0 && map) {
			const palette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
			const colors: Record<string, string> = {};

			for (const category of mapState.places) {
				if (!colors[category.query]) {
					colors[category.query] = palette[Object.keys(colors).length % palette.length];
				}
				const m = new google.maps.Marker({
					position: { lat: category.items[0]?.lat ?? 0, lng: category.items[0]?.lng ?? 0 },
					map,
					title: category.query,
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 7,
						fillColor: colors[category.query],
						fillOpacity: 1,
						strokeColor: '#fff',
						strokeWeight: 2
					}
				});
				placeMarkers.push(m);

				for (const place of category.items.slice(1)) {
					const pm = new google.maps.Marker({
						position: { lat: place.lat, lng: place.lng },
						map,
						title: place.name,
						icon: {
							path: google.maps.SymbolPath.CIRCLE,
							scale: 7,
							fillColor: colors[category.query],
							fillOpacity: 1,
							strokeColor: '#fff',
							strokeWeight: 2
						}
					});
					placeMarkers.push(pm);
				}
			}
		}
	});

	onMount(async () => {
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_KEY;
		if (!apiKey) {
			console.error('VITE_GOOGLE_MAPS_CLIENT_KEY is not set');
			return;
		}

		// Dynamic import keeps this package out of SSR entirely
		const { Loader } = await import('@googlemaps/js-api-loader');
		const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places'] });
		await loader.load();

		map = new google.maps.Map(mapEl, {
			center: { lat: 3.139, lng: 101.6869 }, // Kuala Lumpur default
			zoom: 14,
			zoomControl: true,
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: false
		});

		map.addListener('click', (e: google.maps.MapMouseEvent) => {
			if (!e.latLng) return;
			placeMarkerAt(e.latLng.lat(), e.latLng.lng());
		});
	});
</script>

<div bind:this={mapEl} style="width:100%;height:100%;"></div>
