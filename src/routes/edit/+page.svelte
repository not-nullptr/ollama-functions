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
			createdAt: Date.now(),
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

<main
	class="p-4 w-screen h-screen flex flex-col"
	in:dumbTransitionIn={{}}
	out:dumbTransitionOut={{}}
>
	<div class="overflow-y-auto flex-grow pb-4 pl-1">
		{#each Object.entries($toolsStore.schema).sort((a, b) => {
			if ($toolsStore.fns[a[0]].createdAt < $toolsStore.fns[b[0]].createdAt) return -1;
			if ($toolsStore.fns[a[0]].createdAt > $toolsStore.fns[b[0]].createdAt) return 1;
			return 0;
		}) as [name, item]}
			{#key $toolsStore.fns[name].createdAt}
				<div class="mb-8">
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							checked={typeof $toolsStore.fns[name].enabled === "undefined"
								? true
								: $toolsStore.fns[name].enabled}
							on:change={(e) => {
								$toolsStore.fns[name].enabled = e.currentTarget.checked;
								$toolsStore = { ...$toolsStore };
							}}
							class="mt-0.5 rounded-lg border-2 border-gray-300 text-gray-500 h-6 w-6 -ml-1 cursor-pointer hover:bg-gray-200 active:bg-gray-400 active:border-gray-400 focus:ring-transparent transition-all ease-out duration-200"
						/>
						<h1
							on:input={(e) => {
								updateToolName(name, e.currentTarget.textContent || "");
							}}
							contenteditable
							class="font-bold text-2xl outline-none mb-2"
						>
							{name}
						</h1>
					</div>
					<details>
						<summary>Display</summary>
						<span>Description:</span>
						<span
							on:input={(e) => {
								updateToolSchema(name, {
									description: e.currentTarget.textContent || "",
								});
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
							class="outline-none w-full bg-transparent border-none focus:outline-none p-0 focus:border-none focus:ring-transparent"
						/>
						<!-- svelte-ignore a11y-missing-attribute -->
						<img src={$toolsStore.fns[name].icon} class="w-12 h-12 rounded-lg" />
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
										class="font-bold text-xl outline-none mb-2 mt-1"
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
														description:
															e.currentTarget.textContent || "",
													},
												},
											});
										}}
										contenteditable
										class="outline-none mb-1"
									>
										{param.description}
									</p>
									<label for="type">Type</label>
									<select
										class="mr-3 p-1 px-2 pr-7 border-2 border-gray-300 rounded-lg focus:ring-transparent focus:border-gray-300 outline-none"
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
										class="rounded-lg border-2 border-gray-300 text-gray-500 h-6 w-6 cursor-pointer hover:bg-gray-200 active:bg-gray-400 active:border-gray-400 focus:ring-transparent transition-all ease-out duration-200 -mt-1"
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
							class="text-black no-underline hover:text-black active:text-black hover:no-underline border-2 mt-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
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
			{/key}
		{/each}

		<button
			class="border-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
			on:click={createTool}
		>
			Create Tool
		</button>
	</div>
	<div class="bg-white border-t-2 border-t-gray-300 flex-shrink-0 p-4 w-full">
		<button
			class="border-2 border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 transition-all ease-out duration-200"
			on:click={() => goto("/")}
		>
			Go back
		</button>
	</div>
</main>
