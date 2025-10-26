import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
assert.false = (val) => assert.equal(val, false);
assert.true = (val) => assert.equal(val, true);

import Nation from './modules/Nation.mjs';

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
