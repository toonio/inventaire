/**
 * Resolves the configured logical field names (from Settings) to actual
 * column indexes in a tab's header row. Missing columns resolve to -1 and
 * are simply skipped everywhere else, so the app degrades gracefully if a
 * tab doesn't have every column.
 */
export function buildColumnIndex(headers, settings) {
	const indexOf = (name) => headers.indexOf(name);
	return {
		designation: indexOf(settings.columns.designation),
		photo: indexOf(settings.columns.photo),
		comments: indexOf(settings.columns.comments),
		estimation: indexOf(settings.columns.estimation),
		attribution: indexOf(settings.columns.attribution),
		desires: settings.people.map((p) => ({ name: p.name, index: indexOf(p.column) }))
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
