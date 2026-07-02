/** Shared UI state for the "show only this person's attributed items" header menu. */
export const personFilter = $state({ name: null });

export function setPersonFilter(name) {
	personFilter.name = name;
}

export function clearPersonFilter() {
	personFilter.name = null;
}
