import { describe, it, test, beforeEach } from 'node:test';
import assert from './assert.mjs';

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';
import Unit, * as UnitUtils from '../modules/Unit.mjs';
import Faction from '../modules/Faction.mjs';
import Movable from '../modules/Movable.mjs';
import * as Hex from '../modules/Hex.mjs';
import { currentGame } from '../modules/Game.mjs';

// Minimal mockHex compatible with Hex.Grid
class mockHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	constructor(options) {
		super(options);
		this.terrain = {
			terrain: 'grass',
			movementCost: 1,
			isWater: false,
		};
		this.tile = { faction: new Faction({ index: 0 }) };
		this.f_cost = 0;
		this.g_cost = 0;
		this.h_cost = 0;
		this.parent = undefined;
	}
}

let testGrid;
let faction;

beforeEach(() => {
	testGrid = new Honeycomb.Grid(mockHex, Honeycomb.rectangle({ width: 3, height: 3 }));
	faction = new Faction({ index: 0 });
});

describe('Unit class', () => {
	it('constructs with valid unitType, hex, and faction', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		const unit = new Unit('farmer', { hex, faction });
		assert.equal(unit.unitType, 'farmer');
		assert.equal(unit.row, 1);
		assert.equal(unit.col, 1);
		assert.equal(unit.faction.index, 0);
	});

	it('is also a Movable', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		const unit = new Unit('farmer', { hex, faction });
		assert.true(unit instanceof Movable);
		assert.true(Movable.isInstanceofMovable(unit));
		assert.true(Movable.isActivatableMovable(unit));
	});

	it('throws on unknown unitType', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		assert.throws(() => new Unit('not-a-unit', { hex, faction }), {
			name: 'TypeError',
			message: "Unknown unit 'not-a-unit'",
		});
	});

	it('throws on missing faction', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		assert.throws(() => new Unit('farmer', { hex }), {
			name: 'TypeError',
			message: 'Unit expects to be assigned a Faction!',
		});
	});

	test('activate sets currentGame.activeUnit and emits event', (t) => {
		const spy = t.mock.fn();
		t.mock.method(currentGame.events, 'emit', spy);

		const hex = testGrid.getHex({ row: 1, col: 1 });
		const unit = new Unit('farmer', { hex, faction });

		unit.activate();
		assert.equal(currentGame.activeUnit, unit);
		assert.equal(spy.mock.callCount(), 2); // unit-created + unit-activated
		assert.equal(spy.mock.calls[1].arguments[0], 'unit-activated');
	});

	test('deactivate clears activeUnit and ends turn', (t) => {
		t.mock.method(currentGame.events, 'emit', t.mock.fn());

		const hex = testGrid.getHex({ row: 1, col: 1 });
		const unit = new Unit('farmer', { hex, faction });
		unit.prepareForNewTurn();
		unit.activate();
		unit.deactivate(true);
		assert.equal(currentGame.activeUnit, null);
		assert.equal(unit.moves, 0);
	});

	test('doAction moves unit to adjacent hex', () => {
		const start = testGrid.getHex({ row: 1, col: 1 });
		const unit = new Unit('farmer', { hex: start, faction });
		unit.prepareForNewTurn();
		unit.activate();
		unit.doAction('l', testGrid); // move right
		assert.equal(unit.col, 2);
	});

	test('isUnit and isMovableUnit type guards work', (t) => {
		const spy = t.mock.fn();
		t.mock.method(currentGame.events, 'emit', spy);

		const hex = testGrid.getHex({ row: 1, col: 1 });
		const unit = new Unit('farmer', { hex, faction });
		unit.prepareForNewTurn();
		assert.true(Unit.isUnit(unit));
		assert.true(Unit.isMovableUnit(unit));
		unit.deactivate(true);
		assert.false(Unit.isMovableUnit(unit));

		assert.equal(spy.mock.callCount(), 3); // unit-created + unit-deactivated + end-turn
		assert.equal(spy.mock.calls[2].arguments[0], 'end-turn');
	});

	let unitOptions;

	beforeEach(() => {
		unitOptions = {
			hex: testGrid.getHex({ row: 0, col: 0 }),
			faction: new Faction({ index: 0 }),
		};
	});

	test('isActivatableUnit removes destroyed units', (t) => {
		t.mock.method(currentGame.events, 'emit', t.mock.fn());

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

	test('isMovableUnit removes units with 0 remaining moves', (t) => {
		t.mock.method(currentGame.events, 'emit', t.mock.fn());

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
		const row = 2;
		const col = 2;
		const newRow = row - 1;
		const newCol = col;
		const unit = new Unit('farmer', {
			hex: testGrid.getHex({ row, col }),
			faction: new Faction({ index: 0 }),
		});
		unit.prepareForNewTurn();
		unit.setPath(testGrid.getHex({
			row: newRow,
			col: newCol,
		}), testGrid);
		unit.moveOneStep();
		assert.equal(unit.row, newRow);
		assert.equal(unit.col, newCol);
	});

	it('should move to the next tile correctly', (t) => {
		const [row, col] = [2, 2];
		testGrid = new Honeycomb.Grid(mockHex, Honeycomb.spiral({
			start: { row, col },
			radius: 1,
		}));
		const unit = new Unit('farmer', {
			hex: testGrid.getHex({ row, col }),
			faction: new Faction({ index: 0 }),
		});
		const expected = {
			u: testGrid.getHex({ row: row - 1, col: col - 1 }),
			l: testGrid.getHex({ row, col }),
			i: testGrid.getHex({ row: row - 1, col }),
			k: testGrid.getHex({ row, col }),
			o: testGrid.getHex({ row: row - 1, col: col + 1 }),
			j: testGrid.getHex({ row, col }),
		};
		Object.entries(expected).forEach(([dir, coords]) => {
			unit.prepareForNewTurn();
			unit.doAction(dir, testGrid);
			assert.equal(unit.row, coords.row);
			assert.equal(unit.col, coords.col);
		});
	});
});
