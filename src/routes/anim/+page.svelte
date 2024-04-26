<script lang="ts">
	import CuteBall from "$lib/components/CuteBall.svelte";
	import TransitionalFunction from "$lib/components/TransitionalFunction.svelte";
	import { tick } from "svelte";

	let beginInference: () => void;
	let triggerFunction: () => Promise<void>;
	let cancelInference: () => void;
	let iconUrl: string;

	let container: HTMLDivElement;
	let addText: (
		cb: () => void,
		getContainerBounds: () => DOMRect,
	) => Promise<void> = async () => {};

	let text = "";

	function startGeneration() {
		const output =
			"This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization. This is some sample text, which is not split up realistically using tokenization.";
		// split every 4 characters
		const tokens = output.match(/.{1,4}/g) || [];
		const interval = setInterval(() => {
			const token = tokens.shift();
			if (token) {
				addText(
					() => {
						text += token;
					},
					() => container.getBoundingClientRect(),
				);
			} else {
				clearInterval(interval);
			}
		}, 100);
	}

	function resetGeneration() {}
</script>

<main class="p-4">
	<TransitionalFunction
		bind:beginInference
		bind:triggerFunction
		bind:cancelInference
		bind:iconUrl
	/>
	<div class="flex mt-4 gap-4">
		<button class="border-2 border-gray-200 rounded-lg py-2 px-4" on:click={beginInference}>
			Begin Inference
		</button>
		<button class="border-2 border-gray-200 rounded-lg py-2 px-4" on:click={triggerFunction}>
			Trigger Function
		</button>
		<button class="border-2 border-gray-200 rounded-lg py-2 px-4" on:click={cancelInference}>
			Cancel Inference
		</button>
	</div>
	<div class="h-4" />
	<div class="whitespace-pre-wrap relative max-w-full overflow-hidden" bind:this={container}>
		{text}<CuteBall bind:addText />
	</div>
	<div class="flex mt-4 gap-4">
		<button class="border-2 border-gray-200 rounded-lg py-2 px-4" on:click={startGeneration}>
			Start Generation
		</button>
		<button class="border-2 border-gray-200 rounded-lg py-2 px-4" on:click={resetGeneration}>
			Reset Generation
		</button>
	</div>
</main>
