import { browser } from "$app/environment";
import type { StringToType } from "$lib/fncaller";
import { writable } from "svelte/store";

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
} as const;

type ReadOnlyStore = Partial<{
	[K in keyof typeof settingsSchema]: StringToType<(typeof settingsSchema)[K]["type"]>;
}>;

type Mutable = {
	-readonly [K in keyof ReadOnlyStore]: ReadOnlyStore[K];
};

export const settingsStore = writable<Mutable>(
	(browser ? JSON.parse(localStorage.getItem("settings") || "{}") : {}) ||
		// map the settingsSchema such that it becomes { name: default }
		Object.fromEntries(
			Object.entries(settingsSchema).map(([key, value]) => [key, value.default]),
		),
);