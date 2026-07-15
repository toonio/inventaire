/** Sentinel selected from the header menu to show items attributed to someone outside the configured person list. */
export const OTHER_FILTER = '__other__';

/**
 * Shared UI state for the header menu's person filter. `mode` distinguishes
 * the "Attribués" submenu (items attributed to that person, searched across
 * every tab) from the "Non traités" submenu (items that person hasn't rated
 * yet, scoped to whichever tab is active).
 */
export const personFilter = $state({ name: null, mode: null });

export function setAttributionFilter(name) {
	personFilter.name = name;
	personFilter.mode = 'attributed';
}

export function setUnreviewedFilter(name) {
	personFilter.name = name;
	personFilter.mode = 'unreviewed';
}

export function clearPersonFilter() {
	personFilter.name = null;
	personFilter.mode = null;
}
