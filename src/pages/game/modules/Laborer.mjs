import * as Honeycomb from 'honeycomb-grid';

import City from './City.mjs';
import Tile from './Tile.mjs';

// Thanks to Microsoft Copilot for this name generator!
function generateRomanBritishName() {
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
	tile,
}) {
	const name = generateRomanBritishName();
	if (city instanceof City) {
		Object.defineProperty(this, 'city', {
			enumerable: true,
			get: () => city,
		});
	}
	if (hex instanceof Honeycomb.Hex || tile?.hex instanceof Honeycomb.Hex) {
		Object.defineProperty(this, 'hex', {
			enumerable: true,
			get: () => hex || tile?.hex,
		});
	}
	if (tile instanceof Tile || hex?.tile instanceof Tile) {
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
		if (!(tile instanceof Tile)) {
			throw new TypeError('Laborer.assignTile expects to be passed object instance of Tile!');
		}
		// TODO: Check if Tile has already been assigned and is at its capacity
		this.tile = tile;
	},
});
export default Laborer;
