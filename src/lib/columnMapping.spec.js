import { describe, it, expect } from 'vitest';
import { buildColumnIndex, rowToItem, itemToRow } from './columnMapping.js';

const settings = {
	columns: {
		designation: 'designation',
		photo: 'photo',
		comments: 'Commentaires',
		estimation: 'estimation',
		attribution: 'attribution'
	},
	people: [
		{ name: 'Marion', column: 'Marion' },
		{ name: 'Florent', column: 'Florent' }
	]
};

const headers = ['designation', 'photo', 'Marion', 'Florent', 'Commentaires', 'estimation', 'attribution'];

describe('buildColumnIndex', () => {
	it('resolves configured column names to header indexes', () => {
		const idx = buildColumnIndex(headers, settings);
		expect(idx.designation).toBe(0);
		expect(idx.photo).toBe(1);
		expect(idx.comments).toBe(4);
		expect(idx.estimation).toBe(5);
		expect(idx.attribution).toBe(6);
		expect(idx.desires).toEqual([
			{ name: 'Marion', index: 2 },
			{ name: 'Florent', index: 3 }
		]);
	});

	it('resolves missing columns to -1 instead of throwing', () => {
		const idx = buildColumnIndex(['designation'], settings);
		expect(idx.photo).toBe(-1);
		expect(idx.desires[0].index).toBe(-1);
	});
});

describe('rowToItem / itemToRow round-trip', () => {
	const columnIndex = buildColumnIndex(headers, settings);

	it('parses a raw row into a logical item', () => {
		const row = ['Commode', '=IMAGE("https://x")', '4', '2', 'Belle pièce', '150', 'Marion'];
		const item = rowToItem(row, columnIndex);
		expect(item).toEqual({
			designation: 'Commode',
			photo: '=IMAGE("https://x")',
			comments: 'Belle pièce',
			estimation: '150',
			attribution: 'Marion',
			desires: { Marion: '4', Florent: '2' }
		});
	});

	it('serializes an item back to a row matching the header layout', () => {
		const item = {
			designation: 'Commode',
			photo: '=IMAGE("https://x")',
			comments: 'Belle pièce',
			estimation: '150',
			attribution: 'Marion',
			desires: { Marion: 4, Florent: 2 }
		};
		const row = itemToRow(item, columnIndex, headers.length);
		expect(row).toEqual(['Commode', '=IMAGE("https://x")', 4, 2, 'Belle pièce', '150', 'Marion']);
	});

	it('preserves unmapped columns from the existing row when updating', () => {
		const extendedHeaders = [...headers, 'notes internes'];
		const idx = buildColumnIndex(extendedHeaders, settings);
		const existingRow = ['Old', '', '', '', '', '', '', 'ne pas toucher'];
		const item = {
			designation: 'Commode',
			photo: '',
			comments: '',
			estimation: '',
			attribution: '',
			desires: {}
		};
		const row = itemToRow(item, idx, extendedHeaders.length, existingRow);
		expect(row[7]).toBe('ne pas toucher');
	});
});
