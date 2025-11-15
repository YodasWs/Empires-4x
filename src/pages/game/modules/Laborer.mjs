import City from './City.mjs';
import * as Hex from './Hex.mjs';
import Tile from './Tile.mjs';

// Thanks to Microsoft Copilot for this name generator!
export function generateRomanBritishName() {
	const praenomina = [
		'Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus', 'Publius', 'Aulus', 'Sextus',
	];

	const celticNames = [
		'Bran', 'Cai', 'Elen', 'Rhiannon', 'Taran', 'Mabon', 'Nia', 'Owain',
	];

	const cognomina = [
		'Agricola', 'Felix', 'Silvanus', 'Varus', 'Florus', 'Crispus', 'Severus', 'Vitalis',
	];

	const epithets = [
		'the Smith', 'of Londinium', 'the Younger', 'the Red', 'from Camulodunum', 'the Hunter',
	];

	const first = Math.random() < 0.5
		? praenomina[Math.floor(Math.random() * praenomina.length)]
		: celticNames[Math.floor(Math.random() * celticNames.length)];

	const last = cognomina[Math.floor(Math.random() * cognomina.length)];
	const epithet = Math.random() < 0.3
		? epithets[Math.floor(Math.random() * epithets.length)]
		: '';

	return `${first} ${last} ${epithet}`.trim();
}

function Laborer({
	city,
	hex,
	sprite = 'laborers.farmer',
	tile,
} = {}) {
	const name = generateRomanBritishName();
	if (City.isCity(city)) {
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
	if (Tile.isTile(tile) || Tile.isTile(hex?.tile)) {
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
			get: () => sprite,
		},
	});
}
Object.assign(Laborer.prototype, {
	assignTile(tile) {
		if (!Tile.isTile(tile)) {
			throw new TypeError('Laborer.assignTile expects to be passed object instance of Tile!');
		}
		// TODO: Check if Tile has already been assigned and is at its capacity
		this.tile = tile;
	},
});
Laborer.FOOD_CONSUMPTION = 2;
Laborer.isLaborer = function isLaborer(obj) {
	return obj instanceof Laborer;
};
export default Laborer;
