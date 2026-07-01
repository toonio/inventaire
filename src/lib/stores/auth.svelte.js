// Shared auth state (Svelte 5 runes). Kept in memory only, mirrored to
// sessionStorage so a page refresh doesn't force an immediate re-login for
// as long as the Google access token remains valid.
const STORAGE_KEY = 'inventaire:auth';

function loadInitial() {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
		return parsed;
	} catch {
		return null;
	}
}

const initial = loadInitial();

export const auth = $state({
	accessToken: initial?.accessToken ?? null,
	expiresAt: initial?.expiresAt ?? null,
	email: initial?.email ?? null,
	name: initial?.name ?? null
});

export function setSession({ accessToken, expiresAt, email, name }) {
	auth.accessToken = accessToken;
	auth.expiresAt = expiresAt;
	auth.email = email ?? null;
	auth.name = name ?? null;
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
	}
}

export function clearSession() {
	auth.accessToken = null;
	auth.expiresAt = null;
	auth.email = null;
	auth.name = null;
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(STORAGE_KEY);
	}
}

export function isSignedIn() {
	return Boolean(auth.accessToken && auth.expiresAt && auth.expiresAt > Date.now());
}
