import { browser } from "$app/environment";
import { host, model } from "$lib/ai";
import type { ChatResponse, Message } from "ollama";

type StringToType<T extends string> = T extends "number"
	? number
	: T extends "string"
		? string
		: T extends "boolean"
			? boolean
			: T extends "bigint"
				? bigint
				: T extends "symbol"
					? symbol
					: T extends "undefined"
						? undefined
						: T extends "object"
							? object
							: never;

export interface FunctionSchema {
	[key: string]: {
		description: string;
		params: {
			[key: string]: {
				description: string;
				type:
					| "number"
					| "string"
					| "boolean"
					| "bigint"
					| "symbol"
					| "undefined"
					| "object";
				required: boolean;
			};
		};
	};
}

export class FunctionCaller<T extends FunctionSchema> {
	constructor(
		private schema: T,
		private fnMap: {
			[K in keyof T]: {
				fn: (params: {
					[P in keyof T[K]["params"]]: StringToType<T[K]["params"][P]["type"]>;
				}) => any;
				icon?: string;
			};
		},
	) {
		if (!browser) return;
		localStorage.setItem("aiTasks", JSON.stringify(schema));
		// convert everything in fnMap to strings
		const fnMapString = {} as any;
		for (const key in fnMap) {
			fnMapString[key] = fnMap[key].toString();
		}
		localStorage.setItem("aiFunctions", JSON.stringify(fnMapString));
	}
	async getFunction(query: string, history: Message[]) {
		const res = await fetch(`${host}/api/chat`, {
			method: "POST",
			body: JSON.stringify({
				model,
				messages: [
					{
						role: "system",
						content: `Return null if none match. Based on the given history and query, return a function from the schema with the parameters filled in. Return null if none match. Return \"null\" if no functions are relevant to the query and history.\nFunctions: ${JSON.stringify(
							this.schema,
						)}\nSchema: ${JSON.stringify(
							{
								function: { type: "string", required: true },
								params: {
									type: "Map<string, string>",
									required: false,
								},
							},
							null,
							4,
						)}\nReturn null if none match. Return null if none match. Return null if none match.`,
					},
					{
						role: "user",
						content: `History: []\nQuery: "Write me a cute story"`,
					},
					{
						role: "assistant",
						content: `null`,
					},
					{
						role: "user",
						content: `History: ${JSON.stringify(history, null, 4)}\nQuery: ${query}`,
					},
				],
				stream: false,
				format: "json",
			}),
		});
		const response = (await res.json()) as ChatResponse;
		const message = JSON.parse(response.message.content);
		return message as {
			function: keyof T;
			params: {
				[key: string]: string;
			};
		};
	}

	async callFunction({
		function: fn,
		params,
	}: {
		function: keyof T;
		params: { [key: string]: string };
	}) {
		const schema = this.schema[fn];
		if (!schema) return "";
		console.log(`A function call was requested: ${String(fn)} (${schema.description})`);
		const fnParams: {
			[key: string]: StringToType<T[keyof T]["params"][keyof T[keyof T]["params"]]["type"]>;
		} = {};
		for (const key in schema.params) {
			const param = schema.params[key];
			fnParams[key] = params[key] as any;
		}
		return this.fnMap[fn].fn(fnParams as any);
	}

	getIcon(fn: keyof T) {
		return this.fnMap[fn].icon;
	}

	async getSuggestion(query: string, history: Message[]) {
		const suggestionSchema = {
			suggestion: {
				type: "string",
				required: true,
			},
		};
		const res = await fetch(`${host}/api/chat`, {
			method: "POST",
			body: JSON.stringify({
				model,
				messages: [
					{
						role: "system",
						content: `Given the schema, the chat history and the query, output a suggestion for a follow-up question or fun continuation to the conversation. Mimick the user's typing patterns (punctuation, casing, etc)\nSchema: ${JSON.stringify(
							suggestionSchema,
						)}\nHistory: ${JSON.stringify(history)}`,
					},
					{ role: "user", content: query },
				],
				stream: false,
				format: "json",
			}),
		});
		const response = (await res.json()) as ChatResponse;
		console.log(response);
		const message = JSON.parse(response.message.content);
		return message as {
			suggestion: string;
		};
	}
}
