import World from './../../../json/world.mjs';

import Unit from './Unit.mjs';
import { currentGame } from './Game.mjs';
import * as utils from '../utils/FactionUtils.mjs';

let activeUnit = null;

// Each Human/AI Player controls a Faction
function Faction({
	index,
}) {
	const name = World?.FactionNames[index];
	let money = 0;
	let units = [];
	Object.defineProperties(this, {
		color: {
			enumerable: true,
			get: () => utils.getFactionColor(index),
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
				units = utils.filterValidUnits(units);
			},
		},
		activeUnit: {
			enumerable: true,
			get: () => utils.getActiveUnit(units, activeUnit),
			set(val) {
				if (Number.isInteger(val) && val >= 0) {
					if (val >= units.length) {
						activeUnit = val % units.length;
						return true;
					}
					activeUnit = val;
					return true;
				}
				if (val === null) {
					activeUnit = null;
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
		let isActiveUnit = this.activateNext();
		if (!isActiveUnit) {
			currentGame.endTurn();
		}
	},
	activateUnit(intUnit = activeUnit) {
		if (this.units.length === 0) {
			this.checkEndTurn();
			return false;
		}
		const unit = this.units[intUnit];
		if (!utils.activatableUnit(this.units[intUnit])) {
			return false;
		}
		unit.activate();
		activeUnit = intUnit;
		return true;
	},
	activateNext() {
		return utils.getNextActivatableUnit(this.units, activeUnit);
	},
});
export default Faction;
