<script lang="ts">
	import { afterNavigate } from "$app/navigation";
	import { messagesStore } from "$lib/fncaller";
	import { settingsSchema, settingsStore } from "$lib/settings";
	import { onMount, tick } from "svelte";

	let settingsIcon: HTMLButtonElement;
	let settingsPanel: HTMLDivElement;
	let draggable: HTMLDivElement;
	let mainContent: HTMLDivElement;
	let nonSettingsBtns: HTMLDivElement;
	let panelHeight = 256;
	let open = false;
	let dragging = false;

	const toggleSettings = () => {
		const animation = settingsIcon.getAnimations().find((a) => a.id === "rotate-settings-icon");
		if (animation) return;
		settingsIcon.animate(
			[{ transform: "rotate(0deg)" }, { transform: `rotate(${open ? "-" : ""}360deg)` }],
			{
				duration: 550,
				easing: "ease",
				id: "rotate-settings-icon",
			},
		);
		const bounds = settingsPanel.getBoundingClientRect();
		panelHeight = bounds.height;
		open = !open;
	};

	const changeSetting = (key: string, target: EventTarget | null) => {
		if (!target || !(target instanceof HTMLInputElement)) return;
		const schemaItem = settingsSchema[key as keyof typeof settingsSchema];
		const validator = "validate" in schemaItem ? schemaItem.validate : null;
		if (validator && !validator(target.value as never)) {
			return;
		}
		if ((schemaItem.type as any) === "number") {
			($settingsStore as any)[key] = Number(target.value);
		} else if ((schemaItem.type as any) === "boolean") {
			($settingsStore as any)[key] = target.checked;
		} else ($settingsStore as any)[key as keyof typeof settingsSchema] = target.value;
		$settingsStore = { ...$settingsStore };
	};

	const getSetting = (key: string) => {
		const val = $settingsStore[key as keyof typeof settingsSchema];
		return val === undefined || val === null || typeof val === "undefined"
			? (settingsSchema as any)[key].default
			: val;
	};

	const clearSettings = () => {
		const settingsForm = document.getElementById("settings-form");
		if (!settingsForm) return;
		const inputs = settingsForm.querySelectorAll("input");
		for (const key in settingsSchema) {
			($settingsStore as any)[key] = (settingsSchema as any)[key].default;
			$settingsStore = { ...$settingsStore };
			for (const input of inputs) {
				if (input.getAttribute("data-key") === key) {
					input.value = (settingsSchema as any)[key].default;
				}
			}
		}
	};

	const dumbTransitionIn = (node: HTMLDivElement, opts: {}) => {
		node.style.position = "fixed";
		const bounds = settingsPanel.getBoundingClientRect();
		panelHeight = bounds.height;
		settingsIcon.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(-360deg)` }], {
			duration: 500,
			easing: "ease",
			fill: "forwards",
		});
		node.animate(
			[
				{ transform: `translateY(${-window.innerHeight / 1.55}px)`, opacity: 0 },
				{ transform: `translateY(0)`, opacity: 1 },
			],
			{
				duration: 500,
				easing: "ease",
			},
		);
		return {
			duration: 500,
		};
	};

	const dumbTransitionOut = (node: HTMLDivElement, opts: {}) => {
		panelHeight = window.innerHeight;
		const mainContent = document.getElementById("mainContent");
		if (!mainContent || !(mainContent instanceof HTMLDivElement))
			return {
				duration: 500,
			};
		settingsIcon.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(360deg)` }], {
			duration: 500,
			easing: "ease",
		});
		node.style.position = "fixed";
		const bounds = node.getBoundingClientRect();
		mainContent.style.marginLeft = `${window.innerWidth / 2 - bounds.width / 2}px`;
		node.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 500,
			easing: "ease",
			fill: "forwards",
		});
		return {
			duration: 500,
		};
	};

	onMount(() => {
		let initialX = 0;
		let initialY = 0;
		let lastX = 0;
		let lastY = 0;
		let initialContentY = 0;
		let initialBounds = draggable.getBoundingClientRect();

		function linearDecrease(num1: number, num2: number, distance: number) {
			if (num1 === num2) {
				return 1;
			} else {
				// Calculate the slope of the linear decrease
				const slope = 1 / distance;
				// Calculate the distance between num1 and num2
				const diff = Math.abs(num1 - num2);
				// Calculate the value based on linear interpolation
				const value = 1 - slope * diff;
				// Ensure the value doesn't go below 0
				return value >= 0 ? value : 0;
			}
		}

		function mouseDown(e: MouseEvent) {
			document.body.style.setProperty("-webkit-user-drag", "none");
			document.body.style.setProperty("user-select", "none");
			if (dragging) return;
			if ((e.target as any).id === "draggable") {
				dragging = true;
				lastX = e.clientX;
				lastY = e.clientY;
				const style = window.getComputedStyle(draggable);
				const matrix = new WebKitCSSMatrix(style.transform);
				initialX = matrix.m41;
				initialY = matrix.m42;
				const contentStyle = window.getComputedStyle(mainContent);
				const contentMatrix = new WebKitCSSMatrix(contentStyle.transform);
				initialContentY = contentMatrix.m42;
				initialBounds = draggable.getBoundingClientRect();
				window.addEventListener("mousemove", mouseMove);
				window.addEventListener("mouseup", mouseUp);
				draggable.style.pointerEvents = "none";
				draggable.getAnimations().forEach((a) => a.cancel());
				mainContent.getAnimations().forEach((a) => a.cancel());
				settingsIcon.getAnimations().forEach((a) => a.cancel());
			}
		}
		function remapValue(value: number, minValue: number, maxValue: number): number {
			// Normalize the value to a range between 0 and 1
			const normalizedValue = (value - minValue) / (maxValue - minValue);

			// Remap the normalized value to the new range
			const remappedValue = normalizedValue * (1 - 0) + 0;

			return remappedValue;
		}

		function mouseMove(e: MouseEvent) {
			const maxPxs = 800;
			const deltaY = e.clientY - lastY;
			const clamped = Math.min(Math.max(deltaY, -(maxPxs / 2)), maxPxs / 2);

			const yMin = lastY - maxPxs / 2;
			const yMax = lastY + maxPxs / 2;

			let scaleFactor = linearDecrease(
				lastY,
				Math.min(Math.max(e.clientY, yMin), yMax),
				maxPxs,
			);

			let animationController = remapValue(scaleFactor, 1, 0.5);
			if (open) animationController = 0 - animationController;

			const maxBlur = 4;
			const maxTY = 100;
			const maxRotate = 400;
			const maxOpacity = 1;
			const maxTX = 64;

			mainContent.style.transition = "none";
			settingsIcon.style.transition = "none";
			nonSettingsBtns.style.transition = "none";

			if (open) {
				mainContent.style.transform = `translateY(${initialContentY - maxTY * animationController}px)`;
				mainContent.style.filter = `blur(${
					remapValue(Math.max(maxBlur * -animationController, 0), 4, 0) + 2.36
				}px)`;
				settingsIcon.style.transform = `rotateZ(${maxRotate * animationController}deg)`;
				nonSettingsBtns.style.opacity = `${maxOpacity * -animationController - 0.25}`;
				nonSettingsBtns.style.transform = `translateX(${-maxTX * animationController - maxTX}px)`;
			} else {
				mainContent.style.transform = `translateY(${-(maxTY * animationController)}px)`;
				mainContent.style.filter = `blur(${Math.max(maxBlur * animationController, 0).toFixed(2)}px)`;
				settingsIcon.style.transform = `rotateZ(${maxRotate * animationController}deg)`;
				nonSettingsBtns.style.opacity = `${remapValue(maxOpacity * animationController, 0.5, 0)}`;
				nonSettingsBtns.style.transform = `translateX(${-(maxTX * animationController)}px)`;
			}

			mainContent.offsetHeight;
			settingsIcon.offsetHeight;
			nonSettingsBtns.offsetHeight;

			mainContent.style.transition = "";
			settingsIcon.style.transition = "";
			nonSettingsBtns.style.transition = "";

			const translatedY = initialY + clamped * Math.abs(scaleFactor);

			draggable.style.transform = `translate(0px, ${translatedY}px)`;
		}

		async function mouseUp() {
			document.body.style.setProperty("-webkit-user-drag", "");
			document.body.style.setProperty("user-select", "");
			await tick();
			window.removeEventListener("mousemove", mouseMove);
			window.removeEventListener("mouseup", mouseUp);
			settingsIcon.style.transition = "";
			settingsIcon.offsetHeight;
			settingsIcon.style.transform = `rotateZ(${open ? "-36" : "36"}0deg)`;

			draggable.animate(
				[
					{
						transform: "translateY(0)",
					},
				],
				{
					easing: "ease",
					duration: 500,
				},
			).onfinish = () => {
				dragging = false;
				draggable.style.transform = "";
				draggable.style.filter = "";
				draggable.getAnimations().forEach((a) => a.cancel());
				mainContent.getAnimations().forEach((a) => a.cancel());
			};
			open = !open;
			if (open) {
				nonSettingsBtns.style.pointerEvents = "none";
			} else {
				nonSettingsBtns.style.pointerEvents = "auto";
			}
			draggable.style.pointerEvents = "auto";
		}

		draggable.addEventListener("mousedown", mouseDown);
	});

	const eraseChat = () => {
		console.log($messagesStore);
		$messagesStore = [];
		console.log($messagesStore);
	};
</script>

<div
	in:dumbTransitionIn={{}}
	out:dumbTransitionOut={{}}
	style="transition: 0.5s ease; transition-property: transform; -webkit-user-drag: none; transform: translateY(-{open
		? panelHeight
		: 0}px)"
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={mainContent}
		style="transform: translateY({open ? 160 : 0}px); filter: blur({open ? 4 : 0}px)"
		id="mainContent"
		class="w-screen flex items-center justify-center after:content-[''] relative after:absolute after:w-full after:h-full {open
			? 'after:pointer-events-auto bg-black bg-opacity-20'
			: 'after:pointer-events-none'}"
	>
		<slot />
	</div>
	<div
		bind:this={draggable}
		id="draggable"
		style="box-shadow: {open
			? '0px -4px 20px rgba(0,0,0,0.25)'
			: '0px -0px 8px rgba(0,0,0,0.1)'}; transition: box-shadow 0.5s ease;"
		class="fixed bottom-0 left-0 w-full h-[56px] p-6 bg-white border-t-2 border-t-gray-200 z-50"
	>
		<div
			id="draggable"
			class="w-1/4 h-2 border-2 border-gray-200 bg-white border-b-white rounded-t-lg left-0 right-0 m-auto bottom-full absolute bg-gradient-to-t from-white to-gray-100"
		/>
		<div class="-ml-2 z-10 mt-[-11px] flex w-fit gap-4">
			<button
				bind:this={settingsIcon}
				class="w-7 h-7 transform settingsIcon"
				on:click={toggleSettings}
			>
				<iconify-icon
					style="font-size: 28px;"
					class="cursor-pointer"
					icon="material-symbols:settings-outline-rounded"
				/>
			</button>
			<div
				style="opacity: {open ? 0 : 1}; transform: translateX({open ? -48 : 0}px)"
				class="flex gap-4 non-settings"
				bind:this={nonSettingsBtns}
			>
				<button class="w-7 h-7 transform" on:click={eraseChat}>
					<iconify-icon style="font-size: 28px;" icon="icon-park-outline:clear-format"
					></iconify-icon>
				</button>
			</div>
		</div>
		<div
			id="settings-form"
			bind:this={settingsPanel}
			style="-webkit-user-drag: none; user-select: none;"
			class="w-screen h-64 fixed bottom-0 translate-y-full overflow-hidden flex flex-col bg-white left-0"
		>
			<div class="overflow-y-auto overflow-x-hidden flex-grow">
				{#each Object.entries(settingsSchema) as [key, value]}
					<div class="flex gap-4 items-center p-4 border-b border-gray-200">
						<span class="flex-shrink-0">{value.label}</span>
						<input
							data-key={key}
							type={value.type === "boolean" ? "checkbox" : "text"}
							class=" p-1 px-2 outline-none {value.type === 'boolean'
								? ''
								: 'flex-grow'}"
							on:input={(e) => changeSetting(key, e.target)}
							on:change={(e) => {
								changeSetting(key, e.target);
								console.log(key);
							}}
							value={getSetting(key)}
							checked={getSetting(key)}
							disabled={dragging}
						/>
					</div>
				{/each}
			</div>
			<div class="flex gap-4 p-4 flex-shrink-0">
				<a
					href="/edit"
					class="text-black no-underline hover:text-black active:text-black hover:no-underline border-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
				>
					Edit Tasks
				</a>
				<button
					on:click={clearSettings}
					class="border-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
				>
					Clear Settings
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	#mainContent {
		transition: 0.5s ease;
		transition-property: filter, transform, background;
	}

	.settingsIcon {
		transition: all 0.5s ease;
	}

	.non-settings {
		transition: 0.4s ease;
		transition-property: opacity, transform;
	}
</style>
