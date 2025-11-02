import World from '../../../json/world.mjs';
import * as utils from '../utils/NationUtils.mjs';

function Nation({
	index,
}) {
	const color = utils.getNationColor(index);
	const name = utils.getNationName(index);
	Object.defineProperties(this, {
		color: {
			enumerable: true,
			get: () => color,
		},
		frame: {
			enumerable: true,
			get: () => utils.getNationFrame(index),
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
