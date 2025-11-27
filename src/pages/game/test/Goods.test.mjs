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
		this.terrain = {
			terrain: 'grass',
			movementCost: 1,
			isWater: false,
		};
		this.tile = {};
	}
}

let hex;

beforeEach(() => {
	hex = new mockHex({ row: 1, col: 1 });
});

describe('Goods class', () => {
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

	it('destroys itself on goods-moved event', async () => {
		const goods = new Goods('food', { hex });
		let destroyed = false;
		goods.destroy = () => {
			console.log('Sam, destroy called');
			destroyed = true;
		};

		const promise = Promise.resolve();
		currentGame.events.emit('goods-moved', { goods, promise });

		await promise; // wait for finally()
		assert.true(destroyed);
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
