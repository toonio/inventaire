/** Sentinel selected from the header menu to show items attributed to someone outside the configured person list. */
export const OTHER_FILTER = '__other__';

/** Shared UI state for the "show only this person's attributed items" header menu. */
export const personFilter = $state({ name: null });

export function setPersonFilter(name) {
	personFilter.name = name;
}

export function clearPersonFilter() {
	personFilter.name = null;
}
