import World from '../../../json/world.mjs';

function Nation({
	index,
}) {
	const color = [
		0x32cd32,
		0xff0000,
		0x0000ff,
	][index] ?? 0xaaaaaa;
	const frame = (index + 1) % 3;
	const name = World.NationNames?.[index] ?? 'Unknown';
	Object.defineProperties(this, {
		color: {
			enumerable: true,
			get: () => color,
		},
		frame: {
			enumerable: true,
			get: () => frame,
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
Nation.isNation = function isNation(nation) {
	return nation instanceof Nation;
}
export default Nation;
