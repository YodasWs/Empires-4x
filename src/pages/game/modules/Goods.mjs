import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';
import { currentGame } from './Game.mjs';

function Goods({
	num = 1,
	type,
	hex,
} = {}) {
	if (!(hex instanceof Honeycomb.Hex)) {
		throw new TypeError('Goods expects to be assigned a Honeycomb.Hex!');
	}
	if ((json.world.goods[type] ?? true) === true) {
		throw new TypeError(`Unknown Goods type '${type}'`);
	}
	let rounds = 0;
	const faction = hex.tile.faction;
	const scene = currentGame.scenes.getScene('mainGameScene');
	const sprite = scene.add.sprite(hex.x, hex.y, `goods.${type}`).setDepth(GameConfig.depths.goods);
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
				if (!(val instanceof Honeycomb.Hex)) {
					throw new TypeError('Goods.hex expects to be assigned a Honeycomb.Hex!');
				}
				hex = val;
			},
		},
		num: {
			enumerable: true,
			get: () => num,
		},
		rounds: {
			enumerable: true,
			get: () => rounds,
			set(val) {
				if (!Number.isFinite(val) || val < 0) {
					throw new TypeError('Goods.rounds expects to be assigned a positive number!');
				}
				rounds = val;
			},
		},
		sprite: {
			enumerable: true,
			get: () => sprite,
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
export default Goods;
