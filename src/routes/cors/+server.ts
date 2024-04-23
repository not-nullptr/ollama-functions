export async function GET({ url }) {
	const corsUrl = url.searchParams.get("url");
	if (!corsUrl) return new Response("No URL provided", { status: 400 });
	const res = await fetch(corsUrl);
	const headers = new Headers(res.headers);
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	headers.set("Access-Control-Allow-Headers", "*");
	return new Response(res.body, { status: 200, headers });
}
