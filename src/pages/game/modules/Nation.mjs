import World from './../../../json/world.mjs';

function Nation({
	index,
}) {
	const color = (() => {
		switch (index % 3) {
			case 0:
				return 0x32cd32;
			case 1:
				return 0xff0000;
			case 2:
				return 0x0000ff;
			default:
				return 0xaaaaaa;
		}
	})();
	const name = World.NationNames[index];
	Object.defineProperties(this, {
		color: {
			enumerable: true,
			get: () => color,
		},
		frame: {
			enumerable: true,
			get: () => (index + 1) % 3,
		},
		index: {
			enumerable: true,
			get: () => index,
		},
		name: {
			enumerable: true,
			get: () => name,
		},
	});
}
Object.assign(Nation.prototype, {
});
export default Nation;
