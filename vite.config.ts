import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import Icons from "unplugin-icons/vite";

export default defineConfig({
	plugins: [Icons(), sveltekit()],
	server: {
		proxy: {
			"/api": "http://localhost:11434",
		},
	},
});
