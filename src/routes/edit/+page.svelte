<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { toolsStore, type FunctionSchema } from "$lib/fncaller";

	const createTool = () => {
		// find a tool name that doesn't exist
		let i = 0;
		while ($toolsStore.schema[`new-tool-${i}`]) {
			i++;
		}
		$toolsStore.schema[`new-tool-${i}`] = {
			description: "A new tool",
			params: {},
		};
		$toolsStore.fns[`new-tool-${i}`] = {
			fn: `// define your tool's code here\nconst run: Tool = ({}) => {\n    console.log("ran!");\n    return "";\n}\n\n// expose our tool to the LLM\nrun;`,
		};
	};

	const deleteTool = (name: string) => {
		delete $toolsStore.schema[name];
		delete $toolsStore.fns[name];
		$toolsStore = { ...$toolsStore };
	};

	const updateToolSchema = (name: string, schema: Partial<FunctionSchema[""]>) => {
		$toolsStore.schema[name] = { ...$toolsStore.schema[name], ...schema };
	};

	const updateToolSchemaUnsafe = (name: any, schema: any) => {
		$toolsStore.schema[name] = { ...$toolsStore.schema[name], ...schema };
	};

	const updateToolName = (oldName: string, newName: string) => {
		$toolsStore.schema[newName] = $toolsStore.schema[oldName];
		$toolsStore.fns[newName] = $toolsStore.fns[oldName];
		delete $toolsStore.schema[oldName];
		delete $toolsStore.fns[oldName];
		$toolsStore = { ...$toolsStore };
	};

	const updateToolIcon = (name: string, iconUrl: string) => {
		$toolsStore.fns[name].icon = iconUrl;
		$toolsStore = { ...$toolsStore };
	};

	const dumbTransitionIn = (node: HTMLElement, opts: {}) => {
		node.style.position = "fixed";
		node.animate(
			[
				{ transform: `translateY(${window.innerHeight / 1.55}px)`, opacity: 0 },
				{ transform: "translateY(0)", opacity: 1 },
			],
			{
				duration: 500,
				easing: "ease",
				fill: "forwards",
			},
		);
		return {
			duration: 500,
		};
	};

	const dumbTransitionOut = (node: HTMLElement, opts: {}) => {
		node.style.position = "fixed";
		node.animate(
			[
				{ opacity: 1, transform: "translateY(0)" },
				{ opacity: 0 },
				{ opacity: 0, transform: `translateY(${window.innerHeight / 1.55}px)` },
			],
			{
				duration: 500,
				easing: "ease",
				fill: "forwards",
			},
		);
		return {
			duration: 500,
		};
	};
</script>

<main class="p-4 w-screen h-screen" in:dumbTransitionIn={{}} out:dumbTransitionOut={{}}>
	{#each Object.entries($toolsStore.schema) as [name, item]}
		<div class="mb-8">
			<h1
				on:input={(e) => {
					updateToolName(name, e.currentTarget.textContent || "");
				}}
				contenteditable
				class="font-bold text-2xl outline-none mb-2"
			>
				{name}
			</h1>
			<details>
				<summary>Display</summary>
				<span>Description:</span>
				<span
					on:input={(e) => {
						updateToolSchema(name, { description: e.currentTarget.textContent || "" });
					}}
					contenteditable
					class="outline-none"
				>
					{item.description}
				</span>
				<br />
				<span>Icon URL:</span>
				<input
					on:input={(e) => {
						updateToolIcon(name, e.currentTarget.value);
					}}
					value={$toolsStore.fns[name].icon || ""}
					class="outline-none w-full bg-transparent"
				/>
				<img src={$toolsStore.fns[name].icon} alt="Icon" class="w-12 h-12" />
			</details>
			<details>
				<summary>Params</summary>
				<div>
					{#each Object.entries(item.params) as [paramName, param]}
						<div>
							<h2
								on:input={(e) => {
									const params = { ...item.params };
									delete params[paramName];
									params[e.currentTarget.textContent || ""] = param;
									updateToolSchema(name, { params });
								}}
								contenteditable
								class="font-bold text-lg outline-none"
							>
								{paramName}
							</h2>
							<p
								on:input={(e) => {
									updateToolSchema(name, {
										params: {
											...item.params,
											[paramName]: {
												...param,
												description: e.currentTarget.textContent || "",
											},
										},
									});
								}}
								contenteditable
								class="outline-none"
							>
								{param.description}
							</p>
							<label for="type">Type</label>
							<select
								id="type"
								on:change={(e) => {
									updateToolSchemaUnsafe(name, {
										params: {
											...item.params,
											[paramName]: {
												...param,
												type: e.currentTarget.value,
											},
										},
									});
								}}
								value={param.type}
							>
								<option value="string">String</option>
								<option value="number">Number</option>
								<option value="boolean">Boolean</option>
							</select>
							<label for="required">Required</label>
							<input
								id="required"
								type="checkbox"
								on:change={(e) => {
									updateToolSchemaUnsafe(name, {
										params: {
											...item.params,
											[paramName]: {
												...param,
												required: e.currentTarget.checked,
											},
										},
									});
								}}
								checked={param.required}
							/>
						</div>
						<button
							class="border-2 mt-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
							on:click={() => {
								const params = { ...item.params };
								delete params[paramName];
								updateToolSchema(name, { params });
							}}
						>
							Delete Param
						</button>
					{/each}
				</div>
				<button
					on:click={() => {
						const params = { ...item.params };
						params["new-param"] = {
							description: "A new param",
							type: "string",
							required: false,
						};
						updateToolSchema(name, { params });
					}}
					class="border-2 border-gray-300 mt-2 mb-8 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
				>
					Add Param
				</button>
			</details>
			<div class="flex gap-4">
				<a
					href="/edit/{encodeURIComponent(name)}"
					class="border-2 mt-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
				>
					Edit Code
				</a>
				<button
					class="border-2 mt-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
					on:click={() => deleteTool(name)}
				>
					Delete Tool
				</button>
			</div>
		</div>
	{/each}

	<button
		class="border-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
		on:click={createTool}
	>
		Create Tool
	</button>
	<button
		class="border-2 absolute bottom-0 left-0 m-4 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
		on:click={() => goto("/")}
	>
		Go back
	</button>
</main>
