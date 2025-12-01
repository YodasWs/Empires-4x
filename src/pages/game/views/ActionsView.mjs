import { currentGame } from '../modules/Game.mjs';

import { ActionHandler } from '../modules/Actions.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import Unit, * as UnitUtils from '../modules/Unit.mjs';
import { FogOfWar } from '../views/TileView.mjs';

if (typeof globalThis.document === 'undefined') {
	// Mock document for non-DOM environments
	globalThis.document = {
		add() {
			return this;
		},
		addEventListener() {
			return this;
		},
		appendChild() {
			return this;
		},
		createElement() {
			return this;
		},
		getElementById() {
			return this;
		},
		querySelector() {
			return this;
		},
		querySelectorAll() {
			return [];
		},
		remove() {
			return this;
		},
		removeAttribute() {
			return this;
		},
		setAttribute() {
			return this;
		},
	};
	globalThis.document.classList = globalThis.document;
	globalThis.document.style = globalThis.document;
}

let dom = null;

currentGame.events.on('phaser-ready', () => {
	dom ??= document.getElementById('tile-menu');
});

function OpenUnitActionMenu(evt) {
	const unit = evt.detail?.unit;
	if (!Unit.isUnit(unit) || currentGame.activeUnit !== unit) return;
	if (typeof Element === 'undefined' || !(currentGame.domContainer instanceof Element)) {
		return;
	}

	// Build menu
	// TODO: Move this to the Scene or View
	currentGame.domContainer.innerHTML = '';
	const div = document.createElement('div');
	div.classList.add('unit-actions-menu');

	const faction = currentGame.currentPlayer;
	const context = {
		menu: 'unit-actions-menu',
		hex: unit.hex,
		unit,
		faction,
	};

	ActionHandler.getAvailableActions(context).forEach((action) => {
		const button = document.createElement('button');
		button.innerHTML = action.label;
		button.addEventListener('click', () => {
			action.execute(context);
		});
		if (typeof action.description === 'string' && action.description !== '') {
			button.setAttribute('title', action.description);
		}
		button.style.pointerEvents = 'auto';
		div.appendChild(button);
	});

	currentGame.domContainer.appendChild(div);
	currentGame.domContainer.style.zIndex = 1;
}
currentGame.events.on('unit-activated', OpenUnitActionMenu);

function CloseUnitActionMenu() {
	currentGame.domContainer.innerHTML = '';
	currentGame.domContainer.style.zIndex = 0;
}
currentGame.events.on('unit-deactivated', CloseUnitActionMenu);
currentGame.events.on('unit-moving', CloseUnitActionMenu);

currentGame.events.on('doing-action', () => {
	CloseUnitActionMenu();
	CloseTileMenu();
});

function OpenTileMenu(evt) {
	const hex = evt.detail?.hex || evt.detail?.unit?.hex;
	if (!Hex.isHex(hex) || !Tile.isTile(hex.tile)) return;
	if (!FogOfWar.isHexExplored(currentGame.players[0], hex)) return;

	CloseTileMenu();

	const unit = currentGame.activeUnit;
	const faction = currentGame.currentPlayer;
	const context = {
		menu: 'tile-menu',
		hex,
		unit,
		faction,
	};

	const possibleActions = ActionHandler.getAvailableActions(context)

	// No valid actions
	if (possibleActions.length === 0) {
		return;
	}

	// Auto-execute if only one action and it's not a menu-worthy one
	if (possibleActions.length === 1 && possibleActions[0].key !== 'activateUnit') {
		possibleActions[0].execute(context);
		return;
	}

	// Build menu
	possibleActions.forEach((action) => {
		const button = document.createElement('button');
		button.innerHTML = action.label;
		button.addEventListener('click', () => {
			action.execute(context);
		});
		if (typeof action.description === 'string' && action.description !== '') {
			button.setAttribute('title', action.description);
		}
		button.style.pointerEvents = 'auto';
		dom.appendChild(button);
	});

	// Add cancel button
	const cancel = document.createElement('button');
	cancel.innerHTML = 'Cancel';
	cancel.addEventListener('click', CloseTileMenu);
	cancel.style.pointerEvents = 'auto';
	dom.appendChild(cancel);

	dom.style.zIndex = 1;
	dom.removeAttribute('hidden');
}
currentGame.events.on('hex-clicked', OpenTileMenu);

function CloseTileMenu(evt) {
	dom.setAttribute('hidden', true);
	dom.innerHTML = '';
}
currentGame.events.on('esc-pressed', CloseTileMenu);

/*
function OpenUnitActionMenu(evt) {
	// TODO: In the future, we don't want to accept the hex, only the Unit
	const hex = evt.detail?.hex || evt.detail?.unit?.hex;
	if (!Hex.isHex(hex) || !Tile.isTile(hex.tile)) {
		// Not valid hex, exit
		return;
	}

	// List possible actions on the hex to build menu
	const possibleActions = [];

	// Check for units on this hex
	const unitsOnHex = UnitUtils.getUnitsOnHex(hex);

	// If units on this hex, add option to activate each unit
	if (unitsOnHex.length > 0) {
		unitsOnHex.forEach(unit => {
			// Don't show option to activate currently active unit
			if (unit === currentGame.activeUnit) return;

			// Only show units from current player or if no active unit
			if (unit.faction === currentGame.currentPlayer || !currentGame.activeUnit) {
				possibleActions.push({
					action: 'activateUnit',
					unit: unit,
				});
			}
		});
	}

	if (Unit.isUnit(currentGame.activeUnit)) {
		if (currentGame.activeUnit.hex.row == hex.row && currentGame.activeUnit.hex.col == hex.col) {
			// Check conditions to add actions based on unit type
			switch (currentGame.activeUnit.unitType) {
				case 'settler':
					// Build city option
					if (Actions['b'].isValidOption({ hex })) {
						possibleActions.push('b');
					}
					break;
				case 'farmer':
					// TODO: Centralize check for hex's overlay
					[
						'f',
					].forEach((action) => {
						if (Actions[action].isValidOption({ hex })) {
							possibleActions.push(action);
						}
					});
					break;
			}
			// Check if territory is under our control
			if (Actions['c'].isValidOption({ hex, faction: currentGame.activeUnit.faction })) {
				possibleActions.push('c');
			}
		} else if (Hex.IsLegalMove(hex, currentGame.activeUnit)) {
			// Offer to move unit here
			possibleActions.push('moveTo');
		}
	}

	// Add option to view city
	if (Actions['city'].isValidOption({ hex })) {
		possibleActions.push('city');
	}

	// TODO: If more units here, add option to view units

	// If clicked on unit's tile, add options to wait and hold
	if (currentGame.activeUnit.hex.row === hex.row && currentGame.activeUnit.hex.col === hex.col) {
		possibleActions.push('w', 's');
	}

	possibleActions.push('tile');

	// No actions, do nothing
	if (possibleActions.length === 0) {
		CloseUnitActionMenu();
		return;
	}

	// If only one action, do it (but not for activateUnit - always show menu)
	if (possibleActions.length === 1 && typeof possibleActions[0] === 'object') switch (possibleActions[0].action) {
		case 'moveTo':
			// Automatically move to adjacent hex
			if (Hex.Grid.distance(currentGame.activeUnit.hex, hex) === 1) {
				currentGame.activeUnit.doAction('moveTo', hex);
				return;
			}
			break;
		case 'city':
			DoAction('city', hex);
			return;
		case 'tile':
			DoAction('tile', hex);
			return;
	}

	// Show menu with action options
	currentGame.domContainer.innerHTML = '';
	const div = document.createElement('div');
	div.classList.add('menu');
	possibleActions.concat([
		'',
	]).forEach((actionItem) => {
		const button = document.createElement('button');
		// Handle both string actions and object actions (for activateUnit)
		if (actionItem?.action) {
			const action = Actions[actionItem.action];
			button.innerHTML = action.text(actionItem);
			button.addEventListener('click', () => {
				action.doAction(actionItem);
			});
		} else {
			const action = actionItem;
			button.innerHTML = Actions[action].text({ hex });
			button.addEventListener('click', () => {
				DoAction(action, hex);
			});
		}
		button.style.pointerEvents = 'auto';
		div.appendChild(button);
	});
	div.style.pointerEvents = 'auto';
	currentGame.domContainer.appendChild(div);
	currentGame.domContainer.style.zIndex = 1;
}
//*/
