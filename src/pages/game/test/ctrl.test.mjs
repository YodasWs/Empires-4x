import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Expand assert with convenience methods
assert.false = (val) => assert.equal(val, false);
assert.true = (val) => assert.equal(val, true);

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';

import { Actions, DoAction, OpenUnitActionMenu } from '../modules/Actions.mjs';
import City from '../modules/City.mjs';
import Faction from '../modules/Faction.mjs';
import Goods from '../modules/Goods.mjs';
import Laborer from '../modules/Laborer.mjs';
import Nation from '../modules/Nation.mjs';
import Tile from '../modules/Tile.mjs';
import { default as Unit, init as initUnitModule } from '../modules/Unit.mjs';
import { FindPath, Grid, IsLegalMove, MovementCost } from '../modules/Hex.mjs';
import { currentGame } from '../modules/Game.mjs';

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

	it('addUnit adds a new Unit to faction', async (t) => {
		t.todo('Not yet implemented');
	});

	it('activateUnit calls activate on valid unit', async (t) => {
		t.todo('Not yet implemented');
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
	it('should have a color', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a frame', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have an index', (t) => {
		t.todo('Not yet implemented');
	});
	it('should be the Roman Empire', (t) => {
		t.todo('Not yet implemented');
	});
});

describe('Tile class', () => {
	it('should have a Hex coordinate', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a Faction owner', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a Nation owner', (t) => {
		t.todo('Not yet implemented');
	});
	it('should have a Set of Laborer', (t) => {
		t.todo('Not yet implemented');
	});
	it('should accept a new Laborer', (t) => {
		t.todo('Not yet implemented');
	});
	it('should update territorial claims for Faction', (t) => {
		t.todo('Not yet implemented');
	});
	it('should update territorial claims for Nation', (t) => {
		t.todo('Not yet implemented');
	});
});

describe('Unit class', () => {
});
