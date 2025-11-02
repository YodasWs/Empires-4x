import World from '../../../json/world.mjs';

export function getNationColor(index) {
	return [
		0x32cd32,
		0xff0000,
		0x0000ff,
	][index] ?? 0xaaaaaa;
}

export function getNationFrame(index) {
	return (index + 1) % 3;
}

export function getNationName(index, worldData = World) {
	return worldData.NationNames?.[index] ?? 'Unknown';
}
