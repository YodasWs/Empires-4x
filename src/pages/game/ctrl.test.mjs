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
import { FindPath, Grid } from './modules/Hex.mjs';
import { currentGame } from './modules/Game.mjs';

describe('Game Configuration', () => {
	it('should have correct tile and unit sizes', () => {
		assert.equal(GameConfig.tileWidth, 200);
		assert.equal(GameConfig.unitWidth, 80);
	});
});

describe('Tile class', () => {
});

describe('Laborer class', () => {
});

describe('City class', () => {
});

describe('Faction class', () => {
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

describe('Goods class', () => {
});

describe('Unit class', () => {
});
