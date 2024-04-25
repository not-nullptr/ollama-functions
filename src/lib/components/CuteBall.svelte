<script lang="ts">
	import { tick } from "svelte";

	export let offsetX: number = -24;
	export let offsetY: number = -14;

	let hiddenBall: HTMLDivElement;
	let displayBall: HTMLDivElement;

	export async function addText(cb: () => void, getContainerBounds: () => DOMRect) {
		const oldContainerBounds = getContainerBounds();
		cb();
		await tick();
		if (!hiddenBall || !displayBall) return;
		const hiddenBounds = hiddenBall.getBoundingClientRect();
		const containerBounds = getContainerBounds();
		displayBall.style.left = `${hiddenBounds.left + offsetX}px`;
		displayBall.style.top = `${hiddenBounds.top + offsetY}px`;
		if (oldContainerBounds.height !== containerBounds.height) {
			displayBall.style.setProperty("--bg", "transparent");
			setTimeout(() => {
				if (displayBall) displayBall.style.setProperty("--bg", "white");
			}, 250);
		}
	}
</script>

<div bind:this={hiddenBall} class="inline-block" />
<div
	style="transition: 0.02s ease-in-out; transition-property: left, top; --bg: white;"
	bind:this={displayBall}
	class="ball w-4 h-4 bg-gray-400 rounded-full fixed left-0 top-0 after:content-[''] after:absolute after:top-0 after:h-5 after:w-[999px] after:bg-[var(--bg)]"
/>

<style>
	.ball {
		transform-style: preserve-3d;
		transition-property: left, top, transform;
		transform-origin: center right;
	}

	.ball::after {
		transform: translateZ(-1px);
		background-color: var(--bg);
	}
</style>
