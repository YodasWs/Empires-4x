import World from '../../../json/world.mjs';

import City from './City.mjs';
import Faction from './Faction.mjs';
import * as Hex from './Hex.mjs';
import Laborer from './Laborer.mjs';
import Nation from './Nation.mjs';
import { currentGame } from './Game.mjs';

function isValidImprovement(hex, improvement, builtImprovement) {
	if (!Hex.isHex(hex)) return false;
	if (typeof improvement !== 'string' || improvement === '') return false;
	// Improvement must exist
	if (!(improvement in World.improvements)) return false;
	// Improvement must be same as current, or new
	if (builtImprovement.key !== '' && builtImprovement.key !== improvement) return false;
	// Improvement must be valid for terrain
	if (!(hex.terrain.terrain in World.improvements[improvement]?.terrains)) return false;
	// Cannot build improvement in city
	if (City.isCity(hex.city)) return false;
	return true;
}

export default class Tile {
	#claims = {
		faction: new Map(),
		nation: new Map(),
	};
	#hex
	#objImprovement = undefined;
	#builtImprovement = {
		key: '',
	};
	#laborers = new Set();
	#food = 0;

	constructor({ hex }) {
		if (!Hex.isHex(hex)) {
			throw new TypeError('Tile expects to be assigned object instance of Hex!');
		}
		this.#hex = hex;
	}

	// TODO: Cache Faction
	get faction() {
		const topClaimant = {
			faction: null,
			claim: 0,
		};
		this.#claims.faction.forEach((val, claimPlayer) => {
			if (topClaimant.claim < val) {
				topClaimant.faction = claimPlayer;
				topClaimant.claim = val;
			}
		});
		return topClaimant.faction;
	}

	get hex() {
		return this.#hex;
	}

	get improvement() {
		return this.#objImprovement || {};
	}

	get laborers() {
		return this.#laborers;
	}
	set laborers(val) {
		if (!Laborer.isLaborer(val)) {
			throw new TypeError('Tile.laborers expects to be assigned object instance of Laborer!');
		}
		this.#laborers.add(val);
	}

	// TODO: Cache Nation
	get nation() {
		const topClaimant = {
			nation: null,
			claim: 0,
		};
		this.#claims.nation.forEach((val, claimPlayer) => {
			if (topClaimant.claim < val) {
				topClaimant.nation = claimPlayer;
				topClaimant.claim = val;
			}
		});
		return topClaimant.nation;
	}

	claims(factionOrNation, claimIncrement) {
		// Get numerical value of Player's claim
		let map = null;
		if (Faction.isFaction(factionOrNation)) {
			map = 'faction';
		} else if (Nation.isNation(factionOrNation)) {
			map = 'nation';
		}
		if (map in this.#claims) {
			if (Number.isInteger(claimIncrement) && claimIncrement !== 0) {
				// But first, increment claim value
				this.#claims[map].set(factionOrNation, (this.#claims[map].get(factionOrNation) || 0) + claimIncrement);
			}
			return this.#claims[map].get(factionOrNation) || 0;
		}
		return this.#claims;
	}

	claimTerritory(factionOrNation, claimIncrement = 0) {
		if (Number.isFinite(claimIncrement) && claimIncrement !== 0) {
			let prevPlayer = undefined;
			if (Nation.isNation(factionOrNation) && Nation.isNation(this.nation)) {
				prevPlayer = this.nation.index;
			} else if (Faction.isFaction(factionOrNation) && Faction.isFaction(this.faction)) {
				prevPlayer = this.faction.index;
			}
			this.claims(factionOrNation, claimIncrement);
			// Only update territory lines if faction owner has changed
			if (Faction.isFaction(factionOrNation) && this.faction?.index !== prevPlayer) {
				// TODO: Use an event or something instead of direct reference to currentGame
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
	}

	isValidImprovement(improvement) {
		return isValidImprovement(this.#hex, improvement, this.#builtImprovement);
	}

	setImprovement(val, faction = null) {
		// Destroy all improvements on Tile
		if (val === 'destroy') {
			this.#objImprovement = undefined;
			this.#builtImprovement = {
				key: '',
			};
			return true;
		}

		if (isValidImprovement(this.#hex, val, this.#builtImprovement)) {
			this.#objImprovement = {
				...World.improvements[val],
				...World.improvements[val].terrains[this.#hex.terrain.terrain],
				key: val,
			};
			if (faction instanceof Faction) {
				this.claimTerritory(faction, 10);
				this.#objImprovement.faction = faction;
			}
			this.#builtImprovement.key = val;
			return true;
		}
		return false;
	}

	static isTile(tile) {
		return tile instanceof Tile;
	};
}
