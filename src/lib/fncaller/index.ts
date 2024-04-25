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
		requiredPhrases?: string[];
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
		const filteredSchema = {} as any;
		for (const key in this.schema) {
			const schema = this.schema[key];
			if (schema.requiredPhrases) {
				const required = schema.requiredPhrases;
				// if any of the required phrases are in the query, add it to the filtered schema
				if (required.some((phrase) => query.includes(phrase))) {
					filteredSchema[key] = schema;
				}
			} else {
				filteredSchema[key] = schema;
			}
		}
		const res = await fetch(`${host}/api/chat`, {
			method: "POST",
			body: JSON.stringify({
				model,
				messages: [
					{
						role: "system",
						content: `Functions: ${
							(JSON.stringify(filteredSchema), null, 4)
						}\nSchema: ${JSON.stringify(
							{
								function: {
									type: Object.keys(filteredSchema).join(" | "),
									required: false,
								},
								params: {
									type: "Map<string, any>",
									required: false,
								},
							},
							null,
							4,
						)}\n\nReturn a function from the list with the parameters filled in, using the format provided, with a string \"function\" and a map called \"params\". You are not required to return a function, only if the user asks for one in the list, or if the user passively asks. Return null if none match. Do not pick a function if the query doesn't include its required phrases. Only choose a function in the list, do not make them up. Only output JSON, no text or explanations!`,
					},
					{
						role: "user",
						content: `History: \n${history
							.slice(Math.max(history.length - 4, 1))
							.slice(0, -1)
							.map((h) => `${h.role}: ${h.content}`)
							.join("\n")}\n\nQuery: ${query}`,
					},
				],
				stream: false,
			}),
		});
		const response = (await res.json()) as ChatResponse;
		console.log(response.message.content);
		try {
			const message = JSON.parse(
				response.message.content.startsWith("null") ||
					response.message.content.startsWith("{}")
					? "{}"
					: response.message.content.replaceAll("`", ""),
			);
			return message as {
				function: keyof T;
				params: {
					[key: string]: string;
				};
			};
		} catch (e) {
			return {} as {
				function: keyof T;
				params: {
					[key: string]: string;
				};
			};
		}
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
			fnParams[key] = params[key] as any;
		}
		return this.fnMap[fn]?.fn(fnParams as any);
	}

	getIcon(fn: keyof T) {
		return this.fnMap[fn]?.icon;
	}

	isInFunctions(fn: string) {
		return !!this.schema[fn];
	}
}
