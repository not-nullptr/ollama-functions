<script lang="ts">
	import { browser } from "$app/environment";
	import { FunctionCaller, messagesStore, toolsStore } from "$lib/fncaller";
	import type { ChatResponse, Message } from "ollama/browser";
	import { onMount, tick } from "svelte";
	import type { Tweet } from "rettiwt-api";
	import TransitionalFunction from "$lib/components/TransitionalFunction.svelte";
	import CuteBall from "$lib/components/CuteBall.svelte";
	import Settings from "$lib/components/Settings.svelte";
	import { settingsStore } from "$lib/settings";
	import SvelteMarkdown from "svelte-markdown";
	import MdLink from "$lib/components/MdLink.svelte";

	let input: HTMLTextAreaElement;
	let container: HTMLDivElement;

	let usingMic = false;
	let ttsSpeaking = false;

	let inferenceContainer: HTMLDivElement;
	let addText: (cb: () => void, getContainerBounds: () => DOMRect) => Promise<void> = async (
		cb,
	) => {
		cb();
	};

	let suggestion = "";
	// let mentions: UnreadIds | null = null;

	let yapping = false;

	let beginInference: () => void;
	let cancelInference: () => void;
	let triggerFunction: () => Promise<void>;
	let iconUrl: string;
	let error = false;
	let ws: WebSocket | null;

	$: {
		if (browser) {
			if ($settingsStore.textToSpeech) {
				if (!ws) {
					ws = new WebSocket("ws://127.0.0.1:3000");
					ws.onmessage = (e) => {
						const msg = e.data.toString();
						if (msg === "THE MAN MADE HORROR DOTH SPEAKETH...") {
							console.log("its so over...");
							ttsSpeaking = false;
							runSpeechRecognition();
						} else {
							// read out blob as text
							const blob = new Blob([e.data], { type: "text/plain" });
							const reader = new FileReader();
							reader.onload = () => {
								const text = reader.result as string;
								console.log(text);
							};
							reader.readAsText(blob);
						}
					};
				}
				if (!yapping && !ttsSpeaking) {
					runSpeechRecognition();
				}
			} else {
				ws?.close();
				ws = null;
			}
		}
	}

	$: {
		$messagesStore;
		$messagesStore = $messagesStore;
	}
	let newMsgOpts: Partial<(typeof $messagesStore)[0]> = {};

	// let on = true;
	// $: {
	// 	on;
	//
	// 	(() => {
	// 		if (!browser) return;
	// 		if (!on) {
	// 			document.body.classList.add("bg-gray-900");
	// 			document.body.classList.add("text-gray-200");
	// 			document.body.classList.remove("text-gray-900");
	// 			document.body.classList.remove("bg-white");
	// 		} else {
	// 			document.body.classList.add("bg-white");
	// 			document.body.classList.add("text-gray-900");
	// 			document.body.classList.remove("text-gray-200");
	// 			document.body.classList.remove("bg-gray-900");
	// 		}
	// 	})();
	// }

	const postTweet = async (tweet: string): Promise<Tweet> => {
		const res = await fetch("/twt", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ tweet }),
		});
		const data: { tweet: Tweet } = await res.json();

		if (!data.tweet.id) throw new Error("Failed to post tweet");
		return data.tweet;
	};
	const fnCaller = new FunctionCaller($toolsStore.schema, $toolsStore.fns);

	// const fnCaller = new FunctionCaller(
	// 	{
	// 		arbitraryJs: {
	// 			description: "Runs arbitrary JavaScript code",
	// 			params: {
	// 				code: {
	// 					description:
	// 						"The JavaScript code to run, has to be valid JS code without any text or explanation",
	// 					type: "string",
	// 					required: true,
	// 				},
	// 			},
	// 		},
	// 		noFunction: {
	// 			description:
	// 				"Does nothing, for when the user asks a question that doesn't have a function",
	// 			params: {},
	// 		},
	// 	},
	// 	{
	// 		arbitraryJs: async ({ code }) => {
	//
	// 			try {
	// 				const res = eval(code);
	// 				return `Code successfully ran: ${code}\n\nOutput: ${res}`;
	// 			} catch (e) {
	// 				return `An error occurred: ${e} (did you provide valid JavaScript code?)`;
	// 			}
	// 		},
	// 		noFunction() {
	// 			return "";
	// 		},
	// 	},
	// );

	const fixInputSize = async () => {
		await tick();
		if (!input) return;
		input.style.height = "0px";
		input.style.height = input.scrollHeight + "px";
		fixContainerScroll();
	};

	const fixContainerScroll = async () => {
		await tick();
		container.scrollTop = container.scrollHeight;
	};

	const keyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && input.value.trim().length > 0) {
			e.preventDefault();
			try {
				sendMessage();
			} catch {
				error = true;
			}
		}
	};

	const sendMessage = async () => {
		let query = input.value;
		$messagesStore = [
			...$messagesStore,
			{ role: "user", content: input.value },
			{ ...newMsgOpts, role: "assistant", content: "" },
		];
		fixContainerScroll();
		await tick();
		beginInference();
		await tick();
		input.value = "";
		yapping = true;
		let sysPrompt = "";
		const date = new Date();
		const day = date.toLocaleString("en-GB", { weekday: "long" });
		const time = date.toLocaleString("en-GB", { hour: "numeric", minute: "numeric" });
		if ($messagesStore.filter((c) => c.role === "system").length === 0) {
			$messagesStore = [
				{
					role: "system",
					content: "",
				},
				...$messagesStore,
			];
			// sysPrompt += `You are LLaMA, a helpful, witty, fun-to-chat-with but not over-the-top AI assistant. Current date is ${day} ${date.toLocaleDateString()}, current time is ${time}. `;
			sysPrompt += `You are ${$settingsStore.textToSpeech ? "Jarvis, a friend for the user who is not an AI assistant, but a real person" : "LLaMA, a helpful AI assistant"}.${$settingsStore.textToSpeech ? " Keep text as short as possible, 2 sentences max. Do not say you're an AI, nor a language model, nor a large language model." : ""} Current date is ${day} ${date.toLocaleDateString()}, current time is ${time}. `;
		}
		const fn = await fnCaller.getFunction(query, $messagesStore);
		// sometimes it outputs like { "name": {"param1": "value"} }
		const potentialFn = Object.keys(fn)[0];
		if (
			(fn?.function !== null && fn?.function !== undefined) ||
			(potentialFn !== null &&
				potentialFn !== undefined &&
				fnCaller.isInFunctions(potentialFn)) ||
			Array.isArray(fn)
		) {
			const params = fn?.params || (fn as any)[potentialFn];
			iconUrl =
				fnCaller.getIcon(fn?.function || potentialFn) ||
				`/favicon?domain=${encodeURIComponent("https://ollama.com")}&sz=64`;
			await tick();
			await triggerFunction();

			const fnRes = await fnCaller.callFunction(
				fn || {
					function: potentialFn,
					params,
				},
				(val) => {
					newMsgOpts = val;
				},
			);

			sysPrompt += `Use the following between <context> XML tags to help answer the user's question. Do not reference the context, do not mention "context" to the user, do not output the full context XML, only use the facts inside of it.\n<context>\n  ${fnRes}\n</context>`;
		}
		$messagesStore[$messagesStore.length - 1] = {
			...$messagesStore[$messagesStore.length - 1],
			...newMsgOpts,
		};
		$messagesStore[0].content = sysPrompt;
		$messagesStore = [...$messagesStore];
		const chatReq = await fetch(`${$settingsStore.ollamaUrl}/api/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: $settingsStore.model,
				messages: [...$messagesStore.slice(0, -1)],
				stream: true,
			}),
		});
		const body = chatReq.body;
		if (!body) throw new Error("Failed to get response");
		cancelInference();
		await new Promise((resolve) => setTimeout(resolve, 400)); // necessary for the animation to show
		await tick();
		const reader = body.getReader();
		let ttsTextHolder = "";
		const handleMessage = async (message: ChatResponse) => {
			await addText(
				() => {
					ttsTextHolder += message.message.content;
					$messagesStore[$messagesStore.length - 1].content += message.message.content;
					if (
						message.message.content.includes("?") ||
						message.message.content.includes("!") ||
						message.message.content.includes(".") ||
						message.message.content.includes(":")
					) {
						if (ws) {
							ttsSpeaking = true;
							ws.send(ttsTextHolder);
							ttsTextHolder = "";
						}
					}
				},
				() => inferenceContainer.getBoundingClientRect(),
			);
			if (message.done) {
				newMsgOpts = {};
				yapping = false;
				if (!$settingsStore.textToSpeech) {
					await tick();
					input.focus();
				}
			}
			fixContainerScroll();
			fixInputSize();
		};
		const read = async ({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
			if (done) {
				return;
			}
			const string = new TextDecoder().decode(value);
			const objs = string
				.split("\n")
				.filter((v) => !!v)
				.map((v) => JSON.parse(v)) as ChatResponse[];
			for await (const obj of objs) {
				await handleMessage(obj);
			}
			reader.read().then(read);
		};
		reader.read().then(read);
	};

	const runSpeechRecognition = () => {
		if (webkitSpeechRecognition) {
			const recognition = new webkitSpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.lang = "en-GB";
			recognition.onresult = (event) => {
				const transcript = Array.from(event.results)
					.map((result) => result[0].transcript)
					.join("");
				input.value = transcript;
				fixInputSize();
				if (event.results[0].isFinal) {
					recognition.stop();
					sendMessage();
				}
			};
			recognition.start();
		}
	};

	onMount(() => {
		fixInputSize();
		fixContainerScroll();
		if ($settingsStore.textToSpeech) {
			runSpeechRecognition();
		}
		document.body.style.userSelect = "";
		const unsub = toolsStore.subscribe((val) => {
			fnCaller.setFunctions(val.schema, val.fns);
		});
		return () => {
			unsub();
			if (ws) {
				ws.close();
			}
		};
	});
</script>

<Settings>
	<div
		bind:this={container}
		style="scrollbar-width: none;"
		class="max-w-[1200px] pb-24 p-4 overflow-y-auto py-8 ml-auto mr-auto w-screen h-screen text-xl"
	>
		{#each $messagesStore.filter((c) => c.role !== "system") as message, i}
			<div>
				<b>{message.role}</b>
				<div class="whitespace-pre-wrap" bind:this={inferenceContainer}>
					{#if !message.content && message.role === "assistant"}
						<TransitionalFunction
							bind:beginInference
							bind:cancelInference
							bind:triggerFunction
							bind:iconUrl
						/>
					{/if}<span>
						<SvelteMarkdown
							isInline={true}
							renderers={{
								link: MdLink,
							}}
							source={message.content}
						/>
					</span>{#if message.role === "assistant" && i === $messagesStore.length - 2 && yapping && message.content}
						<CuteBall bind:addText />
					{/if}
				</div>
			</div>
			{#if message.sources && message.content}
				<div>
					{#each message.sources as source}
						<a
							title={source.title || source.url}
							target="_blank"
							href={source.url}
							class="text-black no-underline hover:text-black hover:no-underline active:text-black active:no-underline select-none mr-6 transition-all duration-200 ease-in-out hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 cursor-pointer w-[200px] items-center inline-block rounded-lg border-2 border-gray-300 whitespace-nowrap overflow-hidden overflow-ellipsis text-sm mt-4 p-2 px-3 bg-gray-100"
						>
							<div class="flex gap-2">
								<img
									src="/favicon?domain={new URL(source.url).hostname}"
									alt="Icon"
									class="flex-shrink-0 h-full rounded-[4px]"
								/>
								<div class="whitespace-nowrap overflow-hidden overflow-ellipsis">
									{source.title || source.url}
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
			<br />
		{/each}
		{#if error}
			<div class="text-red-500 -mt-28">
				<div>An error occurred while processing your request.</div>
				<button
					class="border-2 mt-4 border-gray-200 rounded-lg py-2 px-4"
					on:click={() => window.location.reload}
				>
					Reload
				</button>
			</div>
		{/if}
		{#if !yapping && !ttsSpeaking}
			<b>user</b>
			<textarea
				style="font-size: 20px; line-height: unset;"
				class="resize-none w-full h-7 outline-none bg-transparent overflow-y-hidden border-none focus:outline-none focus:ring-transparent p-0"
				on:input={fixInputSize}
				on:keydown={keyDown}
				bind:this={input}
				placeholder={suggestion || "type your message..."}
			/>
		{/if}
	</div>
</Settings>
