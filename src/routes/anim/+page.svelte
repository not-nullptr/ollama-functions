<script lang="ts">
	import TransitionalFunction from "$lib/components/TransitionalFunction.svelte";

	let beginInference: () => void;
	let triggerFunction: () => Promise<void>;
	let cancelInference: () => void;
	let iconUrl: string;
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
</main>
