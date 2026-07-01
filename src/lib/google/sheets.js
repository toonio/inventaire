import { apiFetch } from './http.js';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Quotes a tab name for use in an A1-notation range, e.g. Cuisine -> 'Cuisine' */
export function quoteTabName(tabName) {
	return `'${tabName.replace(/'/g, "''")}'`;
}

/** Lists every tab (sheet) in the spreadsheet with its title and numeric sheetId. */
export async function listTabs(spreadsheetId, accessToken) {
	const url = `${BASE_URL}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`;
	const data = await apiFetch(url, accessToken);
	return data.sheets.map((s) => ({ sheetId: s.properties.sheetId, title: s.properties.title }));
}

/**
 * Reads a tab's full data. Row 1 is treated as the header row.
 * Returns { headers: string[], rows: string[][] } where `rows` excludes the header.
 */
export async function getTabData(spreadsheetId, tabName, accessToken) {
	const range = `${quoteTabName(tabName)}`;
	const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
	const data = await apiFetch(url, accessToken);
	const values = data.values ?? [];
	const [headers = [], ...rows] = values;
	return { headers, rows };
}

/** Appends a new row of values to the end of the tab. */
export async function appendRow(spreadsheetId, tabName, accessToken, values) {
	const range = quoteTabName(tabName);
	const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
	return apiFetch(url, accessToken, {
		method: 'POST',
		body: JSON.stringify({ values: [values] })
	});
}

/**
 * Overwrites a specific row. `sheetRowNumber` is 1-based and includes the
 * header row, so the first data row is 2.
 */
export async function updateRow(spreadsheetId, tabName, accessToken, sheetRowNumber, values) {
	const range = `${quoteTabName(tabName)}!A${sheetRowNumber}`;
	const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
	return apiFetch(url, accessToken, {
		method: 'PUT',
		body: JSON.stringify({ values: [values] })
	});
}

/**
 * Deletes a specific row from the sheet, shifting rows below it up.
 * `sheetRowNumber` is 1-based and includes the header row.
 */
export async function deleteRow(spreadsheetId, sheetId, accessToken, sheetRowNumber) {
	const url = `${BASE_URL}/${spreadsheetId}:batchUpdate`;
	return apiFetch(url, accessToken, {
		method: 'POST',
		body: JSON.stringify({
			requests: [
				{
					deleteDimension: {
						range: {
							sheetId,
							dimension: 'ROWS',
							startIndex: sheetRowNumber - 1,
							endIndex: sheetRowNumber
						}
					}
				}
			]
		})
	});
}
