import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config.js';
import { auth, setSession, clearSession } from '../stores/auth.svelte.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisLoadPromise = null;
let tokenClient = null;

function loadGisScript() {
	if (gisLoadPromise) return gisLoadPromise;
	gisLoadPromise = new Promise((resolve, reject) => {
		if (window.google?.accounts?.oauth2) {
			resolve();
			return;
		}
		const script = document.createElement('script');
		script.src = GIS_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
		document.head.appendChild(script);
	});
	return gisLoadPromise;
}

function getTokenClient() {
	if (tokenClient) return tokenClient;
	if (!GOOGLE_CLIENT_ID) {
		throw new Error(
			'Missing VITE_GOOGLE_CLIENT_ID. Copy .env.example to .env and fill in your Google Cloud OAuth Client ID.'
		);
	}
	tokenClient = window.google.accounts.oauth2.initTokenClient({
		client_id: GOOGLE_CLIENT_ID,
		scope: GOOGLE_SCOPES,
		callback: () => {} // overridden per-request below
	});
	return tokenClient;
}

async function fetchProfile(accessToken) {
	const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) return {};
	return res.json();
}

/**
 * Prompts the Google sign-in / consent popup and stores the resulting
 * access token in the shared auth store.
 */
export async function signIn() {
	await loadGisScript();
	const client = getTokenClient();

	const tokenResponse = await new Promise((resolve, reject) => {
		client.callback = (response) => {
			if (response.error) {
				reject(new Error(response.error_description || response.error));
			} else {
				resolve(response);
			}
		};
		client.requestAccessToken({ prompt: '' });
	});

	const expiresAt = Date.now() + Number(tokenResponse.expires_in) * 1000;
	const profile = await fetchProfile(tokenResponse.access_token);

	setSession({
		accessToken: tokenResponse.access_token,
		expiresAt,
		email: profile.email,
		name: profile.name
	});
}

export function signOut() {
	const token = auth.accessToken;
	clearSession();
	if (token && window.google?.accounts?.oauth2) {
		window.google.accounts.oauth2.revoke(token, () => {});
	}
}

export function getAccessToken() {
	if (!auth.accessToken || !auth.expiresAt || auth.expiresAt <= Date.now()) {
		return null;
	}
	return auth.accessToken;
}
