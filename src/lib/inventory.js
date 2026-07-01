import { listTabs } from './google/sheets.js';
import { settings } from './stores/settings.svelte.js';

/** Tabs to treat as inventory categories, honoring the optional Settings allow-list. */
export async function getVisibleTabs(accessToken) {
	const allTabs = await listTabs(settings.spreadsheetId, accessToken);
	if (!settings.includedTabs || settings.includedTabs.length === 0) return allTabs;
	return allTabs.filter((t) => settings.includedTabs.includes(t.title));
}
