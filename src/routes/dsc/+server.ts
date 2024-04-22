import { DISCORD_TOKEN } from "$env/static/private";
import { json } from "@sveltejs/kit";
import WebSocket from "ws";

export interface UnreadIds {
	msgs: { [id: string]: { username: string; content: string }[] };
	username: string;
}

async function getUnreadIds(token: string): Promise<UnreadIds> {
	return new Promise<UnreadIds>((resolve, reject) => {
		const url = "wss://gateway.discord.gg/?v=9&encoding=json";
		const ws = new WebSocket(url);
		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					op: 2,
					d: {
						token,
						capabilities: 16381,
						properties: {
							os: "Linux",
							browser: "Firefox",
							device: "",
							system_locale: "en-US",
							browser_user_agent:
								"Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
							browser_version: "124.0",
							os_version: "",
							referrer: "https://discord.com/",
							referring_domain: "discord.com",
							referrer_current: "",
							referring_domain_current: "",
							release_channel: "stable",
							client_build_number: 286349,
							client_event_source: null,
							design_id: 0,
						},
						presence: { status: "unknown", since: 0, activities: [], afk: false },
						compress: false,
						client_state: { guild_versions: {} },
					},
				}),
			);
		};
		ws.onmessage = async (msg) => {
			const data = JSON.parse(msg.data.toString());
			if (data.t !== "READY") return;
			const ourId = data.d.user.id;
			const readState = data.d.read_state;
			console.log(readState);
			const states = readState.entries.filter(
				(entry: any) => entry.mention_count > 0 && entry.last_message_id !== 0,
			);
			ws.close();
			const unreadMsgs: {
				[id: string]: { username: string; content: string }[];
			} = {};
			const fetchedMentions = await fetch(
				"https://discord.com/api/v9/users/@me/mentions?limit=25&roles=true&everyone=true",
				{
					headers: {
						authorization: token,
					},
				},
			);
			const res = await fetchedMentions.json();
			console.log(res);
			for (const state of states) {
				console.log(state);
				for (let i = 0; i < state.mention_count; i++) {
					const msg = res.shift();
					const guild = data.d.guilds.find((guild: any) =>
						guild.channels.map((c: any) => c.id).includes(msg.channel_id),
					);
					if (!guild) continue;
					const mapped = {
						username: msg.author.global_name || msg.author.username,
						content: msg.content.replaceAll(`<@${ourId}>`, ``).trim() || "",
					};
					if (unreadMsgs[guild.properties.name]) {
						unreadMsgs[guild.properties.name].push(mapped);
					} else {
						unreadMsgs[guild.properties.name] = [mapped];
					}
				}
			}
			for (const key in unreadMsgs) {
				unreadMsgs[key] = unreadMsgs[key].reverse();
			}
			resolve({
				msgs: unreadMsgs,
				username: data.d.user.global_name || data.d.user.username,
			});
		};
	});
}

export async function GET({ request }) {
	const token = DISCORD_TOKEN;
	const unreadIds = await getUnreadIds(token);
	return json(unreadIds);
}
