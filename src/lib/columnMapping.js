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
		designation: findHeaderIndex(headers, settings.columns.designation),
		photo: findHeaderIndex(headers, settings.columns.photo),
		comments: findHeaderIndex(headers, settings.columns.comments),
		estimation: findHeaderIndex(headers, settings.columns.estimation),
		attribution: findHeaderIndex(headers, settings.columns.attribution),
		desires: settings.people.map((p) => ({ name: p.name, index: findHeaderIndex(headers, p.column) }))
	};
}

/** Converts a raw sheet row into a logical item object. */
export function rowToItem(row, columnIndex) {
	const get = (i) => (i >= 0 ? (row[i] ?? '') : '');
	return {
		designation: get(columnIndex.designation),
		photo: get(columnIndex.photo),
		comments: get(columnIndex.comments),
		estimation: get(columnIndex.estimation),
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
	set(columnIndex.designation, item.designation);
	set(columnIndex.photo, item.photo);
	set(columnIndex.comments, item.comments);
	set(columnIndex.estimation, item.estimation);
	set(columnIndex.attribution, item.attribution);
	columnIndex.desires.forEach((d) => set(d.index, item.desires?.[d.name]));
	return row;
}
