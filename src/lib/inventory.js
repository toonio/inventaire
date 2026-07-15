import { listTabs, getTabData } from './google/sheets.js';
import { settings } from './stores/settings.svelte.js';
import { buildColumnIndex, rowToItem, isUnratedDesire } from './columnMapping.js';

/** Tabs to treat as inventory categories, honoring the optional Settings allow-list. */
export async function getVisibleTabs(accessToken) {
	const allTabs = await listTabs(settings.spreadsheetId, accessToken);
	if (!settings.includedTabs || settings.includedTabs.length === 0) return allTabs;
	return allTabs.filter((t) => settings.includedTabs.includes(t.title));
}

/**
 * Scans every visible tab and, for each configured person, counts how many
 * items they've rated a desire for — used by the "Non traités" submenu's
 * "(x/y)" progress label.
 */
export async function getReviewCounts(accessToken) {
	const tabs = await getVisibleTabs(accessToken);
	const byPerson = Object.fromEntries(settings.people.map((p) => [p.name, 0]));
	let total = 0;
	for (const tab of tabs) {
		const data = await getTabData(settings.spreadsheetId, tab.title, accessToken);
		const columnIndex = buildColumnIndex(data.headers, settings);
		total += data.rows.length;
		for (const row of data.rows) {
			const item = rowToItem(row, columnIndex);
			for (const person of settings.people) {
				if (!isUnratedDesire(item.desires[person.name])) {
					byPerson[person.name] += 1;
				}
			}
		}
	}
	return { total, byPerson };
}
