import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Expand assert with convenience methods
assert.false = (val) => assert.equal(val, false);
assert.true = (val) => assert.equal(val, true);

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import City from './modules/City.mjs';
import Faction from './modules/Faction.mjs';
import Goods from './modules/Goods.mjs';
import Laborer from './modules/Laborer.mjs';
import Nation from './modules/Nation.mjs';
import Tile from './modules/Tile.mjs';
import Unit from './modules/Unit.mjs';
import { Grid } from './modules/Hex.mjs';
import { currentGame } from './modules/Game.mjs';

describe('Game Configuration', () => {
	it('should have correct tile and unit sizes', () => {
		assert.equal(GameConfig.tileWidth, 200);
		assert.equal(GameConfig.unitWidth, 80);
	});
});

describe('City class', () => {
});

describe('Faction class', () => {
	it('initializes with correct color and index', () => {
		const faction = new Faction({ index: 1 });
		assert.equal(faction.index, 1);
		assert.equal(faction.color, 0xff0000);
	});

	it('Faction.money setter enforces positive numbers', () => {
		const faction = new Faction({ index: 0 });
		faction.money = 100;
		assert.equal(faction.money, 100);
		assert.throws(() => {
			faction.money = -5;
		}, 'expects to be assigned a positive number');
	});

	it('Faction.checkEndTurn calls currentGame.endTurn', async (t) => {
		const mockEndTurn = t.mock.fn();
		t.mock.method(currentGame, 'endTurn', mockEndTurn);

		const faction = new Faction({ index: 0 });
		faction.activateNext = () => false; // force endTurn path
		faction.checkEndTurn();

		assert.equal(mockEndTurn.mock.callCount(), 1);
	});
});

describe('Goods class', () => {
});

describe('Laborer class', () => {
});

describe('Nation class', () => {
	const n = new Nation({
		index: 0,
	});
	it('should have a color', () => {
		assert.equal(typeof n.color, 'number');
		assert.false(Number.isNaN(n.color));
		assert.true(Number.isInteger(n.color));
	});
	it('should have a frame', () => {
		assert.equal(n.frame, 1);
	});
	it('should have an index', () => {
		assert.equal(n.index, 0);
	});
	it('should be the Roman Empire', () => {
		assert.equal(n.name, 'Roman Empire');
	});
});

describe('Tile class', () => {
});

describe('Unit class', () => {
});
