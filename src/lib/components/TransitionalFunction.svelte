<script lang="ts">
	import { FastAverageColor } from "fast-average-color";

	let img: HTMLImageElement;
	let imgContainer: HTMLDivElement;
	let spinner: HTMLSpanElement;
	let loadContainer: HTMLDivElement;

	export let iconUrl =
		"https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=https://twitter.com";

	const defaultColor = "#3b82f6";
	const duration = 360;
	const ease = "ease-in-out";

	const onLoad = async () => {
		if (img.naturalHeight) return;
		return new Promise<void>((resolve) => {
			img.onload = () => {
				resolve();
			};
		});
	};

	export const triggerFunction = async () => {
		await onLoad();
		const fac = new FastAverageColor();
		const color = await fac.getColorAsync(img);
		// if all the values are greater than 220, it's close to white
		const isCloseToWhite = Object.values(color.value)
			.slice(0, 2)
			.every((v) => v > 200);
		function areValuesClose(array: number[]) {
			// Find the maximum and minimum values in the array
			const max = Math.max(...array);
			const min = Math.min(...array);

			// Calculate the difference between the maximum and minimum values
			const difference = max - min;

			// Check if the difference is less than or equal to 15
			return difference <= 15;
		}
		imgContainer.animate(
			[
				{
					opacity: "0",
					transform: "translateX(-20px) scale(3, 0.333)",
				},
				{
					opacity: "1",
					transform: "translateX(4px) scale(0.9, 1.1)",
				},
				{
					opacity: "1",
					transform: "translateX(0) scale(1)",
				},
			],
			{
				duration,
				easing: ease,
				fill: "forwards",
			},
		).onfinish = () => {
			imgContainer.style.transformOrigin = "center";
			imgContainer.animate(
				[
					{
						transform: "rotate(0deg)",
						easing: "ease-in",
					},
					{
						transform: "rotate(360deg)",
					},
				],
				{
					duration: duration * 3,
					fill: "forwards",
					delay: 250,
				},
			).onfinish = () => {
				imgContainer.animate(
					[
						{
							transform: "rotate(0deg)",
						},
						{
							transform: "rotate(360deg)",
						},
					],
					{
						duration: duration * 2,
						fill: "forwards",
						easing: "linear",
						iterations: Infinity,
					},
				);
			};
		};
		setTimeout(() => {
			const cssAnim = spinner.getAnimations().find((a) => a.id !== "color");
			if (!cssAnim) return;
			cssAnim.playbackRate = 2;
		}, duration / 2);
		spinner.animate(
			[
				{
					borderBottomColor: defaultColor,
				},
				{
					borderBottomColor:
						isCloseToWhite && areValuesClose(Object.values(color.value).slice(0, 2))
							? defaultColor
							: color.rgb,
				},
			],
			{
				duration,
				easing: ease,
				fill: "forwards",
				id: "color",
			},
		);
		loadContainer.animate(
			[
				{
					transform: "translateX(0)",
					easing: "ease-in",
				},
				{
					transform: "translateX(8px)",
					easing: "ease-out",
				},
				{
					transform: "translateX(0)",
					easing: "ease-in",
				},
			],
			{
				duration,
				easing: ease,
				fill: "forwards",
				delay: duration / 3 - 128,
			},
		);
	};

	export const beginInference = () => {
		loadContainer.animate(
			[
				{
					transform: "translateY(48px) scale(0.5, 2)",
					opacity: "0",
					easing: "ease-in",
				},
				{
					transform: "translateY(0) scale(1.4, 0.3)",
					opacity: "1",
					easing: "ease-out",
				},
				{
					transform: "translateY(0) scale(0.9, 1.1)",
					opacity: "1",
					easing: "ease-in",
				},
				{
					transform: "translateY(0) scale(1)",
					opacity: "1",
					easing: "ease-out",
				},
			],
			{
				duration,
				fill: "forwards",
			},
		);
	};

	export const cancelInference = () => {
		loadContainer.style.transformOrigin = "center";
		loadContainer.animate(
			[
				{
					transform: "translateY(0) scale(1)",
					opacity: "1",
				},
				{
					transform: "scale(2)",
					opacity: "0",
				},
			],
			{
				duration: duration / 3,
				fill: "forwards",
				easing: ease,
			},
		).onfinish = () => {
			loadContainer.getAnimations().forEach((animation) => animation.cancel());
			imgContainer.getAnimations().forEach((animation) => animation.cancel());
			spinner
				.getAnimations()
				.filter((a) => a.id === "color")
				.forEach((animation) => animation.cancel());
			loadContainer.style.transformOrigin = "top";
			imgContainer.style.transformOrigin = "right";
			const cssAnim = spinner.getAnimations().find((a) => a.id !== "color");
			if (cssAnim) cssAnim.playbackRate = 1;
		};
	};
</script>

<div bind:this={loadContainer} class="relative w-10 h-10 origin-top mt-4 mb-2 opacity-0">
	<span
		style="border-bottom-color: {defaultColor}"
		bind:this={spinner}
		class="w-10 h-10 spin border-[5px] border-gray-200 rounded-[50%] inline-block box-border"
	/>
	<div
		bind:this={imgContainer}
		class="absolute origin-right top-0 left-0 opacity-0 w-full h-full flex items-center justify-center"
	>
		<img
			crossorigin="anonymous"
			bind:this={img}
			src="/cors?url={encodeURIComponent(iconUrl)}"
			alt="hero"
			class="w-5 h-5 rounded-full"
		/>
	</div>
</div>

<style>
	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.spin {
		animation: rotation 1s infinite linear;
	}
</style>
