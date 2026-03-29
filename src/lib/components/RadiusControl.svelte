<script lang="ts">
	import { mapState } from '$lib/stores/map-state.svelte';

	function formatRadius(m: number): string {
		if (m >= 1000) {
			return `${(m / 1000).toFixed(1)} km`;
		}
		return `${m} m`;
	}
</script>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<label for="radius" class="text-sm font-medium text-gray-700">Radius</label>
		<span class="text-sm font-semibold text-blue-600">{formatRadius(mapState.radius_m)}</span>
	</div>
	<input
		id="radius"
		type="range"
		min="500"
		max="10000"
		step="100"
		bind:value={mapState.radius_m}
		class="w-full accent-blue-600"
	/>
	<div class="flex justify-between text-xs text-gray-400">
		<span>500m</span>
		<span>10km</span>
	</div>
</div>
