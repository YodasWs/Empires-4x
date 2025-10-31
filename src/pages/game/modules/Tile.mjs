import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';

import City from './City.mjs';
import Faction from './Faction.mjs';
import Nation from './Nation.mjs';
import { currentGame } from './Game.mjs';

let scene = null;
function isValidImprovement(hex, improvement, builtImprovement) {
	if (!(hex instanceof Honeycomb.Hex)) return false;
	if (typeof improvement !== 'string' || improvement === '') return false;
	// Improvement must exist
	if (!Object.keys(json.world.improvements).includes(improvement)) return false;
	// Improvement must be same as current, or new
	if (builtImprovement.key !== '' && builtImprovement.key !== improvement) return false;
	// Improvement must be valid for terrain
	if (!hex.terrain.terrain in json.world.improvements[improvement]?.terrains) return false;
	// Cannot build improvement in city
	if (hex.city instanceof City) return false;
	return true;
}

function Tile({
	hex,
}) {
	if (scene === null) {
		scene = currentGame.scenes.getScene('mainGameScene');
	}
	const claims = {
		faction: new Map(),
		nation: new Map(),
	};

	let objImprovement = undefined;
	let builtImprovement = {
		key: '',
	};

	const laborers = new Set();
	let road = undefined;

	this.food = 0;
	Object.defineProperties(this, {
		claims: {
			enumerable: true,
			get: () => (factionOrNation, claimIncrement) => {
				// Get numerical value of Player's claim
				if (factionOrNation instanceof Faction) {
					if (Number.isInteger(claimIncrement) && claimIncrement !== 0) {
						// But first, increment claim value
						claims.faction.set(factionOrNation, (claims.faction.get(factionOrNation) || 0) + claimIncrement);
					}
					return claims.faction.get(factionOrNation) || 0;
				} else if (factionOrNation instanceof Nation) {
					if (Number.isInteger(claimIncrement) && claimIncrement !== 0) {
						// But first, increment claim value
						claims.nation.set(factionOrNation, (claims.nation.get(factionOrNation) || 0) + claimIncrement);
					}
					return claims.nation.get(factionOrNation) || 0;
				}
				return claims;
			},
		},
		hex: {
			get: () => hex,
		},
		// TODO: Cache Faction
		faction: {
			enumerable: true,
			get: () => {
				const topClaimant = {
					faction: null,
					claim: 0,
				};
				claims.faction.forEach((val, claimPlayer) => {
					if (topClaimant.claim < val) {
						topClaimant.faction = claimPlayer;
						topClaimant.claim = val;
					}
				});
				return topClaimant.faction;
			},
		},
		// TODO: Cache Nation
		nation: {
			enumerable: true,
			get: () => {
				const topClaimant = {
					nation: null,
					claim: 0,
				};
				claims.nation.forEach((val, claimPlayer) => {
					if (topClaimant.claim < val) {
						topClaimant.nation = claimPlayer;
						topClaimant.claim = val;
					}
				});
				return topClaimant.nation;
			},
		},
		improvement: {
			enumerable: true,
			get: () => objImprovement || {},
		},
		laborers: {
			enumerable: true,
			get: () => laborers,
			set(val) {
				if (!(val instanceof Citizen)) {
					throw new TypeError('Tile.laborers expects to be assigned object instance of Citizen!');
				}
				laborers.add(val);
				return true;
			},
		},
		road: {
			enumerable: true,
			get: () => road || {},
			set(val) {
				// Destroy all roads on Tile
				if (val === 'destroy') {
					if (road?.image instanceof Phaser.GameObjects.Image) {
						road.image.destroy();
					}
					road = undefined;
					return true;
				}
				if (Object.keys(json.world.improvements).includes(val)) {
					road = {
						...json.world.roads[val],
						image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(GameConfig.depths.road),
						key: val,
					};
					return true;
				}
				return false;
			},
		},
		setImprovement: {
			get: () => (val, faction = null) => {
				// Destroy all improvements on Tile
				if (val === 'destroy') {
					if (objImprovement?.image instanceof Phaser.GameObjects.Image) {
						objImprovement.image.destroy();
					}
					objImprovement = undefined;
					builtImprovement = {
						key: '',
					};
					return true;
				}

				if (isValidImprovement(hex, val, builtImprovement)) {
					objImprovement = {
						...json.world.improvements[val],
						image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(GameConfig.depths.improvement),
						key: val,
					};
					if (faction instanceof Faction) {
						this.claimTerritory(faction, 10);
						objImprovement.faction = faction;
					}
					builtImprovement.key = val;
					return true;
				}
				return false;
			},
		},
		isValidImprovement: {
			get() {
				return (improvement) => isValidImprovement(hex, improvement, builtImprovement);
			},
		},
	});
}
Object.assign(Tile.prototype, {
	claimTerritory(factionOrNation, claimIncrement = 0) {
		if (Number.isFinite(claimIncrement) && claimIncrement !== 0) {
			let prevPlayer = undefined;
			if (factionOrNation instanceof Nation && this.nation instanceof Nation) {
				prevPlayer = this.nation.index;
			} else if (factionOrNation instanceof Faction && this.faction instanceof Faction) {
				prevPlayer = this.faction.index;
			}
			this.claims(factionOrNation, claimIncrement);
			// Only update scene if nation owner has changed
			if (factionOrNation instanceof Faction && this.faction?.index !== prevPlayer) {
				currentGame.markTerritory(this.hex, {
					graphics: currentGame.graphics.territoryFills,
					lineOffset: 1,
					fill: true,
				});
				currentGame.markTerritory(this.hex, {
					graphics: currentGame.graphics.territoryLines,
					lineOffset: 0.97,
					fill: false,
				});
			}
		}
	},
});
export default Tile;
