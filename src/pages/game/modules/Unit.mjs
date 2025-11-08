import * as GameConfig from './Config.mjs';
import World from '../../../json/world.mjs';

import { Actions } from './Actions.mjs';
import City from './City.mjs';
import * as Hex from './Hex.mjs';
import Laborer from './Laborer.mjs';
import { currentGame } from './Game.mjs';

const actionOutlines = {
	text: [],
};

let MainGameScene;

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

export function init() {
	MainGameScene = currentGame.scenes.getScene('mainGameScene');
}

export function hideActionSprites() {
	const windowConfig = GameConfig.getWindowConfig();
	currentGame.sprActiveUnit?.setActive(false).setPosition(windowConfig.offscreen, windowConfig.offscreen).setDepth(GameConfig.depths.offscreen);
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
	if (typeof (World.units[unitType] ?? false) !== 'object') {
		throw new TypeError(`Unknown unit '${unitType}'`);
	}
	// Add sprite
	const { x, y } = Hex.Grid.getHex({ row, col });
	const sprite = MainGameScene?.add.sprite(x, y, `unit.${unitType}`)
		.setTint(0x383838)
		.setDepth(GameConfig.depths.inactiveUnits);
	sprite?.setScale(GameConfig.unitWidth / sprite.width);

	const base = World.units[unitType];
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
			get: () => Hex.Grid.getHex({ row: this.row, col: this.col }),
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
		const thisHex = Hex.Grid.getHex({ row: this.row, col: this.col });
		currentGame.sprActiveUnit?.setActive(true).setPosition(thisHex.x, thisHex.y).setDepth(GameConfig.depths.activeUnit - 1);

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
		this.sprite?.setTint(0xffffff).setDepth(GameConfig.depths.activeUnit);

		// Continue on path
		if (Array.isArray(this.path) && this.path.length > 0) {
			while (this.moves >= Hex.MovementCost(this, this.path[0])) {
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
			const [row, col] = actionTileCoordinates(move.toLowerCase(), this.row, this.col);
			const hex = Hex.Grid.getHex({ row, col });
			if (Hex.IsLegalMove(hex, this)) {
				const text = MainGameScene?.add.text(
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
		if (typeof this.scene?.input?.keyboard?.enabled === 'boolean') {
			this.scene.input.keyboard.enabled = true;
		}
	},
	deactivate(endMoves = false) {
		if (endMoves === true) {
			this.moves = 0;
		}
		hideActionSprites();
		this.sprite?.setTint(0x383838).setDepth(GameConfig.depths.inactiveUnits);
		currentGame.activeUnit = null;
		if (typeof this?.scene?.input?.keyboard?.enabled === 'boolean') {
			this.scene.input.keyboard.enabled = false;
		}
		currentGame.currentPlayer?.checkEndTurn();
	},
	destroy() {
		this.deactivate(true);
		this.sprite?.setActive(false);
		this.sprite?.destroy();
		this.deleted = true;
	},
	// TODO: Move all of this to Actions.mjs
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
		if (action === 'moveTo' && Hex.isHex(hex)) {
			if (Hex.Grid.distance(this.hex, hex) === 1) {
				// Neighbor, move there
				this.moveTo(hex);
			} else {
				// Find path
				const path = Hex.FindPath(this.hex, hex, this);
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
			const [row, col] = actionTileCoordinates(action, this.row, this.col);
			this.moveTo(Hex.Grid.getHex({ row, col }));
		} else if (action === 'c') {
			const thisHex = Hex.Grid.getHex({ row: this.row, col: this.col});
			if (!Actions['c'].isValidOption({ hex: thisHex, faction: this.faction })) {
				// TODO: Show message to Player that territory already belongs to them!
				console.warn('Sam, you own this already');
				return;
			}
			// Claim hex territory
			thisHex.tile.claimTerritory(this.faction, 10);
			this.deactivate(true);
		} else {
			const thisHex = Hex.Grid.getHex({ row: this.row, col: this.col});
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
				case 'farmer':
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
		if (!Hex.IsLegalMove(hex, this)) return;
		this.row = hex.row;
		this.col = hex.col;
		// TODO: Move tween code to View layer
		// TODO: Chain tweens to multiple hexes instead of straight to last hex
		MainGameScene?.tweens.add({
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
		this.moves -= Hex.MovementCost(this, hex);
		if (this.moves <= 0) this.deactivate();
	},
});
Unit.isUnit = function isUnit(unit) {
	return unit instanceof Unit;
}
Unit.isActivatableUnit = function isActivatableUnit(unit) {
	return Unit.isUnit(unit) && unit.deleted === false;
}
Unit.isMovableUnit = function isMovableUnit(unit) {
	return Unit.isActivatableUnit(unit) && unit.moves > 0;
}
export default Unit;
