/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{html,js,svelte,ts}"],
	theme: {
		extend: {
			colors: {
				blurple: "#5865f2",
				"primary-bg": "var(--background-primary)",
				"secondary-bg": "var(--background-secondary)",
				"tertiary-bg": "var(--background-tertiary)",
				"input-bg": "var(--input-background)",
				"header-primary": "var(--header-primary)",
				"header-secondary": "var(--header-secondary)",
				"channels-default": "var(--channels-default)",
				selected: "var(--background-modifier-selected)",
				hover: "var(--background-modifier-hover)",
				active: "var(--background-modifier-active)",
				"channel-icon": "var(--channel-icon)",
				"text-interactive-active": "var(--text-interactive-active)",
				normal: "var(--text-normal)",
				"background-modifier-accent": "var(--background-modifier-accent)",
				muted: "var(--text-muted)",
			},
			boxShadow: {
				"elevation-high": "var(--elevation-high)",
				"elevation-medium": "var(--elevation-medium)",
				"elevation-low": "var(--elevation-low)",
			},
		},
	},
	plugins: [],
};
