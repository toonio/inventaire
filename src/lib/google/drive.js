import { apiFetch } from './http.js';

const BASE_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

const APP_FOLDER_NAME = 'Inventaire Photos';

/**
 * Finds the app's photo folder (created by this app, per drive.file scope)
 * or creates it if it doesn't exist yet. Returns the folder id.
 */
export async function findOrCreateAppFolder(accessToken, folderName = APP_FOLDER_NAME) {
	const escapedName = folderName.replace(/'/g, "\\'");
	const q = encodeURIComponent(
		`name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
	);
	const listUrl = `${BASE_URL}/files?q=${q}&fields=files(id,name)&spaces=drive`;
	const listRes = await apiFetch(listUrl, accessToken);
	if (listRes.files?.length) return listRes.files[0].id;

	const createRes = await apiFetch(`${BASE_URL}/files?fields=id`, accessToken, {
		method: 'POST',
		body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' })
	});
	return createRes.id;
}

/** Uploads a photo blob into the given Drive folder. Returns { id, name }. */
export async function uploadPhoto(accessToken, folderId, blob, filename) {
	const mimeType = blob.type || 'image/jpeg';
	const metadata = { name: filename, parents: [folderId], mimeType };
	const boundary = `inventaire-${Math.random().toString(36).slice(2)}`;

	const metadataPart =
		`--${boundary}\r\n` +
		'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
		`${JSON.stringify(metadata)}\r\n`;
	const mediaHeader = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
	const closing = `\r\n--${boundary}--`;

	const body = new Blob([metadataPart, mediaHeader, blob, closing]);

	const res = await fetch(`${UPLOAD_URL}?uploadType=multipart&fields=id,name`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': `multipart/related; boundary=${boundary}`
		},
		body
	});
	if (!res.ok) {
		throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
	}
	return res.json();
}

/** Makes a Drive file viewable by anyone with the link (required for Sheets IMAGE()). */
export async function setFilePublic(accessToken, fileId) {
	return apiFetch(`${BASE_URL}/files/${fileId}/permissions`, accessToken, {
		method: 'POST',
		body: JSON.stringify({ role: 'reader', type: 'anyone' })
	});
}

export async function deleteFile(accessToken, fileId) {
	return apiFetch(`${BASE_URL}/files/${fileId}`, accessToken, { method: 'DELETE' });
}

export function driveViewUrl(fileId) {
	return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function imageFormula(fileId) {
	return `=IMAGE("${driveViewUrl(fileId)}")`;
}

/** Extracts a displayable image URL from a cell value (raw URL or =IMAGE("url") formula). */
export function extractImageUrl(cellValue) {
	if (!cellValue) return null;
	const formulaMatch = cellValue.match(/=IMAGE\("([^"]+)"/i);
	if (formulaMatch) return formulaMatch[1];
	if (/^https?:\/\//i.test(cellValue)) return cellValue;
	return null;
}

/** Extracts a Drive file id from a cell value that may be a raw URL or an =IMAGE(...) formula. */
export function extractFileId(cellValue) {
	const url = extractImageUrl(cellValue);
	if (!url) return null;
	const idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
	if (idParam) return idParam[1];
	const pathId = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
	if (pathId) return pathId[1];
	return null;
}
