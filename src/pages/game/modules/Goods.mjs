import World from '../../../json/world.mjs';

import * as Hex from './Hex.mjs';
import Movable from './Movable.mjs';
import { currentGame } from './Game.mjs';

export default class Goods extends Movable {
	#goodsType;
	#num;
	#rounds = 0;
	#start;

	constructor(goodsType, {
		hex,
		num = 1,
	}) {
		if (!Goods.isValidGoodsType(goodsType)) {
			throw new TypeError(`Unknown Goods type '${goodsType}'`);
		}

		super({
			base: World.ResourceTransporter,
			hex,
		});
		this.#goodsType = goodsType;
		this.#num = num;
		this.#start = hex;

		currentGame.events.on('goods-moved', (evt) => {
			const { goods, promise } = evt.detail;
			if (goods !== this) return;
			promise.finally(() => {
				this.destroy();
			});
		});
	}

	get goodsType() {
		return this.#goodsType;
	}

	get num() {
		return this.#num;
	}
	set num(val) {
		if (!Number.isInteger(val) || val < 0) {
			throw new TypeError('Goods.num expects to be assigned a nonnegative integer!');
		}
		this.#num = val;
	}

	get rounds() {
		return this.#rounds;
	}
	set rounds(val) {
		if (!Number.isInteger(val) || val < 0) {
			throw new TypeError('Goods.rounds expects to be assigned a nonnegative integer!');
		}
		this.#rounds = val;
	}

	get start() {
		return this.#start;
	}

	static isGoods(goods) {
		return goods instanceof Goods;
	}

	static isValidGoodsType(type) {
		return typeof (World.goods[type] ?? false) === 'object';
	}
}
