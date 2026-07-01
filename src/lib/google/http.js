/** Shared fetch wrapper for authenticated Google API calls. */
export async function apiFetch(url, accessToken, options = {}) {
	const res = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			...options.headers
		}
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Google API error (${res.status}): ${body}`);
	}
	if (res.status === 204) return null;
	return res.json();
}
