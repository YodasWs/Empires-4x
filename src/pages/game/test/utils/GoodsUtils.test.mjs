import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../utils/GoodsUtils.mjs';

describe('GoodsUtils module', () => {
	test('validateGoodsType throws for unknown type', () => {
		assert.throws(() => {
			utils.validateGoodsType('this-is-not-a-good');
		}, /Unknown Goods type 'this-is-not-a-good'/);
	});
});
