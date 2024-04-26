<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
	import { page } from "$app/stores";
	import { toolsStore } from "$lib/fncaller";
	import { mocha } from "$lib/monaco/theme";
	import { goto } from "$app/navigation";
	import { settingsSchema, settingsStore } from "$lib/settings";

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
            const _ = ${JSON.stringify(schema)} as const;
			const settingsSchema = ${JSON.stringify(settingsSchema)};
			type ReadOnlyStore = Partial<{
	            [K in keyof typeof settingsSchema]: StringToType<(typeof settingsSchema)[K]["type"]>;
            }>;

            type Mutable = {
            	-readonly [K in keyof ReadOnlyStore]: ReadOnlyStore[K];
            };
            type StringToType<T extends string> = T extends "string" ? string : T extends "number" ? number : T extends "boolean" ? boolean : T extends "object" ? object : T extends "array" ? any[] : T extends "null" ? null : T extends "undefined" ? undefined : T extends "function" ? Function : T;
            type T = typeof _;
            type Tool = {
			    [K in keyof T]: (params: {
				[P in keyof T[K]["params"]]: StringToType<T[K]["params"][P]["type"]>;
			    }, addOpt: (
					v: Partial<
						{
							role: string;
							content: string;
							sources: {
								title: string;
								url: string;
							}[];
							title: string;
						}
					>
				) => void, settings: Mutable) => any;
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

		const _editor = monaco.editor.create(editorContainer, {
			automaticLayout: true,
		});
		_editor.addAction({
			id: "save",
			label: "Save AI Tool",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
			run: () => {
				const code = _editor.getValue();
				$toolsStore.fns[schemaName] = {
					...$toolsStore.fns[schemaName],
					fn: code,
				};
			},
		});
		_editor.addAction({
			id: "test",
			label: "Test AI Tool",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
			run: test,
		});
		const fns = $toolsStore.fns;
		const model = monaco.editor.createModel(fns[schemaName]?.fn, "typescript");
		_editor.setModel(model);
		editor = _editor;
	});

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose());
		editor?.dispose();
	});

	const save = () => {
		const code = editor.getValue();
		$toolsStore.fns[$page.params.task] = {
			...$toolsStore.fns[$page.params.task],
			fn: code,
		};
	};

	const saveAndGoBack = () => {
		save();
	};

	const test = async () => {
		console.log("transpiling...");
		const codeTs = editor.getValue();
		const typescript = await import("typescript");
		const code = typescript.transpile(codeTs, {
			lib: ["es2022"],
			target: typescript.ScriptTarget.ES2017,
		});
		const fn = eval(code);
		const schema = $toolsStore.schema;
		const schemaName: keyof typeof schema = $page.params.task;

		// for each parameter, prompt the user for a value
		const params = Object.keys(schema[schemaName].params).reduce(
			(acc, key) => {
				const param = schema[schemaName].params[key];
				const value = prompt(`Enter a value for ${key} (${param.type})`);
				if (value === null) return acc;
				acc[key] =
					param.type === "number"
						? parseInt(value)
						: param.type === "boolean"
							? value !== "false"
							: (value as any);
				return acc;
			},
			{} as Record<string, string>,
		);
		if (Object.keys(params).length === 0) return;
		console.log("running...");
		const res = await fn(
			params,
			(v: any) => {
				console.log("[DEBUG] Added optional data", v);
			},
			$settingsStore,
		);
		console.log("result:", res);
	};
</script>

<div>
	<div class="w-screen h-screen" bind:this={editorContainer} />
	<div class="fixed bottom-0 right-0 p-4 px-8 z-50 bg flex gap-4">
		<button
			class="text-black no-underline hover:text-black active:text-black hover:no-underline border-2 bg-white border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
			on:click={test}
		>
			Test
		</button>
		<a
			href="/edit"
			style="-webkit-user-drag: none;"
			class="text-black no-underline hover:text-black active:text-black hover:no-underline border-2 bg-white border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
			on:click={saveAndGoBack}
		>
			Save and go back
		</a>
	</div>
</div>
