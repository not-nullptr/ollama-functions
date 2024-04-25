<script lang="ts">
	import { browser } from "$app/environment";
	import { host, model, ollama } from "$lib/ai";
	import { FunctionCaller } from "$lib/fncaller";
	import type { Message } from "ollama/browser";
	import { onMount, tick } from "svelte";
	import type { Tweet } from "rettiwt-api";
	// import type { UnreadIds } from "./dsc/+server";
	import sanitize from "sanitize-html";
	import { marked } from "marked";
	import TransitionalFunction from "$lib/components/TransitionalFunction.svelte";
	import CuteBall from "$lib/components/CuteBall.svelte";

	let input: HTMLTextAreaElement;
	let container: HTMLDivElement;

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

	let chatHistory: (Message & {
		source?: string;
		title?: string;
	})[] = [];
	let newMsgOpts: Partial<(typeof chatHistory)[0]> = {};

	let on = true;
	$: {
		on;
		console.log(on);
		(() => {
			if (!browser) return;
			if (!on) {
				document.body.classList.add("bg-gray-900");
				document.body.classList.add("text-gray-200");
				document.body.classList.remove("text-gray-900");
				document.body.classList.remove("bg-white");
			} else {
				document.body.classList.add("bg-white");
				document.body.classList.add("text-gray-900");
				document.body.classList.remove("text-gray-200");
				document.body.classList.remove("bg-gray-900");
			}
		})();
	}

	const postTweet = async (tweet: string): Promise<Tweet> => {
		const res = await fetch("/twt", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ tweet }),
		});
		const data: { tweet: Tweet } = await res.json();
		console.log(data);
		if (!data.tweet.id) throw new Error("Failed to post tweet");
		return data.tweet;
	};

	const fnCaller = new FunctionCaller(
		{
			// getDiscordMentions: {
			// 	description: "Gets the user's unread Discord mentions",
			// 	params: {},
			// },
			createTweet: {
				description:
					'Posts a Tweet. Only use when the user uses the phrases "post a tweet", "write a tweet" or similar.',
				params: {
					tweet: {
						description:
							"Write a tweet from the prompt, from the perspective of the user.",
						type: "string",
						required: true,
					},
				},
				requiredPhrases: [
					"post a tweet",
					"write a tweet",
					"tweet",
					"post that to twitter",
					"tweet that",
				],
			},
			setGpuRgbLight: {
				description: "Sets the RGB light on the user's GPU",
				params: {
					red: {
						description: "The red value of the RGB light, (0 - 255)",
						type: "number",
						required: true,
					},
					green: {
						description: "The green value of the RGB light (0 - 255)",
						type: "number",
						required: true,
					},
					blue: {
						description: "The blue value of the RGB light (0 - 255)",
						type: "number",
						required: true,
					},
					// colorName: {
					// 	description:
					// 		"The name of the color specified by the user, including any adjectives",
					// 	type: "string",
					// 	required: true,
					// },
				},
			},
			getChatTheme: {
				description: "Gets the current chat theme.",
				params: {},
				requiredPhrases: ["theme"],
			},
			setChatTheme: {
				description: "Sets the current chat theme",
				params: {
					theme: {
						type: "boolean",
						description:
							"Dark theme corresponds to false. Light theme corresponds to true.",
						required: true,
					},
				},
				requiredPhrases: ["theme"],
			},
			// searchWikipedia: {
			// 	description:
			// 		"Searches Wikipedia for an article, and then returns a relevant section.",
			// 	params: {
			// 		articleName: {
			// 			description: "The name of the article to search for.",
			// 			type: "string",
			// 			required: true,
			// 		},
			// 		query: {
			// 			description:
			// 				"The query to search for in the article. Relies on a Vector DB, so summarization won't work.",
			// 			type: "string",
			// 			required: true,
			// 		},
			// 	},
			// },
			// loadInfinitely: {
			// 	description: "Causes the LLM to load infinitely.",
			// 	params: {},
			// },
		},
		{
			// getDiscordMentions: {
			// 	fn: async () => {
			// 		const unread: UnreadIds = mentions || (await (await fetch("/dsc")).json());
			// 		mentions = unread;
			// 		return Object.keys(unread.msgs).length > 0
			// 			? `If the user has asked for Discord notifications more than once, remind them that the result will be cached until they start a new chat. JSON schema is as follows: \n${JSON.stringify(
			// 					{
			// 						serverName: {
			// 							type: {
			// 								type: "array",
			// 								properties: {
			// 									username: {
			// 										type: "string",
			// 										description:
			// 											"The name of the user who mentioned you",
			// 									},
			// 									content: {
			// 										type: "string",
			// 										description: "The content of the message",
			// 									},
			// 								},
			// 							},
			// 							description:
			// 								"The name of the server and the messages in it which mention you",
			// 						},
			// 					},
			// 				)}\n\n Unread discord mentions:\n ${JSON.stringify(unread.msgs, null, 2)}`
			// 			: "You have no unread Discord mentions.";
			// 	},
			// 	icon: "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=https://discord.com",
			// },
			createTweet: {
				fn: async ({ tweet }) => {
					console.log("Posting", tweet);
					const res = await postTweet(
						`${tweet.replace(/\n+/g, ". ")} (DISCLAIMER: TWEETED BY AI)`,
					);
					const url = `https://twitter.com/${res.tweetBy.userName}/status/${res.id}`;
					newMsgOpts = {
						source: url,
						title: `${res.tweetBy.userName} on Twitter: ${tweet}`,
					};
					return `Tell the user that you just posted a tweet for them, with the following content:\n\n${tweet}\n\nTell the user that you posted the tweet, and tell them the contents, and provide some commentary on it.`;
				},
				icon: "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=https://twitter.com",
			},
			setGpuRgbLight: {
				// fn: async ({ colorName }) => {
				fn: async ({ red, green, blue }) => {
					red = red || 0;
					green = green || 0;
					blue = blue || 0;
					// console.log("Setting RGB light to", colorName);
					try {
						// const rgb = await fetch(`${host}/api/chat`, {
						// 	method: "POST",
						// 	body: JSON.stringify({
						// 		model,
						// 		messages: [
						// 			{
						// 				role: "system",
						// 				content: `Given a description of a colour, come up with an RGB value to describe it, in the format:\n${JSON.stringify(
						// 					{
						// 						red: "number (0 - 255)",
						// 						green: "number (0 - 255)",
						// 						blue: "number (0 - 255)",
						// 					},
						// 					null,
						// 					2,
						// 				)}`,
						// 			},
						// 			{
						// 				role: "user",
						// 				content: "baby blue",
						// 			},
						// 			{
						// 				role: "assistant",
						// 				content: JSON.stringify({
						// 					red: 140,
						// 					green: 207,
						// 					blue: 230,
						// 				}),
						// 			},
						// 			{
						// 				role: "user",
						// 				content: colorName,
						// 			},
						// 		],
						// 		stream: false,
						// 		format: "json",
						// 	}),
						// });
						// const { red, green, blue } = JSON.parse((await rgb.json()).message.content);
						console.log("Setting RGB light to", red, green, blue);
						await fetch(`/gpu?rgb=${red},${green},${blue}`);
						return `Inform the user that you have set RGB light on their GPU. Success!`;
					} catch {
						return "An error occurred while setting the RGB light on the user's GPU.";
					}
				},
				icon: "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=https://nvidia.com",
			},
			getChatTheme: {
				fn: () => (on ? "Current theme is light" : "Current theme is dark"),
				icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnEo1pmjomnVL7tL5Zf4zGsrw0ZB99Y9I3rozNkNhhrQ&s",
			},
			// loadInfinitely: {
			// 	fn: () => {
			// 		return new Promise(() => {
			// 			console.log("!");
			// 		});
			// 	},
			// 	icon: "https://pbs.twimg.com/profile_images/1744316680505880576/CB9u_cmy_400x400.jpg",
			// },
			// setThemeState({ theme }) {
			// 	console.log("setting to", theme);
			// 	on = theme;
			// 	return `Theme updated to ${theme} successfully.`;
			// },
			setChatTheme: {
				fn: ({ theme }) => {
					if (typeof theme === "string") {
						theme = theme === "true";
					}
					console.log("setting to", theme);
					on = theme;
					return `LLaMA is setting the theme to ${theme ? "light" : "dark"}. Success!`;
				},
				icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnEo1pmjomnVL7tL5Zf4zGsrw0ZB99Y9I3rozNkNhhrQ&s",
			},
			// searchWikipedia: {
			// 	fn: ({ articleName }) => {
			// 		return ``;
			// 	},
			// 	icon: "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=https://wikipedia.org",
			// },
		},
	);

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
	// 			console.log(code);
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
		chatHistory = [
			...chatHistory,
			{ role: "user", content: input.value },
			{ ...newMsgOpts, role: "assistant", content: "" },
		];
		fixContainerScroll();
		await tick();
		beginInference();
		await tick();
		yapping = true;
		let query = input.value;
		let sysPrompt = "";
		if (chatHistory.filter((c) => c.role === "system").length === 0) {
			chatHistory = [
				{
					role: "system",
					content: "",
				},
				...chatHistory,
			];
			sysPrompt += `You are LLaMA, a helpful, witty, fun-to-chat-with but not over-the-top AI assistant. Current date is ${new Date().toLocaleDateString()}, current time is ${new Date().toLocaleTimeString()}. `;
		}
		const fn = await fnCaller.getFunction(query, chatHistory);
		// sometimes it outputs like { "name": {"param1": "value"} }
		const potentialFn = Object.keys(fn)[0];
		if (
			(fn?.function !== null && fn?.function !== undefined) ||
			(potentialFn !== null &&
				potentialFn !== undefined &&
				fnCaller.isInFunctions(potentialFn))
		) {
			console.log(fn?.function, potentialFn);
			const params = fn?.params || (fn as any)[potentialFn];
			iconUrl =
				fnCaller.getIcon(fn?.function || potentialFn) ||
				"https://s2.googleusercontent.com/s2/favicons?domain=undefined&sz=64";
			await tick();
			await triggerFunction();

			const fnRes = await fnCaller.callFunction(
				fn || {
					function: potentialFn,
					params,
				},
			);
			sysPrompt += `Use the following between <context> XML tags to help answer the user's question. Do not reference the context, do not mention "context" to the user, do not output the full context XML, only use the facts inside of it.\n<context>\n  ${fnRes}\n</context>`;
		}
		chatHistory[chatHistory.length - 1] = {
			...chatHistory[chatHistory.length - 1],
			...newMsgOpts,
		};
		chatHistory[0].content = sysPrompt;
		const chat = await ollama.chat({
			model,
			messages: [...chatHistory.slice(0, -1)],
			stream: true,
		});
		cancelInference();
		await new Promise((resolve) => setTimeout(resolve, 400)); // necessary for the animation to show
		await tick();
		for await (const message of chat) {
			await addText(
				() => {
					chatHistory[chatHistory.length - 1].content += message.message.content;
				},
				() => inferenceContainer.getBoundingClientRect(),
			);
			if (message.done) {
				yapping = false;
				newMsgOpts = {};
				await tick();
				input.focus();
			}
			fixContainerScroll();
			fixInputSize();
		}
	};
</script>

<div
	bind:this={container}
	class="max-w-[1200px] p-4 overflow-y-auto py-8 ml-auto mr-auto w-screen h-screen text-xl"
>
	{#each chatHistory.filter((c) => c.role !== "system") as message, i}
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
				{/if}{message.content}{#if message.role === "assistant" && i === chatHistory.length - 2 && yapping && message.content}
					<CuteBall bind:addText />
				{/if}
			</div>
		</div>
		{#if message.source}
			<a
				title={message.title}
				target="_blank"
				href={message.source}
				class="select-none transition-all duration-200 ease-in-out hover:bg-gray-300 active:bg-gray-400 active:border-gray-400 cursor-pointer w-[300px] items-center gap-2 flex rounded-lg border-2 border-gray-300 whitespace-nowrap overflow-hidden overflow-ellipsis text-sm mt-4 p-2 px-3 bg-gray-100"
			>
				<img
					src="https://s2.googleusercontent.com/s2/favicons?domain={new URL(
						message.source,
					).hostname}"
					alt="Icon"
					class="flex-shrink-0 h-full rounded-[4px]"
				/>
				<div class="whitespace-nowrap overflow-hidden overflow-ellipsis">
					{message.title || message.source}
				</div>
			</a>
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
	{#if !yapping}
		<b>user</b>
		<textarea
			class="resize-none w-full h-7 outline-none bg-transparent"
			on:input={fixInputSize}
			on:keydown={keyDown}
			bind:this={input}
			placeholder={suggestion || "type your message..."}
		/>
	{/if}
</div>
