<script lang="ts">
	import { mapState } from '$lib/stores/map-state.svelte';

	function formatRadius(m: number): string {
		if (m >= 1000) {
			return `${(m / 1000).toFixed(1)} km`;
		}
		return `${m} m`;
	}
</script>

<div class="flex items-center gap-3">
	<span class="text-xs font-medium whitespace-nowrap text-slate-500">Radius</span>
	<input
		id="radius"
		type="range"
		min="500"
		max="10000"
		step="100"
		bind:value={mapState.radius_m}
		class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
	/>
	<span class="w-14 text-right text-xs font-semibold text-emerald-700">{formatRadius(mapState.radius_m)}</span>
</div>
