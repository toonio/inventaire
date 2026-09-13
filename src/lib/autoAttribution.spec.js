import { describe, it, expect } from 'vitest';
import {
	computeAutoAttribution,
	planToRangeUpdates,
	CATALOGUE_ATTRIBUTION
} from './autoAttribution.js';

const people = ['Fanny', 'Antoine', 'Flo', 'Marion'];

function item(desires, attribution = '') {
	return { attribution, desires };
}

describe('computeAutoAttribution', () => {
	it('sends items nobody wants to the donation catalogue', () => {
		const result = computeAutoAttribution(
			item({ Fanny: '0', Antoine: '0', Flo: '0', Marion: '0' }),
			people
		);
		expect(result).toBe(CATALOGUE_ATTRIBUTION);
	});

	it('treats negative ratings as no interest', () => {
		const result = computeAutoAttribution(
			item({ Fanny: '-1', Antoine: '0', Flo: '-3', Marion: '0' }),
			people
		);
		expect(result).toBe(CATALOGUE_ATTRIBUTION);
	});

	it('attributes to the only interested person', () => {
		const result = computeAutoAttribution(
			item({ Fanny: '0', Antoine: '4', Flo: '0', Marion: '-1' }),
			people
		);
		expect(result).toBe('Antoine');
	});

	it('leaves contested items alone', () => {
		const result = computeAutoAttribution(
			item({ Fanny: '5', Antoine: '4', Flo: '0', Marion: '0' }),
			people
		);
		expect(result).toBeNull();
	});

	it('leaves already attributed items alone', () => {
		const result = computeAutoAttribution(
			item({ Fanny: '0', Antoine: '0', Flo: '0', Marion: '0' }, 'Flo'),
			people
		);
		expect(result).toBeNull();
	});

	it('skips items someone has not rated yet', () => {
		const result = computeAutoAttribution(
			item({ Fanny: '0', Antoine: '3', Flo: '', Marion: '0' }),
			people
		);
		expect(result).toBeNull();
	});

	it('skips items with a non-numeric rating', () => {
		const result = computeAutoAttribution(
			item({ Fanny: 'oui', Antoine: '0', Flo: '0', Marion: '0' }),
			people
		);
		expect(result).toBeNull();
	});

	it('returns null when no person is configured', () => {
		expect(computeAutoAttribution(item({}), [])).toBeNull();
	});
});

describe('planToRangeUpdates', () => {
	it('targets only the attribution cell of each row', () => {
		const updates = planToRangeUpdates([
			{ tabTitle: 'Cuisine', rowNumber: 5, columnIndex: 7, attribution: 'Flo' },
			{ tabTitle: "L'atelier", rowNumber: 2, columnIndex: 27, attribution: CATALOGUE_ATTRIBUTION }
		]);
		expect(updates).toEqual([
			{ range: "'Cuisine'!H5", values: [['Flo']] },
			{ range: "'L''atelier'!AB2", values: [['catalogue']] }
		]);
	});
});
