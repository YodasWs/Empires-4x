import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../utils/CityUtils.mjs';

describe('CityUtils', () => {
	test('validateNation throws if not instance of Nation', () => {
		const fakeNation = {};
		assert.throws(() => {
			utils.validateNation(fakeNation);
		}, /City expects to be assigned a Nation/);
	});
});
