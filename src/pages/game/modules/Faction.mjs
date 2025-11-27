import World from '../../../json/world.mjs';

import City from './City.mjs';
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

	currentGame.events.on('goods-moved', (evt) => {
		const { goods, promise } = evt.detail;
		if (goods.faction !== this || !City.isCity(goods.hex.city)) return;
		// Deliver Food to City
		promise.then(() => {
			console.log('Sam, Faction received', goods.num, 'goods for', World.ResourceValues[goods.goodsType], 'each');
			this.money += World.ResourceValues[goods.goodsType] * goods.num;
			console.log('Sam, Faction new money total:', this.money);
		});
	});

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
					activeUnitIndex = val % units.length;
					return;
				}
				if (val === null) {
					activeUnitIndex = null;
				}
			},
		},
	});

	currentGame.events.on('unit-moved', (evt) => {
		if (evt.detail.faction === this || evt.detail.unit.faction === this) {
			evt.detail.promise.then(this.checkEndTurn.bind(this));
		}
	});
}
Object.assign(Faction.prototype, {
	addUnit(unitType, hex) {
		this.units.push(new Unit(unitType, {
			hex,
			faction: this,
		}));
	},
	checkEndTurn() {
		const hasMovableUnit = this.activateNext();
		if (!hasMovableUnit) {
			currentGame.events.emit('end-turn', { faction: this });
		}
	},
	activateUnit(intUnit = activeUnitIndex) {
		if (this.units.length === 0) {
			currentGame.events.emit('end-turn', { faction: this });
			return false;
		}
		if (!Unit.isActivatableUnit(this.units[intUnit])) {
			return false;
		}
		this.units[intUnit].activate();
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
