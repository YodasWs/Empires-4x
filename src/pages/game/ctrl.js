import * as Honeycomb from 'honeycomb-grid';
const tileWidth = 200;
const offscreen = window.visualViewport.width * -2;

const grid = new Honeycomb.Grid(Honeycomb.defineHex({
	dimensions: tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}), Honeycomb.rectangle({ width: 10, height: 6 }));

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

const depths = {
	map: 0,
	cities: 1,
	inactiveUnits: 2,
	actionSprites: 98,
	activeUnit: 100,
};

function Tile() {
}
Object.assign(Tile.prototype, {
});

function City({
	col,
	row,
	scene,
	player,
}) {
	const hex = grid.getHex({ row, col });
	const sprite = scene.add.image(hex.x, hex.y, 'cities', player % 3).setDepth(depths.cities).setScale(0.8);
	hex.city = this;
	Object.defineProperties(this, {
		sprite: {
			get: () => sprite,
		}
	});
}
Object.assign(City.prototype, {
});

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
		addUnit(unitType, row, col, scene) {
			this.units.push(new Unit(unitType, {
				row,
				col,
				scene,
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
			unit.activate();
			activeUnit = intUnit;
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
	scene,
	player
}) {
	// Check unitType exists
	const base = json.world.units[unitType];
	if (typeof base !== 'object' || base === null) {
		throw new TypeError(`Unknown unit '${unitType}'`);
	}
	// Add sprite
	const { x, y } = grid.getHex({ row, col });
	const sprite = scene.add.sprite(x, y, `unit.${unitType}`);
	// Define properties
	this.col = col;
	this.row = row;
	Object.defineProperties(this, {
		base: {
			enumerable: true,
			get: () => base,
		},
		scene: {
			enumerable: true,
			get: () => scene,
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
		const { x, y } = grid.getHex({ row: this.row, col: this.col });
		this.scene.cameras.main.centerOn(x, y);
		this.sprite.setDepth(depths.activeUnit);
		currentGame.sprActiveUnit.setActive(true).setPosition(x, y).setDepth(depths.activeUnit - 1);
		Object.entries(actionSprites).forEach(([action, sprite]) => {
			const [row, col] = actionTileCoordinates(action, this.row, this.col);
			if (isLegalMove(this, row, col)) {
				sprite.img.setActive(true).setPosition(x, y).setDepth(depths.actionSprites);
			} else {
				sprite.img.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.map);
			}
		});
		currentGame.activeUnit = this;
		this.scene.input.keyboard.enabled = true;
	},
	deactivate() {
		currentGame.sprActiveUnit.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.map);
		Object.entries(actionSprites).forEach(([action, sprite]) => {
			sprite.img.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.map);
		});
		this.sprite.setDepth(depths.inactiveUnits);
		currentGame.activeUnit = null;
		this.scene.input.keyboard.enabled = false;
		currentGame.currentPlayer.checkEndTurn();
	},
	doAction(action) {
		if (action === 'w') {
			this.deactivate();
			return;
		}
		if (action === ' ') {
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
			this.sprite.setPosition(target.x, target.y).setDepth(depths.inactiveUnits);
			this.moves -= this.base.movementCosts[target.terrain];
			if (this.moves > 0) {
				this.player.activateUnit();
			} else {
				this.deactivate();
			}
			return;
		}
		if (action === 'b' && this.unitType === 'settler') {
			// Build city
			const city = new City({
				col: this.col,
				row: this.row,
				player: 0,
				scene: this.scene,
			});
			// TODO: Remove unit from game
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

const scale = 0.8;

const config = {
	type: Phaser.AUTO,
	height: window.visualViewport.height / scale,
	width: window.visualViewport.width / scale,
	zoom: scale,
	backgroundColor: '#71ABFF',
	scene: {
		preload() {
			// Load World Tile Images
			Object.entries(json.world.terrains).forEach(([key, terrain]) => {
				this.load.image(`tile.${key}`, `img/tiles/${terrain.tile}.png`);
			});
			this.load.spritesheet('cities', 'img/tiles/cities.png', {
				frameHeight: 200,
				frameWidth: 200,
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
					sprite: this.add.image(hex.x, hex.y, `tile.${tile.terrain}`).setDepth(depths.map),
					text: this.add.text(hex.x - tileWidth / 2, hex.y + tileWidth / 3.6, hex.row + '×' + hex.col, {
						fixedWidth: tileWidth,
						font: '12pt Trebuchet MS',
						align: 'center',
						color: 'white',
					}).setOrigin(0),
				});
				if (typeof hex.city === 'object' && hex.city !== null) {
					new City({
						col: hex.col,
						row: hex.row,
						scene: this,
						player: hex.city.player,
					});
				}
			});

			// Add Game Sprites and Images
			currentGame.sprActiveUnit = this.add.image(offscreen, offscreen, 'activeUnit').setActive(false);
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				sprite.img = this.add.image(offscreen, offscreen, action).setInteractive(
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

			// Listen for key presses
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
