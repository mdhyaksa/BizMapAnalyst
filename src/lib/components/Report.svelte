<script lang="ts">
	import { marked } from 'marked';
	import { mapState } from '$lib/stores/map-state.svelte';

	const renderedHtml = $derived(
		mapState.report ? (marked.parse(mapState.report) as string) : ''
	);

	const palette = ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#3b82f6'];
</script>

{#if mapState.report}
	<div class="space-y-4">

		<!-- Nearby places found -->
		{#if mapState.places.length > 0}
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h3 class="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
					Nearby Places Scanned
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each mapState.places as category, i}
						<span
							class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
							style="background-color: {palette[i % palette.length]}"
						>
							{category.query}
							<span class="rounded-full bg-white/20 px-1.5 py-0.5 text-white">
								{category.count}
							</span>
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Report content -->
		<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
			<!-- Card header -->
			<div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
					<h2 class="text-sm font-semibold text-slate-800">Location Report</h2>
				</div>
				<button
					onclick={() => {
						if (mapState.report) navigator.clipboard.writeText(mapState.report);
					}}
					class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
				>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					Copy
				</button>
			</div>

			<!-- Report body -->
			<div class="px-6 py-5">
				<div
					class="prose prose-sm max-w-none
						prose-headings:font-semibold prose-headings:text-slate-900
						prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-base prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-1.5
						prose-p:text-slate-600 prose-p:leading-relaxed
						prose-li:text-slate-600
						prose-strong:text-slate-800
						prose-ul:space-y-1"
				>
					{@html renderedHtml}
				</div>
			</div>
		</div>
	</div>
{/if}
