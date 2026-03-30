<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		onPlaceSelected: (lat: number, lng: number, name: string) => void;
	}
	let { onPlaceSelected }: Props = $props();

	let inputEl: HTMLInputElement;

	onMount(async () => {
		// Wait for the google global loaded by Map.svelte
		let attempts = 0;
		while (!(window as any).google?.maps?.places && attempts < 40) {
			await new Promise((r) => setTimeout(r, 250));
			attempts++;
		}
		if (!(window as any).google?.maps?.places) return;

		const autocomplete = new google.maps.places.Autocomplete(inputEl, {
			fields: ['geometry', 'name']
		});
		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (place.geometry?.location) {
				onPlaceSelected(
					place.geometry.location.lat(),
					place.geometry.location.lng(),
					place.name ?? ''
				);
			}
		});
	});
</script>

<div class="flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm ring-1 ring-slate-200">
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0 text-slate-400">
		<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
	</svg>
	<input
		bind:this={inputEl}
		type="text"
		placeholder="Search for a location..."
		class="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
	/>
</div>
