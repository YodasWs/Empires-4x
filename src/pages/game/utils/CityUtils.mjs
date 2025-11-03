import Nation from '../modules/Nation.mjs';

export function validateNation(nation) {
	if (!(nation instanceof Nation)) {
		throw new TypeError('City expects to be assigned a Nation!');
	}
	return true;
}
