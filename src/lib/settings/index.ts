import { browser } from "$app/environment";
import type { StringToType } from "$lib/fncaller";
import { get, writable } from "svelte/store";

export const settingsSchema = {
	ollamaUrl: {
		label: "Ollama URL",
		type: "string",
		default: "http://127.0.0.1:11434",
		validate: (value: string) => {
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
	},
	model: {
		label: "Model",
		type: "string",
		default: "llama3:8b",
	},
	enforceJsonOutput: {
		label: "Enforce JSON Output (slower but far more reliable)",
		type: "boolean",
		default: true,
	},
	ballTransition: {
		label: "Ball Transition Duration",
		type: "number",
		default: 150,
	},
} as const;

type ReadOnlyStore = Partial<{
	[K in keyof typeof settingsSchema]: StringToType<(typeof settingsSchema)[K]["type"]>;
}>;

type Mutable = {
	-readonly [K in keyof ReadOnlyStore]: ReadOnlyStore[K];
};

const defaults = Object.fromEntries(
	Object.entries(settingsSchema).map(([key, value]) => [key, value.default]),
);

const local = browser ? JSON.parse(localStorage.getItem("settings") || "null") : null;

export const settingsStore = writable<Mutable>({
	...defaults,
	...local,
});
