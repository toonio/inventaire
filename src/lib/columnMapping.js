function normalizeHeaderName(name) {
	return (name ?? '').trim().toLowerCase();
}

/**
 * Finds a header's column index, ignoring case and leading/trailing
 * whitespace differences between Settings' configured column name and the
 * spreadsheet's actual header (a common source of silent mismatches when
 * headers are typed by hand).
 */
function findHeaderIndex(headers, name) {
	const target = normalizeHeaderName(name);
	if (!target) return -1;
	return headers.findIndex((h) => normalizeHeaderName(h) === target);
}

/**
 * Resolves the configured logical field names (from Settings) to actual
 * column indexes in a tab's header row. Missing columns resolve to -1 and
 * are simply skipped everywhere else, so the app degrades gracefully if a
 * tab doesn't have every column.
 */
export function buildColumnIndex(headers, settings) {
	return {
		itemNumber: findHeaderIndex(headers, settings.columns.itemNumber),
		designation: findHeaderIndex(headers, settings.columns.designation),
		photo: findHeaderIndex(headers, settings.columns.photo),
		attribution: findHeaderIndex(headers, settings.columns.attribution),
		desires: settings.people.map((p) => ({ name: p.name, index: findHeaderIndex(headers, p.column) }))
	};
}

/** Converts a raw sheet row into a logical item object. */
export function rowToItem(row, columnIndex) {
	const get = (i) => (i >= 0 ? (row[i] ?? '') : '');
	return {
		itemNumber: get(columnIndex.itemNumber),
		designation: get(columnIndex.designation),
		photo: get(columnIndex.photo),
		attribution: get(columnIndex.attribution),
		desires: Object.fromEntries(columnIndex.desires.map((d) => [d.name, get(d.index)]))
	};
}

/**
 * Converts a logical item object back into a raw sheet row, preserving any
 * existing values in columns the app doesn't know about.
 */
export function itemToRow(item, columnIndex, headerCount, existingRow = []) {
	const row = Array.from({ length: headerCount }, (_, i) => existingRow[i] ?? '');
	const set = (i, value) => {
		if (i >= 0) row[i] = value ?? '';
	};
	set(columnIndex.itemNumber, item.itemNumber);
	set(columnIndex.designation, item.designation);
	set(columnIndex.photo, item.photo);
	set(columnIndex.attribution, item.attribution);
	columnIndex.desires.forEach((d) => set(d.index, item.desires?.[d.name]));
	return row;
}

/**
 * Computes the next sequential item number for a tab from the highest
 * existing numeric N° value, so adding an item doesn't require typing one
 * in manually. Returns null if the tab has no N° column configured.
 */
export function computeNextItemNumber(rows, columnIndex) {
	if (columnIndex.itemNumber < 0) return null;
	let max = 0;
	for (const row of rows) {
		const value = Number(row[columnIndex.itemNumber]);
		if (Number.isFinite(value) && value > max) max = value;
	}
	return max + 1;
}
