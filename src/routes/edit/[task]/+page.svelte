<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
	import typescript from "typescript";
	import { page } from "$app/stores";
	let editor: Monaco.editor.IStandaloneCodeEditor;
	let monaco: typeof Monaco;
	let editorContainer: HTMLElement;

	onMount(async () => {
		// Import our 'monaco.ts' file here
		// (onMount() will only be executed in the browser, which is what we want)
		monaco = (await import("$lib/monoco/index")).default;
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
		const schema = JSON.parse(localStorage.getItem("aiTasks") || "{}");
		const schemaName: keyof typeof schema = $page.params.task;
		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			`
            const _ = ${JSON.stringify(schema)};
            type StringToType<T extends string> = T extends "string" ? string : T extends "number" ? number : T extends "boolean" ? boolean : T extends "object" ? object : T extends "array" ? any[] : T extends "null" ? null : T extends "undefined" ? undefined : T extends "function" ? Function : T;
            type T = typeof _;
            type ${schemaName.charAt(0).toUpperCase() + schemaName.slice(1)} = {
			    [K in keyof T]: (params: {
				[P in keyof T[K]["params"]]: StringToType<T[K]["params"][P]["type"]>;
			    }) => any;
            }["${schemaName}"];`,
			"file:///_.d.ts",
		);
		// Your monaco instance is ready, let's display some code!
		const editor = monaco.editor.create(editorContainer, {
			automaticLayout: true,
		});
		editor.addAction({
			id: "save",
			label: "Save AI Task",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
			run: () => {
				const code = editor.getValue();
				const transpiled = typescript.transpile(code);
			},
		});
		const fns = JSON.parse(localStorage.getItem("aiFunctions") || "{}");
		const model = monaco.editor.createModel(
			fns[schemaName] ||
				`const ${schemaName}: ${schemaName.charAt(0).toUpperCase() + schemaName.slice(1)} = (params) => {
    console.log(params);
};

export default ${schemaName};`,
			"typescript",
		);
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
