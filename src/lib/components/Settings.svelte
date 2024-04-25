<script lang="ts">
	import { settingsSchema, settingsStore } from "$lib/settings";

	let settingsIcon: HTMLButtonElement;
	let settingsPanel: HTMLDivElement;
	let panelHeight = 0;
	let open = false;

	const openSettings = (e: MouseEvent) => {
		e.preventDefault();
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
		const validator = schemaItem.validate;
		if (validator && !validator(target.value as never)) {
			return;
		}
		if ((schemaItem.type as any) === "number") {
			($settingsStore as any)[key] = Number(target.value);
			return;
		}
		($settingsStore as any)[key as keyof typeof settingsSchema] = target.value;
	};

	const getSetting = (key: string) => {
		return (
			$settingsStore[key as keyof typeof settingsSchema] ||
			(settingsSchema as any)[key].default
		);
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
</script>

<div
	in:dumbTransitionIn={{}}
	out:dumbTransitionOut={{}}
	style="transition: all 0.5s ease; transform: translateY(-{open ? panelHeight : 0}px)"
>
	<div id="mainContent" class="w-screen flex items-center justify-center">
		<slot />
	</div>
	<button
		bind:this={settingsIcon}
		style="transition: all 0.5s ease; margin-bottom: {open ? -42 : 16}px"
		class="fixed w-7 h-7 bottom-0 left-0 ml-6 transform z-10"
		on:click={openSettings}
	>
		<iconify-icon
			style="font-size: 28px;"
			class="cursor-pointer"
			icon="material-symbols:settings-outline-rounded"
		/>
	</button>
	<div
		id="settings-form"
		bind:this={settingsPanel}
		class="w-screen h-64 fixed bottom-0 translate-y-full pt-12"
	>
		{#each Object.entries(settingsSchema) as [key, value]}
			<div class="flex gap-4 justify-between items-center p-4 border-b border-gray-200">
				<span class="flex-shrink-0">{value.label}</span>
				<input
					data-key={key}
					type="text"
					class=" p-1 px-2 outline-none flex-grow"
					on:input={(e) => changeSetting(key, e.target)}
					value={getSetting(key)}
				/>
			</div>
		{/each}
		<div class="flex gap-4 p-4">
			<a
				href="/edit"
				class="border-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
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
