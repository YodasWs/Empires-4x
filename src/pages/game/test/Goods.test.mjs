import { describe, it, test, beforeEach } from 'node:test';
import assert from './assert.mjs';

import Goods from '../modules/Goods.mjs';
import * as GameConfig from '../modules/Config.mjs';
import * as Honeycomb from 'honeycomb-grid';
import * as Hex from '../modules/Hex.mjs';
import { currentGame } from '../modules/Game.mjs';
import Movable from '../modules/Movable.mjs';

// Minimal mockHex compatible with Hex.Grid
class mockHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	f_cost
	g_cost
	h_cost

	constructor(options) {
		super(options);
		this.tile = {
			setImprovement: () => {},
			claimTerritory: () => {},
			improvement: null,
			laborers: new Set(),
		};
	}

	get terrain() {
		return {
			terrain: 'grass',
			movementCost: 1,
			isWater: false,
		};
	}
}

describe('Goods class', () => {
	let hex;
	beforeEach(() => {
		hex = new mockHex({ row: 1, col: 1 });
	});

	it('throws on invalid hex', (t) => {
		assert.throws(() => new Goods('food', {
			hex: { row: 0, col: 0, tile: {} },
		}), {
			name: 'TypeError',
			message: 'Movable expects to be assigned a Hex!'
		});
	});

	test('Goods is also a Movable', () => {
		const goods = new Goods('food', { hex });
		assert.true(goods instanceof Movable);
		assert.true(Movable.isInstanceofMovable(goods));
		assert.true(Movable.isActivatableMovable(goods));
	});

	it('constructs with valid goodsType and hex', () => {
		const goods = new Goods('food', { hex, num: 3 });
		assert.equal(goods.goodsType, 'food');
		assert.equal(goods.num, 3);
		assert.equal(goods.start, hex);
	});

	it('throws on unknown goodsType', () => {
		assert.throws(() => new Goods('not-real', { hex }), {
			name: 'TypeError',
			message: "Unknown Goods type 'not-real'",
		});
	});

	it('does not destroy itself on goods-moved event if it did not reach destination', async (t) => {
		const testGrid = new Honeycomb.Grid(mockHex, Honeycomb.rectangle({ width: 3, height: 1 }));
		const targetHex = testGrid.getHex({ row: 0, col: 2 });
		const goods = new Goods('food', { hex: testGrid.getHex({ row: 0, col: 0 }) });

		const spy = t.mock.fn();
		t.mock.method(goods, 'destroy', spy);

		assert.notEqual(goods.setPath(targetHex, testGrid), null);
		goods.prepareForNewTurn();
		goods.moveOneTurn();

		const promise = Promise.resolve();
		currentGame.events.emit('goods-moved', { goods, promise });

		await promise; // wait for finally()
		assert.equal(spy.mock.callCount(), 0, 'Goods.destroy was called');
	});

	it('destroys itself on goods-moved event if it reached destination', async (t) => {
		const testGrid = new Honeycomb.Grid(mockHex, Honeycomb.rectangle({ width: 3, height: 1 }));
		const targetHex = testGrid.getHex({ row: 0, col: 1 });
		const goods = new Goods('food', { hex: testGrid.getHex({ row: 0, col: 0 }) });

		let destroyed = false;
		goods.destroy = () => {
			destroyed = true;
		};

		assert.notEqual(goods.setPath(targetHex, testGrid), null);
		goods.prepareForNewTurn();
		goods.moveOneTurn();

		const promise = Promise.resolve();
		currentGame.events.emit('goods-moved', { goods, promise });

		await promise; // wait for finally()
		assert.true(destroyed, 'Goods not destroyed');
	});

	test('num setter accepts zero integer', () => {
		const goods = new Goods('food', { hex });
		goods.num = 0;
		assert.equal(goods.num, 0);
	});

	test('num setter accepts valid nonnegative integer', () => {
		const goods = new Goods('food', { hex });
		goods.num = 5;
		assert.equal(goods.num, 5);
	});

	it('throws on negative num value', () => {
		const goods = new Goods('food', { hex });
		assert.throws(() => {
			goods.num = -1;
		}, {
			name: 'TypeError',
			message: 'Goods.num expects to be assigned a nonnegative integer!',
		});
	});

	it('throws on setting non-integer num', () => {
		const goods = new Goods('food', { hex });
		assert.throws(() => {
			goods.num = 2.5;
		}, {
			name: 'TypeError',
			message: 'Goods.num expects to be assigned a nonnegative integer!',
		});
	});

	test('start getter returns the initial hex', () => {
		const goods = new Goods('food', { hex });
		assert.equal(goods.start, hex);
	});

	test('rounds setter accepts valid nonnegative integer', () => {
		const goods = new Goods('food', { hex });
		goods.rounds = 2;
		assert.equal(goods.rounds, 2);
	});

	test('rounds setter accepts zero integer', () => {
		const goods = new Goods('food', { hex });
		goods.rounds = 0;
		assert.equal(goods.rounds, 0);
	});

	it('throws on negative rounds value', () => {
		const goods = new Goods('food', { hex });
		assert.throws(() => {
			goods.rounds = -1;
		}, {
			name: 'TypeError',
			message: 'Goods.rounds expects to be assigned a nonnegative integer!',
		});
	});

	it('throws on setting non-integer rounds', () => {
		const goods = new Goods('food', { hex });
		assert.throws(() => {
			goods.rounds = 2.5;
		}, {
			name: 'TypeError',
			message: 'Goods.rounds expects to be assigned a nonnegative integer!',
		});
	});

	test('Goods.isGoods returns true for Goods instance', () => {
		const goods = new Goods('food', { hex });
		assert.true(Goods.isGoods(goods));
	});

	test('Goods.isGoods returns false for non-Goods', () => {
		assert.false(Goods.isGoods({}));
		assert.false(Goods.isGoods(null));
	});

	test('Goods.isValidGoodsType returns true for known type', () => {
		assert.true(Goods.isValidGoodsType('food'));
	});

	test('Goods.isValidGoodsType returns false for unknown type', () => {
		assert.false(Goods.isValidGoodsType('not-real'));
	});
});

describe('Food production and delivery', () => {
	let testGrid;
	beforeEach(() => {
		// Inject a small test grid
		testGrid = new Honeycomb.Grid(mockHex, Honeycomb.spiral({
			start: { row: 0, col: 0 },
			radius: 2,
		}));
	});

	test('Farm produces food goods each turn', (t) => {
		t.skip('Not yet implemented');
	});

	test('Farmer Laborer consumes food each turn', (t) => {
		t.skip('Not yet implemented');
	});

	test('Excess food from Farm moves towards nearest City', (t) => {
		t.skip('Not yet implemented');
	});

	test('Food continues multiple turns to nearest City', (t) => {
		t.skip('Not yet implemented');
	});

	test('Food is consumed by Laborer on path', (t) => {
		t.skip('Not yet implemented');
	});

	test('Food is delivered to City for money', (t) => {
		t.skip('Not yet implemented');
	});

	test('Food spoils before reaching City', async (t) => {
		testGrid = new Honeycomb.Grid(mockHex, Honeycomb.rectangle({ width: 8, height: 1 }));
		const startHex = testGrid.getHex({ row: 0, col: 0 });
		const endHex = testGrid.getHex({ row: 0, col: 7 });
		const goods = new Goods('food', { hex: startHex, num: 3 });
		goods.setPath(endHex, testGrid);
		do {
			goods.prepareForNewTurn();
			goods.moveOneTurn();
			goods.rounds++;
		} while (goods.rounds < Goods.MaxFoodRounds + 1);
		assert.equal(goods.rounds, 6);
		assert.equal(goods.hex.row, 0);
		assert.equal(goods.hex.col, 5);
		assert.notEqual(goods.hex, endHex);
		assert.equal(goods.goodsType, 'food');
		assert.true(goods.deleted);
	});
});
