import * as Honeycomb from 'honeycomb-grid';
const tileWidth = 200;

const Tile = Honeycomb.defineHex({
	dimensions: tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
})
const grid = new Honeycomb.Grid(Tile, Honeycomb.rectangle({ width: 10, height: 6 }))

const actionSprites = (() => {
	const deltaX = tileWidth * (Math.sqrt(3) - 1);
	const deltaY = tileWidth * (2 * Math.sqrt(2) - 2);
	const halfTile = tileWidth / 2;
	const polygonPoints = [
		{ x: -2, y: 0 },
		{ x: -1, y: 0 - Math.sqrt(3) },
		{ x: 1, y: 0 - Math.sqrt(3) },
		{ x: 2, y: 0 },
		{ x: 1, y: Math.sqrt(3) },
		{ x: -1, y: Math.sqrt(3) },
	].map((point) => ({
		x: point.x * tileWidth / 4 + 150,
		y: point.y * tileWidth / 4 + 150,
	}));
	return {
		moveU: {
			src: 'img/actions/moveU.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x - deltaX,
				y: point.y - deltaY / 2,
			})),
			key: 'u',
		},
		moveI: {
			src: 'img/actions/moveI.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x,
				y: point.y - deltaY,
			})),
			key: 'i',
		},
		moveO: {
			src: 'img/actions/moveO.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x + deltaX,
				y: point.y - deltaY / 2,
			})),
			key: 'o',
		},
		moveJ: {
			src: 'img/actions/moveJ.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x - deltaX,
				y: point.y + deltaY / 2,
			})),
			key: 'j',
		},
		moveK: {
			src: 'img/actions/moveK.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x,
				y: point.y + deltaY,
			})),
			key: 'k',
		},
		moveL: {
			src: 'img/actions/moveL.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x + deltaX,
				y: point.y + deltaY / 2,
			})),
			key: 'l',
		},
	};
})();

const activeUnitDepth = 100;

const Player = (() => {
	let activeUnit = null;
	function Player() {
		const units = [];
		Object.defineProperties(this, {
			units: {
				enumerable: true,
				get: () => units,
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
	Object.assign(Player.prototype, {
		addUnit(unitType, row, col, game) {
			this.units.push(new Unit(unitType, {
				row,
				col,
				game,
				player: this,
			}));
		},
		checkEndTurn() {
			console.log('Sam, checkEndTurn');
			let isActiveUnit = this.activateNext();
			if (!isActiveUnit) {
				currentGame.endTurn();
			}
		},
		activateUnit(intUnit = activeUnit) {
			const unit = this.units[intUnit];
			if (!(unit instanceof Unit)) {
				throw new TypeError(`Player does not have unit ${intUnit}`);
			}
			const { x, y } = grid.getHex({ row: unit.row, col: unit.col });
			unit.sprite.setDepth(activeUnitDepth);
			currentGame.sprActiveUnit.setActive(true).setPosition(x, y).setDepth(activeUnitDepth - 1);
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				const [row, col] = actionTileCoordinates(action, unit.row, unit.col);
				if (isLegalMove(unit, row, col)) {
					sprite.img.setActive(true).setPosition(x, y).setDepth(activeUnitDepth - 2);
				} else {
					sprite.img.setActive(false).setPosition(-300, -300).setDepth(0);
				}
			});
			activeUnit = intUnit;
			currentGame.activeUnit = unit;
			unit.game.input.keyboard.enabled = true;
		},
		activateNext() {
			// Find and activate next unit
			for (let i = activeUnit + 1; i < this.units.length; i++) {
				if (!(this.units[i] instanceof Unit)) {
					break;
				}
				if (this.units[i].moves > 0) {
					this.activateUnit(i);
					activeUnit = i;
					return true;
				}
			}
			// Check for unmove unit we skipped
			for (let i = 0; i <= activeUnit; i++) {
				if (!(this.units[i] instanceof Unit)) {
					break;
				}
				if (this.units[i].moves > 0) {
					this.activateUnit(i);
					activeUnit = i;
					return true;
				}
			}
			return false;
		},
	});
	return Player;
})();

const currentGame = {
	players: [
		new Player(),
	],
	turn: 0,
	activeUnit: null,
	currentPlayer: null,
	intCurrentPlayer: null,
	sprActiveUnit: null,
	startRound() {
		this.turn++;
		console.log('Sam, startRound', this.turn);
		this.startTurn(0);
	},
	startTurn(intPlayer) {
		if (!Number.isFinite(intPlayer)) {
			throw new TypeError(`Unknown player ${intPlayer}`);
		}
		this.currentPlayer = this.players[intPlayer];
		if (!(this.currentPlayer instanceof Player)) {
			throw new TypeError(`Player ${intPlayer} is not a Player Object`);
		}
		this.intCurrentPlayer = intPlayer;
		// Reset each unit's movement points
		this.currentPlayer.units.forEach((unit) => {
			unit.moves = unit.base.movementPoints;
		});
		// Activate first unit
		this.currentPlayer.activateUnit(0);
	},
	endTurn() {
		console.log('Sam, endTurn!');
		this.intCurrentPlayer++;
		if (this.intCurrentPlayer >= this.players.length) {
			this.endRound();
			return;
		}
		this.startTurn(this.intCurrentPlayer);
	},
	endRound() {
		console.log('Sam, endRound!');
		this.startRound();
	},
};

function actionTileCoordinates(action, row, col) {
	switch (action) {
	case 'moveU':
	case 'u':
		if (col % 2 == 0) row--;
		col--;
		break;
	case 'moveI':
	case 'i':
		row--;
		break;
	case 'moveO':
	case 'o':
		if (col % 2 == 0) row--;
		col++;
		break;
	case 'moveJ':
	case 'j':
		if (col % 2 == 1) row++;
		col--;
		break;
	case 'moveK':
	case 'k':
		row++;
		break;
	case 'moveL':
	case 'l':
		if (col % 2 == 1) row++;
		col++;
		break;
	}
	return [row, col];
}

function Unit(unitType, {
	row,
	col,
	game,
	player
}) {
	// Check unitType exists
	const base = json.world.units[unitType];
	if (typeof base !== 'object' || base === null) {
		throw new TypeError(`Unknown unit '${unitType}'`);
	}
	// Add sprite
	const { x, y } = grid.getHex({ row, col });
	const sprite = game.add.sprite(x, y, `unit.${unitType}`);
	// Define properties
	this.col = col;
	this.row = row;
	Object.defineProperties(this, {
		base: {
			enumerable: true,
			get: () => base,
		},
		game: {
			enumerable: true,
			get: () => game,
		},
		sprite: {
			enumerable: true,
			get: () => sprite,
		},
	});
}
Object.assign(Unit.prototype, {
	deactivate() {
		currentGame.sprActiveUnit.setActive(false).setPosition(-300, -300).setDepth(0);
		Object.entries(actionSprites).forEach(([action, sprite]) => {
			sprite.img.setActive(false).setPosition(-300, -300).setDepth(0);
		});
		this.sprite.setDepth(1);
		currentGame.activeUnit = null;
		this.game.input.keyboard.enabled = false;
		currentGame.currentPlayer.checkEndTurn();
	},
	doAction(action) {
		if (action === 'w') {
			this.deactivate();
			return;
		}
		console.log(`Sam, '${action}'`);
		if (action === ' ') {
			console.log('Sam, did you hit space?');
			this.moves = 0;
			this.deactivate();
			return;
		}
		if ([
			'moveU',
			'u',
			'moveI',
			'i',
			'moveO',
			'o',
			'moveJ',
			'j',
			'moveK',
			'k',
			'moveL',
			'l',
		].includes(action)) {
			const [row, col] = actionTileCoordinates(action, this.row, this.col);
			if (!isLegalMove(this, row, col)) {
				return;
			}
			this.row = row;
			this.col = col;
			const target = grid.getHex({ row: this.row, col: this.col});
			this.sprite.setPosition(target.x, target.y).setDepth(1);
			this.moves -= this.base.movementCosts[target.terrain];
			if (this.moves > 0) {
				this.player.activateUnit();
			} else {
				this.deactivate();
			}
			return;
		}
	},
});

function doAction(evt) {
	// Not the player's turn, leave
	if (currentGame.currentPlayer !== currentGame.players[0]) {
		return false;
	}
	if (evt.repeat) {
		return false;
	}
	// No active unit, leave
	if (typeof currentGame.activeUnit !== 'object' || currentGame.activeUnit === null) {
		return false;
	}
	currentGame.activeUnit.doAction(evt.key);
}

function isLegalMove(unit, row, col) {
	// Grab Target Tile
	const target = grid.getHex({ row, col });
	if (target === undefined) return false;
	console.log('Sam, isLegalMove, target:', target);

	// TODO: Check move into City
	switch (target.city) {
	}

	// TODO: Check for battle
	// const tileUnits = grabUnitsOnTile(row, col);
	let tileUnits;
	if (false) {
		if (unit.attack == 0) return false;
		if (units[tileUnits[0]].faction == 'britton' && unit.faction == 'roman') return false;
	}
	console.log('Sam, isLegalMove, unit:', unit);

	// Check movement into terrain
	const movementCost = unit.base.movementCosts[target.terrain];
	if (!Number.isFinite(movementCost)) return false;
	if (movementCost <= unit.moves) return true;
	return false;
}

const config = {
	type: Phaser.AUTO,
	height: 1200,
	width: 1600,
	zoom: 0.8,
	backgroundColor: '#71ABFF',
	scene: {
		preload() {
			// Load World Tile Images
			Object.entries(json.world.terrains).forEach(([key, terrain]) => {
				this.load.image(`tile.${key}`, `img/tiles/${terrain.tile}.png`);
			});
			// Load images for player's action
			this.load.image('activeUnit', 'img/activeUnit.png');
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				this.load.image(action, sprite.src);
			});
			// Load Unit Images
			Object.keys(json.world.units).forEach((unit) => {
				this.load.image(`unit.${unit}`, `img/units/${unit}.png`);
			});
		},
		create() {
			// Build World from Honeycomb Grid
			grid.forEach((hex) => {
				const tile = json.world.world[hex.row][hex.col];
				Object.assign(hex, tile, {
					sprite: this.add.image(hex.x, hex.y, `tile.${tile.terrain}`).setDepth(0),
					text: this.add.text(hex.x - tileWidth / 2, hex.y + tileWidth / 3.6, hex.row + '×' + hex.col, {
						fixedWidth: tileWidth,
						font: '12pt Trebuchet MS',
						align: 'center',
						color: 'white',
					}).setOrigin(0),
				});
			});

			// Add Game Sprites and Images
			currentGame.sprActiveUnit = this.add.image(-300, -300, 'activeUnit').setActive(false);
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				sprite.img = this.add.image(-300, -300, action).setInteractive(
					new Phaser.Geom.Polygon(sprite.polygon),
					Phaser.Geom.Polygon.Contains
				).on('pointerdown', () => {
					console.log('Sam, pointerdown on', action);
					doAction({ key: action });
				}).setActive(false);
			});

			// TODO: Build Starting Players and Units
			currentGame.players[0].addUnit('settler', 1, 2, this);
			currentGame.players[0].addUnit('warrior', Math.floor(Math.random() * 2 + 1), Math.floor(Math.random() * 3), this);
			console.log('Sam, players:', currentGame.players);
			console.log('Sam, unit 1:', currentGame.players[0].units[0]);

			this.input.keyboard.on('keydown', (evt) => {
				evt.preventDefault();
				doAction(evt);
			}).enabled = false;

			currentGame.startRound();
		},
		update() {
		},
	},
};

yodasws.page('pageGame').setRoute({
	template: 'pages/game/game.html',
	canonicalRoute: '/game/',
	route: '/game/?',
}).on('load', () => {
	const game = new Phaser.Game(Object.assign({}, config, {
		parent: document.querySelector('main'),
	}));
});
