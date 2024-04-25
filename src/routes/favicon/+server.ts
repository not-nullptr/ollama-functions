export async function GET({ url }) {
	const paramsK = url.searchParams.keys();
	const paramsV = url.searchParams.values();
	let newParamsArr: string[] = [];
	for (const param of paramsK) {
		newParamsArr.push(`${param}=${paramsV.next().value}`);
	}
	const res = await fetch(
		`http://s2.googleusercontent.com/s2/favicons?${newParamsArr.join("&")}`,
	);
	return new Response(res.body, {
		status: 200,
	});
}
