const STORAGE_KEY = 'inventaire:settings';

const DEFAULT_SETTINGS = {
	spreadsheetId: '',
	spreadsheetName: '',
	// null = every tab in the spreadsheet is treated as a category
	includedTabs: null,
	columns: {
		itemNumber: 'N°',
		designation: 'Nom',
		photo: 'Photo',
		attribution: 'Validation'
	},
	people: [
		{ name: 'Fanny', column: 'Fanny' },
		{ name: 'Antoine', column: 'Antoine' },
		{ name: 'Flo', column: 'Flo' },
		{ name: 'Marion', column: 'Marion' }
	],
	driveFolderId: null
};

function loadInitial() {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_SETTINGS);
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return structuredClone(DEFAULT_SETTINGS);
		return { ...structuredClone(DEFAULT_SETTINGS), ...JSON.parse(raw) };
	} catch {
		return structuredClone(DEFAULT_SETTINGS);
	}
}

export const settings = $state(loadInitial());

/** Persists the current settings to localStorage. Call after any mutation. */
export function saveSettings() {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	}
}

export function isConfigured() {
	return Boolean(settings.spreadsheetId);
}
