<script lang="ts">
	import { browser } from "$app/environment";
	import { model, ollama } from "$lib/ai";
	import { FunctionCaller } from "$lib/fncaller";
	import type { Message } from "ollama/browser";
	import { onMount, tick } from "svelte";
	import type { Tweet } from "rettiwt-api";
	import type { UnreadIds } from "./dsc/+server";
	import sanitize from "sanitize-html";
	import { marked } from "marked";
	import TransitionalFunction from "$lib/components/TransitionalFunction.svelte";

	let input: HTMLTextAreaElement;
	let container: HTMLDivElement;
	let suggestion = "";
	let mentions: UnreadIds | null = null;

	let yapping = false;

	let beginInference: () => void;
	let cancelInference: () => void;
	let triggerFunction: () => Promise<void>;
	let iconUrl: string;

	let chatHistory: (Message & {
		source?: string;
		title?: string;
	})[] =
		// [
		// 	{
		// 		role: "system",
		// 		content:
		// 			'You are LLaMA, a helpful, witty, fun-to-chat-with but not over-the-top AI assistant. Current date is 22/04/2024, current time is 16:32:27. Use the following between <context> XML tags to help answer the user\'s question. Do not reference the context, do not mention "context" to the user, do not output the full context XML, only use the facts inside of it.\n<context>\n  Tweet successfully posted. Make sure to tell the user the Tweet Content.\n{\n    "tweetedContent": "Hey everyone, just a reminder that it\'s okay to take a step back and breathe. You\'ve got this! Have a great afternoon!"\n}\n</context>',
		// 	},
		// 	{
		// 		role: "user",
		// 		content: "could you post an afternoon motivational message for my followers?",
		// 	},
		// 	{
		// 		role: "assistant",
		// 		content:
		// 			"You've already got a tweet ready to go!\n\nHere's the content: \"Hey everyone, just a reminder that it's okay to take a step back and breathe. You've got this! Have a great afternoon!\"",
		// 		source: "https://twitter.com/notnullptr/status/1782432319179010260",
		// 	},
		// ];
		[];
	let newMsgOpts: Partial<(typeof chatHistory)[0]> = {};

	let on = true;
	$: console.log(chatHistory);
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
			getDiscordMentions: {
				description: "Gets the user's unread Discord mentions",
				params: {},
			},
			// createTweet: {
			// 	description: "!! DO NOT USE UNLESS USER ASKS SPECIFICALLY !! . Posts a tweet",
			// 	params: {
			// 		tweet: {
			// 			description:
			// 				"Write a tweet from the prompt, from the perspective of the user.",
			// 			type: "string",
			// 			required: true,
			// 		},
			// 	},
			// },
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
				},
			},
			getChatTheme: {
				description: "Gets the current chat theme.",
				params: {},
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
			},
		},
		{
			getDiscordMentions: {
				fn: async () => {
					const unread: UnreadIds = mentions || (await (await fetch("/dsc")).json());
					mentions = unread;
					return Object.keys(unread.msgs).length > 0
						? `If the user has asked for Discord notifications more than once, remind them that the result will be cached until they start a new chat. JSON schema is as follows: \n${JSON.stringify(
								{
									serverName: {
										type: {
											type: "array",
											properties: {
												username: {
													type: "string",
													description:
														"The name of the user who mentioned you",
												},
												content: {
													type: "string",
													description: "The content of the message",
												},
											},
										},
										description:
											"The name of the server and the messages in it which mention you",
									},
								},
							)}\n\n Unread discord mentions:\n ${JSON.stringify(unread.msgs, null, 2)}`
						: "You have no unread Discord mentions.";
				},
				icon: "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=https://discord.com",
			},
			// async createTweet({ tweet }) {
			// 	console.log("Posting", tweet);
			// 	const res = await postTweet(
			// 		`${tweet.replace(/\n+/g, ". ")} (DISCLAIMER: TWEETED BY AI)`,
			// 	);
			// 	const url = `https://twitter.com/${res.tweetBy.userName}/status/${res.id}`;
			// 	const req = await fetch(
			// 		"https://api.allorigins.win/get?url=" + encodeURIComponent(url),
			// 	);
			// 	const data = await req.json();
			// 	const doc = new DOMParser().parseFromString(data.contents, "text/html");
			// 	const title = doc.title;
			// 	newMsgOpts = {
			// 		source: `https://twitter.com/${res.tweetBy.userName}/status/${res.id}`,
			// 		title,
			// 	};
			// 	return `Tell the user that you just posted a tweet for them, with the following content:\n\n${tweet}\n\nTell the user that you posted the tweet, and tell them the contents, and provide some commentary on it.`;
			// },
			setGpuRgbLight: {
				fn: async ({ red, green, blue }) => {
					try {
						console.log("Setting RGB light to", red, green, blue);
						await fetch(`/gpu?rgb=${red},${green},${blue}`);
						return `Assistant has set the RGB value. Inform the user that the RGB light on their GPU has been set. Success!`;
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
	};

	const fixContainerScroll = async () => {
		await tick();
		container.scrollTop = container.scrollHeight;
	};

	const keyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && input.value.trim().length > 0) {
			e.preventDefault();
			sendMessage();
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
		if (fn?.function) {
			iconUrl =
				fnCaller.getIcon(fn.function) ||
				"https://s2.googleusercontent.com/s2/favicons?domain=undefined&sz=64";
			await tick();
			await triggerFunction();
			await new Promise((resolve) => setTimeout(resolve, 500)); // admire the animation lol

			const fnRes = await fnCaller.callFunction(fn);
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
		await new Promise((resolve) => setTimeout(resolve, 400));
		for await (const message of chat) {
			chatHistory[chatHistory.length - 1].content += message.message.content;
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

	const thisSucks = (md: string) => {
		return marked(md, {
			async: false,
		}) as string;
	};
</script>

<div
	bind:this={container}
	class="max-w-[1200px] p-4 overflow-y-auto py-8 ml-auto mr-auto w-screen h-screen text-xl"
>
	{#each chatHistory.filter((c) => c.role !== "system") as message}
		<div>
			<b>{message.role}</b>
			<div class="whitespace-pre-wrap">
				{#if !message.content && message.role === "assistant"}
					<TransitionalFunction
						bind:beginInference
						bind:cancelInference
						bind:triggerFunction
						bind:iconUrl
					/>
				{/if}{message.content}
			</div>
		</div>
		{#if message.source}
			<a
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
