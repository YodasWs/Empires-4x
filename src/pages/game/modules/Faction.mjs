import World from './../../../json/world.mjs';

import Unit from './Unit.mjs';
import { currentGame } from './Game.mjs';

export function getFactionColor(index) {
	return [
		0x32cd32,
		0xff0000,
		0x0000ff,
	][index] ?? 0xaaaaaa;
}

export function getNextMovableUnit(units, activeUnitIndex) {
	for (let i = 0; i < units.length; i++) {
		const unitIndex = (activeUnitIndex + 1 + i) % units.length;
		console.log('Sam, checking unit', unitIndex, 'moves:', units[unitIndex].moves);
		if (Unit.isMovableUnit(units[unitIndex])) {
			return units[unitIndex];
		}
	}
	return false;
}

let activeUnitIndex = null;

// Each Human/AI Player controls a Faction
function Faction({
	index,
}) {
	const color = getFactionColor(index);
	const name = World?.FactionNames[index];
	let money = 0;
	let units = [];
	Object.defineProperties(this, {
		color: {
			enumerable: true,
			get: () => color,
		},
		index: {
			enumerable: true,
			get: () => index,
		},
		money: {
			enumerable: true,
			get: () => money,
			set(val) {
				if (!Number.isFinite(val) || val < 0) {
					throw new TypeError('Faction.money expects to be assigned a positive number!');
				}
				money = val;
			},
		},
		name: {
			enumerable: true,
			get: () => name,
		},
		nation: {
			enumerable: true,
			get: () => currentGame.nations[0],
		},
		units: {
			enumerable: true,
			get: () => units,
			set: (val) => {
				if (!Array.isArray(val)) {
					throw new TypeError('Faction.units expects to be assigned an Array!');
				}
				units = val.filter(Unit.isActivatableUnit);
			},
		},
		activeUnit: {
			enumerable: true,
			get: () => {
				if (Number.isInteger(activeUnitIndex) && activeUnitIndex >= 0 && activeUnitIndex <= units.length) {
					return units[activeUnitIndex];
				}
				return undefined;
			},
			set(val) {
				if (Number.isInteger(val) && val >= 0) {
					if (val >= units.length) {
						activeUnitIndex = val % units.length;
						return true;
					}
					activeUnitIndex = val;
					return true;
				}
				if (val === null) {
					activeUnitIndex = null;
				}
				return false;
			},
		},
	});
}
Object.assign(Faction.prototype, {
	addUnit(unitType, row, col, scene) {
		this.units.push(new Unit(unitType, {
			row,
			col,
			scene,
			faction: this,
		}));
	},
	checkEndTurn() {
		const hasMovableUnit = this.activateNext();
		if (!hasMovableUnit) {
			currentGame.endTurn();
		}
	},
	activateUnit(intUnit = activeUnitIndex) {
		if (this.units.length === 0) {
			this.checkEndTurn();
			return false;
		}
		const unit = this.units[intUnit];
		if (!Unit.isActivatableUnit(this.units[intUnit])) {
			return false;
		}
		unit.activate();
		activeUnitIndex = intUnit;
		return true;
	},
	activateNext() {
		const nextUnit = getNextMovableUnit(this.units, activeUnitIndex);
		if (Unit.isMovableUnit(nextUnit)) {
			activeUnitIndex = this.units.indexOf(nextUnit);
			nextUnit.activate();
			return true;
		}
		return false;
	},
});
Faction.isFaction = function isFaction(faction) {
	return faction instanceof Faction;
}
export default Faction;
