import City from './City.mjs';
import * as Hex from './Hex.mjs';
import Tile from './Tile.mjs';
import * as utils from '../utils/LaborerUtils.mjs';

function Laborer({
	city,
	hex,
	tile,
}) {
	const name = utils.generateRomanBritishName();
	if (city instanceof City) {
		Object.defineProperty(this, 'city', {
			enumerable: true,
			get: () => city,
		});
	}
	if (Hex.isHex(hex) || Hex.isHex(tile?.hex)) {
		Object.defineProperty(this, 'hex', {
			enumerable: true,
			get: () => hex || tile?.hex,
		});
	}
	if (utils.validateTile(tile) || utils.validateTile(hex?.tile)) {
		Object.defineProperty(this, 'tile', {
			enumerable: true,
			get: () => tile || hex?.tile,
		});
	}
	Object.defineProperties(this, {
		name: {
			enumerable: true,
			get: () => name,
		},
		sprite: {
			enumerable: true,
			get: () => 'laborers.farmer',
		},
	});
}
Object.assign(Laborer.prototype, {
	FOOD_CONSUMPTION: 2,
	assignTile(tile) {
		if (!(utils.validateTile(tile))) {
			throw new TypeError('Laborer.assignTile expects to be passed object instance of Tile!');
		}
		// TODO: Check if Tile has already been assigned and is at its capacity
		this.tile = tile;
	},
});
export default Laborer;
