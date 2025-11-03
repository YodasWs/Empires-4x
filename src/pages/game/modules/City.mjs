import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';

import Laborer from './Laborer.mjs';
import Nation from './Nation.mjs';
import { Grid } from './Hex.mjs';
import { currentGame } from './Game.mjs';

let scene = null;
function City({
	col,
	row,
	level = 1,
	nation,
} = {}) {
	if (scene === null) {
		scene = currentGame.scenes.getScene('mainGameScene');
	}
	if (!Nation.isNation(nation)) {
		throw new TypeError('City expects to be assigned a Nation!');
	}

	// Tie to hex
	const thisHex = Grid.getHex({ row, col });
	thisHex.tile.setImprovement('destroy');

	const sprite = scene.add.image(thisHex.x, thisHex.y, 'cities', nation.frame).setDepth(GameConfig.depths.cities).setScale(0.8);
	thisHex.city = this;
	const laborers = new Set();

	// Claim this tile and adjacent tiles
	Grid.traverse(Honeycomb.spiral({
		start: [ thisHex.q, thisHex.r ],
		radius: 1,
	})).forEach((hex) => {
		hex.tile.claimTerritory(nation, 100);
	});

	// Claim water territory
	Grid.traverse(Honeycomb.ring({
		center: [ thisHex.q, thisHex.r ],
		radius: 2,
	})).forEach((hex) => {
		if (hex.terrain.isWater) {
			hex.tile.claimTerritory(nation, 50);
		}
	});

	// Properties
	Object.defineProperties(this, {
		hex: {
			enumerable: true,
			get: () => thisHex,
		},
		laborers: {
			enumerable: true,
			get: () => laborers,
			set(val) {
				if (!(val instanceof Laborer)) {
					throw new TypeError('City.laborers expects to be assigned object instance of Laborer!');
				}
				laborers.add(val);
				return true;
			},
		},
		nation: {
			enumerable: true,
			get: () => nation,
		},
		sprite: {
			get: () => sprite,
		},
		level: {
			enumerable: true,
			get: () => level,
		},
	});
}
Object.assign(City.prototype, {
});
City.isCity = function isCity(city) {
	return city instanceof City;
}
export default City;
