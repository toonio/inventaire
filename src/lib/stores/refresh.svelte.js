/**
 * Bumped whenever something outside the listing page changes the
 * spreadsheet (currently the header menu's auto-attribution pass), so the
 * listing reloads instead of showing stale rows. Pages read `refresh.token`
 * inside their loading effect to subscribe.
 */
export const refresh = $state({ token: 0 });

export function requestRefresh() {
	refresh.token += 1;
}
