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

// Helpers to create valid objects
function makeHex() {
	// Minimal stub hex with tile + terrain
	return testGrid.getHex({ row: 0, col: 0 });
	hex.tile = {
		setImprovement: () => {},
		claimTerritory: () => {},
		improvement: null,
		laborers: new Set(),
	};
	hex.terrain = { isWater: false, terrain: 'grass', name: 'Grassland' };
	return hex;
}

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

test('City constructor assigns hex and nation', () => {
	const hex = makeHex();
	const nation = makeNation();
	const city = new City({ hex, nation, Grid: testGrid });

	assert.equal(city.hex, hex);
	assert.equal(city.nation, nation);
	assert.equal(hex.city, city);
});

test('City.addToQueue pushes valid unit', () => {
	const hex = makeHex();
	const nation = makeNation();
	const faction = makeFaction(nation);
	const city = new City({ hex, nation, Grid: testGrid });

	city.addToQueue({ faction, unitType: Object.keys(World.units)[0] });
	assert.equal(city.queue.length, 1);
	assert.equal(city.queue[0].faction, faction);
});

test('City.addToQueue rejects invalid faction', () => {
	const hex = makeHex();
	const nation = makeNation();
	const city = new City({ hex, nation, Grid: testGrid });

	assert.throws(() => {
		city.addToQueue({ faction: {}, unitType: 'warrior' });
	}, /Faction/);
});

test('City.processFood consumes stored food and produces units', () => {
	const hex = makeHex();
	const nation = makeNation();
	const faction = makeFaction(nation);
	const city = new City({ hex, nation, Grid: testGrid });

	// Add a unit to the queue
	const unitType = Object.keys(World.units)[0];
	city.addToQueue({ faction, unitType });

	// Give enough food
	const promise = Promise.resolve();
	currentGame.events.emit('goods-moved', {
		goods: {
			faction,
			goodsType: 'food',
			hex: city.hex,
			num: GameConfig.cityFoodPerUnit + 2,
		},
		promise,
	});

	return promise.finally(() => {
		assert.equal(city.queue.length, 0);
	});
});

test('City.isCity works correctly', () => {
	const hex = makeHex();
	const nation = makeNation();
	const city = new City({ hex, nation, Grid: testGrid });

	assert.true(City.isCity(city));
	assert.true(!City.isCity({}));
});
