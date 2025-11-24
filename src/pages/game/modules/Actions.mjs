import World from '../../../json/world.mjs';
import * as Honeycomb from 'honeycomb-grid';

import * as Hex from './Hex.mjs';
import City from './City.mjs';
import Laborer from './Laborer.mjs';
import Tile from './Tile.mjs';
import Unit from './Unit.mjs';
import { currentGame } from './Game.mjs';

// TODO: Base action object:
/*
action = {
	key: 'nameOfAction',
	text: ({ hex, unit, faction }) => 'User-facing Action Name',
	sprite: 'optional-sprite-key',
	isValidOption: ({ hex, unit, faction }) => true/false,
	doAction: ({ hex, unit, faction }) => {
		// Perform action
	},
}
/**/

class GameAction {
	constructor(definition) {
		[
			'execute',
			'isValid',
			'label',
		].forEach((prop) => {
			if (prop in definition) {
				this[`#${prop}`] = definition[prop];
				delete definition[prop];
			}
		});
		Object.assign(this, definition);
	}

	isValid(context) {
		if (typeof context.menu === 'string' && !this.showIn.includes(context.menu)) return false;
		if (this['#isValid'] === true) return true;
		if (Array.isArray(this.unitTypes) &&
			(!Unit.isUnit(context.unit) || !this.unitTypes.includes(context.unit.unitType))) return false;
		const fn = ActionValidators[this['#isValid']];
		return typeof fn === 'function' ? fn(context) : true;
	}

	execute(context) {
		const fn = ActionExecutors[this['#execute']];
		if (!this.isValid(context)) {
			return false;
		}
		if (typeof fn === 'function') {
			return Promise.try(() => {
				currentGame.events.emit('doing-action');
			}).then(() => {
				fn(context);
			});
		}
		console.warn(`No executor for action ${this.key}`);
	}

	get label() {
		const fn = ActionLabels[this['#label']];
		if (typeof fn === 'function') return fn(context);
		return this['#label'];
	}
}

const ActionRegistry = new Map();

function loadActions(actionDefs) {
	actionDefs.forEach(def => {
		const action = new GameAction(def);
		ActionRegistry.set(action.key, action);
	});
}
loadActions(World.actions);

const ActionValidators = {
	currentPlayerTurn() {
		return currentGame.currentPlayer === currentGame.players[0];
	},
	hexTileValid({ hex }) {
		return Hex.isHex(hex) && Tile.isTile(hex.tile);
	},
	isCityTile({ hex }) {
		return City.isCity(hex.city);
	},
	isFarmBuildable({ hex, unit }) {
		if (hex !== unit.hex) return false;
		if (!ActionValidators.hexTileValid({ hex })) return false;
		return unit.unitType === 'farmer' && hex.tile.isValidImprovement('farm');
	},
	isHexControlled({ hex, faction }) {
		return hex.tile.faction === faction;
	},
	isLegalMove({ hex, unit }) {
		return hex !== unit.hex && Hex.IsLegalMove(hex, unit);
	},
};

const ActionExecutors = {
	buildFarm({ unit, hex }) {
		hex.tile.setImprovement('farm', unit.faction);
		hex.tile.laborers = new Laborer({
			hex,
			faction: unit.faction,
			type: 'farmer',
		});
		unit.destroy();
	},
	endTurn() {
		currentGame.events.emit('end-turn');
	},
	skip({ unit }) {
		unit.deactivate(true);
	},
	startCityView({ hex }) {
		currentGame.scenes.start('city-view', { hex });
	},
	startMoveTo({ unit, hex }) {
		if (unit.setPath(hex)) {
			unit.moveOneTurn();
		}
	},
	startTileView({ hex }) {
		currentGame.scenes.start('tile-view', { hex });
	},
	wait({ unit }) {
		unit.deactivate();
	},
};

// Store any labels that need to be generated dynamically by function
const ActionLabels = {
};

export class ActionHandler {
	static handle(key, context) {
		const action = ActionRegistry.get(key);
		if (!(action instanceof GameAction)) return false;
		if (!action.isValid(context)) return false;
		action.execute(context);
		return true;
	}

	static getAvailableActions(context) {
		return [...ActionRegistry.values()].filter(action => action.isValid(context));
	}
}

currentGame.events.on('key-pressed', (evt) => {
	const key = evt.detail;
	const unit = currentGame.activeUnit;
	if (!Unit.isUnit(unit)) return;
	const context = { unit, hex: unit.hex, faction: unit.faction };
	ActionHandler.handle(key, context);
});

/*
// TODO: This object should define every action and handle all of each action's programming
function Action(def) {
	Object.keys(def).forEach((key) => {
		if (typeof def[key] === 'function') {
			Object.defineProperty(this, key, {
				enumerable: true,
				get: () => def[key],
			});
		}
	});
	if (typeof def.text !== 'function') {
		Object.defineProperty(this, 'text', {
			enumerable: true,
			get() {
				if (typeof def.text === 'string') {
					return () => def.text;
				}
				return () => '[action text missing]';
			},
		});
	}
}
Object.assign(Action.prototype, {
});
//*/

/*
export const Actions = [
	{
		key: 'moveTo',
		text: ({ hex }) => Hex.isHex(hex) ? `Move to ${hex.row}×${hex.col}` : 'Move here',
		isValidOption({ hex, unit }) {
			return Hex.IsLegalMove(hex, unit);
		},
	},
	{
		key: 'tile',
		text: 'Information on space',
		isValidOption({ hex }) {
			return Hex.isHex(hex) && Tile.isTile(hex.tile);
		},
		doAction({ hex }) {
			if (this.isValidOption({ hex })) {
				CloseUnitActionMenu();
				currentGame.scenes.start('tile-view', {
					hex,
				});
			}
		},
	},
	{
		key: 'city',
		text: 'View city',
		isValidOption({ hex }) {
			return hex.tile?.faction === currentGame.currentPlayer && hex.city instanceof City;
		},
		doAction({ hex }) {
			if (this.isValidOption({ hex })) {
				CloseUnitActionMenu();
				currentGame.scenes.start('city-view', {
					hex,
				});
			}
		},
	},
	{
		// Allow switching between units
		key: 'activateUnit',
		text: ({ unit }) => {
			if (unit instanceof Unit) {
				const moveText = unit.moves > 0 ? `(${unit.moves} moves left)` : '(no moves)';
				return `Activate ${unit.unitType} ${moveText}`;
			}
			return 'Activate unit';
		},
		isValidOption({ unit }) {
			return unit instanceof Unit && !unit.deleted;
		},
		doAction({ unit, faction }) {
			if (this.isValidOption({ unit })) {
				CloseUnitActionMenu();

				// Deactivate current unit without ending moves
				if (currentGame.activeUnit instanceof Unit) {
					currentGame.activeUnit.deactivate(false);
				}

				// Find the unit's index in its player's units array
				const unitIndex = unit.faction.units.indexOf(unit);
				if (unitIndex >= 0) {
					unit.faction.activateUnit(unitIndex);
				}
			}
		},
	},
	{
		key: 'b', // build city
		text: '<u>B</u>uild city',
		isValidOption({ hex }) {
			// Do not build on water
			if (hex.terrain.isWater) {
				return false;
			}
			// Make sure there is no city on this tile or an adjacent tile
			if (Hex.Grid.traverse(Honeycomb.spiral({
				start: [ hex.q, hex.r ],
				radius: 1,
			})).filter((hex) => {
				if (hex.city instanceof City) {
					return true;
				}
				return false;
			}).size > 0) {
				return false;
			}
			return true;
		},
	},
	{
		key: 'c', // claim territory
		text: '<u>C</u>laim territory',
		isValidOption: ({ hex, faction }) => {
			return hex.tile.faction !== faction;
		},
	},
	{
		key: 'C',
		text: 'Clear land <kbd>Shift+C</kbd>',
		isValidOption({ hex }) {
			return [
				'farm',
			].includes(hex.tile.improvement.key);
		},
	},
	{
		key: 'f', // farm
		text: 'Build <u>f</u>arm',
		isValidOption({ hex }) {
			return hex.tile.isValidImprovement('farm');
		},
	},
].reduce((obj, action) => ({
	...obj,
	[action.key]: new Action(action),
}), {});
//*/

/*
export function DoAction(evt, hex = null) {
	// Not the player's turn, leave
	if (currentGame.currentPlayer !== currentGame.players[0]) {
		console.warn('Not your turn!');
		return false;
	}

	// Repeating keyboard/pointer action, ignore
	if (typeof evt === 'object' && evt.repeat) {
		return false;
	}

	if (typeof evt === 'string' && Actions[evt] instanceof Action && typeof Actions[evt].doAction === 'function') {
		Actions[evt].doAction({ hex });
		return true;
	}

	// No active unit, leave
	if (!(currentGame.activeUnit instanceof Unit)) {
		return false;
	}

	// All that remains are Unit actions
	currentGame.activeUnit.doAction(evt.key ?? evt, hex);
}
//*/
