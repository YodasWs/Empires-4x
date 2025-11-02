import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';
import World from '../../../json/world.mjs';
import * as utils from '../utils/UnitUtils.mjs';

import { Actions } from './Actions.mjs';
import City from './City.mjs';
import Laborer from './Laborer.mjs';
import { FindPath, Grid, IsLegalMove, MovementCost } from './Hex.mjs';
import { currentGame } from './Game.mjs';

const offscreen = globalThis.window === undefined ? -10000
	: Math.max(window.visualViewport.width, window.visualViewport.height) * -2;
const actionOutlines = {
	text: [],
};

let MainGameScene;

export function init() {
	MainGameScene = currentGame.scenes.getScene('mainGameScene');
}

function hideActionSprites() {
	currentGame.sprActiveUnit.setActive(false).setPosition(offscreen, offscreen).setDepth(GameConfig.depths.offscreen);
	actionOutlines.graphics?.destroy();
	while (actionOutlines.text.length > 0) {
		actionOutlines.text.pop().destroy();
	}
}

function Unit(unitType, {
	row,
	col,
	faction,
}) {
	utils.validateUnitType(unitType);
	// Add sprite
	const { x, y } = Grid.getHex({ row, col });
	const sprite = MainGameScene.add.sprite(x, y, `unit.${unitType}`)
		.setTint(0x383838)
		.setDepth(GameConfig.depths.inactiveUnits);
	sprite.setScale(GameConfig.unitWidth / sprite.width);

	// Define properties
	this.col = col;
	this.row = row;
	this.path = [];
	this.deleted = false;
	Object.defineProperties(this, {
		base: {
			enumerable: true,
			get: () => base,
		},
		hex: {
			enumerable: true,
			get: () => Grid.getHex({ row: this.row, col: this.col }),
		},
		faction: {
			enumerable: true,
			get: () => faction,
		},
		scene: {
			enumerable: true,
			get: () => MainGameScene,
		},
		sprite: {
			enumerable: true,
			get: () => sprite,
		},
		unitType: {
			enumerable: true,
			get: () => unitType,
		},
	});
}
Object.assign(Unit.prototype, {
	activate() {
		hideActionSprites();
		const thisHex = Grid.getHex({ row: this.row, col: this.col });
		currentGame.sprActiveUnit.setActive(true).setPosition(thisHex.x, thisHex.y).setDepth(GameConfig.depths.activeUnit - 1);

		// Pan camera to active unit
		// TODO: Add setting to skip this if automated movement
		// TODO: Add setting to skip if not human player's unit
		const startPos = GameConfig.lineShift(this.scene.cameras.main.getScroll(thisHex.x, thisHex.y), {
			x: this.scene.cameras.main.scrollX,
			y: this.scene.cameras.main.scrollY,
		}, 0.2);
		setTimeout(() => {
			this.scene.cameras.main.setScroll(startPos.x, startPos.y);
			setTimeout(() => {
				const pos = this.scene.cameras.main.getScroll(thisHex.x, thisHex.y);
				this.scene.cameras.main.pan(thisHex.x, thisHex.y, 500, 'Linear', true);
			}, 0);
		}, 0);
		this.sprite.setTint(0xffffff).setDepth(GameConfig.depths.activeUnit);

		// Continue on path
		if (Array.isArray(this.path) && this.path.length > 0) {
			while (this.moves >= MovementCost(this, this.path[0])) {
				this.doAction('moveTo', this.path.shift());
			}
			this.deactivate(true);
			return;
		}

		// Not the human player's unit, do nothing (for now)
		if (this.faction.index !== 0) {
			this.deactivate(true);
			return;
		}

		// Set text and listeners on hexes to move unit
		[
			'L',
			'K',
			'J',
			'U',
			'I',
			'O',
		].forEach((move) => {
			const [row, col] = utils.actionTileCoordinates(move.toLowerCase(), this.row, this.col);
			if (IsLegalMove(row, col, this)) {
				const hex = Grid.getHex({ row, col });
				const text = MainGameScene.add.text(
					hex.x - GameConfig.tileWidth / 2,
					hex.y + GameConfig.tileWidth / 6,
					move,
					{
						fixedWidth: GameConfig.tileWidth,
						font: '25pt Trebuchet MS',
						align: 'center',
						color: 'khaki',
						stroke: 'black',
						strokeThickness: 7,
					}
				).setOrigin(0).setDepth(GameConfig.depths.actionSprites);
				actionOutlines.text.push(text);
				this.scene.cameras.getCamera('mini').ignore(text);
			}
		});

		currentGame.activeUnit = this;
		this.scene.input.keyboard.enabled = true;
	},
	deactivate(endMoves = false) {
		if (endMoves === true) {
			this.moves = 0;
		}
		hideActionSprites();
		this.sprite.setTint(0x383838).setDepth(GameConfig.depths.inactiveUnits);
		currentGame.activeUnit = null;
		this.scene.input.keyboard.enabled = false;
		currentGame.currentPlayer.checkEndTurn();
	},
	destroy() {
		this.deactivate(true);
		this.sprite.setActive(false);
		this.sprite.destroy();
		this.deleted = true;
	},
	doAction(action, hex = null) {
		currentGame.closeUnitActionMenu();
		// Wait, to do action later in turn
		if (action === 'w' || action === 'Tab') {
			// TODO: If Tab on unit action menu, do a11y instead of deactivate unit
			this.deactivate();
			return;
		}
		// Stay here this turn
		if (action === 's') {
			this.deactivate(true);
			return;
		}
		// Move unit
		if (action === 'moveTo' && hex instanceof Honeycomb.Hex) {
			if (Grid.distance(this.hex, hex) === 1) {
				// Neighbor, move there
				this.moveTo(hex);
			} else {
				// Find path
				const path = FindPath(this.hex, hex, this);
				if (!Array.isArray(path) || path.length === 0) {
					// TODO: Warn User no path was found
					console.warn('Sam, no path found!');
					return;
				}
				if (Array.isArray(path)) {
					this.path = path;
				}
			}
		} else if ([
			'u',
			'i',
			'o',
			'j',
			'k',
			'l',
		].includes(action)) {
			const [row, col] = utils.actionTileCoordinates(action, this.row, this.col);
			this.moveTo(Grid.getHex({ row, col }));
		} else if (action === 'c') {
			const thisHex = Grid.getHex({ row: this.row, col: this.col});
			if (!Actions['c'].isValidOption({ hex: thisHex, faction: this.faction })) {
				// TODO: Show message to Player that territory already belongs to them!
				console.warn('Sam, you own this already');
				return;
			}
			// Claim hex territory
			thisHex.tile.claimTerritory(this.faction, 10);
			this.deactivate(true);
		} else {
			const thisHex = Grid.getHex({ row: this.row, col: this.col});
			// Unit-specific actions
			switch (this.unitType) {
				case 'settler':
					switch (action) {
						// TODO: Build Village
						case 'b':
							break;
							if (!Actions['b'].isValidOption({ hex: thisHex })) {
								// TODO: Warn player
								console.warn('Cannot place city adjacent to another city');
								return;
							}
							// TODO: Switch to Village
							const city = new City({
								col: this.col,
								row: this.row,
								// faction: this.faction,
								scene: this.scene,
							});
							this.destroy();
							return;
					}
					break;
				case 'homesteader':
					switch (action) {
						// Build farm
						case 'f':
							if (thisHex.tile.setImprovement('farm', this.faction)) {
								thisHex.tile.laborers = new Laborer({ hex: thisHex });
								this.destroy();
							} else {
								// TODO: Warn player
								console.warn('Could not build farm here');
							}
							return;
					}
					break;
				case 'builder':
					switch (action) {
						// Clear Improvement or Overlay
						case 'C':
							if (!Actions['C'].isValidOption({ hex: thisHex })) {
								return;
							}
							if (thisHex.tile.improvement.key === 'farm') {
								thisHex.tile.setImprovement('destroy');
								this.deactivate(true);
								return;
							}
					}
					break;
			}
		}
		if (this.moves > 0) {
			this.faction.activateUnit();
		} else {
			this.deactivate();
		}
	},
	moveTo(hex) {
		if (!(hex instanceof Honeycomb.Hex)) return;
		if (!IsLegalMove(hex.row, hex.col, this)) return;
		this.row = hex.row;
		this.col = hex.col;
		// TODO: Chain tweens to multiple hexes instead of straight to last hex
		MainGameScene.tweens.add({
			targets: this.sprite,
			x: hex.x,
			y: hex.y,
			ease: 'Quad.inOut',
			duration: 800,
			yoyo: false,
			onComplete(tween) {
				tween.destroy();
			},
		});
		this.moves -= MovementCost(this, hex);
		if (this.moves <= 0) this.deactivate();
	},
});
export default Unit;
