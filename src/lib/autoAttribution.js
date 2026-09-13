import { getTabData, batchUpdateValues, quoteTabName, columnLetter } from './google/sheets.js';
import { settings } from './stores/settings.svelte.js';
import { buildColumnIndex, rowToItem, isUnratedDesire } from './columnMapping.js';
import { getVisibleTabs } from './inventory.js';

/** Attribution written for items nobody wants — the donation catalogue. */
export const CATALOGUE_ATTRIBUTION = 'catalogue';

/**
 * Decides the automatic attribution for a single item, or null when it must
 * be left untouched. Only fully reviewed, unattributed items are eligible:
 *
 * - every configured person rated 0 (or less) -> the donation catalogue,
 * - exactly one person rated above 0 -> that person,
 * - anything else (already attributed, two or more people interested, or a
 *   missing/unrated cell) -> null, since a blank cell means that person
 *   hasn't given their opinion yet and attributing now would pre-empt it.
 */
export function computeAutoAttribution(item, peopleNames) {
	if (!peopleNames.length) return null;
	if (String(item.attribution ?? '').trim()) return null;
	const interested = [];
	for (const name of peopleNames) {
		const raw = item.desires?.[name];
		if (isUnratedDesire(raw)) return null;
		const value = Number(String(raw).replace(',', '.'));
		if (!Number.isFinite(value)) return null;
		if (value > 0) interested.push(name);
	}
	if (interested.length === 0) return CATALOGUE_ATTRIBUTION;
	if (interested.length === 1) return interested[0];
	return null;
}

/**
 * Scans every visible tab and builds the list of attributions the pass would
 * write, without touching the spreadsheet. Shown to the user for
 * confirmation before `applyAutoAttributions` commits it.
 */
export async function planAutoAttributions(accessToken) {
	const tabs = await getVisibleTabs(accessToken);
	const peopleNames = settings.people.map((p) => p.name);
	const plan = [];
	const warnings = [];
	let scanned = 0;
	for (const tab of tabs) {
		const data = await getTabData(settings.spreadsheetId, tab.title, accessToken);
		const columnIndex = buildColumnIndex(data.headers, settings);
		if (columnIndex.attribution < 0) {
			warnings.push(
				`Colonne « ${settings.columns.attribution} » introuvable dans « ${tab.title} » — onglet ignoré.`
			);
			continue;
		}
		const missing = columnIndex.desires.filter((d) => d.index < 0).map((d) => d.name);
		if (missing.length) {
			warnings.push(
				`Colonnes manquantes dans « ${tab.title} » : ${missing.join(', ')} — objets ignorés.`
			);
		}
		data.rows.forEach((row, i) => {
			const item = rowToItem(row, columnIndex);
			scanned += 1;
			const attribution = computeAutoAttribution(item, peopleNames);
			if (!attribution) return;
			plan.push({
				tabTitle: tab.title,
				rowNumber: i + 2,
				columnIndex: columnIndex.attribution,
				itemNumber: item.itemNumber,
				designation: item.designation,
				attribution
			});
		});
	}
	return { plan, warnings, scanned, tabCount: tabs.length };
}

/** Builds the A1 ranges a plan writes to — one single cell per item. */
export function planToRangeUpdates(plan) {
	return plan.map((entry) => ({
		range: `${quoteTabName(entry.tabTitle)}!${columnLetter(entry.columnIndex)}${entry.rowNumber}`,
		values: [[entry.attribution]]
	}));
}

/** Commits a plan built by `planAutoAttributions` in one batched write. */
export async function applyAutoAttributions(plan, accessToken) {
	if (!plan.length) return 0;
	await batchUpdateValues(settings.spreadsheetId, accessToken, planToRangeUpdates(plan));
	return plan.length;
}
