import * as Honeycomb from 'honeycomb-grid';
const tileWidth = 200;
const offscreen = window.visualViewport.width * -2;

const grid = new Honeycomb.Grid(Honeycomb.defineHex({
	dimensions: tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}), Honeycomb.rectangle({ width: 15, height: 6 }));

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
	territoryLines: 1,
	cities: 2,
	inactiveUnits: 3,
	actionSprites: 98,
	activeUnit: 100,
};

function Tile() {
	let player = undefined;
	Object.defineProperties(this, {
		player: {
			enumerable: true,
			get: () => player,
			set(val) {
				if (!(val instanceof Player)) {
					throw new TypeError('Tile.player must be of type Player');
				}
				// Do not yet allow claiming of other player's territory
				if (!(player instanceof Player)) {
					player = val;
				}
			},
		},
	});
}
Object.assign(Tile.prototype, {
	claimTerritory(player) {
		this.player = player;
		currentGame.markTerritory();
	}
});

function City({
	col,
	row,
	scene,
	player,
}) {
	// Tie to hex
	const thisHex = grid.getHex({ row, col });
	const sprite = scene.add.image(thisHex.x, thisHex.y, 'cities', player.frame).setDepth(depths.cities).setScale(0.8);
	thisHex.city = this;
	// Claim this tile and adjacent tiles
	grid.traverse(Honeycomb.spiral({
		start: [ thisHex.q, thisHex.r ],
		radius: 1,
	})).forEach((hex) => {
		hex.tile.claimTerritory(player);
	});
	// Claim water territory
	grid.traverse(Honeycomb.spiral({
		start: [ thisHex.q, thisHex.r ],
		radius: 2,
	})).forEach((hex) => {
		if (hex.terrain.isWater && !hex.tile.player) {
			hex.tile.claimTerritory(player);
		}
	});
	// Properties
	Object.defineProperties(this, {
		player: {
			enumerable: true,
			get: () => player,
		},
		sprite: {
			get: () => sprite,
		}
	});
}
Object.assign(City.prototype, {
});

const Player = (() => {
	let activeUnit = null;
	function Player(index) {
		const units = [];
		Object.defineProperties(this, {
			frame: {
				enumerable: true,
				get: () => index % 3,
			},
			index: {
				enumerable: true,
				get: () => index,
			},
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
			color: {
				enumerable: true,
				get() {
					switch (index % 3) {
						case 0:
							return 0xff0000;
						case 1:
							return 0x00ff00;
						case 2:
							return 0x0000ff;
						default:
							return 0xaaaaaa;
					}
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
			if (this.units.length === 0) {
				this.checkEndTurn();
				return;
			}
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
		new Player(0),
		new Player(1),
		new Player(2),
	],
	turn: 0,
	activeUnit: null,
	currentPlayer: null,
	intCurrentPlayer: null,
	sprActiveUnit: null,
	startRound() {
		// Check cities
		grid.filter(hex => typeof hex.city === 'object' && hex.city !== null).forEach((hex) => {
			const city = hex.city;
			console.log('Sam, startRound, city:', city);
			grid.traverse(Honeycomb.spiral({
				start: [ hex.q, hex.r ],
				radius: 2,
			}));
		});
		// Start Round
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
		this.markTerritory();
		// Activate first unit
		this.currentPlayer.activateUnit(0);
	},
	markTerritory() {
		// TODO: Mark only the boundaries of territory
		// https://www.redblobgames.com/x/1541-hex-region-borders/
		const graphics = currentGame.scenes.getScene('mainGameScene').add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryLines);
		grid.forEach((hex) => {
			if (!hex.tile || !(hex.tile.player instanceof Player)) return;
			graphics.lineStyle(5, hex.tile.player.color);
			graphics.beginPath();
			// Draw points closer to center of hex
			const [firstCorner, ...otherCorners] = hex.corners.map(point => lineShift(point, hex, 0.97));
			graphics.moveTo(firstCorner.x, firstCorner.y);
			otherCorners.forEach(({x, y}) => {
				graphics.lineTo(x, y);
			});
			graphics.closePath();
			graphics.strokePath();
		});
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

function lineShift(point1, point2, t = 0.9) {
	const m = (point1.y - point2.y) / (point1.x - point2.x)
	const b = point1.y - m * point1.x
	const x = (point1.x - point2.x) * t + point2.x;
	return {
		x,
		y: m * x + b,
	};
}

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

function hideActionSprites() {
	currentGame.sprActiveUnit.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.map);
	Object.entries(actionSprites).forEach(([action, sprite]) => {
		sprite.img.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.map);
	});
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
		player: {
			enumerable: true,
			get: () => player,
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
		hideActionSprites();
		this.sprite.setDepth(depths.inactiveUnits);
		currentGame.activeUnit = null;
		this.scene.input.keyboard.enabled = false;
		currentGame.currentPlayer.checkEndTurn();
	},
	doAction(action) {
		// Wait, to do action later in turn
		if (action === 'w' || action === 'Tab') {
			this.deactivate();
			return;
		}
		// Stay here
		if (action === ' ') {
			this.moves = 0;
			this.deactivate();
			return;
		}
		// Move unit
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
			const thisHex = grid.getHex({ row: this.row, col: this.col});
			this.sprite.setPosition(thisHex.x, thisHex.y).setDepth(depths.inactiveUnits);
			this.moves -= this.base.movementCosts[thisHex.terrain.terrain];
			if (this.moves > 0) {
				this.player.activateUnit();
			} else {
				this.deactivate();
			}
			return;
		}
		// Build city
		if (action === 'b' && this.unitType === 'settler') {
			const thisHex = grid.getHex({ col: this.col, row: this.row });
			// Do not build on water
			if (thisHex.terrain.isWater) {
				return;
			}
			// Make sure there is no city on this tile or an adjacent tile
			if (grid.traverse(Honeycomb.spiral({
				start: [ thisHex.q, thisHex.r ],
				radius: 1,
			})).filter((hex) => {
				if (typeof hex.city === 'object' && hex.city !== null) {
					return true;
				}
				return false;
			}).size > 0) {
				return;
			}
			// Build city
			const city = new City({
				col: this.col,
				row: this.row,
				player: this.player,
				scene: this.scene,
			});
			// Remove unit from game
			const i = this.player.units.indexOf(this);
			if (i >= 0) {
				this.player.units.splice(i, 1);
			}
			this.deactivate();
			this.sprite.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.map);
			delete this;
			return;
		}
		// TODO: Claim hex territory
		if (action === 'c') {
			const thisHex = grid.getHex({ row: this.row, col: this.col});
			if (thisHex.tile.player === this.player) return;
			thisHex.tile.claimTerritory(this.player);
			this.moves--;
			this.deactivate();
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
	// console.log('Sam, isLegalMove, target:', target);

	// TODO: Check move into City
	if (target.city instanceof City && target.city.player.index !== unit.player.index) {
		if (!unit.attack || !unit.attackCities) return false;
	}

	// TODO: Check for battle
	// const tileUnits = grabUnitsOnTile(row, col);
	let tileUnits;
	if (false) {
		if (!unit.attack) return false;
		if (units[tileUnits[0]].index == 'britton' && unit.faction == 'roman') return false;
	}
	// console.log('Sam, isLegalMove, unit:', unit);

	// Check movement into terrain
	const movementCost = unit.base.movementCosts[target.terrain.terrain];
	if (!Number.isFinite(movementCost)) return false;
	if (movementCost <= unit.moves) return true;
	return false;
}

const scale = 0.5;

const config = {
	type: Phaser.AUTO,
	height: window.visualViewport.height / scale,
	width: window.visualViewport.width / scale,
	zoom: scale,
	backgroundColor: '#71ABFF',
	scene: {
		key: 'mainGameScene',
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
					tile: new Tile(),
					terrain: {
						...json.world.terrains[tile.terrain],
						terrain: tile.terrain,
					},
					sprite: this.add.image(hex.x, hex.y, `tile.${tile.terrain}`).setDepth(depths.map),
					text: this.add.text(hex.x - tileWidth / 2, hex.y + tileWidth / 3.6, hex.row + '×' + hex.col, {
						fixedWidth: tileWidth,
						font: '12pt Trebuchet MS',
						align: 'center',
						color: 'white',
					}).setOrigin(0),
				});
			}).forEach((hex) => {
				if (typeof hex.city === 'object' && hex.city !== null) {
					hex.city = new City({
						col: hex.col,
						row: hex.row,
						scene: this,
						player: currentGame.players[hex.city.player],
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
			currentGame.players[0].addUnit('settler', 2, 3, this);
			currentGame.players[0].addUnit('warrior', 2, 3, this);
			console.log('Sam, players:', currentGame.players);
			console.log('Sam, unit 1:', currentGame.players[0].units[0]);

			// Listen for key presses
			this.input.keyboard.on('keydown', (evt) => {
				if (evt.ctrlKey && [
					'r', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				].includes(evt.key)) {
					return;
				}
				evt.preventDefault();
				doAction(evt);
			}).enabled = false;

			currentGame.startRound();

			this.events.on('pause', () => {
				console.log('Sam, mainGameScene paused');
				hideActionSprites();
			});
			this.events.on('resume', () => {
				console.log('Sam, mainGameScene resumed');
				currentGame.scenes.wake('mainControls');
				currentGame.currentPlayer.activateUnit();
			});
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

	game.scene.sleep('mainGameScene');
	game.scene.add('mainControls', {
		preload() {
		},
		create() {
			console.log('Sam, mainControls created');
			const graphics = this.add.graphics({ x: 0, y: 0 });
			graphics.lineStyle(5, 0x0000ff);
			graphics.beginPath();
			graphics.moveTo(1000, 0);
			graphics.lineTo(1000, 1000);
			graphics.lineTo(0, 1000);
			graphics.closePath();
			graphics.strokePath();

			graphics.fillStyle(0x00ff00);
			graphics.fillCircle(window.visualViewport.width / scale / 2, window.visualViewport.height / scale - 150, 150);
			this.events.on('sleep', () => {
				console.log('Sam, mainControls sleep');
			});
		},
		update() {
		},
	}, true);
	game.scene.moveAbove('mainGameScene', 'mainControls');

	game.scene.add('city-view', {
		preload() {
		},
		create() {
		},
		update() {
		},
	});
	game.scene.sleep('city-view');
	setTimeout(() => {
		game.scene.pause('mainGameScene');
		setTimeout(() => {
			game.scene.switch('mainControls', 'city-view');
			setTimeout(() => {
				game.scene.resume('mainGameScene');
			}, 1000);
		}, 1000);
	}, 1000);

	game.scene.add('main-menu', {
		preload() {
		},
		create() {
		},
		update() {
		},
	});
	game.scene.sleep('main-menu');

	game.scene.add('tech-tree', {
		preload() {
		},
		create() {
		},
		update() {
		},
	});
	game.scene.sleep('tech-tree');

	currentGame.scenes = game.scene;
	console.log('Sam, scenes:', game.scene.scenes);
});
