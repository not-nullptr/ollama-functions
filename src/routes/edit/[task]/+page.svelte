<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
	import typescript from "typescript";
	import { page } from "$app/stores";
	import { toolsStore } from "$lib/fncaller";
	import { mocha } from "$lib/monaco/theme";

	let editor: Monaco.editor.IStandaloneCodeEditor;
	let monaco: typeof Monaco;
	let editorContainer: HTMLElement;

	onMount(async () => {
		// Import our 'monaco.ts' file here
		// (onMount() will only be executed in the browser, which is what we want)
		monaco = (await import("$lib/monaco/index")).default;
		// const schema = {
		// 	arbitraryJs: {
		// 		description: "Runs arbitrary JavaScript code",
		// 		params: {
		// 			code: {
		// 				description:
		// 					"The JavaScript code to run, has to be valid JS code without any text or explanation",
		// 				type: "string",
		// 				required: true,
		// 			},
		// 		},
		// 	},
		// };
		const schema = $toolsStore.schema;
		const schemaName: keyof typeof schema = $page.params.task;
		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			`
            const _ = ${JSON.stringify(schema)};
            type StringToType<T extends string> = T extends "string" ? string : T extends "number" ? number : T extends "boolean" ? boolean : T extends "object" ? object : T extends "array" ? any[] : T extends "null" ? null : T extends "undefined" ? undefined : T extends "function" ? Function : T;
            type T = typeof _;
            type Tool = {
			    [K in keyof T]: (params: {
				[P in keyof T[K]["params"]]: StringToType<T[K]["params"][P]["type"]>;
			    }) => any;
            }["${schemaName}"];`,
			"file:///toolType.d.ts",
		);

		// monaco.editor.defineTheme("default", {
		// 	base: "vs-dark",
		// 	inherit: true,
		// 	rules: [
		// 		{
		// 			token: "identifier",
		// 			foreground: "9CDCFE",
		// 		},
		// 		{
		// 			token: "identifier.function",
		// 			foreground: "DCDCAA",
		// 		},
		// 		{
		// 			token: "type",
		// 			foreground: "1AAFB0",
		// 		},
		// 	],
		// 	colors: {},
		// });
		monaco.editor.defineTheme("mocha-fix", {
			base: "vs-dark",
			inherit: true,
			rules: [
				{
					token: "identifier.function",
					foreground: "86b4fa",
				},
				{
					token: "identifier",
					foreground: "86b4fa",
				},
				{
					token: "type",
					foreground: "f9de96",
				},
				...mocha.rules,
			],
			colors: {
				...mocha.colors,
			},
		});
		monaco.editor.setTheme("mocha-fix");

		const editor = monaco.editor.create(editorContainer, {
			automaticLayout: true,
		});
		editor.addAction({
			id: "save",
			label: "Save AI Task",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
			run: () => {
				const code = editor.getValue();
				$toolsStore.fns[schemaName] = {
					...$toolsStore.fns[schemaName],
					fn: code,
				};
			},
		});
		const fns = $toolsStore.fns;
		const model = monaco.editor.createModel(fns[schemaName]?.fn, "typescript");
		editor.setModel(model);
	});

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose());
		editor?.dispose();
	});
</script>

<div>
	<div class="w-screen h-screen" bind:this={editorContainer} />
</div>
