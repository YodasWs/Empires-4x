import { describe, it, test } from 'node:test';
import assert from './assert.mjs';

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';

import { Actions, DoAction, OpenUnitActionMenu } from '../modules/Actions.mjs';
import City from '../modules/City.mjs';
import Faction, * as FactionUtils from '../modules/Faction.mjs';
import Goods from '../modules/Goods.mjs';
import Laborer from '../modules/Laborer.mjs';
import Nation from '../modules/Nation.mjs';
import Tile from '../modules/Tile.mjs';
import { default as Unit, init as initUnitModule } from '../modules/Unit.mjs';
import { FindPath, Grid, IsLegalMove, MovementCost } from '../modules/Hex.mjs';
import { currentGame } from '../modules/Game.mjs';

describe('Game Configuration', () => {
	it('should have correct tile and unit sizes', () => {
		assert.equal(GameConfig.tileWidth, 200);
		assert.equal(GameConfig.unitWidth, 80);
	});
});

describe('City class', () => {
});

describe('Faction class', () => {
	const unitOptions = {
		row: 0,
		col: 0,
		faction: {
			index: 0,
		},
	};

	test('initializes with correct color and index', () => {
		const faction = new Faction({ index: 1 });
		assert.equal(faction.index, 1);
		assert.equal(faction.color, 0xff0000);
	});

	test('Faction.money setter enforces positive numbers', () => {
		const faction = new Faction({ index: 0 });
		faction.money = 100;
		assert.equal(faction.money, 100);
		assert.throws(() => {
			faction.money = -5;
		}, 'expects to be assigned a positive number');
	});

	test('addUnit adds a new Unit to faction', async (t) => {
		t.todo('Not yet implemented');
	});

	test('activateUnit calls activate on valid unit', async (t) => {
		t.todo('Not yet implemented');
	});

	test('Faction.checkEndTurn calls currentGame.endTurn', async (t) => {
		const mockEndTurn = t.mock.fn();
		t.mock.method(currentGame, 'endTurn', mockEndTurn);

		const faction = new Faction({ index: 0 });
		faction.activateNext = () => false; // force endTurn path
		faction.checkEndTurn();

		assert.equal(mockEndTurn.mock.callCount(), 1);
	});

	test('getFactionColor returns correct color for index', (t) => {
		assert.equal(FactionUtils.getFactionColor(0), 0x32cd32);
		assert.equal(FactionUtils.getFactionColor(1), 0xff0000);
		assert.equal(FactionUtils.getFactionColor(2), 0x0000ff);
		assert.equal(FactionUtils.getFactionColor(99), 0xaaaaaa);
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
		const result = FactionUtils.filterValidUnits(units);
		assert.deepEqual(result, [validUnit1, validUnit2]);
	});

	test('getNextMovableUnit returns correct index', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const units = [
			{ moves: 0, deleted: false },
			{ moves: 2, deleted: false },
			{ moves: 0, deleted: false },
		];
		const result = FactionUtils.getNextMovableUnit(units, 0);
		assert.equal(result, 1);
	});

	test('getNextMovableUnit wraps around if needed', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const units = [
			{ moves: 1, deleted: false },
			{ moves: 0, deleted: false },
		];
		const result = FactionUtils.getNextMovableUnit(units, 1);
		assert.equal(result, 0);
	});

	test('getNextMovableUnit returns false if no valid unit', (t) => {
		t.skip('Need to decouple Unit from Phaser to run this test');
		return;
		const units = [
			{ moves: 0, deleted: false },
			{ moves: 0, deleted: true },
		];
		const result = FactionUtils.getNextMovableUnit(units, 0);
		assert.equal(result, false);
	});
});

describe('Goods class', () => {
	test('Goods.isValidGoodsType gives false for unknown value', () => {
		assert.false(Goods.isValidGoodsType('this-is-not-a-good'));
	});
});

describe('Laborer class', () => {
});

describe('Nation class', () => {
	const n = new Nation({
		index: 0,
	});
	it('should have a color', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a frame', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have an index', (t) => {
		t.todo('Not yet implemented');
	});
	it('should be the Roman Empire', (t) => {
		t.todo('Not yet implemented');
	});
});

describe('Tile class', () => {
	it('should have a Hex coordinate', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a Faction owner', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a Nation owner', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a Set of Laborer', (t) => {
		t.todo('Not yet implemented');
	});
	it('should accept a new Laborer', (t) => {
		t.todo('Not yet implemented');
	});
	it('should update territorial claims for Faction', (t) => {
		t.todo('Not yet implemented');
	});
	it('should update territorial claims for Nation', (t) => {
		t.todo('Not yet implemented');
	});
});

describe('Unit class', () => {
});
