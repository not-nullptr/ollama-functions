module.exports = {
	apps: [
		{
			name: "ollama-functions",
			script: "./build/index.js",
			env_production: {
				NODE_ENV: "production",
				PORT: "3000",
			},
		},
	],
};
