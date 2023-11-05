import * as Honeycomb from 'honeycomb-grid';
const tileWidth = 200;
const offscreen = Math.max(window.visualViewport.width, window.visualViewport.height) * -2;

class gameHex extends Honeycomb.defineHex({
	dimensions: tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	f_cost;
	h_cost;
	g_cost;
}

const grid = new Honeycomb.Grid(gameHex, Honeycomb.rectangle({ width: 15, height: 6 }));

const depths = {
	offscreen: 0,
	map: 1,
	territoryLines: 2,
	improvement: 5,
	road: 6,
	cities: 10,
	inactiveUnits: 11,
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
		let road = undefined;
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
								image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(depths.improvement),
								key: val,
							});
						return true;
					}
					return false;
				},
			},
			road: {
				enumerable: true,
				get: () => road || {},
				set(val) {
					if (val === 'destroy') {
						if (typeof road === 'object' && road.image instanceof Phaser.GameObjects.Image) {
							road.image.destroy();
						}
						road = undefined;
						return true;
					}
					if (Object.keys(json.world.improvements).includes(val)) {
						road = Object.assign({}, json.world.roads[val],
							{
								image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(depths.road),
								key: val,
							});
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
			get: () => thisHex,
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
		this.players.forEach((player) => {
			player.food = 0;
		});
		grid.forEach((hex) => {
			// Adjust each player's claim on territory
			this.players.forEach((player) => {
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
	markTerritory(thisHex = null, options = {
		graphics: this.graphics.territoryLines,
		lineShift: 0.97,
		offsetX: 0,
		offsetY: 0,
	}) {
		// TODO: Mark only the boundaries of territory
		// https://www.redblobgames.com/x/1541-hex-region-borders/
		(thisHex instanceof Honeycomb.Hex ? [thisHex] : grid).forEach((hex) => {
			if (!(hex.tile instanceof Tile) || !(hex.tile.player instanceof Player)) return;
			options.graphics.lineStyle(5, hex.tile.player.color);
			options.graphics.beginPath();
			// Draw points closer to center of hex
			const [firstCorner, ...otherCorners] = hex.corners.map(point => lineShift(point, hex, options.lineShift));
			options.graphics.moveTo(firstCorner.x + options.offsetX, firstCorner.y + options.offsetY);
			otherCorners.forEach(({x, y}) => {
				options.graphics.lineTo(x + options.offsetX, y + options.offsetY);
			});
			options.graphics.closePath();
			options.graphics.strokePath();
		});
	},
	endTurn() {
		// TODO: Pause for User to acknowledge end of turn
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
	closeUnitActionMenu() {
		this.domContainer.innerHTML = '';
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

function hideActionSprites() {
	currentGame.sprActiveUnit.setActive(false).setPosition(offscreen, offscreen).setDepth(depths.offscreen);
	actionOutlines.graphics.destroy();
	while (actionOutlines.text.length > 0) {
		actionOutlines.text.pop().destroy();
	}
}

// Thanks to https://github.com/AlurienFlame/Honeycomb and https://www.redblobgames.com/pathfinding/a-star/introduction.html
function findPath(unit, start, end) {
	let openHexes = [];
	let closedHexes = [];
	let explored = 0;
	let foundPath = false;

	// Initialize path
	start.parent = undefined;
	openHexes.push(start);
	start.g_cost = 0;

	while (openHexes.length > 0) {
		// Sort array by f_cost, then by h_cost for hexes with equal f_cost
		const current = openHexes.sort((a, b) => a.f_cost - b.f_cost || a.h_cost - b.h_cost)[0];

		// Check if finished
		if (current === end) {
			console.log('Sam,', `Found target after exploring ${explored} hexes.`);
			foundPath = true;
			break;
		}

		openHexes = openHexes.filter((hex) => current !== hex);
		closedHexes.push(current);

		// Check the neighbors
		grid.traverse(Honeycomb.ring({
			center: [ current.q, current.r ],
			radius: 1,
		})).forEach((neighbor) => {
			// If checked path already
			if (closedHexes.includes(neighbor)) return;
			// If Unit cannot move here, do not include in path
			if (!isLegalMove(unit, neighbor.row, neighbor.col)) return;

			// g_cost is movement cost from start
			neighbor.g_cost = current.g_cost + unit.base.movementCosts[neighbor.terrain.terrain];
			// h_cost is simple distance to end
			neighbor.h_cost = grid.distance(current, end);
			// f_cost is sum of above two
			neighbor.f_cost = neighbor.g_cost + neighbor.h_cost;

			if (!openHexes.includes(neighbor)) {
				neighbor.parent = current;
				explored++;
				openHexes.push(neighbor);
			}
		});
	}

	if (!foundPath) {
		console.warn('Sam,', `Ran out of hexes to explore after exploring ${explored} hexes.`);
		return;
	}

	// TODO: Return the hexes from end.parent back
	const path = [end];
	let pathHex = end;
	do {
		pathHex = pathHex.parent;
		if (pathHex !== start) {
			path.unshift(pathHex);
		}
	} while (pathHex.parent instanceof Honeycomb.Hex);

	return path;
}

function Unit(unitType, {
	row,
	col,
	scene,
	player,
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
	this.path = [];
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
		currentGame.sprActiveUnit.setActive(true).setPosition(thisHex.x, thisHex.y).setDepth(depths.activeUnit - 1);

		// Pan camera to active unit
		// TODO: Add setting to skip this if automated movement
		// TODO: Add setting to skip if not human player's unit
		const startPos = lineShift(this.scene.cameras.main.getScroll(thisHex.x, thisHex.y), {
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
		this.sprite.setDepth(depths.activeUnit);

		// Continue on path
		if (Array.isArray(this.path) && this.path.length > 0) {
			// Only move along path is able
			if (this.moves > 0) {
				this.doAction('moveTo', this.path.shift());
			} else {
				this.deactivate(true);
			}
			return;
		}

		// Not the human player's unit, do nothing (for now)
		if (this.player.index !== 0) {
			this.deactivate(true);
			return;
		}

		actionOutlines.graphics = currentGame.scenes.getScene( 'mainGameScene').add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryLines + 1);
		const graphics = actionOutlines.graphics;

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
			if (isLegalMove(this, row, col)) {
				const hex = grid.getHex({ row, col });
				actionOutlines.text.push(currentGame.scenes.getScene( 'mainGameScene').add.text(
					hex.x - tileWidth / 2,
					hex.y + tileWidth / 6,
					move,
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
	doAction(action, hex = null) {
		currentGame.closeUnitActionMenu();
		// Wait, to do action later in turn
		if (action === 'w' || action === 'Tab') {
			this.deactivate();
			return;
		}
		// Stay here
		if (action === 's') {
			this.deactivate(true);
			return;
		}
		if (action === 'city' && hex instanceof Honeycomb.Hex) {
			currentGame.scenes.start('city-view', {
				hex,
			});
			return;
		}
		// Move unit
		if (action === 'moveTo' && hex instanceof Honeycomb.Hex) {
			if (grid.distance(this.hex, hex) === 1) {
				// Neighbor, move there
				this.moveTo(hex);
			} else {
				// Find path
				const path = findPath(this, this.hex, hex);
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
			this.moveTo(grid.getHex({ row, col }));
		} else if (action === 'c') {
			const thisHex = grid.getHex({ row: this.row, col: this.col});
			if (!Actions['c'].isValidOption({ hex: thisHex, player: this.player })) {
				// TODO: Show message to Player that territory already belongs to them!
				console.warn('Sam, you own this already');
				return;
			}
			// Claim hex territory
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
							if (!Actions['b'].isValidOption({ hex: thisHex })) {
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
							if (!Actions['f'].isValidOption({ hex: thisHex })) {
								// TODO: Warn player
								console.warn('Cannot place farm here');
								return;
							}
							thisHex.tile.improvement = 'farm';
							this.deactivate(true);
							return;
						// Clear Improvement or Overlay
						case 'C':
							if (!Actions['C'].isValidOption({ hex: thisHex })) {
								return;
							}
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
		hideActionSprites();
		this.row = hex.row;
		this.col = hex.col;
		this.sprite.setPosition(hex.x, hex.y).setDepth(depths.inactiveUnits);
		this.moves -= this.base.movementCosts[hex.terrain.terrain];
	},
});

function Action(def) {
	Object.defineProperties(this, {
		text: {
			enumerable: true,
			get() {
				switch (typeof def.text) {
					case 'function':
						return def.text;
					case 'text':
						return () => def.text;
				}
				return () => '[action text missing]';
			},
		},
		isValidOption: {
			enumerable: true,
			get() {
				if (typeof def.isValidOption === 'function') return def.isValidOption;
				return () => true;
			},
		},
	});
}
Object.assign(Action.prototype, {
});

// TODO: This object should define every action and handle all of each action's programming
const Actions = [
	{
		key: 'moveTo',
		text: ({ hex }) => hex instanceof Honeycomb.Hex ? `Move to ${hex.row}×${hex.col}` : 'Move here',
		isValidOption({ hex }) {
			return false;
		},
	},
	{
		key: 'city',
		text: () => 'View city',
		isValidOption({ hex }) {
			return false;
		},
	},
	{
		key: 'b', // build city
		text: () => '<u>B</u>uild city',
		isValidOption({ hex }) {
			// Do not build on water
			if (hex.terrain.isWater) {
				return false;
			}
			// Make sure there is no city on this tile or an adjacent tile
			if (grid.traverse(Honeycomb.spiral({
				start: [ hex.q, hex.r ],
				radius: 1,
			})).filter((hex) => {
				if (typeof hex.city === 'object' && hex.city !== null) {
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
		text: () => '<u>C</u>laim territory',
		isValidOption: ({ hex, player }) => {
			return hex.tile.player !== player;
		},
	},
	{
		key: 'C',
		text: () => 'Clear land <kbd>Shift+C</kbd>',
		isValidOption({ hex }) {
			return [
				'farm',
			].includes(hex.tile.improvement.key);
		},
	},
	{
		key: 'f', // farm
		text: () => 'Build <u>f</u>arm',
		isValidOption({ hex }) {
			// Check valid terrain
			if (![
				'swamp',
				'desert',
				'grass',
				'hill',
			].includes(hex.terrain.terrain)) {
				return false;
			}
			// Cannot build in city
			if (hex.city instanceof City) {
				return false;
			}
			// Cannot replace another farm
			if (hex.tile.improvement.key === 'farm') {
				return false;
			}
			return true;
		},
	},
	{
		key: 'w', // wait
		text: () => '<u>W</u>ait',
	},
	{
		key: 's', // stay
		text: () => '<u>S</u>tay here',
	},
	{
		key: '',
		text: () => 'Cancel',
	},
].reduce((obj, action) => Object.assign(obj, {
	[action.key]: new Action(action),
}), {});
console.log('Sam, Actions:', Actions);

function doAction(evt) {
	// Not the player's turn, leave
	if (currentGame.currentPlayer !== currentGame.players[0]) {
		return false;
	}
	// Repeating keyboard/pointer action, ignore
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

	// Check movement into terrain
	const movementCost = unit.base.movementCosts[target.terrain.terrain];
	if (!Number.isFinite(movementCost)) return false;
	if (movementCost <= unit.moves) return true;
	return false;
}

function openUnitActionMenu(hex) {
	if (!(hex instanceof Honeycomb.Hex)) {
		// Not valid hex, exit
		return;
	}

	// List possible actions on the hex to build menu
	const possibleActions = [];

	if (currentGame.activeUnit instanceof Unit) {
		console.log('Sam, unit, current location:', currentGame.activeUnit.hex.row, currentGame.activeUnit.hex.col);
		if (currentGame.activeUnit.hex.row == hex.row && currentGame.activeUnit.hex.col == hex.col) {
			// Check conditions to add actions based on unit type
			switch (currentGame.activeUnit.unitType) {
				case 'settler':
					// Build city option
					if (Actions['b'].isValidOption({ hex })) {
						possibleActions.push('b');
					}
					break;
				case 'worker':
					// TODO: Centralize check for hex's overlay
					[
						'f',
						'C',
					].forEach((action) => {
						if (Actions[action].isValidOption({ hex })) {
							possibleActions.push(action);
						}
					});
					break;
			}
			// Check if territory is under our control
			if (Actions['c'].isValidOption({ hex, player: currentGame.activeUnit.player })) {
				possibleActions.push('c');
			}
		} else if (isLegalMove(currentGame.activeUnit, hex.row, hex.col)) {
			// Offer to move unit here
			possibleActions.push('moveTo');
		}
	}

	// Add option to view city
	if (hex.city instanceof City) {
		possibleActions.push('city');
	}

	// TODO: If more units here, add option to view units

	// If clicked on unit's tile, add options to wait and hold
	if (currentGame.activeUnit.hex.row === hex.row && currentGame.activeUnit.hex.col === hex.col) {
		possibleActions.push('w', 's');
	}

	// No actions, do nothing
	if (possibleActions.length === 0) {
		currentGame.closeUnitActionMenu();
		return;
	}

	// If only one action, do it
	if (possibleActions.length === 1) switch (possibleActions[0]) {
		case 'moveTo':
			// Automatically move to adjacent hex
			if (grid.distance(currentGame.activeUnit.hex, hex) === 1) {
				currentGame.activeUnit.doAction('moveTo', hex);
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

	// Show menu with action options
	currentGame.domContainer.innerHTML = '';
	const div = document.createElement('div');
	div.classList.add('menu');
	possibleActions.concat([
		'',
	]).forEach((action) => {
		const button = document.createElement('button');
		button.innerHTML = Actions[action].text({ hex });
		button.addEventListener('click', () => {
			currentGame.activeUnit.doAction(action, hex);
		});
		button.style.pointerEvents = 'auto';
		div.appendChild(button);
	});
	div.style.pointerEvents = 'auto';
	currentGame.domContainer.appendChild(div);
	currentGame.domContainer.style.zIndex = 1;
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
				if (typeof hex.improvement === 'string') {
					hex.tile.improvement = hex.improvement;
				}
			});

			// Add Game Sprites and Images
			currentGame.sprActiveUnit = this.add.image(offscreen, offscreen, 'activeUnit').setActive(false);

			{
				// TODO: Calculate the zoom and size to show the whole map
				const w = grid.pixelWidth;
				const h = grid.pixelHeight;
				const padLeft = window.visualViewport.width / scale / 2;
				const padTop = window.visualViewport.height / scale / 2;
				this.cameras.main.setBounds(
					-padLeft,
					-padTop,
					w + padLeft * 2,
					h + padTop * 2
				);
				const minimap = this.cameras.add(window.visualViewport.width / scale - 800, window.visualViewport.height / scale - 400, 800, 400);
				minimap.setZoom(0.2).setName('mini').setBackgroundColor(0x000000);
				minimap.centerOn(grid.pixelWidth / 2, grid.pixelHeight / 2);
			}

			// TODO: Open this menu when user presses the spacebar
			this.input.on('pointerdown', (evt) => {
				const hex = grid.pointToHex({
					x: evt.worldX,
					y: evt.worldY,
				});
				openUnitActionMenu(hex);
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
				// Ctrl+R, reload; Ctrl+1, change browser tab
				if (evt.ctrlKey && [
					'r', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				].includes(evt.key)) {
					return;
				}
				// Ctrl+Shift+I, open Chrome dev tools
				if (evt.ctrlKey && evt.key === 'I') return;
				evt.preventDefault();
				switch (evt.key) {
					case 'ArrowUp':
						console.log('Sam, pan up');
						this.cameras.main.scrollY -= 4;
						return;
					case 'ArrowDown':
						console.log('Sam, pan down');
						this.cameras.main.scrollY += 4;
						return;
					case 'ArrowLeft':
						console.log('Sam, pan left');
						this.cameras.main.scrollX -= 4;
						return;
					case 'ArrowRight':
						console.log('Sam, pan right');
						this.cameras.main.scrollX += 4;
						return;
				}
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
			{
				// Lay black background
				const graphics = this.add.graphics({ x: 0, y: 0 }).setDepth(0);
				graphics.fillStyle(0x000000, 0.5);
				graphics.fillRect(0, 0, config.width, config.height);
			}
			const graphics = this.add.graphics({ x: 0, y: 0 }).setDepth(1);

			// Close button
			graphics.fillStyle(0x000000, 1);
			graphics.fillRect(config.width - 100, 0, 100, 100);
			this.add.text(0, 0, '× ', {
				fixedWidth: config.width,
				font: '60pt Trebuchet MS',
				align: 'right',
				color: 'white',
				stroke: 'black',
				strokeThickness: 7,
			}).setDepth(2).setInteractive().on('pointerdown', () => {
				game.scene.stop('city-view');
			});

			// Important constants for translating city tiles locations
			const [offsetX, offsetY] = [data.hex.x, data.hex.y];
			// TODO: Need to either make sure tiles fit in screen or that user can pan camera

			const tileScale = Math.min(config.height, config.width) / 7 / tileWidth;
			const center = {
				x: config.width / 2,
				y: config.height / 3,
			};

			// Grab and render city hexes
			grid.traverse(Honeycomb.spiral({
				start: [ data.hex.q, data.hex.r ],
				radius: 2,
			})).forEach((hex) => {
				// Display city hexes
				// TODO: Basic rendering each hex should be done in one function and then called here and by the global world map. Only further tile details not shown on world map should be added here
				const tileCenter = {
					x: (hex.x - offsetX) * tileScale + center.x,
					y: (hex.y - offsetY) * tileScale + center.y,
				};
				const img = this.add.image(tileCenter.x, tileCenter.y, `tile.${hex.terrain.terrain}`).setDepth(1);
				img.scaleX = tileScale;
				img.scaleY = tileScale;
				currentGame.markTerritory(hex, {
					offsetX: 0 - hex.x + center.x + (hex.x - offsetX) * tileScale,
					offsetY: 0 - hex.y + center.y + (hex.y - offsetY) * tileScale,
					graphics: graphics.setDepth(2),
					lineShift: 1.1,
				});
				// TODO: Show food production on tiles
				const fixedWidth = tileWidth * tileScale;
				this.add.text(
					tileCenter.x - fixedWidth / 2,
					tileCenter.y + fixedWidth / 4,
					`Food: ${(hex.terrain.food || 0) + (hex.tile.improvement.food || 0)}`,
					{
						font: '14pt Trebuchet MS',
						align: 'center',
						color: 'white',
						stroke: 'black',
						strokeThickness: 7,
						fixedWidth,
					}
				).setDepth(3);
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
				game.domContainer.innerHTML = '';
				game.scene.wake('mainGameScene');
			}).on('shutdown', () => {
				console.log('Sam, city-view shutdown');
				game.domContainer.innerHTML = '';
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

	Object.assign(currentGame, {
		scenes: game.scene,
		domContainer: game.domContainer,
	});
	console.log('Sam, scenes:', game.scene.scenes);
	game.domContainer.classList.add('game');
});
