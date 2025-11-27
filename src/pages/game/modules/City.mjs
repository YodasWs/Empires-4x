import World from '../../../json/world.mjs';
import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';

import * as Hex from './Hex.mjs';
import Housing from './Housing.mjs';
import Faction from './Faction.mjs';
import Laborer from './Laborer.mjs';
import Nation from './Nation.mjs';
import { currentGame } from './Game.mjs';

export default class City {
	#hex;
	#housing;
	#nation;
	#queue = [];
	#storedFood = 0;

	constructor({
		hex,
		nation,
	}) {
		if (!Nation.isNation(nation)) {
			throw new TypeError('City expects to be assigned object instance of Nation!');
		}
		this.#nation = nation;

		if (!Hex.isHex(hex)) {
			throw new TypeError('City expects to be assigned object instance of Hex!');
		}
		this.#hex = hex;
		hex.tile.setImprovement('destroy');
		hex.city = this;

		// Claim this tile and adjacent tiles
		Hex.Grid.traverse(Honeycomb.spiral({
			start: [ hex.q, hex.r ],
			radius: 1,
		})).forEach((adjacentHex) => {
			adjacentHex.tile.claimTerritory(nation, 100);
		});

		// Claim water territory
		Hex.Grid.traverse(Honeycomb.ring({
			center: [ hex.q, hex.r ],
			radius: 2,
		})).forEach((waterHex) => {
			waterHex.tile.claimTerritory(nation, waterHex.terrain.isWater ? 50 : 0);
		});

		this.#housing = new Housing({
			hex,
			numUnits: 6,
		});

		currentGame.events.on('goods-moved', (evt) => {
			const { goods, promise } = evt.detail;
			if (goods.hex.city !== this) return;
			// TODO: Deliver Food to City
			promise.then(() => {
				this.#storedFood += goods.num;
				this.processFood();
			});
		});
	}

	processFood() {
		while (this.#storedFood >= GameConfig.cityFoodPerUnit) {
			this.#storedFood -= GameConfig.cityFoodPerUnit;
			const newUnit = this.#queue.shift();
			newUnit.faction.addUnit(newUnit.unitType, this.#hex);
		}
	}

	get hex() {
		return this.#hex;
	}

	get housing() {
		return this.#housing.numUnits;
	}

	get laborers() {
		return this.#housing.laborers;
	}
	set laborers(val) {
		this.#housing.laborers = val;
	}

	get nation() {
		return this.#nation;
	}

	get queue() {
		return this.#queue;
	}

	addToQueue({ faction, unitType }) {
		if (!Faction.isFaction(faction)) {
			throw new TypeError('City.addToQueue expects to be assigned object instance of Faction!');
		}
		if (!(unitType in World.units)) {
			console.warn(`City production queue: Unknown unit key ${unitType}`);
			return;
		}
		this.#queue.push({
			unitType,
			faction,
		});
	}

	static isCity(city) {
		return city instanceof City;
	}
}
