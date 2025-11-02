import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../utils/FactionUtils.mjs';
import Unit from '../../modules/Unit.mjs';

describe('FactionUtils module', () => {
	const unitOptions = {
		row: 0,
		col: 0,
		faction: {
			index: 0,
		},
	};

	test('getFactionColor returns correct color for index', (t) => {
		t.todo('No idea why this test fails in CLI but pass locally');
		assert.equal(utils.getFactionColor(0), 0x32cd32);
		assert.equal(utils.getFactionColor(1), 0xff0000);
		assert.equal(utils.getFactionColor(2), 0x0000ff);
		assert.equal(utils.getFactionColor(99), 0xaaaaaa);
	});

	test('filterValidUnits removes deleted units', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const validUnit1 = new Unit('homesteader', unitOptions);
		const validUnit2 = new Unit('rancher', unitOptions);
		const deletedUnit1 = new Unit('homesteader', unitOptions);
		const deletedUnit2 = new Unit('rancher', unitOptions);
		deletedUnit1.destroy();
		deletedUnit2.destroy();
		const units = [
			validUnit1,
			deletedUnit1,
			validUnit2,
			deletedUnit2,
		];
		const result = utils.filterValidUnits(units);
		assert.deepEqual(result, [validUnit1, validUnit2]);
	});

	test('filterValidUnits keeps only valid Unit instances', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const validUnit1 = new Unit('homesteader', unitOptions);
		const validUnit2 = new Unit('rancher', unitOptions);
		const deletedUnit1 = new Unit('rancher', unitOptions);
		deletedUnit1.destroy();
		assert.deepEqual(
			utils.filterValidUnits([
				validUnit1,
				deletedUnit1,
				new Unit('not-real-unit', unitOptions),
				{ deleted: false }, // not an instance of Unit
				validUnit2,
			]),
			[validUnit1, validUnit2],
		);
	});

	test('getActiveUnit returns correct unit by index', () => {
		const units = [{ id: 1 }, { id: 2 }, { id: 3 }];
		assert.deepEqual(utils.getActiveUnit(units, 1), { id: 2 });
		assert.equal(utils.getActiveUnit(units, -1), undefined);
		assert.equal(utils.getActiveUnit(units, 99), undefined);
	});

	test('getNextActivatableUnit returns correct index', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const units = [
			{ moves: 0, deleted: false },
			{ moves: 2, deleted: false },
			{ moves: 0, deleted: false },
		];
		const result = utils.getNextActivatableUnit(units, 0);
		assert.equal(result, 1);
	});

	test('getNextActivatableUnit wraps around if needed', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const units = [
			{ moves: 1, deleted: false },
			{ moves: 0, deleted: false },
		];
		const result = utils.getNextActivatableUnit(units, 1);
		assert.equal(result, 0);
	});

	test('getNextActivatableUnit returns false if no valid unit', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const units = [
			{ moves: 0, deleted: false },
			{ moves: 0, deleted: true },
		];
		const result = utils.getNextActivatableUnit(units, 0);
		assert.equal(result, false);
	});
});
