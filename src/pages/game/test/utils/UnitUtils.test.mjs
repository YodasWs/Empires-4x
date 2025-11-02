import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../utils/UnitUtils.mjs';

describe('UnitUtils module', () => {
	test('actionTileCoordinates returns correct coordinates for even column', () => {
		const row = 4;
		const col = 2; // even
		const result = utils.actionTileCoordinates('u', row, col);
		assert.deepEqual(result, [3, 1]); // row--, col--
	});

	test('actionTileCoordinates returns correct coordinates for odd column', () => {
		const row = 4;
		const col = 3; // odd
		const result = utils.actionTileCoordinates('j', row, col);
		assert.deepEqual(result, [5, 2]); // row++, col--
	});

	test('actionTileCoordinates handles all directions for even column', () => {
		const row = 5;
		const col = 2;
		const expected = {
			u: [4, 1],
			i: [4, 2],
			o: [4, 3],
			j: [5, 1],
			k: [6, 2],
			l: [5, 3],
		};
		Object.entries(expected).forEach(([dir, coords]) => {
			assert.deepEqual(utils.actionTileCoordinates(dir, row, col), coords);
		});
	});

	test('actionTileCoordinates handles all directions for odd column', () => {
		const row = 5;
		const col = 3;
		const expected = {
			u: [5, 2],
			i: [4, 3],
			o: [5, 4],
			j: [6, 2],
			k: [6, 3],
			l: [6, 4],
		};
		Object.entries(expected).forEach(([dir, coords]) => {
			assert.deepEqual(utils.actionTileCoordinates(dir, row, col), coords);
		});
	});

	test('validateUnitType returns base object for valid unit', (t) => {
		t.todo('Need to use Unit class');
		const mockWorldUnits = {
			homesteader: { range: 2 },
			settler: { build: true },
		};
		const result = utils.validateUnitType('homesteader', mockWorldUnits);
		assert.deepEqual(result, { range: 2 });
	});

	test('validateUnitType throws for unknown unit', (t) => {
		t.todo('Need to use Unit class');
		const mockWorldUnits = {
			homesteader: { range: 2 },
		};
		assert.throws(() => {
			utils.validateUnitType('wizard', mockWorldUnits);
		}, /Unknown unit 'wizard'/);
	});
});
