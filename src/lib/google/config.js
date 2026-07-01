export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? '';

// drive.file: only files created by this app or explicitly picked by the
// user via the Google Picker — see CLAUDE.md > Google Cloud setup.
export const GOOGLE_SCOPES = [
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive.file',
	'openid',
	'email',
	'profile'
].join(' ');
