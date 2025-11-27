import assert from 'node:assert/strict';

// Expand assert with convenience methods
assert.false = (val, message = undefined) => assert.equal(val, false, message);
assert.true = (val, message = undefined) => assert.equal(val, true, message);

export default assert;
