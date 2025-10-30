import { Grid } from './Hex.mjs';
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
	if (!(nation instanceof Nation)) {
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
	this.housing = (() => {
		switch (level) {
			case 1: return 3;
			case 2: return 6;
		}
		return 0;
	})();
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
		housing: {
			enumerable: true,
			get: () => this.housing,
		},
	});
}
Object.assign(City.prototype, {
});
export default City;
