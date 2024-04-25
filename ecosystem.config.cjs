module.exports = {
	apps: [
		{
			name: "ollama-functions",
			script: "node build",
			env_production: {
				NODE_ENV: "production",
				PORT: "3000",
			},
		},
	],
};
