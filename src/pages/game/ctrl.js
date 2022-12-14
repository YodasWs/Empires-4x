import * as Honeycomb from 'honeycomb-grid';
const tileWidth = 200;
const offscreen = Math.max(window.visualViewport.width, window.visualViewport.height) * -2;

const grid = new Honeycomb.Grid(Honeycomb.defineHex({
	dimensions: tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}), Honeycomb.rectangle({ width: 15, height: 6 }));

const depths = {
	offscreen: 0,
	map: 1,
	territoryLines: 2,
	overlay: 3,
	cities: 4,
	inactiveUnits: 5,
	actionSprites: 98,
	activeUnit: 100,
};

const Tile = (() => {
	function Tile({
		scene,
		hex,
	}) {
		let player = undefined;
		const claims = new Map();
		let improvement = undefined;
		Object.defineProperties(this, {
			claims: {
				enumerable: true,
				get: () => (lookupPlayer, claimIncrement) => {
					if (lookupPlayer instanceof Player) {
						if (Number.isInteger(claimIncrement)) {
							claims.set(lookupPlayer, (claims.get(lookupPlayer) || 0) + claimIncrement);
						}
						return claims.get(lookupPlayer) || 0;
					}
					return claims;
				},
			},
			hex: {
				get: () => hex,
			},
			// TODO: Cache player
			player: {
				enumerable: true,
				get: () => {
					const topClaimant = {
						player: null,
						claim: 0,
					};
					claims.forEach((val, claimPlayer) => {
						if (topClaimant.claim < val) {
							topClaimant.player = claimPlayer;
							topClaimant.claim = val;
						}
					});
					return topClaimant.player;
				},
			},
			improvement: {
				enumerable: true,
				get: () => improvement || {},
				set(val) {
					console.log('Sam, improvement:', improvement);
					if (val === 'destroy') {
						if (typeof improvement === 'object' && improvement.image instanceof Phaser.GameObjects.Image) {
							improvement.image.destroy();
						}
						improvement = undefined;
						return true;
					}
					if (Object.keys(json.world.improvements).includes(val)) {
						improvement = Object.assign({}, json.world.improvements[val],
							{
								image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(depths.overlay),
								key: val,
							});
						console.log('Sam, improvement:', improvement);
						return true;
					}
					return false;
				},
			},
		});
	}
	Object.assign(Tile.prototype, {
		claimTerritory(player, claimIncrement = 0) {
			if (Number.isFinite(claimIncrement) && claimIncrement !== 0) {
				let prevPlayer = undefined;
				if (this.player instanceof Player) {
					prevPlayer = this.player.index;
				}
				this.claims(player, claimIncrement);
				// Only update scene if player owner has changed
				if (this.player instanceof Player && this.player.index !== prevPlayer) {
					currentGame.markTerritory(this.hex);
				}
			}
		}
	});
	return Tile;
})();

function City({
	col,
	row,
	scene,
	player,
}) {
	// Tie to hex
	const thisHex = grid.getHex({ row, col });
	thisHex.tile.improvement = 'destroy';
	const sprite = scene.add.image(thisHex.x, thisHex.y, 'cities', player.frame).setDepth(depths.cities).setScale(0.8);
	thisHex.city = this;
	// Claim this tile and adjacent tiles
	grid.traverse(Honeycomb.spiral({
		start: [ thisHex.q, thisHex.r ],
		radius: 1,
	})).forEach((hex) => {
		hex.tile.claimTerritory(player, 100);
	});
	// Claim water territory
	grid.traverse(Honeycomb.ring({
		center: [ thisHex.q, thisHex.r ],
		radius: 2,
	})).forEach((hex) => {
		if (hex.terrain.isWater) {
			hex.tile.claimTerritory(player, 50);
		}
	});
	// Properties
	Object.defineProperties(this, {
		hex: {
			enumerable: true,
			get: () => grid.getHex({ row, col }),
		},
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
		let food = 0;
		const units = [];
		Object.defineProperties(this, {
			food: {
				enumerable: true,
				get: () => food,
				set(val) {
					if (Number.isInteger(val) && val >= 0) {
						food = val;
					}
				},
			},
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
					continue;
				}
				if (this.units[i].moves > 0) {
					this.activateUnit(i);
					return true;
				}
			}
			// Check for unmove unit we skipped
			for (let i = 0; i <= activeUnit; i++) {
				if (!(this.units[i] instanceof Unit)) {
					continue;
				}
				if (this.units[i].moves > 0) {
					this.activateUnit(i);
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
		// Reset count of economy
		currentGame.players.forEach((player) => {
			player.food = 0;
		});
		grid.forEach((hex) => {
			// Adjust each player's claim on territory
			currentGame.players.forEach((player) => {
				if (hex.tile.player === player) {
					hex.tile.claimTerritory(player, 1);
				} else if (hex.tile.claims(player) > 0) {
					hex.tile.claimTerritory(player, -1);
				}
			});
			// Collect food
			if (hex.tile.player instanceof Player) {
				let food = 0;
				food += hex.terrain.food || 0;
				food += hex.tile.improvement.food || 0;
				hex.tile.player.food += food;
			}
			// Check cities
			if (hex.city instanceof City) {
				const city = hex.city;
				console.log('Sam, startRound, city:', city);
				grid.traverse(Honeycomb.spiral({
					start: [ hex.q, hex.r ],
					radius: 2,
				})).forEach((hex) => {
				});
			}
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
		// Activate first unit
		this.currentPlayer.activateUnit(0);
	},
	markTerritory(thisHex = null) {
		// TODO: Mark only the boundaries of territory
		// https://www.redblobgames.com/x/1541-hex-region-borders/
		const graphics = currentGame.graphics.territoryLines;
		(thisHex instanceof Honeycomb.Hex ? [thisHex] : grid).forEach((hex) => {
			if (!(hex.tile instanceof Tile) || !(hex.tile.player instanceof Player)) return;
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
	currentGame.sprActiveUnit.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.offscreen);
	actionOutlines.graphics.destroy();
	while (actionOutlines.text.length > 0) {
		actionOutlines.text.pop().destroy();
	}
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
	const sprite = scene.add.sprite(x, y, `unit.${unitType}`).setDepth(depths.inactiveUnits);
	// Define properties
	this.col = col;
	this.row = row;
	Object.defineProperties(this, {
		base: {
			enumerable: true,
			get: () => base,
		},
		hex: {
			enumerable: true,
			get: () => grid.getHex({ row: this.row, col: this.col }),
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
const actionOutlines = {
	text: [],
};
Object.assign(Unit.prototype, {
	activate() {
		const thisHex = grid.getHex({ row: this.row, col: this.col });
		this.scene.cameras.main.centerOn(thisHex.x, thisHex.y);
		this.sprite.setDepth(depths.activeUnit);
		currentGame.sprActiveUnit.setActive(true).setPosition(thisHex.x, thisHex.y).setDepth(depths.activeUnit - 1);

		// Not the human player's unit
		if (this.player.index !== 0) {
			this.deactivate(true);
			return;
		}

		actionOutlines.graphics = currentGame.scenes.getScene( 'mainGameScene').add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryLines + 1);
		const graphics = actionOutlines.graphics;
		const moves = [
			'L',
			'K',
			'J',
			'U',
			'I',
			'O',
		];

		// Set text and listeners on hexes to move unit
		grid.traverse(Honeycomb.ring({
			center: [ thisHex.q, thisHex.r ],
			radius: 1,
		})).forEach((hex) => {
			const key = moves.shift();
			if (isLegalMove(this, hex.row, hex.col)) {
				actionOutlines.text.push(currentGame.scenes.getScene( 'mainGameScene').add.text(
					hex.x - tileWidth / 2,
					hex.y + tileWidth / 6,
					key,
					{
						fixedWidth: tileWidth,
						font: '25pt Trebuchet MS',
						align: 'center',
						color: 'khaki',
						stroke: 'black',
						strokeThickness: 7,
					}
				).setOrigin(0).setDepth(depths.actionSprites));
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
			this.deactivate(true);
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
			this.moveTo(grid.getHex({ row, col }));
			return;
		}
		if (action === 'c') {
			// Claim hex territory
			const thisHex = grid.getHex({ row: this.row, col: this.col});
			if (thisHex.tile.player === this.player) return;
			thisHex.tile.claimTerritory(this.player, 10);
			this.moves--;
		} else {
			const thisHex = grid.getHex({ row: this.row, col: this.col});
			// Unit-specific actions
			switch (this.unitType) {
				case 'settler':
					switch (action) {
						// Build city
						case 'b':
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
								// TODO: Warn player
								console.warn('Cannot place city adjacent to another city');
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
							this.sprite.destroy();
							delete this;
							return;
					}
					break;
				case 'worker':
					switch (action) {
						// Build farm
						case 'f':
							// Check valid terrain
							if (![
								'swamp',
								'desert',
								'grass',
								'hill',
							].includes(thisHex.terrain.terrain)) {
								return;
							}
							// Cannot build in city
							if (thisHex.city instanceof City) {
								return;
							}
							// Cannot replace another farm
							if (thisHex.tile.improvement.key === 'farm') {
								return;
							}
							thisHex.tile.improvement = 'farm';
							this.deactivate(true);
							return;
						// Clear Improvement or Overlay
						case 'C':
							if (thisHex.tile.improvement.key === 'farm') {
								thisHex.tile.improvement = 'destroy';
								this.deactivate(true);
								return;
							}
					}
					break;
			}
		}
		if (this.moves > 0) {
			this.player.activateUnit();
		} else {
			this.deactivate();
		}
	},
	moveTo(hex) {
		if (!(hex instanceof Honeycomb.Hex)) return;
		if (!isLegalMove(this, hex.row, hex.col)) return;
		this.row = hex.row;
		this.col = hex.col;
		this.sprite.setPosition(hex.x, hex.y).setDepth(depths.inactiveUnits);
		this.moves -= this.base.movementCosts[hex.terrain.terrain];
		if (this.moves > 0) {
			this.player.activateUnit();
		} else {
			this.deactivate();
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
	if (!(currentGame.activeUnit instanceof Unit)) {
		return false;
	}
	currentGame.activeUnit.doAction(evt.key);
}

function isLegalMove(unit, row, col) {
	// Grab Target Tile
	const target = grid.getHex({ row, col });
	if (!(target instanceof Honeycomb.Hex)) return false;
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
			Object.entries(json.world.improvements).forEach(([key, improvement]) => {
				this.load.image(`improvements.${key}`, `img/improvements/${improvement.tile}.png`);
			});
			// Load images for player's action
			this.load.image('activeUnit', 'img/activeUnit.png');
			// Load Unit Images
			Object.keys(json.world.units).forEach((unit) => {
				this.load.image(`unit.${unit}`, `img/units/${unit}.png`);
			});
		},
		create() {
			// Add graphics objects
			currentGame.graphics = {
				territoryLines: this.add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryLines),
			};

			// Build World from Honeycomb Grid
			grid.forEach((hex) => {
				const tile = json.world.world[hex.row][hex.col];
				Object.assign(hex, tile, {
					tile: new Tile({
						scene: this,
						hex,
					}),
					terrain: {
						...json.world.terrains[tile.terrain],
						terrain: tile.terrain,
					},
					sprite: this.add.image(hex.x, hex.y, `tile.${tile.terrain}`).setDepth(depths.map).setInteractive(
						new Phaser.Geom.Polygon(grid.getHex({ row: 0, col: 0}).corners),
						Phaser.Geom.Polygon.Contains
					),
					text: this.add.text(hex.x - tileWidth / 2, hex.y + tileWidth / 3.6, hex.row + '??' + hex.col, {
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
				if (typeof hex.improvement === 'string') {
					hex.tile.improvement = hex.improvement;
				}
			});

			// Add Game Sprites and Images
			currentGame.sprActiveUnit = this.add.image(offscreen, offscreen, 'activeUnit').setActive(false);
			this.input.on('pointerdown', (evt) => {
				const hex = grid.pointToHex({
					x: evt.worldX,
					y: evt.worldY,
				});
				// List possible actions on the hex to build menu
				const possibleActions = [];

				if (currentGame.activeUnit instanceof Unit && isLegalMove(currentGame.activeUnit, hex.row, hex.col)) {
					// TODO: Offer to move unit here
					possibleActions.push('moveTo');
				}

				if (hex.city instanceof City) {
					console.log('Sam, tapped on city');
					possibleActions.push('city');
				}

				// If only one action, do it
				if (possibleActions.length === 1) switch (possibleActions[0]) {
					case 'moveTo':
						// Automatically move to adjacent hex
						if (grid.distance(currentGame.activeUnit.hex, hex) === 1) {
							currentGame.activeUnit.moveTo(hex);
							return;
						}
						break;
					case 'city':
						console.log('Sam, only action is city-view');
						currentGame.scenes.start('city-view', {
							hex,
						});
						return;
				}

				// Sam, temporarily force show city-view scene
				if (possibleActions.includes('city')) {
					console.log('Sam, force show city-view');
					currentGame.scenes.start('city-view', {
						hex,
					});
					return;
				}

				// TODO: Show menu with action options
				possibleActions.forEach((action) => {
				});
			});

			// TODO: Build Starting Players and Units
			currentGame.players[0].addUnit('settler', 2, 3, this);
			currentGame.players[0].addUnit('warrior', 2, 3, this);
			currentGame.players[0].addUnit('worker', 2, 3, this);
			currentGame.players[2].addUnit('warrior', 2, 8, this);
			console.log('Sam, players:', currentGame.players);
			console.log('Sam, unit 1:', currentGame.players[0].units[0]);

			// Listen for key presses
			this.input.keyboard.on('keydown', (evt) => {
				if (evt.ctrlKey && [
					'r', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				].includes(evt.key)) {
					return;
				}
				if (evt.ctrlKey && evt.key === 'I') return;
				evt.preventDefault();
				doAction(evt);
			}).enabled = false;

			currentGame.startRound();

			this.events.on('pause', () => {
				console.log('Sam, mainGameScene paused');
				currentGame.scenes.sleep('mainControls');
				hideActionSprites();
			});
			this.events.on('resume', () => {
				console.log('Sam, mainGameScene resumed');
				currentGame.scenes.wake('mainControls');
				currentGame.currentPlayer.activateUnit();
			}).on('wake', () => {
				console.log('Sam, mainGameScene woken');
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
		dom: {
			createContainer: true,
		},
	}));

	game.scene.add('mainControls', {
		preload() {
		},
		create() {
			return;
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
		create(data) {
			if (!(data.hex instanceof Honeycomb.Hex) || !(data.hex.tile instanceof Tile)) {
				game.scene.resume('mainGameScene');
				return;
			}
			console.log('Sam, city-view created');
			game.scene.pause('mainGameScene');

			// Start building graphics scene
			const graphics = this.add.graphics({ x: 0, y: 0 });
			graphics.fillStyle(0x000000, 0.5);
			graphics.fillRect(0, 0, config.width, config.height);

			// Close button
			graphics.fillStyle(0x000000, 1);
			graphics.fillRect(config.width - 100, 0, 100, 100);
			this.add.text(0, 0, '?? ', {
				fixedWidth: config.width,
				font: '60pt Trebuchet MS',
				align: 'right',
				color: 'white',
				stroke: 'black',
				strokeThickness: 7,
			}).setInteractive().on('pointerdown', () => {
				console.log('Sam, pointerdown');
				game.scene.stop('city-view');
			});

			// Important constants for translating city tiles locations
			const [offsetX, offsetY] = [data.hex.x, data.hex.y];
			// TODO: Need to either make sure tiles fit in screen or that user can pan camera
			const tileScale = {
				x: 1.5,
				y: 1.0,
			};
			const center = {
				x: config.width / 2,
				y: config.height / 3,
			};

			// Grab city hexes
			grid.traverse(Honeycomb.spiral({
				start: [ data.hex.q, data.hex.r ],
				radius: 2,
			})).forEach((hex) => {
				// Display city hexes
				const img = this.add.image((hex.x - offsetX) * tileScale.x + center.x, (hex.y - offsetY) * tileScale.y + center.y, `tile.${hex.terrain.terrain}`);
				img.scaleX = tileScale.x;
				img.scaleY = tileScale.y;
			});

			// Set event listeners
			this.input.keyboard.enabled = true;
			this.input.keyboard.on('keydown', (evt) => {
				if (evt.key === 'Escape') {
					game.scene.stop('city-view');
				}
			});

			this.events.on('sleep', () => {
				console.log('Sam, city-view sleep');
				game.scene.wake('mainGameScene');
			}).on('shutdown', () => {
				console.log('Sam, city-view shutdown');
				game.scene.wake('mainGameScene');
			});
		},
		update() {
		},
	});

	setTimeout(() => {
		return;
		game.scene.pause('mainGameScene');
		setTimeout(() => {
			game.scene.start('city-view');
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

	game.scene.add('tech-tree', {
		preload() {
		},
		create() {
		},
		update() {
		},
	});

	currentGame.scenes = game.scene;
	console.log('Sam, scenes:', game.scene.scenes);
});
