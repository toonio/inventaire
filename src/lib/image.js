/** Pure helper: scales width/height down so the longest side is at most maxDimension. */
export function computeScaledDimensions(width, height, maxDimension) {
	const scale = Math.min(1, maxDimension / Math.max(width, height));
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

/**
 * Resizes and compresses an image file client-side using a canvas, so
 * phone photos are fast to upload. Returns a JPEG Blob.
 */
export async function compressImage(file, { maxDimension = 1600, quality = 0.82 } = {}) {
	const bitmap = await createImageBitmap(file);
	const { width, height } = computeScaledDimensions(bitmap.width, bitmap.height, maxDimension);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close?.();

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
			'image/jpeg',
			quality
		);
	});
}
