import World from './../../../json/world.mjs';
import Unit from './Unit.mjs';
import { currentGame } from './Game.mjs';

let activeUnit = null;

// Each Human/AI Player controls a Faction
function Faction({
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
				units = val.filter(unit => unit instanceof Unit && unit.deleted === false);
			},
		},
		activeUnit: {
			enumerable: true,
			get() {
				if (Number.isInteger(activeUnit) && activeUnit >= 0 && activeUnit <= units.length) {
					return units[activeUnit];
				}
				return undefined;
			},
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
		if (!(unit instanceof Unit)) {
			return false;
		}
		if (unit.deleted === true) {
			return false;
		}
		unit.activate();
		activeUnit = intUnit;
		return true;
	},
	activateNext() {
		// Find and activate next unit
		for (let i = activeUnit + 1; i < this.units.length; i++) {
			if (!(this.units[i] instanceof Unit)) {
				continue;
			}
			if (this.units[i].moves > 0 && this.activateUnit(i)) {
				return true;
			}
		}
		// Check for unmoved unit we skipped
		for (let i = 0; i <= activeUnit; i++) {
			if (!(this.units[i] instanceof Unit)) {
				continue;
			}
			if (this.units[i].moves > 0 && this.activateUnit(i)) {
				return true;
			}
		}
		return false;
	},
});
export default Faction;
