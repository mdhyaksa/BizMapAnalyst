<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import ControlPanel from '$lib/components/ControlPanel.svelte';

	let mapComponent: ReturnType<typeof Map>;

	function handlePlaceSelected(lat: number, lng: number, _name: string) {
		mapComponent?.panTo(lat, lng);
	}
</script>

<div class="flex h-full">
	<!-- Map -->
	<div class="flex-1">
		<Map bind:this={mapComponent} />
	</div>

	<!-- Side Panel -->
	<div class="w-96 flex-shrink-0 border-l border-gray-200 bg-white shadow-lg max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-10 max-md:w-80">
		<ControlPanel onPlaceSelected={handlePlaceSelected} />
	</div>
</div>
