import World from '../../../json/world.mjs';

import * as Hex from './Hex.mjs';
import Faction from './Faction.mjs';
import Movable from './Movable.mjs';
import { currentGame } from './Game.mjs';

import { destroyUnitSprite } from '../views/UnitView.mjs';

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
		default:
			throw new TypeError(`Unknown action tile '${action}'`);
	}
	return [row, col];
}

function throwTypeError(message) {
	throw new TypeError(message);
}

export default class Unit extends Movable {
	#unitType

	constructor(unitType, {
		hex,
		faction,
	}) {
		if (!Faction.isFaction(faction)) {
			throw new TypeError('Unit expects to be assigned a Faction!');
		}
		const base = World.units[unitType] ?? throwTypeError(`Unknown unit '${unitType}'`)

		super({ base, hex, faction });
		this.#unitType = unitType;
		currentGame.events.emit('unit-created', { unit: this });
	}

	get unitType() {
		return this.#unitType;
	}

	deactivate(endMoves = false) {
		super.deactivate(endMoves);
		currentGame.activeUnit = null;
		// TODO: Probably do this by event emitter instead
		this.faction.checkEndTurn();
	}

	activate(continueOnPath = true) {
		// TODO: Add setting to skip this if automated movement
		// TODO: Add setting to skip view/center/wait if not human player's unit

		super.activate(continueOnPath);

		currentGame.activeUnit = this;

		// Not the human player's unit, do nothing (for now)
		if (this.faction.index !== 0) {
			this.deactivate(true);
			return;
		}

		currentGame.events.emit('unit-activated', { unit: this });
	}

	destroy() {
		this.deactivate(true);
		super.destroy();
		destroyUnitSprite(this);
	}

	doAction(action, Grid = Hex.Grid) {
		try {
			const [row, col] = actionTileCoordinates(action, this.row, this.col);
			const targetHex = Grid.getHex({ row, col });
			super.setPath(targetHex, Grid);
			super.moveOneStep();
		} catch (e) {
			// I don't think we care about the error here
		}
	}

	static isUnit(unit) {
		return unit instanceof Unit;
	}
	static isActivatableUnit(unit) {
		return Unit.isUnit(unit) && unit.deleted === false;
	}
	static isMovableUnit(unit) {
		return Unit.isActivatableUnit(unit) && unit.moves > 0;
	}
}
export const isUnit = Unit.isUnit;
