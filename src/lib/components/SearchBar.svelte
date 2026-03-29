<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		onPlaceSelected: (lat: number, lng: number, name: string) => void;
	}
	let { onPlaceSelected }: Props = $props();

	let inputEl: HTMLInputElement;

	onMount(async () => {
		// Wait for Google Maps to be loaded
		if (!window.google?.maps?.places) {
			// Retry a few times
			for (let i = 0; i < 10; i++) {
				await new Promise((r) => setTimeout(r, 500));
				if (window.google?.maps?.places) break;
			}
		}

		if (!window.google?.maps?.places) return;

		const autocomplete = new google.maps.places.Autocomplete(inputEl, {
			fields: ['geometry', 'name']
		});

		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (place.geometry?.location) {
				const lat = place.geometry.location.lat();
				const lng = place.geometry.location.lng();
				onPlaceSelected(lat, lng, place.name ?? 'Selected Place');
			}
		});
	});
</script>

<input
	bind:this={inputEl}
	type="text"
	placeholder="Search for a place..."
	class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
/>
