import Unit from '../modules/Unit.mjs';

export function getFactionColor(index) {
	return [
		0x32cd32,
		0xff0000,
		0x0000ff,
	][index] ?? 0xaaaaaa;
}

export function activatableUnit(unit) {
	return unit instanceof Unit && unit.deleted === false;
}

export function filterValidUnits(units) {
	if (!Array.isArray(units)) return undefined;
	return units.filter(activatableUnit);
}

export function getActiveUnit(units, activeUnit) {
	if (!Array.isArray(units)) return undefined;
	if (Number.isInteger(activeUnit) && activeUnit >= 0 && activeUnit <= units.length) {
		return units[activeUnit];
	}
	return undefined;
}

export function getNextActivatableUnit(units, activeUnit) {
	// Find and activate next unit
	for (let i = activeUnit + 1; i < units.length; i++) {
		if (!activatableUnit(units[i])) {
			continue;
		}
		if (units[i].moves > 0 && activateUnit(i)) {
			return true;
		}
	}
	// Check for unmoved unit we skipped
	for (let i = 0; i <= activeUnit; i++) {
		if (!activatableUnit(units[i])) {
			continue;
		}
		if (units[i].moves > 0 && activateUnit(i)) {
			return true;
		}
	}
	return false;
}
