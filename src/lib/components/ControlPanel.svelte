<script lang="ts">
	import SearchBar from './SearchBar.svelte';
	import RadiusControl from './RadiusControl.svelte';
	import Report from './Report.svelte';
	import { mapState } from '$lib/stores/map-state.svelte';

	interface Props {
		onPlaceSelected: (lat: number, lng: number, name: string) => void;
	}
	let { onPlaceSelected }: Props = $props();

	async function generateReport() {
		if (mapState.lat === null || mapState.lng === null) {
			mapState.error = 'Please select a location on the map first.';
			return;
		}
		if (!mapState.business_description.trim()) {
			mapState.error = 'Please enter a business description.';
			return;
		}

		mapState.loading = true;
		mapState.error = null;
		mapState.report = null;
		mapState.places = [];
		mapState.queries_used = [];

		try {
			const res = await fetch('/api/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lat: mapState.lat,
					lng: mapState.lng,
					business_description: mapState.business_description,
					radius_m: mapState.radius_m
				})
			});

			const data = await res.json();

			if (!res.ok) {
				mapState.error = data.error || 'Failed to generate report.';
				return;
			}

			mapState.report = data.report;
			mapState.address = data.address;
			mapState.queries_used = data.queries_used;
			mapState.places = data.places;
		} catch {
			mapState.error = 'Network error. Please try again.';
		} finally {
			mapState.loading = false;
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="border-b border-gray-200 px-4 py-3">
		<h1 class="text-lg font-bold text-gray-900">BizMap Analyst</h1>
		<p class="text-xs text-gray-500">AI-powered business location analysis</p>
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 space-y-4 overflow-y-auto p-4">
		<!-- Search -->
		<SearchBar {onPlaceSelected} />

		<!-- Location indicator -->
		{#if mapState.lat !== null && mapState.lng !== null}
			<div class="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
				Location: {mapState.lat.toFixed(4)}, {mapState.lng.toFixed(4)}
				{#if mapState.address}
					<br /><span class="text-green-600">{mapState.address}</span>
				{/if}
			</div>
		{:else}
			<div class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
				Click on the map or search to select a location
			</div>
		{/if}

		<!-- Radius -->
		<RadiusControl />

		<!-- Business description -->
		<div class="space-y-1">
			<label for="desc" class="text-sm font-medium text-gray-700">Business Idea</label>
			<textarea
				id="desc"
				bind:value={mapState.business_description}
				placeholder="e.g., A bubble tea shop targeting university students and office workers..."
				rows="3"
				maxlength="1000"
				class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			></textarea>
			<div class="text-right text-xs text-gray-400">
				{mapState.business_description.length}/1000
			</div>
		</div>

		<!-- Generate button -->
		<button
			onclick={generateReport}
			disabled={mapState.loading || mapState.lat === null || !mapState.business_description.trim()}
			class="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if mapState.loading}
				<span class="inline-flex items-center gap-2">
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					Analyzing...
				</span>
			{:else}
				Generate Report
			{/if}
		</button>

		<!-- Error -->
		{#if mapState.error}
			<div class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
				{mapState.error}
			</div>
		{/if}

		<!-- Report -->
		<Report />
	</div>
</div>
