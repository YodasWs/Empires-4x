import { describe, it, test, beforeEach } from 'node:test';
import assert from './assert.mjs';

import * as Honeycomb from 'honeycomb-grid';
import World from '../../../json/world.mjs';
import * as GameConfig from '../modules/Config.mjs';
import Goods from '../modules/Goods.mjs';
import Movable from '../modules/Movable.mjs';
import Faction from '../modules/Faction.mjs';
import * as Hex from '../modules/Hex.mjs';

// Create mockHex class compatible with Hex.Grid
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
	}
}

let testGrid;

beforeEach(() => {
	// Inject a small test grid
	testGrid = new Honeycomb.Grid(mockHex, Honeycomb.spiral({
		start: { row: 0, col: 0 },
		radius: 3,
	}));
});

describe('Movable class', () => {
	it('constructs with valid hex and faction', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex, faction });
		assert.equal(movable.row, 1);
		assert.equal(movable.col, 1);
		assert.equal(movable.faction.index, 0);
	});

	it('throws on invalid hex', () => {
		const faction = new Faction({ index: 0 });
		assert.throws(() => new Movable({ hex: {}, faction }), {
			name: 'TypeError',
			message: 'Movable expects to be assigned a Hex!',
		});
	});

	test('prepareForNewTurn sets movement points', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex, faction });
		movable.prepareForNewTurn();
		assert.equal(movable.moves, movable.baseMovementPoints);
	});

	test('setPath to adjacent hex returns valid iterator', () => {
		const start = testGrid.getHex({ row: 1, col: 1 });
		const end = testGrid.getHex({ row: 1, col: 2 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex: start, faction });
		const iterator = movable.setPath(end, testGrid);
		assert.ok(iterator);
	});

	test('moveOneStep updates position and reduces moves', () => {
		const start = testGrid.getHex({ row: 1, col: 1 });
		const end = testGrid.getHex({ row: 1, col: 2 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex: start, faction });
		movable.prepareForNewTurn();
		movable.setPath(end, testGrid);
		movable.moveOneStep();
		assert.equal(movable.row, end.row);
		assert.equal(movable.col, end.col);
		assert.true(movable.moves < movable.baseMovementPoints);
	});

	test('moveOneTurn updates position and reduces moves', () => {
		const start = testGrid.getHex({ row: 0, col: 0 });
		const end = testGrid.getHex({ row: 0, col: 2 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({
			hex: start,
			faction,
			base: {
				movementPoints: 10,
				movementCosts: {
					grass: 5,
				},
			},
		});
		movable.prepareForNewTurn();
		movable.setPath(end, testGrid);
		movable.moveOneTurn();
		assert.equal(movable.row, end.row);
		assert.equal(movable.col, end.col);
		assert.equal(movable.moves, 0);
	});

	it('should be able to move to an adjacent hex', (t) => {
		const movable = new Movable({
			hex: testGrid.getHex({ row: 0, col: 0 }),
		});
		movable.prepareForNewTurn();
		movable.activate();
		const targetHex = testGrid.getHex({ row: 1, col: 0 });
		movable.setPath(targetHex, testGrid);
		movable.moveOneStep();
		assert.equal(movable.row, targetHex.row);
		assert.equal(movable.col, targetHex.col);
		assert.true(movable.moves < movable.baseMovementPoints);
	});

	it('should set and follow a path to a distant hex', (t) => {
		const movable = new Movable({
			hex: testGrid.getHex({ row: -2, col: 0 }),
		});
		const targetHex = testGrid.getHex({ row: 2, col: 2 });
		const moveIterable = movable.setPath(targetHex, testGrid);
		assert.notEqual(moveIterable, null);
		for (let i = 0; i < 10; i++) {
			if (moveIterable.done === true) break;
			movable.prepareForNewTurn();
			movable.activate();
			movable.moveOneTurn();
		}
		assert.equal(movable.row, targetHex.row);
		assert.equal(movable.col, targetHex.col);
	});

	test('deactivate sets moves to zero', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex, faction });
		movable.prepareForNewTurn();
		movable.deactivate(true);
		assert.equal(movable.moves, 0);
	});

	test('destroy resets state and marks deleted', () => {
		const hex = testGrid.getHex({ row: 1, col: 1 });
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex, faction });
		movable.prepareForNewTurn();
		movable.destroy();
		assert.equal(movable.moves, 0);
		assert.equal(movable.deleted, true);
	});

	test('setPath returns null if no path found', () => {
		const start = testGrid.getHex({ row: 1, col: 1 });
		const end = new mockHex({ row: 99, col: 99 }); // not in grid
		const faction = new Faction({ index: 0 });
		const movable = new Movable({ hex: start, faction });
		const result = movable.setPath(end, testGrid);
		assert.equal(result, null);
	});
});
