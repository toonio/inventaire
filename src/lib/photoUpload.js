import { compressImage } from './image.js';
import {
	findOrCreateAppFolder,
	uploadPhoto,
	setFilePublic,
	imageFormula,
	deleteFile
} from './google/drive.js';
import { settings, saveSettings } from './stores/settings.svelte.js';

async function ensureDriveFolder(accessToken) {
	if (settings.driveFolderId) return settings.driveFolderId;
	const folderId = await findOrCreateAppFolder(accessToken);
	settings.driveFolderId = folderId;
	saveSettings();
	return folderId;
}

/** Compresses and uploads a new photo file. Returns { fileId, formula }. */
export async function uploadNewPhoto(accessToken, file) {
	const folderId = await ensureDriveFolder(accessToken);
	const blob = await compressImage(file);
	const filename = `inventaire-${Date.now()}.jpg`;
	const uploaded = await uploadPhoto(accessToken, folderId, blob, filename);
	await setFilePublic(accessToken, uploaded.id);
	return { fileId: uploaded.id, formula: imageFormula(uploaded.id) };
}

/** Attaches a photo the user picked from their existing Drive via the Picker. */
export async function attachPickedPhoto(accessToken, fileId) {
	await setFilePublic(accessToken, fileId);
	return { fileId, formula: imageFormula(fileId) };
}

/** Best-effort cleanup of a replaced photo; failures are non-fatal. */
export function deletePreviousPhoto(accessToken, fileId) {
	if (!fileId) return;
	deleteFile(accessToken, fileId).catch(() => {});
}
