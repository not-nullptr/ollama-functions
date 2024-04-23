import { json } from "@sveltejs/kit";
import child_process from "child_process";

export async function GET({ request, url }) {
	const rgb = url.searchParams.get("rgb");
	const [r, g, b] = (rgb || "").split(",").map((x) => parseInt(x));
	if (isNaN(r) || isNaN(g) || isNaN(b)) {
		return json({ error: "Invalid RGB" }, { status: 400 });
	}
	const hex = `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
	if (!hex) {
		return json({ error: "No hex provided" }, { status: 400 });
	}
	// run openrgb
	const openrgb = child_process.spawn("openrgb", ["--color", hex]);
	console.log(`openrgb --color ${hex}`);
	openrgb.on("error", (err) => {
		console.error(err);
	});
	openrgb.on("exit", (code) => {
		if (code !== 0) {
			console.error(`openrgb exited with code ${code}`);
		}
	});
	return json({ success: true });
}
