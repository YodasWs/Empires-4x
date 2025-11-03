import { describe, test } from 'node:test';
import assert from '../assert.mjs';
import * as utils from '../../utils/LaborerUtils.mjs';

describe('LaborerUtils module', () => {
	test('generateRomanBritishName returns a non-empty string', () => {
		const name = utils.generateRomanBritishName();
		assert.equal(typeof name, 'string');
		assert.true(name.length > 0);
	});
});
