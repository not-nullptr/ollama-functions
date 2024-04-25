import { Ollama } from "ollama/browser";

export const model = "mistral:latest";

export let ai = {
	ollama: new Ollama({
		host:
			typeof window !== "undefined"
				? `${window.location.protocol}//${window.location.host.split(":")[0]}:${
						!!window.location.host.split(":")[1]
							? window.location.host.split(":")[1]
							: window.location.protocol.startsWith("https")
								? 443
								: 80
					}`
				: undefined,
	}),
};

export const host = "";
