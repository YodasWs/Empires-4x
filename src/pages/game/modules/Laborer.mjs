function Laborer({
	city,
	hex,
	tile,
}) {
	const name = generateRomanBritishName();
	if (city instanceof City) {
		Object.defineProperty(this, 'city', {
			enumerable: true,
			get: () => city,
		});
	}
	if (hex instanceof Honeycomb.Hex || tile?.hex instanceof Honeycomb.Hex) {
		Object.defineProperty(this, 'hex', {
			enumerable: true,
			get: () => hex || tile?.hex,
		});
	}
	if (tile instanceof Tile || hex?.tile instanceof Tile) {
		Object.defineProperty(this, 'tile', {
			enumerable: true,
			get: () => tile || hex?.tile,
		});
	}
	Object.defineProperties(this, {
		name: {
			enumerable: true,
			get: () => name,
		},
		sprite: {
			enumerable: true,
			get: () => 'laborers.farmer',
		},
	});
}
Object.assign(Laborer.prototype, {
	FOOD_CONSUMPTION: 2,
	assignTile(tile) {
		if (!(tile instanceof Tile)) {
			throw new TypeError('Laborer.assignTile expects to be passed object instance of Tile!');
		}
		// TODO: Check if Tile has already been assigned and is at its capacity
		this.tile = tile;
	},
});
export default Laborer;
