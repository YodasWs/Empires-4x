import { beforeEach, describe, it, test } from 'node:test';
import assert from './assert.mjs';

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';
import World from '../../../json/world.mjs';

import { Actions, DoAction, OpenUnitActionMenu } from '../modules/Actions.mjs';
import City from '../modules/City.mjs';
import Faction, * as FactionUtils from '../modules/Faction.mjs';
import Goods from '../modules/Goods.mjs';
import Laborer, * as LaborerUtils from '../modules/Laborer.mjs';
import Movable from '../modules/Movable.mjs';
import Nation from '../modules/Nation.mjs';
import Tile from '../modules/Tile.mjs';
import Unit, * as UnitUtils from '../modules/Unit.mjs';
import * as Hex from '../modules/Hex.mjs';
import { currentGame } from '../modules/Game.mjs';

class mockHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	constructor(options) {
		super(options);
		this.terrain = World.terrains[options.terrain || 'grass'] || {};
		this.tile = { faction: new Faction({ index: 0 }) };
	}
}

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
		hex: new mockHex({ row: 0, col: 0 }),
		faction: new Faction({ index: 0 }),
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
		const faction = new Faction({ index: 0 });
		assert.true(Array.isArray(faction.units));
		assert.equal(faction.units.length, 0);
		faction.addUnit('farmer', new mockHex({ row: 0, col: 0 }));
		assert.true(Array.isArray(faction.units));
		assert.equal(faction.units.length, 1);
	});

	test('activateUnit calls activate on valid unit', async (t) => {
		const faction = new Faction({ index: 0 });
		faction.addUnit('farmer', new mockHex({ row: 0, col: 0 }));
		assert.true(Array.isArray(faction.units));
		assert.equal(faction.units.length, 1);
		faction.units.forEach((unit) => {
			unit.prepareForNewTurn();
		});
		faction.activateUnit(0);
		assert.equal(currentGame.activeUnit, faction.units[0]);
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

	test('getNextMovableUnit returns correct index', (t) => {
		const validUnit1 = new Unit('farmer', unitOptions);
		const movedUnit1 = new Unit('farmer', unitOptions);
		const movedUnit2 = new Unit('rancher', unitOptions);
		const units = [
			movedUnit1,
			validUnit1,
			movedUnit2,
		];
		units.forEach((unit) => {
			unit.prepareForNewTurn();
		});
		movedUnit1.deactivate(true);
		movedUnit2.deactivate(true);
		const result = units.indexOf(FactionUtils.getNextMovableUnit(units, 0));
		assert.equal(result, 1);
	});

	test('getNextMovableUnit wraps around if needed', (t) => {
		const validUnit1 = new Unit('farmer', unitOptions);
		const movedUnit1 = new Unit('farmer', unitOptions);
		const movedUnit2 = new Unit('rancher', unitOptions);
		const units = [
			validUnit1,
			movedUnit1,
			movedUnit2,
		];
		units.forEach((unit) => {
			unit.prepareForNewTurn();
		});
		movedUnit1.deactivate(true);
		movedUnit2.deactivate(true);
		const result = units.indexOf(FactionUtils.getNextMovableUnit(units, 1));
		assert.equal(result, 0);
	});

	test('getNextMovableUnit returns false if no valid unit', (t) => {
		const movedUnit1 = new Unit('farmer', unitOptions);
		const movedUnit2 = new Unit('rancher', unitOptions);
		movedUnit1.deactivate(true);
		movedUnit2.deactivate(true);
		const units = [
			movedUnit1,
			movedUnit2,
		];
		const result = FactionUtils.getNextMovableUnit(units, 0);
		assert.equal(result, false);
	});
});

describe('Goods class', () => {
	test('Goods.isValidGoodsType gives false for unknown value', () => {
		assert.false(Goods.isValidGoodsType('this-is-not-a-good'));
	});

	it('creates valid Goods instance', (t) => {
		const type = 'food';
		assert.true(Goods.isValidGoodsType(type));
		const hex = new mockHex({ row: 0, col: 0 });
		const goods = new Goods(type, {
			hex,
			num: 3,
		});
		assert.equal(goods.goodsType, type);
		assert.true(Goods.isValidGoodsType(goods.goodsType));
		assert.equal(goods.hex, hex);
		assert.equal(goods.num, 3);
	});

	it('throws on invalid hex', (t) => {
		assert.throws(() => new Goods('food', {
			hex: { row: 0, col: 0, tile: {} },
		}), {
			name: 'TypeError',
			message: 'Movable expects to be assigned a Hex!'
		});
	});

	it('throws on unknown goods type', (t) => {
		assert.throws(() => new Goods('not-real-name', {
			hex: new mockHex({ row: 0, col: 0 }),
		}), {
			name: 'TypeError',
			message: "Unknown Goods type 'not-real-name'"
		});
	});

	it('throws on invalid num assignment', (t) => {
		const goods = new Goods('food', {
			hex: new mockHex({ row: 0, col: 0 }),
		});
		assert.throws(() => { goods.num = -1 }, {
			name: 'TypeError',
			message: 'Goods.num expects to be assigned a nonnegative integer!'
		});
	});
});

describe('Laborer class', () => {
	test('generateRomanBritishName returns a non-empty string', () => {
		const name = LaborerUtils.generateRomanBritishName();
		assert.equal(typeof name, 'string');
		assert.true(name.length > 0);
	});
	it('should be assigned housing', (t) => {
		t.skip('Not yet implemented');
	});
	it('should be assigned a tile to work', (t) => {
		t.skip('Not yet implemented');
	});
	it('should be reassigned which tile to work', (t) => {
		t.skip('Not yet implemented');
	});
	it('should consume Food at the end of the Round', (t) => {
		t.skip('Test not yet implemented');
	});
	it('should die if not given enough Food', (t) => {
		t.skip('Test not yet implemented');
	});
});

describe('Nation class', () => {
	it('should have the correct color', () => {
		assert.equal(new Nation({ index: 0 }).color, 0x32cd32);
		assert.equal(new Nation({ index: 1 }).color, 0xff0000);
		assert.equal(new Nation({ index: 2 }).color, 0x0000ff);
		assert.equal(new Nation({ index: 99 }).color, 0xaaaaaa);
	});

	it('should have the correct frame', () => {
		assert.equal(new Nation({ index: 0 }).frame, 1);
		assert.equal(new Nation({ index: 1 }).frame, 2);
		assert.equal(new Nation({ index: 2 }).frame, 0);
	});

	it('should have the correct index', () => {
		assert.equal(new Nation({ index: 0 }).index, 0);
		assert.equal(new Nation({ index: 1 }).index, 1);
		assert.equal(new Nation({ index: 2 }).index, 2);
	});

	it('should have the correct name', () => {
		assert.equal(new Nation({ index: 0 }).name, 'Roman Empire');
		assert.equal(new Nation({ index: 1 }).name, 'Unknown');
	});
});

describe('Tile class', () => {
	it('should have a Hex coordinate', (t) => {
		t.skip('Not yet implemented');
	});
	it('should have a Faction owner', (t) => {
		t.skip('Not yet implemented');
	});
	it('should have a Nation owner', (t) => {
		t.skip('Not yet implemented');
	});
	it('should have a Set of Laborers', (t) => {
		t.skip('Not yet implemented');
	});
	it('should accept a new Laborer', (t) => {
		t.skip('Not yet implemented');
	});
	it('should update territorial claims for Faction', (t) => {
		t.skip('Not yet implemented');
	});
	it('should update territorial claims for Nation', (t) => {
		t.skip('Not yet implemented');
	});
});
