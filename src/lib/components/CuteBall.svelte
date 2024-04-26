<script lang="ts">
	import { settingsStore } from "$lib/settings";
	import { tick } from "svelte";

	export let offsetX: number = -24;
	export let offsetY: number = -14;

	let hiddenBall: HTMLDivElement;
	let displayBall: HTMLDivElement;

	let first = true;

	export async function addText(cb: () => void, getContainerBounds: () => DOMRect) {
		const oldContainerBounds = getContainerBounds();
		cb();
		await tick();
		if (!hiddenBall || !displayBall) return;
		const hiddenBounds = hiddenBall.getBoundingClientRect();
		const containerBounds = getContainerBounds();
		if (oldContainerBounds.height !== containerBounds.height) {
			displayBall.style.setProperty("--bg", "transparent");
			setTimeout(() => {
				if (displayBall) displayBall.style.setProperty("--bg", "white");
			}, 50);
			displayBall.style.transition = "0.05s ease-in-out";
		}
		displayBall.style.left = `${hiddenBounds.left + offsetX}px`;
		displayBall.style.top = `${hiddenBounds.top + offsetY}px`;
		displayBall.offsetHeight;
		displayBall.style.transition = $settingsStore.ballTransition + "ms ease-in-out";
		if (first) {
			displayBall.style.transition = "0.05s ease-in-out";
			displayBall.style.left = `${containerBounds.left + offsetX}px`;
			displayBall.style.top = `${containerBounds.top + offsetY}px`;
			setTimeout(() => {
				displayBall.style.transition = $settingsStore.ballTransition + "ms ease-in-out";
				displayBall.style.left = `${hiddenBounds.left + offsetX}px`;
				displayBall.style.top = `${hiddenBounds.top + offsetY}px`;
			}, 0);
		}
		first = false;
	}
</script>

<div bind:this={hiddenBall} class="inline-block" />
<div
	style="transition: {$settingsStore.ballTransition}ms ease-in-out; transition-property: left, top; --bg: white;"
	bind:this={displayBall}
	class="ball w-4 h-4 bg-gray-400 rounded-full fixed left-0 top-0 after:content-[''] after:absolute after:top-0 after:h-6 after:w-[999px] after:bg-[var(--bg)]"
/>

<style>
	.ball {
		transform-style: preserve-3d;
		transition-property: left, top, transform;
		transform-origin: center right;
	}

	.ball::after {
		transform: translateZ(-1px) translateY(-4px);
		background-color: var(--bg);
	}
</style>
