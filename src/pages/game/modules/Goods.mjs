import World from '../../../json/world.mjs';
import * as Hex from './Hex.mjs';

function Goods({
	num = 1,
	type,
	hex,
} = {}) {
	if (!Hex.isHex(hex)) {
		throw new TypeError('Goods expects to be assigned a Hex!');
	}
	if (!Goods.isValidGoodsType(type)) {
		throw new TypeError(`Unknown Goods type '${type}'`);
	}
	let rounds = 0;
	const faction = hex.tile.faction;
	const start = hex;
	Object.defineProperties(this, {
		faction: {
			enumerable: true,
			get: () => faction,
		},
		hex: {
			enumerable: true,
			get: () => hex,
			set(val) {
				if (!Hex.isHex(val)) {
					throw new TypeError('Goods.hex expects to be assigned a Honeycomb.Hex!');
				}
				hex = val;
			},
		},
		num: {
			enumerable: true,
			get: () => num,
			set(val) {
				if (!Number.isInteger(val) || val < 0) {
					throw new TypeError('Goods.num expects to be assigned a nonnegative integer!');
				}
				num = val;
			},
		},
		rounds: {
			enumerable: true,
			get: () => rounds,
			set(val) {
				if (!Number.isInteger(val) || val < 0) {
					throw new TypeError('Goods.rounds expects to be assigned a nonnegative integer!');
				}
				rounds = val;
			},
		},
		start: {
			enumerable: true,
			get: () => start,
		},
		type: {
			enumerable: true,
			get: () => type,
		},
	});
}
Object.assign(Goods.prototype, {
});
Goods.isValidGoodsType = function isValidGoodsType(type) {
	return typeof (World.goods[type] ?? false) === 'object';
}
export default Goods;
