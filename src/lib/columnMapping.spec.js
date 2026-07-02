import { describe, it, expect } from 'vitest';
import {
	buildColumnIndex,
	rowToItem,
	itemToRow,
	computeNextItemNumber,
	buildHeaderRow
} from './columnMapping.js';

const settings = {
	columns: {
		itemNumber: 'N°',
		designation: 'Nom',
		photo: 'Photo',
		attribution: 'Validation'
	},
	people: [
		{ name: 'Fanny', column: 'Fanny' },
		{ name: 'Marion', column: 'Marion' }
	]
};

const headers = ['N°', 'Nom', 'Photo', 'Fanny', 'Marion', 'Validation'];

describe('buildColumnIndex', () => {
	it('resolves configured column names to header indexes', () => {
		const idx = buildColumnIndex(headers, settings);
		expect(idx.itemNumber).toBe(0);
		expect(idx.designation).toBe(1);
		expect(idx.photo).toBe(2);
		expect(idx.attribution).toBe(5);
		expect(idx.desires).toEqual([
			{ name: 'Fanny', index: 3 },
			{ name: 'Marion', index: 4 }
		]);
	});

	it('resolves missing columns to -1 instead of throwing', () => {
		const idx = buildColumnIndex(['Nom'], settings);
		expect(idx.photo).toBe(-1);
		expect(idx.desires[0].index).toBe(-1);
	});

	it('matches headers regardless of case or surrounding whitespace', () => {
		const idx = buildColumnIndex([' NOM ', 'photo', 'fanny'], settings);
		expect(idx.designation).toBe(0);
		expect(idx.photo).toBe(1);
		expect(idx.desires[0].index).toBe(2);
	});
});

describe('rowToItem / itemToRow round-trip', () => {
	const columnIndex = buildColumnIndex(headers, settings);

	it('parses a raw row into a logical item', () => {
		const row = ['12', 'Commode', '=IMAGE("https://x")', '4', '2', 'Marion'];
		const item = rowToItem(row, columnIndex);
		expect(item).toEqual({
			itemNumber: '12',
			designation: 'Commode',
			photo: '=IMAGE("https://x")',
			attribution: 'Marion',
			desires: { Fanny: '4', Marion: '2' }
		});
	});

	it('serializes an item back to a row matching the header layout', () => {
		const item = {
			itemNumber: 12,
			designation: 'Commode',
			photo: '=IMAGE("https://x")',
			attribution: 'Marion',
			desires: { Fanny: 4, Marion: 2 }
		};
		const row = itemToRow(item, columnIndex, headers.length);
		expect(row).toEqual([12, 'Commode', '=IMAGE("https://x")', 4, 2, 'Marion']);
	});

	it('preserves unmapped columns from the existing row when updating', () => {
		const extendedHeaders = [...headers, 'notes internes'];
		const idx = buildColumnIndex(extendedHeaders, settings);
		const existingRow = ['1', 'Old', '', '', '', '', 'ne pas toucher'];
		const item = {
			itemNumber: '1',
			designation: 'Commode',
			photo: '',
			attribution: '',
			desires: {}
		};
		const row = itemToRow(item, idx, extendedHeaders.length, existingRow);
		expect(row[6]).toBe('ne pas toucher');
	});
});

describe('computeNextItemNumber', () => {
	const columnIndex = buildColumnIndex(headers, settings);

	it('returns 1 for an empty tab', () => {
		expect(computeNextItemNumber([], columnIndex)).toBe(1);
	});

	it('returns the highest existing number plus one', () => {
		const rows = [
			['3', 'A', '', '', '', ''],
			['1', 'B', '', '', '', ''],
			['7', 'C', '', '', '', '']
		];
		expect(computeNextItemNumber(rows, columnIndex)).toBe(8);
	});

	it('ignores non-numeric or blank N° values', () => {
		const rows = [
			['', 'A', '', '', '', ''],
			['abc', 'B', '', '', '', ''],
			['4', 'C', '', '', '', '']
		];
		expect(computeNextItemNumber(rows, columnIndex)).toBe(5);
	});

	it('returns null when no N° column is configured', () => {
		const idx = buildColumnIndex(['Nom'], settings);
		expect(computeNextItemNumber([], idx)).toBeNull();
	});
});

describe('buildHeaderRow', () => {
	it('builds a header row in N°, designation, photo, people, attribution order', () => {
		expect(buildHeaderRow(settings)).toEqual(['N°', 'Nom', 'Photo', 'Fanny', 'Marion', 'Validation']);
	});

	it('skips blank/unconfigured columns', () => {
		const partial = {
			columns: { itemNumber: '', designation: 'Nom', photo: '', attribution: 'Validation' },
			people: [{ name: 'Fanny', column: 'Fanny' }]
		};
		expect(buildHeaderRow(partial)).toEqual(['Nom', 'Fanny', 'Validation']);
	});
});
