<script lang="ts">
	import { FastAverageColor } from "fast-average-color";

	let img: HTMLImageElement;
	let imgContainer: HTMLDivElement;
	let spinner: HTMLSpanElement;
	let loadContainer: HTMLDivElement;
	let loadContainerInternal: HTMLDivElement;

	export let iconUrl = `/favicon?domain=${encodeURIComponent("undefined")}&sz=64`;

	const defaultColor = "#3b82f6";
	const duration = 360;
	const ease = "ease-in-out";

	const onLoad = async () => {
		if (img.naturalHeight || !img.src) return;
		return new Promise<void>((resolve, reject) => {
			img.onload = () => {
				resolve();
			};
			img.onerror = (e) => {
				reject(e);
			};
		});
	};

	export const triggerFunction = async () => {
		console.log("!");
		await onLoad();
		console.log("!!");
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
				loadContainer.style.transformOrigin = "center";
				loadContainer.animate(
					[
						{
							transform: "translateY(0) scale(1.1, 0.9)",
							easing: "cubic-bezier(0,1,1,1)",
						},
						{
							transform: "translateY(-16px) scale(0.9, 1.1)",
							easing: "cubic-bezier(1,0,1,1)",
						},
						{
							transform: "translateY(0) scale(1)",
							easing: "cubic-bezier(0,1,1,1)",
						},
					],
					{
						duration: duration * 1.5,
						easing: ease,
						fill: "forwards",
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
		loadContainer.style.transformOrigin = "right";
		loadContainer.animate(
			[
				{
					transform: "translateX(0) scale(1)",
					easing: "ease-in",
				},
				{
					transform: "scale(0.8, 1.3) translateX(8px)",
					easing: "ease-out",
				},
				{
					transform: "scale(1.05, 0.95) translateX(-1px)",
					easing: "ease-in",
				},
				{
					transform: "scale(1)",
					easing: "ease-out",
				},
			],
			{
				duration: duration * 1.5,
				easing: ease,
				fill: "forwards",
				delay: duration / 3 - 160,
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
				duration: duration,
				fill: "forwards",
			},
		).onfinish = () => {
			loadContainer.style.transformOrigin = "right";
		};
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
	<div bind:this={loadContainerInternal}>
		<span
			style="border-bottom-color: {defaultColor}"
			bind:this={spinner}
			class="w-10 h-10 spin border-[5px] border-black/20 rounded-[50%] inline-block box-border"
		/>
		<div
			bind:this={imgContainer}
			class="absolute origin-right top-0 left-0 opacity-0 w-full h-full flex items-center justify-center"
		>
			<img
				crossorigin="anonymous"
				bind:this={img}
				src={iconUrl}
				alt="hero"
				class="w-5 h-5 rounded-full"
			/>
		</div>
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
