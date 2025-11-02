import World from '../../../json/world.mjs';

export function actionTileCoordinates(action, row, col) {
	switch (action) {
		case 'u':
			if (col % 2 == 0) row--;
			col--;
			break;
		case 'i':
			row--;
			break;
		case 'o':
			if (col % 2 == 0) row--;
			col++;
			break;
		case 'j':
			if (col % 2 == 1) row++;
			col--;
			break;
		case 'k':
			row++;
			break;
		case 'l':
			if (col % 2 == 1) row++;
			col++;
			break;
	}
	return [row, col];
}

export function validateUnitType(unitType) {
	// Check unitType exists
	const base = World.units[unitType];
	if (typeof base !== 'object' || base === null) {
		throw new TypeError(`Unknown unit '${unitType}'`);
	}
}
