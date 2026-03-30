<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import RadiusControl from '$lib/components/RadiusControl.svelte';
	import Report from '$lib/components/Report.svelte';
	import { mapState } from '$lib/stores/map-state.svelte';

	let mapComponent: ReturnType<typeof Map>;

	function handlePlaceSelected(lat: number, lng: number, _name: string) {
		mapComponent?.panTo(lat, lng);
	}

	async function generateReport() {
		if (mapState.lat === null || mapState.lng === null) {
			mapState.error = 'Please pin a location on the map first.';
			return;
		}
		if (!mapState.business_description.trim()) {
			mapState.error = 'Please describe your business idea.';
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

<!-- Header -->
<header class="border-b border-slate-200 bg-white shadow-sm">
	<div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
		<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
			<svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</div>
		<div>
			<h1 class="text-base font-bold leading-tight text-slate-900">BizMap Analyst</h1>
			<p class="text-xs leading-tight text-slate-400">AI-powered location intelligence</p>
		</div>
	</div>
</header>

<!-- Main content -->
<main class="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-12">

	<!-- Map card -->
	<div class="relative overflow-hidden rounded-2xl border border-slate-200 shadow-md" style="height:52vh;min-height:320px;">
		<!-- Search bar overlaid on map -->
		<div class="absolute left-3 right-3 top-3 z-10">
			<SearchBar onPlaceSelected={handlePlaceSelected} />
		</div>

		<!-- Map fills the card — inline style so height works before Tailwind hydrates -->
		<div style="width:100%;height:100%;">
			<Map bind:this={mapComponent} />
		</div>

		<!-- Location pin hint -->
		{#if mapState.lat === null}
			<div class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
				<div class="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
					Click the map to pin a location
				</div>
			</div>
		{/if}
	</div>

	<!-- Location status + radius row -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
		<!-- Location status -->
		<div class="flex-1">
			{#if mapState.lat !== null && mapState.lng !== null}
				<div class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
					<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
					<span class="text-sm text-emerald-800">
						{#if mapState.address}
							{mapState.address}
						{:else}
							{mapState.lat.toFixed(4)}, {mapState.lng.toFixed(4)}
						{/if}
					</span>
				</div>
			{:else}
				<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
					<div class="h-2 w-2 rounded-full bg-amber-400"></div>
					<span class="text-sm text-amber-800">No location selected</span>
				</div>
			{/if}
		</div>

		<!-- Radius control -->
		<div class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:w-64">
			<RadiusControl />
		</div>
	</div>

	<!-- Business idea card -->
	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<label for="business-desc" class="block text-sm font-semibold text-slate-700">
			Business Idea
		</label>
		<p class="mt-0.5 text-xs text-slate-400">Describe your concept, target customers, and what makes it unique.</p>

		<textarea
			id="business-desc"
			bind:value={mapState.business_description}
			placeholder="e.g., A specialty coffee shop targeting remote workers and students, with fast Wi-Fi, all-day breakfast, and a calm atmosphere..."
			rows="4"
			maxlength="1000"
			class="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
		></textarea>

		<div class="mt-1 flex items-center justify-between">
			<span class="text-xs text-slate-400">{mapState.business_description.length}/1000</span>
		</div>

		<!-- Error -->
		{#if mapState.error}
			<div class="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
				<svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-sm text-red-700">{mapState.error}</p>
			</div>
		{/if}

		<!-- Generate button -->
		<button
			onclick={generateReport}
			disabled={mapState.loading || mapState.lat === null || !mapState.business_description.trim()}
			class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if mapState.loading}
				<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				Analyzing location...
			{:else}
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				Generate Report
			{/if}
		</button>
	</div>

	<!-- Report -->
	<Report />

</main>
