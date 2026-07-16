import { listTabs, getTabData } from './google/sheets.js';
import { settings } from './stores/settings.svelte.js';
import { buildColumnIndex, rowToItem, isUnratedDesire } from './columnMapping.js';

/**
 * Titles of the tabs selected by default when the user hasn't customized the
 * Settings tab allow-list yet: every tab except the last two, since those
 * tend to be summary/notes tabs rather than inventory categories.
 */
export function defaultIncludedTabTitles(allTabs) {
	return allTabs.slice(0, Math.max(0, allTabs.length - 2)).map((t) => t.title);
}

/** Tabs to treat as inventory categories, honoring the optional Settings allow-list. */
export async function getVisibleTabs(accessToken) {
	const allTabs = await listTabs(settings.spreadsheetId, accessToken);
	if (!settings.includedTabs || settings.includedTabs.length === 0) {
		const defaultTitles = defaultIncludedTabTitles(allTabs);
		return allTabs.filter((t) => defaultTitles.includes(t.title));
	}
	return allTabs.filter((t) => settings.includedTabs.includes(t.title));
}

/** True when every cell in a row is blank — Sheets can return these for genuinely empty rows in the middle of a tab. */
function isBlankRow(row) {
	return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '');
}

/**
 * Scans every visible tab and, for each configured person, counts how many
 * items they've rated a desire for — used by the header menu's recap popup.
 * `getTabData` already separates the header row from `rows`, so only blank
 * rows need filtering out here.
 */
export async function getReviewCounts(accessToken) {
	const tabs = await getVisibleTabs(accessToken);
	const byPerson = Object.fromEntries(settings.people.map((p) => [p.name, 0]));
	let total = 0;
	for (const tab of tabs) {
		const data = await getTabData(settings.spreadsheetId, tab.title, accessToken);
		const columnIndex = buildColumnIndex(data.headers, settings);
		const rows = data.rows.filter((row) => !isBlankRow(row));
		total += rows.length;
		for (const row of rows) {
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
