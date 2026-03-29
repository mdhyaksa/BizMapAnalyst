<script lang="ts">
	import { marked } from 'marked';
	import { mapState } from '$lib/stores/map-state.svelte';

	const renderedHtml = $derived(
		mapState.report ? marked.parse(mapState.report) as string : ''
	);
</script>

{#if mapState.report}
	<div class="space-y-4">
		<!-- Nearby places summary -->
		{#if mapState.places.length > 0}
			<div class="rounded-lg bg-gray-50 p-3">
				<h4 class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Nearby Places Found</h4>
				<div class="flex flex-wrap gap-2">
					{#each mapState.places as category}
						<span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
							{category.query}
							<span class="rounded-full bg-blue-200 px-1.5 text-blue-700">{category.count}</span>
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Report content -->
		<div class="prose prose-sm max-w-none prose-headings:text-gray-900 prose-h2:mt-4 prose-h2:mb-2 prose-h2:text-base prose-p:text-gray-700 prose-li:text-gray-700">
			{@html renderedHtml}
		</div>

		<!-- Copy button -->
		<button
			onclick={() => {
				if (mapState.report) {
					navigator.clipboard.writeText(mapState.report);
				}
			}}
			class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
		>
			Copy Report
		</button>
	</div>
{/if}
