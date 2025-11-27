import { describe, it, test, beforeEach } from 'node:test';
import assert from './assert.mjs';

import * as Honeycomb from 'honeycomb-grid';
import World from '../../../json/world.mjs';
import Faction from '../modules/Faction.mjs';
import City from '../modules/City.mjs';
import * as Hex from '../modules/Hex.mjs';
import Nation from '../modules/Nation.mjs';
import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

let testGrid;

beforeEach(() => {
	// Inject a small test grid
	testGrid = new Honeycomb.Grid(mockHex, Honeycomb.spiral({
		start: { row: 0, col: 0 },
		radius: 2,
	}));
});

// Create mockHex class compatible with Hex.Grid
class mockHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	constructor(options) {
		super(options);
		this.tile = {
			faction: new Faction({ index: 0 }),
			setImprovement: () => {},
			claimTerritory: () => {},
			improvement: null,
			laborers: new Set(),
		};
	}

	get terrain() {
		return {
			terrain: 'grass',
			movementCost: 1,
			isWater: false,
		};
	}
}

function makeNation() {
	return new Nation({ name: 'TestNation' });
}

function makeFaction(nation) {
	return new Faction({ nation, index: 0 });
}

describe('City class', () => {
	test('City constructor assigns hex and nation', () => {
		const hex = testGrid.getHex({ row: 0, col: 0 });
		const nation = makeNation();
		const city = new City({ hex, nation, Grid: testGrid });

		assert.equal(city.hex, hex);
		assert.equal(city.nation, nation);
		assert.equal(hex.city, city);
	});

	test('City.addToQueue pushes valid unit', () => {
		const hex = testGrid.getHex({ row: 0, col: 0 });
		const nation = makeNation();
		const faction = makeFaction(nation);
		const city = new City({ hex, nation, Grid: testGrid });

		city.addToQueue({ faction, unitType: Object.keys(World.units)[0] });
		assert.equal(city.queue.length, 1);
		assert.equal(city.queue[0].faction, faction);
	});

	test('City.addToQueue rejects invalid unit type', () => {
		const hex = testGrid.getHex({ row: 0, col: 0 });
		const nation = makeNation();
		const faction = makeFaction(nation);
		const city = new City({ hex, nation, Grid: testGrid });

		city.addToQueue({ faction, unitType: 'not-valid-unit' });
		assert.equal(city.queue.length, 0);
	});

	test('City.addToQueue rejects invalid faction', () => {
		const hex = testGrid.getHex({ row: 0, col: 0 });
		const nation = makeNation();
		const city = new City({ hex, nation, Grid: testGrid });

		assert.throws(() => {
			city.addToQueue({ faction: {}, unitType: Object.keys(World.units)[0] });
		}, /Faction/);
	});

	test('City.processFood consumes stored food and produces units', () => {
		const hex = testGrid.getHex({ row: 0, col: 0 });
		const nation = makeNation();
		const faction = makeFaction(nation);
		const city = new City({ hex, nation, Grid: testGrid });

		const unitType = Object.keys(World.units)[0];
		const unit = World.units[unitType];
		faction.money = (unit.productionCosts.addToQueue.money || 0)
			+ (unit.productionCosts.removeFromQueue.money || 0)
			+ 10;

		// Add a unit to the queue
		city.addToQueue({ faction, unitType });
		assert.equal(city.queue.length, 1);

		// Give enough food
		const promise = Promise.resolve();
		currentGame.events.emit('goods-moved', {
			goods: {
				faction,
				goodsType: 'food',
				hex: city.hex,
				num: (unit.productionCosts.addToQueue.food || 0) + (unit.productionCosts.removeFromQueue.food || 0) + 2,
			},
			promise,
		});

		return promise.finally(() => {
			assert.equal(city.queue.length, 0);
		});
	});

	test('City.isCity works correctly', () => {
		const hex = testGrid.getHex({ row: 0, col: 0 });
		const nation = makeNation();
		const city = new City({ hex, nation, Grid: testGrid });

		assert.true(City.isCity(city));
		assert.true(!City.isCity({}));
	});
});
