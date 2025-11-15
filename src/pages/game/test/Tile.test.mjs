import { describe, it, test, beforeEach } from 'node:test';
import assert from './assert.mjs';

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';
import * as Hex from '../modules/Hex.mjs';
import { currentGame } from '../modules/Game.mjs';

import Faction from '../modules/Faction.mjs';
import Laborer from '../modules/Laborer.mjs';
import Movable from '../modules/Movable.mjs';
import Nation from '../modules/Nation.mjs';
import Tile from '../modules/Tile.mjs';
import Unit from '../modules/Unit.mjs';

// Minimal mockHex compatible with Hex.Grid
class mockHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	constructor(options) {
		super(options);
		this.terrain = {
			terrain: 'grass',
			movementCost: 1,
			isWater: false,
		};
		this.city = null;
	}
}

let hex;
let tile;
let faction;
let nation;

beforeEach(() => {
	hex = new mockHex({ row: 1, col: 1 });
	tile = new Tile({ hex });
	faction = new Faction({ index: 0 });
	nation = new Nation({ index: 0 });
});

describe('Tile class', () => {
	test('Tile.isTile returns true for Tile instance', () => {
		assert.true(Tile.isTile(tile));
	});

	test('claims() increments and returns faction claim', () => {
		const claim = tile.claims(faction, 10);
		assert.equal(claim, 10);
	});

	test('claims() increments and returns nation claim', () => {
		const claim = tile.claims(nation, 5);
		assert.equal(claim, 5);
	});

	test('faction getter returns top claimant', () => {
		tile.claims(faction, 20);
		assert.equal(tile.faction, faction);
	});

	test('nation getter returns top claimant', () => {
		tile.claims(nation, 15);
		assert.equal(tile.nation, nation);
	});

	test('claimTerritory updates claims and triggers markTerritory', (t) => {
		const spy = t.mock.fn();
		t.mock.method(currentGame, 'markTerritory', spy);

		tile.claimTerritory(faction, 10);
		assert.equal(spy.mock.callCount(), 2);
		assert.equal(spy.mock.calls[0].arguments[0], tile.hex);
	});

	test('isValidImprovement returns false for unknown improvement', () => {
		assert.false(tile.isValidImprovement('not-real'));
	});

	test('setImprovement returns true for valid improvement', () => {
		const result = tile.setImprovement('farm', faction);
		assert.true(result);
		assert.equal(tile.improvement.key, 'farm');
	});

	test('setImprovement returns false for invalid improvement', () => {
		const result = tile.setImprovement('not-real');
		assert.false(result);
	});

	test('setImprovement destroys improvement when passed "destroy"', () => {
		tile.setImprovement('farm');
		assert.equal(tile.improvement.key, 'farm');
		const result = tile.setImprovement('destroy');
		assert.true(result);
		assert.equal(tile.improvement.key, undefined);
	});

	test('laborers setter accepts valid Laborer', () => {
		const laborer = new Laborer({ hex });
		tile.laborers = laborer;
		assert.true(tile.laborers.has(laborer));
	});

	test('laborers setter throws on invalid input', () => {
		assert.throws(() => {
			tile.laborers = {};
		}, {
			name: 'TypeError',
			message: 'Tile.laborers expects to be assigned object instance of Laborer!',
		});
	});
});
