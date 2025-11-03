import World from '../../../json/world.mjs';

export function validateGoodsType(type) {
	if ((World.goods[type] ?? true) === true) {
		throw new TypeError(`Unknown Goods type '${type}'`);
	}
	return true;
}
