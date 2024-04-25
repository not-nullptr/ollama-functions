<script lang="ts">
	import { onMount } from "svelte";
	import "../app.css";
	import "iconify-icon";
	import { settingsStore } from "$lib/settings";
	import { toolsStore } from "$lib/fncaller";
	import { ai } from "$lib/ai";
	import { Ollama } from "ollama";

	onMount(() => {
		$toolsStore.fns = JSON.parse(localStorage.getItem("functions") || "{}");
		$toolsStore.schema = JSON.parse(localStorage.getItem("schema") || "{}");
		const unsubscribeSettings = settingsStore.subscribe((v) => {
			localStorage.setItem("settings", JSON.stringify(v));
		});
		const unsubscribeTools = toolsStore.subscribe((v) => {
			localStorage.setItem("schema", JSON.stringify(v.schema));
			localStorage.setItem("functions", JSON.stringify(v.fns));
		});
		ai.ollama = new Ollama({
			host: $settingsStore.ollamaUrl || "http://127.0.0.1:11434",
		});
		return () => {
			unsubscribeSettings();
			unsubscribeTools();
		};
	});
</script>

<slot />
