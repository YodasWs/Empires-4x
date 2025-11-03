import assert from 'node:assert/strict';

// Expand assert with convenience methods
assert.false = (val) => assert.equal(val, false);
assert.true = (val) => assert.equal(val, true);

export default assert;
