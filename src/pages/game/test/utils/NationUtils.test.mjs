import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../utils/NationUtils.mjs';

describe('NationUtils module', () => {
	test('getNationColor returns correct color', () => {
		assert.equal(utils.getNationColor(0), 0x32cd32);
		assert.equal(utils.getNationColor(1), 0xff0000);
		assert.equal(utils.getNationColor(2), 0x0000ff);
		assert.equal(utils.getNationColor(99), 0xaaaaaa);
	});

	test('getNationFrame returns correct frame', () => {
		assert.equal(utils.getNationFrame(0), 1);
		assert.equal(utils.getNationFrame(1), 2);
		assert.equal(utils.getNationFrame(2), 0);
	});

	test('getNationName returns name from world data', () => {
		const mockWorld = { NationNames: ['Britons', 'Gauls', 'Romans'] };
		assert.equal(utils.getNationName(1, mockWorld), 'Gauls');
	});

	test('getNationName returns "Unknown" if index is missing', () => {
		const mockWorld = { NationNames: ['Britons'] };
		assert.equal(utils.getNationName(5, mockWorld), 'Unknown');
	});
});
