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
		Grid = Hex.Grid,
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
		Grid.traverse(Honeycomb.spiral({
			start: [ hex.q, hex.r ],
			radius: 1,
		})).forEach((adjacentHex) => {
			if (!Hex.isHex(adjacentHex)) return;
			adjacentHex.tile.claimTerritory(nation, 100);
		});

		// Claim water territory
		Grid.traverse(Honeycomb.ring({
			center: [ hex.q, hex.r ],
			radius: 2,
		})).forEach((waterHex) => {
			if (!Hex.isHex(waterHex)) return;
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
		do {
			if (this.#queue.length <= 0) return;
			console.log('Sam, in processFood');
			const { faction, unitType } = this.#queue[0];
			const foodCost = World.units?.[unitType]?.productionCosts?.removeFromQueue?.food || 0;
			// TODO: Don't let a faction that cannot afford the unit continue to block the queue
			const moneyCost = World.units?.[unitType]?.productionCosts?.removeFromQueue?.money || 0;
			if (faction.money < moneyCost) {
				// TODO: This is here only for development/testing purposes until we have a proper queue management system
				this.#queue.shift();
				break;
			}
			if (this.#storedFood < foodCost) {
				break;
			}
			this.#storedFood -= foodCost;
			faction.money -= moneyCost;
			const newUnit = this.#queue.shift();
			newUnit.faction.addUnit(newUnit.unitType, this.#hex);
		} while (this.#storedFood > 0 && this.#queue.length > 0);
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
