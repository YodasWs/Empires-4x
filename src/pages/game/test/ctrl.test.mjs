import { describe, it, test } from 'node:test';
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
		this.terrain = World.terrains[options.terrain || 'grass'];
		this.tile = new Tile(this);
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

describe('Movable class', () => {
	it('should set the correct path to an adjacent hex', (t) => {
		t.todo('Test not yet implemented; currently relies on Grid');
		const row = 5;
		const col = 5;
		const newRow = row - 1;
		const newCol = col;
		const movable = new Movable({
			hex: new mockHex({ row, col })
		});
		const moveIterable = movable.setPath(new mockHex({
			row: newRow,
			col: newCol,
		}));
		assert.notEqual(moveIterable, null);
	});

	it('should be able to move to an adjacent hex', (t) => {
		t.todo('Test not yet implemented; currently relies on Grid');
		const row = 5;
		const col = 5;
		const newRow = row - 1;
		const newCol = col;
		const movable = new Movable({
			hex: new mockHex({ row, col })
		});
		const moveIterable = movable.setPath(new mockHex({
			row: newRow,
			col: newCol,
		}));
		assert.notEqual(moveIterable, null);
		movable.moveOneStep();
		assert.equal(movable.row, newRow);
		assert.equal(movable.col, newCol);
	});

	it('should set the correct path to a distant hex', (t) => {
		t.todo('Test not yet implemented; currently relies on Grid');
		const row = 2;
		const col = 2;
		const newRow = 5;
		const newCol = 5;
		const movable = new Movable({
			hex: new mockHex({ row, col })
		});
		const moveIterable = movable.setPath(new mockHex({
			row: newRow,
			col: newCol,
		}));
		assert.notEqual(moveIterable, null);
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

describe('Unit class', () => {
	const unitOptions = {
		hex: new mockHex({
			row: 0,
			col: 0,
		}),
		faction: new Faction({ index: 0 }),
	};

	test('isActivatableUnit removes destroyed units', () => {
		const validUnit1 = new Unit('farmer', unitOptions);
		const validUnit2 = new Unit('rancher', unitOptions);
		const deletedUnit1 = new Unit('farmer', unitOptions);
		const deletedUnit2 = new Unit('rancher', unitOptions);
		const movedUnit1 = new Unit('farmer', unitOptions);
		const units = [
			validUnit1,
			deletedUnit1,
			movedUnit1,
			validUnit2,
			deletedUnit2,
		];
		units.forEach((unit) => {
			unit.prepareForNewTurn();
		});
		movedUnit1.deactivate(true);
		deletedUnit1.destroy();
		deletedUnit2.destroy();
		const result = units.filter(Unit.isActivatableUnit);
		assert.deepEqual(result, [validUnit1, movedUnit1, validUnit2]);
	});

	test('isMovableUnit removes units with 0 remaining moves', () => {
		const validUnit1 = new Unit('farmer', unitOptions);
		const validUnit2 = new Unit('rancher', unitOptions);
		const movedUnit1 = new Unit('farmer', unitOptions);
		const movedUnit2 = new Unit('rancher', unitOptions);
		const deletedUnit1 = new Unit('rancher', unitOptions);
		const units = [
			validUnit1,
			movedUnit1,
			validUnit2,
			movedUnit2,
			deletedUnit1,
		];
		units.forEach((unit) => {
			unit.prepareForNewTurn();
		});
		movedUnit1.deactivate(true);
		movedUnit2.deactivate(true);
		deletedUnit1.destroy();
		const result = units.filter(Unit.isMovableUnit);
		assert.deepEqual(result, [validUnit1, validUnit2]);
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
			assert.deepEqual(UnitUtils.actionTileCoordinates(dir, row, col), coords);
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
			assert.deepEqual(UnitUtils.actionTileCoordinates(dir, row, col), coords);
		});
	});

	it('should move to the given tile correctly', (t) => {
		t.todo('Need to implement new Movable class instead');
		const row = 5;
		const col = 5;
		const newRow = row - 1;
		const newCol = col;
		const unit = new Unit('farmer', {
			hex: new mockHex({ row: 5, col: 5 }),
			faction: new Faction({ index: 0 }),
		});
		unit.prepareForNewTurn();
		unit.moveTo(new mockHex({
			row: newRow,
			col: newCol,
		}));
		assert.equal(unit.row, newRow);
		assert.equal(unit.col, newCol);
	});

	it('should move to the next tile correctly', (t) => {
		t.todo('Need to implement new Movable class first');
		const unit = new Unit('farmer', {
			hex: new mockHex({ row: 5, col: 5 }),
			faction: new Faction({ index: 0 }),
		});
		const expected = {
			u: new mockHex({ row: 5, col: 4 }),
			l: new mockHex({ row: 5, col: 5 }),
			i: new mockHex({ row: 4, col: 5 }),
			k: new mockHex({ row: 5, col: 5 }),
			o: new mockHex({ row: 5, col: 6 }),
			j: new mockHex({ row: 5, col: 5 }),
		};
		Object.entries(expected).forEach(([dir, coords]) => {
			unit.doAction(dir);
			assert.equal(unit.row, coords.row);
			assert.equal(unit.col, coords.col);
		});
	});
});
