import { describe, it, expect } from 'vitest';
import { driveViewUrl, imageFormula, extractImageUrl, extractFileId, resolvePhotoUrl } from './drive.js';

describe('driveViewUrl', () => {
	it('uses the thumbnail endpoint, not uc?export=view', () => {
		expect(driveViewUrl('ABC123')).toBe('https://drive.google.com/thumbnail?id=ABC123&sz=w1600');
	});
});

describe('extractFileId / resolvePhotoUrl', () => {
	it('extracts the file id from an IMAGE() formula and rebuilds a thumbnail URL', () => {
		const cell = imageFormula('XYZ789');
		expect(extractFileId(cell)).toBe('XYZ789');
		expect(resolvePhotoUrl(cell)).toBe('https://drive.google.com/thumbnail?id=XYZ789&sz=w1600');
	});

	it('upgrades photos stored with the old uc?export=view format', () => {
		const legacyCell = '=IMAGE("https://drive.google.com/uc?export=view&id=OLD456")';
		expect(extractFileId(legacyCell)).toBe('OLD456');
		expect(resolvePhotoUrl(legacyCell)).toBe('https://drive.google.com/thumbnail?id=OLD456&sz=w1600');
	});

	it('falls back to the raw URL for non-Drive links', () => {
		const cell = 'https://example.com/photo.jpg';
		expect(extractFileId(cell)).toBeNull();
		expect(resolvePhotoUrl(cell)).toBe('https://example.com/photo.jpg');
	});

	it('returns null for an empty cell', () => {
		expect(extractImageUrl('')).toBeNull();
		expect(resolvePhotoUrl('')).toBeNull();
	});
});
