import { describe, it, expect } from 'vitest';
import { computeScaledDimensions } from './image.js';

describe('computeScaledDimensions', () => {
	it('leaves images already under the max dimension untouched', () => {
		expect(computeScaledDimensions(400, 300, 1600)).toEqual({ width: 400, height: 300 });
	});

	it('downscales the longest side to the max dimension, preserving aspect ratio', () => {
		expect(computeScaledDimensions(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
	});

	it('handles portrait images by scaling on height', () => {
		expect(computeScaledDimensions(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
	});

	it('never produces a zero dimension for extreme aspect ratios', () => {
		const { width, height } = computeScaledDimensions(10000, 1, 1600);
		expect(width).toBe(1600);
		expect(height).toBeGreaterThanOrEqual(1);
	});
});
