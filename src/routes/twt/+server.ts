import { TWITTER_API_KEY, TWITTER_USERNAME } from "$env/static/private";
import { json } from "@sveltejs/kit";
import { Rettiwt } from "rettiwt-api";

const rettiwt = new Rettiwt({
	apiKey: TWITTER_API_KEY,
});

export async function POST({ request }) {
	return new Promise(async (resolve) => {
		const body = await request.json();
		if (typeof body.tweet !== "string" || body.tweet.length > 280) {
			return json({ error: "Invalid tweet" }, { status: 400 });
		}
		const success = await rettiwt.tweet.tweet(body.tweet);
		if (!success) {
			return json({ error: "Failed to tweet" }, { status: 500 });
		}
		setTimeout(async () => {
			const potentialTweets = await rettiwt.tweet.search({
				fromUsers: [TWITTER_USERNAME],
				includePhrase: body.tweet,
			});
			console.log(potentialTweets);
			// get the newest tweet
			const tweet = potentialTweets.list.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)[0];
			console.log(tweet);
			resolve(json({ tweet }));
		}, 2000);
	});
}

export async function GET() {
	const potentialTweets = await rettiwt.tweet.search({
		fromUsers: [TWITTER_USERNAME],
	});
	// sort by newest
	const tweets = potentialTweets.list.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	return json({ tweets });
}
