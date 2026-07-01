import { GOOGLE_API_KEY } from './config.js';

let pickerApiLoadPromise = null;

function loadPickerApi() {
	if (pickerApiLoadPromise) return pickerApiLoadPromise;
	pickerApiLoadPromise = new Promise((resolve, reject) => {
		if (window.google?.picker) {
			resolve();
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://apis.google.com/js/api.js';
		script.onload = () => {
			window.gapi.load('picker', { callback: resolve, onerror: reject });
		};
		script.onerror = () => reject(new Error('Failed to load Google API loader'));
		document.head.appendChild(script);
	});
	return pickerApiLoadPromise;
}

async function showPicker(view, { accessToken, onPicked }) {
	await loadPickerApi();
	const google = window.google;

	const picker = new google.picker.PickerBuilder()
		.setOAuthToken(accessToken)
		.setDeveloperKey(GOOGLE_API_KEY)
		.addView(view)
		.setCallback((data) => {
			if (data.action === google.picker.Action.PICKED) {
				const doc = data.docs[0];
				onPicked({ id: doc.id, name: doc.name, url: doc.url });
			}
		})
		.build();

	picker.setVisible(true);
}

/**
 * Opens the Google Picker restricted to images, so the user can attach an
 * existing Drive photo. `onPicked` is called with { id, name, url }.
 */
export async function openPicker({ accessToken, onPicked }) {
	await loadPickerApi();
	const google = window.google;
	const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
		.setIncludeFolders(true)
		.setSelectFolderEnabled(false);
	return showPicker(view, { accessToken, onPicked });
}

/**
 * Opens the Google Picker restricted to Google Sheets spreadsheets, so the
 * user can pick the inventory spreadsheet without copy-pasting its URL/ID.
 * `onPicked` is called with { id, name, url }.
 */
export async function openSpreadsheetPicker({ accessToken, onPicked }) {
	await loadPickerApi();
	const google = window.google;
	const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
		.setIncludeFolders(true)
		.setSelectFolderEnabled(false);
	return showPicker(view, { accessToken, onPicked });
}
