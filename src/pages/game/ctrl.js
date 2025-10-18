import * as Honeycomb from 'honeycomb-grid';
const tileWidth = 200;
const unitWidth = 80;
const offscreen = Math.max(window.visualViewport.width, window.visualViewport.height) * -2;

class gameHex extends Honeycomb.defineHex({
	dimensions: tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	f_cost
	h_cost
	g_cost
}

const grid = new Honeycomb.Grid(gameHex, Honeycomb.rectangle({ width: 15, height: 6 }));

const depths = {
	offscreen: 0,
	map: 1,
	territoryFills: 2,
	territoryLines: 2,
	improvement: 5,
	road: 6,
	cities: 10,
	inactiveUnits: 11,
	resources: 20,
	actionSprites: 98,
	activeUnit: 100,
};

const Tile = (() => {
	let scene = null;
	function isValidImprovement(hex, improvement, builtImprovement) {
		if (!(hex instanceof Honeycomb.Hex)) return false;
		if (typeof improvement !== 'string' || improvement === '') return false;
		// Improvement must exist
		if (!Object.keys(json.world.improvements).includes(improvement)) return false;
		// Improvement must be same as current, or new
		if (builtImprovement.key !== '' && builtImprovement.key !== improvement) return false;
		// Improvement must be valid for terrain
		if (!hex.terrain.terrain in json.world.improvements[improvement]?.terrains) return false;
		// Cannot build improvement in city
		if (hex.city instanceof City) return false;
		return true;
	}

	function Tile({
		hex,
	}) {
		if (scene === null) {
			scene = currentGame.scenes.getScene('mainGameScene');
		}
		const claims = new Map();

		let objImprovement = undefined;
		let builtImprovement = {
			key: '',
		};

		const laborers = new Set();
		let player = undefined;
		let road = undefined;

		this.food = 0;
		Object.defineProperties(this, {
			claims: {
				enumerable: true,
				get: () => (lookupPlayer, claimIncrement) => {
					// Get numerical value of Player's claim
					if (lookupPlayer instanceof Player) {
						if (Number.isInteger(claimIncrement)) {
							// But first, increment claim value
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
				get: () => objImprovement || {},
			},
			laborers: {
				enumerable: true,
				get: () => laborers,
				set(val) {
					if (!(val instanceof Citizen)) {
						throw new TypeError('Tile.laborers expects to be assigned object instance of Citizen!');
					}
					laborers.add(val);
					return true;
				},
			},
			road: {
				enumerable: true,
				get: () => road || {},
				set(val) {
					// Destroy all roads on Tile
					if (val === 'destroy') {
						if (road?.image instanceof Phaser.GameObjects.Image) {
							road.image.destroy();
						}
						road = undefined;
						return true;
					}
					if (Object.keys(json.world.improvements).includes(val)) {
						road = {
							...json.world.roads[val],
							image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(depths.road),
							key: val,
						};
						return true;
					}
					return false;
				},
			},
			setImprovement: {
				get: () => (val) => {
					// Destroy all improvements on Tile
					if (val === 'destroy') {
						if (objImprovement?.image instanceof Phaser.GameObjects.Image) {
							objImprovement.image.destroy();
						}
						objImprovement = undefined;
						builtImprovement = {
							key: '',
						};
						return true;
					}

					if (isValidImprovement(hex, val, builtImprovement)) {
						objImprovement = {
							...json.world.improvements[val],
							image: scene.add.image(hex.x, hex.y, `improvements.${val}`).setDepth(depths.improvement),
							key: val,
						};
						builtImprovement.key = val;
						return true;
					}
					return false;
				},
			},
			isValidImprovement: {
				get() {
					return (improvement) => isValidImprovement(hex, improvement, builtImprovement);
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
					currentGame.markTerritory(this.hex, {
						graphics: currentGame.graphics.territoryFills,
						lineOffset: 1,
						fill: true,
					});
					currentGame.markTerritory(this.hex, {
						graphics: currentGame.graphics.territoryLines,
						lineOffset: 0.97,
						fill: false,
					});
				}
			}
		},
	});
	return Tile;
})();

// Thanks to Microsoft Copilot for this name generator!
function generateRomanBritishName() {
	const praenomina = [
		'Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus', 'Publius', 'Aulus', 'Sextus',
	];

	const celticNames = [
		'Bran', 'Cai', 'Elen', 'Rhiannon', 'Taran', 'Mabon', 'Nia', 'Owain',
	];

	const cognomina = [
		'Agricola', 'Felix', 'Silvanus', 'Varus', 'Florus', 'Crispus', 'Severus', 'Vitalis',
	];

	const epithets = [
		'the Smith', 'of Londinium', 'the Younger', 'the Red', 'from Camulodunum', 'the Hunter',
	];

	const first = Math.random() < 0.5
		? praenomina[Math.floor(Math.random() * praenomina.length)]
		: celticNames[Math.floor(Math.random() * celticNames.length)];

	const last = cognomina[Math.floor(Math.random() * cognomina.length)];
	const epithet = Math.random() < 0.3
		? epithets[Math.floor(Math.random() * epithets.length)]
		: '';

	return `${first} ${last} ${epithet}`.trim();
}

const Citizen = (() => {
	function Citizen({
		city,
		hex,
		tile,
	}) {
		const name = generateRomanBritishName();
		if (city instanceof City) {
			Object.defineProperty(this, 'city', {
				enumerable: true,
				get: () => city,
			});
		}
		if (hex instanceof Honeycomb.Hex || tile?.hex instanceof Honeycomb.Hex) {
			Object.defineProperty(this, 'hex', {
				enumerable: true,
				get: () => hex || tile?.hex,
			});
		}
		if (tile instanceof Tile || hex?.tile instanceof Tile) {
			Object.defineProperty(this, 'tile', {
				enumerable: true,
				get: () => tile || hex?.tile,
			});
		}
		Object.defineProperties(this, {
			name: {
				enumerable: true,
				get: () => name,
			},
			sprite: {
				enumerable: true,
				get: () => 'laborers.farmer',
			},
		});
	}
	Object.assign(Citizen.prototype, {
		FOOD_CONSUMPTION: 2,
		assignTile(tile) {
			if (!(tile instanceof Tile)) {
				throw new TypeError('Citizen.assignTile expects to be passed object instance of Tile!');
			}
			// TODO: Check if Tile has already been assigned and is at its capacity
			this.tile = tile;
		},
	});
	return Citizen;
})();

const City = (() => {
	let scene = null;
	function City({
		col,
		row,
		level = 1,
		player,
	} = {}) {
		if (scene === null) {
			scene = currentGame.scenes.getScene('mainGameScene');
		}
		// Tie to hex
		const thisHex = grid.getHex({ row, col });
		thisHex.tile.setImprovement('destroy');

		const sprite = scene.add.image(thisHex.x, thisHex.y, 'cities', player.frame).setDepth(depths.cities).setScale(0.8);
		thisHex.city = this;
		const laborers = new Set();

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
		this.housing = (() => {
			switch (level) {
				case 1: return 3;
				case 2: return 6;
			}
			return 0;
		})();
		Object.defineProperties(this, {
			hex: {
				enumerable: true,
				get: () => thisHex,
			},
			laborers: {
				enumerable: true,
				get: () => laborers,
				set(val) {
					if (!(val instanceof Citizen)) {
						throw new TypeError('City.laborers expects to be assigned object instance of Citizen!');
					}
					laborers.add(val);
					return true;
				},
			},
			player: {
				enumerable: true,
				get: () => player,
			},
			sprite: {
				get: () => sprite,
			},
			level: {
				enumerable: true,
				get: () => level,
			},
			housing: {
				enumerable: true,
				get: () => this.housing,
			},
		});
	}
	Object.assign(City.prototype, {
	});
	return City;
})();

const Player = (() => {
	let activeUnit = null;
	function Player(index) {
		const name = json.world?.FactionNames[index];
		let money = 0;
		let units = [];

		Object.defineProperties(this, {
			frame: {
				enumerable: true,
				get: () => (index + 1) % 3,
			},
			index: {
				enumerable: true,
				get: () => index,
			},
			name: {
				enumerable: true,
				get: () => name,
			},
			units: {
				enumerable: true,
				get: () => units,
				set: (val) => {
					if (!Array.isArray(val)) {
						throw new TypeError('Player.units expects to be assigned an Array!');
					}
					units = val.filter(unit => unit instanceof Unit && unit.deleted === false);
				},
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
							return 0x32cd32;
						case 1:
							return 0xff0000;
						case 2:
							return 0x0000ff;
						default:
							return 0xaaaaaa;
					}
				},
			},
			money: {
				enumerable: true,
				get: () => money,
				set(val) {
					if (!Number.isFinite(val) || val < 0) {
						throw new TypeError('Player.money expects to be assigned a positive number!');
					}
					money = val;
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
			let isActiveUnit = this.activateNext();
			if (!isActiveUnit) {
				currentGame.endTurn();
			}
		},
		activateUnit(intUnit = activeUnit) {
			if (this.units.length === 0) {
				this.checkEndTurn();
				return false;
			}
			const unit = this.units[intUnit];
			if (!(unit instanceof Unit)) {
				return false;
			}
			if (unit.deleted === true) {
				return false;
			}
			unit.activate();
			activeUnit = intUnit;
			return true;
		},
		activateNext() {
			// Find and activate next unit
			for (let i = activeUnit + 1; i < this.units.length; i++) {
				if (!(this.units[i] instanceof Unit)) {
					continue;
				}
				if (this.units[i].moves > 0 && this.activateUnit(i)) {
					return true;
				}
			}
			// Check for unmoved unit we skipped
			for (let i = 0; i <= activeUnit; i++) {
				if (!(this.units[i] instanceof Unit)) {
					continue;
				}
				if (this.units[i].moves > 0 && this.activateUnit(i)) {
					return true;
				}
			}
			return false;
		},
	});
	return Player;
})();

let FoodSprites = [];
const FoodSpriteOptions = {
	ease: 'Linear',
	duration: 1000,
	yoyo: false,
};

const currentGame = {
	players: [],
	turn: 0,
	activeUnit: null,
	currentPlayer: null,
	intCurrentPlayer: null,
	sprActiveUnit: null,
	graphics: {},
	uiDisplays: {},
	startRound() {
		this.players.forEach((player) => {
			// Reset each player's units array to remove deleted units
			player.units = player.units;
		});
		const scene = currentGame.scenes.getScene('mainGameScene');
		grid.forEach((hex) => {
			// Adjust each player's claim on territory
			this.players.forEach((player) => {
				if (hex.tile.player === player) {
					// Strengthen top claimant's claim
					hex.tile.claimTerritory(player, 1);
				} else if (hex.tile.claims(player) > 0) {
					// Weaken foreign claimant's claim
					hex.tile.claimTerritory(player, -1);
				}
			});

			hex.tile.food = 0;

			// Produce Food
			if (hex.tile.laborers.size > 0) {
				let food = 0;
				food += hex.terrain.food || 0;
				food += hex.tile.improvement.food || 0;
				if (food > 0) {
					// TODO: Add some particle effect to show food being generated and not stacked
					const { x, y } = hex;
					FoodSprites.push({
						food,
						hex,
						rounds: 0,
						sprite: scene.add.sprite(x, y, `resources.wheat`).setDepth(depths.resources),
						start: hex,
					});
				}
			}
		});

		// Check Cities
		grid.forEach((hex) => {
			if (hex.city instanceof City) {
				const city = hex.city;
				grid.traverse(Honeycomb.spiral({
					start: [ hex.q, hex.r ],
					radius: 2,
				})).forEach((hex) => {
				});
			}
		});

		// Start Round
		this.turn++;
		currentGame.uiDisplays.round.setText(`Round ${this.turn}`);
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

		// Sam, TODO: Show message to User whose turn it is
		currentGame.uiDisplays.player.setText(`${this.currentPlayer.name}'s Turn`)
			.setX(14 + currentGame.uiDisplays.round.displayWidth + 10)
			.setColor(intPlayer === 0 ? 'goldenrod' : 'lightgrey');
		this.intCurrentPlayer = intPlayer;

		// Reset each unit's movement points
		this.currentPlayer.units.forEach((unit) => {
			unit.moves = unit.base.movementPoints;
		});
		// Activate first unit
		this.currentPlayer.activateUnit(0);
	},
	markTerritory(thisHex = null, {
		graphics = this.graphics.territoryLines,
		lineOffset = 0.97,
		offsetX = 0,
		offsetY = 0,
		fill = false,
		lineWidth = 5,
	} = {}) {
		// TODO: Mark only the boundaries of territory
		// https://www.redblobgames.com/x/1541-hex-region-borders/
		(thisHex instanceof Honeycomb.Hex ? [thisHex] : grid).forEach((hex) => {
			if (!(hex.tile instanceof Tile) || !(hex.tile.player instanceof Player)) return;
			if (fill === false) {
				graphics.lineStyle(lineWidth, hex.tile.player.color);
			} else {
				graphics.fillStyle(hex.tile.player.color);
			}
			graphics.beginPath();
			// Draw points closer to center of hex
			const [firstCorner, ...otherCorners] = hex.corners.map(point => lineShift(point, hex, lineOffset));
			graphics.moveTo(firstCorner.x + offsetX, firstCorner.y + offsetY);
			otherCorners.forEach(({x, y}) => {
				graphics.lineTo(x + offsetX, y + offsetY);
			});
			graphics.closePath()[fill === false ? 'strokePath' : 'fillPath']();
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
		const scene = currentGame.scenes.getScene('mainGameScene');
		const delaysForEndRound = [];
		currentGame.uiDisplays.player.setX(14 + currentGame.uiDisplays.round.displayWidth + 10)
			.setText('End of Round')
			.setColor('lightgrey');
		// TODO: Check each tile's Food reserves to feed Citizens and Laborers!

		// Collect list of villages and cities
		const cities = [];
		grid.forEach((hex) => {
			if (hex.city instanceof City) {
				cities.push(hex);
			}
		});

		// Remove any FoodSprites that have no food or have been destroyed
		FoodSprites = FoodSprites.filter(({ food, sprite }) => {
			return food > 0 && sprite instanceof Phaser.GameObjects.Sprite && sprite.active;
		});

		// Move Food towards nearest City
		FoodSprites.forEach((FoodSprite, i) => {
			let { hex, food, sprite } = FoodSprite;
			if (food <= 0) {
				sprite.setActive(false);
				sprite.destroy();
				return;
			}

			// Leave Food on tile for Laborers
			if (hex.tile.laborers.size > 0 && hex.tile.food < hex.tile.laborers.size * Citizen.FOOD_CONSUMPTION) {
				const neededFood = Math.max(0, hex.tile.laborers.size * Citizen.FOOD_CONSUMPTION - hex.tile.food);
				const takeFood = Math.min(neededFood, food);
				FoodSprite.food = food -= takeFood;
				hex.tile.food += takeFood;

				if (food <= 0) {
					sprite.setActive(false);
					sprite.destroy();
					return;
				}
			}

			// Move surplus Food to City
			let closestHex = null;
			let closestDistance = Infinity;
			cities.forEach((cityHex) => {
				const dist = grid.distance(hex, cityHex);
				if (dist < closestDistance) {
					closestHex = cityHex;
					closestDistance = dist;
				}
			});

			if (closestHex instanceof Honeycomb.Hex && closestHex.city instanceof City) {
				const path = findPath(hex, closestHex);
				if (Array.isArray(path) && path.length > 0) {
					const nextHex = path.shift();
					if (nextHex.city instanceof City) {
						delaysForEndRound.push(new Promise((resolve) => {
							scene.tweens.add({
								targets: sprite,
								x: nextHex.x,
								y: nextHex.y,
								...FoodSpriteOptions,
								onComplete(tween) {
									nextHex.city.player.money += food * 10;
									currentGame.uiDisplays.money.setText(currentGame.players[0].money.toLocaleString('en-Us'));
									sprite.setActive(false);
									sprite.destroy();
									tween.destroy();
									resolve();
								},
							});
						}));
					} else {
						FoodSprite.hex = nextHex;
						delaysForEndRound.push(new Promise((resolve) => {
							scene.tweens.add({
								targets: sprite,
								x: nextHex.x,
								y: nextHex.y,
								...FoodSpriteOptions,
								onComplete(tween) {
									tween.destroy();
									resolve();
								},
							});
						}));
					}
				}
				// TODO: What if there's no path?!
			}

			// TODO: Limit lifespan of FoodSprite
			if (++FoodSprite.rounds > 5) {
				sprite.setActive(false);
				sprite.destroy();
			}
		});

		grid.forEach((hex) => {
			if (hex.tile.laborers.size > 0 && hex.tile.food < hex.tile.laborers.size * Citizen.FOOD_CONSUMPTION) {
				// TODO: Citizen Starves!
			}

			// TODO: Feed Laborers from Tile food reserves
			hex.tile.food -= hex.tile.laborers.size * Citizen.FOOD_CONSUMPTION;
		});

		Promise.all(delaysForEndRound).then(() => {
			currentGame.uiDisplays.money.setText(currentGame.players[0].money.toLocaleString('en-Us'));
			this.startRound();
		});
	},
	closeUnitActionMenu() {
		this.domContainer.innerHTML = '';
	},
};

// Helper to find a point along a line between two points
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
	actionOutlines.graphics?.destroy();
	while (actionOutlines.text.length > 0) {
		actionOutlines.text.pop().destroy();
	}
}

// The basic resource transporter unit, used to move resources to the nearest City
let ResourceTransporter = null;

// Thanks to https://github.com/AlurienFlame/Honeycomb and https://www.redblobgames.com/pathfinding/a-star/introduction.html
function findPath(start, end, unit = ResourceTransporter) {
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
			if (!isLegalMove(neighbor.row, neighbor.col, unit)) return;

			// g_cost is movement cost from start
			neighbor.g_cost = current.g_cost + movementCost(unit, neighbor, current);
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
	} while (pathHex?.parent instanceof Honeycomb.Hex);

	return path;
}

// Searches all players units to find any units on the specified hex
function getUnitsOnHex(hex) {
    if (!(hex instanceof Honeycomb.Hex)) return [];
    
    const units = [];
    currentGame.players.forEach(player => {
        player.units.forEach(unit => {
            if (unit.hex.row === hex.row && unit.hex.col === hex.col && !unit.deleted) {
                units.push(unit);
            }
        });
    });
    return units;
}

function movementCost(unit, nextHex, thisHex = unit.hex) {
	if (!(nextHex instanceof Honeycomb.Hex) || !(unit instanceof Unit)) {
		return Infinity;
	}
	if (nextHex.terrain.isWater && !unit.base.moveOnWater) {
		// Is there a unit override for this terrain movement?
		return unit.base.movementCosts[nextHex.terrain.terrain] ?? Infinity;
	}
	// TODO: Include roads, terrain improvements, etc
	return unit.base.movementCosts[nextHex.terrain.terrain] ?? nextHex.terrain.movementCost ?? Infinity;
}

const actionOutlines = {
	text: [],
};
const Unit = (() => {
	let scene = null;

	function Unit(unitType, {
		row,
		col,
		player,
	}) {
		// Check unitType exists
		const base = json.world.units[unitType];
		if (typeof base !== 'object' || base === null) {
			throw new TypeError(`Unknown unit '${unitType}'`);
		}

		if (scene === null) {
			scene = currentGame.scenes.getScene('mainGameScene');
		}

		// Add sprite
		const { x, y } = grid.getHex({ row, col });
		const sprite = scene.add.sprite(x, y, `unit.${unitType}`)
			.setTint(0x383838)
			.setDepth(depths.inactiveUnits);
		sprite.setScale(unitWidth / sprite.width);

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
	Object.assign(Unit.prototype, {
		activate() {
			hideActionSprites();
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
			this.sprite.setTint(0xffffff).setDepth(depths.activeUnit);

			// Continue on path
			if (Array.isArray(this.path) && this.path.length > 0) {
				while (this.moves >= movementCost(this, this.path[0])) {
					this.doAction('moveTo', this.path.shift());
				}
				this.deactivate(true);
				return;
			}

			// Not the human player's unit, do nothing (for now)
			if (this.player.index !== 0) {
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
				if (isLegalMove(row, col, this)) {
					const hex = grid.getHex({ row, col });
					const text = scene.add.text(
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
					).setOrigin(0).setDepth(depths.actionSprites);
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
			this.sprite.setTint(0x383838).setDepth(depths.inactiveUnits);
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
				if (grid.distance(this.hex, hex) === 1) {
					// Neighbor, move there
					this.moveTo(hex);
				} else {
					// Find path
					const path = findPath(this.hex, hex, this);
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
				this.deactivate(true);
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
								this.destroy();
								return;
						}
						break;
					case 'homesteader':
						switch (action) {
								// Build farm
							case 'f':
								if (thisHex.tile.setImprovement('farm')) {
									thisHex.tile.laborers = new Citizen({ hex: thisHex });
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
				this.player.activateUnit();
			} else {
				this.deactivate();
			}
		},
		moveTo(hex) {
			if (!(hex instanceof Honeycomb.Hex)) return;
			if (!isLegalMove(hex.row, hex.col, this)) return;
			this.row = hex.row;
			this.col = hex.col;
			// TODO: Chain tweens to multiple hexes instead of straight to last hex
			scene.tweens.add({
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
			this.moves -= movementCost(this, hex);
			if (this.moves <= 0) this.deactivate();
		},
	});
	return Unit;
})();

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

// TODO: This object should define every action and handle all of each action's programming
const Actions = [
	{
		key: 'moveTo',
		text: ({ hex }) => hex instanceof Honeycomb.Hex ? `Move to ${hex.row}×${hex.col}` : 'Move here',
		isValidOption({ hex, unit }) {
			return isLegalMove(hex.row, hex.col, unit);
		},
	},
	{
		key: 'tile',
		text: 'Information on space',
		isValidOption({ hex }) {
			return hex instanceof Honeycomb.Hex && hex.tile instanceof Tile;
		},
		doAction({ hex }) {
			if (this.isValidOption({ hex })) {
				currentGame.closeUnitActionMenu();
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
			return hex.tile?.player === currentGame.currentPlayer && hex.city instanceof City;
		},
		doAction({ hex }) {
			if (this.isValidOption({ hex })) {
				currentGame.closeUnitActionMenu();
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
		doAction({ unit, player }) {
			if (this.isValidOption({ unit })) {
				currentGame.closeUnitActionMenu();
				
				// Deactivate current unit without ending moves
				if (currentGame.activeUnit instanceof Unit) {
					currentGame.activeUnit.deactivate(false);
				}
				
				// Find the unit's index in its player's units array
				const unitIndex = unit.player.units.indexOf(unit);
				if (unitIndex >= 0) {
					unit.player.activateUnit(unitIndex);
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
			if (grid.traverse(Honeycomb.spiral({
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
		isValidOption: ({ hex, player }) => {
			return hex.tile.player !== player;
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
	{
		key: 'w', // wait
		text: '<u>W</u>ait',
	},
	{
		key: 's', // stay
		text: '<u>S</u>tay here this turn',
	},
	{
		key: '',
		text: 'Cancel',
	},
].reduce((obj, action) => ({
	...obj,
	[action.key]: new Action(action),
}), {});

function doAction(evt, hex = null) {
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

function isLegalMove(row, col, unit = ResourceTransporter) {
	// Grab Target Tile
	const targetHex = grid.getHex({ row, col });
	if (!(targetHex instanceof Honeycomb.Hex)) return false;

	if (unit instanceof Unit) {
		// TODO: Check move into City
		if (targetHex.city instanceof City && targetHex.city.player.index !== unit.player.index) {
			if (!unit.attack || !unit.attackCities) return false;
		}

		// TODO: Check for battle
		// const tileUnits = grabUnitsOnTile(row, col);
		let tileUnits;
		if (false) {
			if (!unit.attack) return false;
			if (units[tileUnits[0]].index == 'britton' && unit.faction == 'roman') return false;
		}
	}

	// Check movement into terrain
	const moves = movementCost(unit, targetHex);
	if (!Number.isFinite(moves)) return false;
	return moves <= unit.moves;
}

function openUnitActionMenu(hex) {
	if (!(hex instanceof Honeycomb.Hex) || !(hex.tile instanceof Tile)) {
		// Not valid hex, exit
		return;
	}

	// List possible actions on the hex to build menu
	const possibleActions = [];

	// Check for units on this hex
	const unitsOnHex = getUnitsOnHex(hex);

	// If units on this hex, add option to activate each unit
	if (unitsOnHex.length > 0) {
		unitsOnHex.forEach(unit => {
			// Don't show option to activate currently active unit
			if (unit === currentGame.activeUnit) return;

			// Only show units from current player or if no active unit
			if (unit.player === currentGame.currentPlayer || !currentGame.activeUnit) {
				possibleActions.push({
					action: 'activateUnit',
					unit: unit,
				});
			}
		});
	}

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
				case 'homesteader':
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
			if (Actions['c'].isValidOption({ hex, player: currentGame.activeUnit.player })) {
				possibleActions.push('c');
			}
		} else if (isLegalMove(hex.row, hex.col, currentGame.activeUnit)) {
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
		currentGame.closeUnitActionMenu();
		return;
	}

	// If only one action, do it (but not for activateUnit - always show menu)
	if (possibleActions.length === 1 && typeof possibleActions[0] === 'object') switch (possibleActions[0].action) {
		case 'moveTo':
			// Automatically move to adjacent hex
			if (grid.distance(currentGame.activeUnit.hex, hex) === 1) {
				currentGame.activeUnit.doAction('moveTo', hex);
				return;
			}
			break;
		case 'city':
			doAction('city', hex);
			return;
		case 'tile':
			doAction('tile', hex);
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
                doAction(action, hex);
            });
        }
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
			ResourceTransporter = {
				...json.world.ResourceTransporter,
			};
			Object.entries(json.world.improvements).forEach(([key, improvement]) => {
				if (typeof improvement.tile === 'string' && improvement.tile.length > 0) {
					this.load.image(`improvements.${key}`, `img/improvements/${improvement.tile}.png`);
				}
			});
			Object.entries(json.world.resources).forEach(([key, resource]) => {
				if (typeof resource.tile === 'string' && resource.tile.length > 0) {
					this.load.image(`resources.${key}`, `img/resources/${resource.tile}.png`);
				}
			});
			this.load.image('laborers.farmer', 'img/laborers/farmer.png');
			// Load images for player's action
			this.load.image('activeUnit', 'img/activeUnit.png');
			// Load Unit Images
			Object.keys(json.world.units).forEach((unitType) => {
				this.load.image(`unit.${unitType}`, `img/units/${unitType}.png`);
			});
		},
		create() {
			// Add graphics objects
			currentGame.graphics = {
				...currentGame.graphics,
				territoryFills: this.add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryFills),
				territoryLines: this.add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryLines),
			};

			// Build World from Honeycomb Grid
			grid.forEach((hex) => {
				const tile = json.world.world[hex.row][hex.col];
				Object.assign(hex, tile, {
					tile: new Tile({
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
				// Build City
				if (typeof hex.city === 'object' && hex.city !== null) {
					hex.city = new City({
						...hex.city,
						col: hex.col,
						row: hex.row,
						player: currentGame.players[hex.city.player],
					});
				}
				// Build Improvement
				if (typeof hex.improvement === 'string') {
					hex.tile.setImprovement(hex.improvement);
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
				this.cameras.main.ignore([
					currentGame.graphics.territoryFills,
				]);

				const minimap = this.cameras.add(window.visualViewport.width / scale - 800, window.visualViewport.height / scale - 400, 800, 400);
				minimap.setZoom(0.2).setName('mini').setBackgroundColor(0x000000);
				minimap.centerOn(grid.pixelWidth / 2, grid.pixelHeight / 2);
				minimap.ignore([
					currentGame.graphics.territoryLines,
				]);
			}

			// Pointer handling: support drag-to-pan (drag) and click-to-open (click)
			let isDragging = false;
			const dragStart = { x: 0, y: 0 };
			const camStart = { x: 0, y: 0 };
			let dragThreshold = 4; // default (pixels)

			this.input.on('pointerdown', (pointer) => {
				// Record starting positions (screen coords and camera scroll)
				dragStart.x = pointer.x;
				dragStart.y = pointer.y;
				camStart.x = this.cameras.main.scrollX;
				camStart.y = this.cameras.main.scrollY;
				isDragging = false;
				// Set drag threshold based on input device type. Touch/pens are less precise
				// so use a larger threshold to avoid accidental drags.
				switch (pointer.pointerType) {
					case 'touch':
						dragThreshold = 10;
						break;
					case 'pen':
						dragThreshold = 8;
						break;
					case 'mouse':
					default:
						dragThreshold = 4;
				}
			});

			this.input.on('pointermove', (pointer) => {
				if (!pointer.isDown) return;
				const dx = pointer.x - dragStart.x;
				const dy = pointer.y - dragStart.y;
				// Start dragging after threshold so clicks are not interpreted as drags
				if (!isDragging && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
					isDragging = true;
				}
				if (isDragging) {
					// Adjust camera scroll. Movement must be scaled by camera zoom to map
					// screen pixels to world pixels correctly.
					const zoom = this.cameras.main.zoom || 1;
					this.cameras.main.setScroll(camStart.x - dx / zoom, camStart.y - dy / zoom);
				}
			});

			this.input.on('pointerup', (pointer) => {
				if (!isDragging) {
					// Treat as click
					openUnitActionMenu(grid.pointToHex({ x: pointer.worldX, y: pointer.worldY }));
				}
				// Reset drag state
				isDragging = false;
			});

			// TODO: Build Starting Players and Units
			currentGame.players[0].addUnit('rancher', 2, 3, this);
			currentGame.players[0].addUnit('homesteader', 2, 4, this);
			currentGame.players[0].addUnit('miner', 2, 2, this);
			currentGame.players[0].addUnit('settler', 3, 3, this);
			currentGame.players[0].addUnit('builder', 1, 3, this);

			// Listen for key presses
			this.input.keyboard.on('keydown', (evt) => {
				// Ctrl+R, reload; Ctrl+1, change browser tab
				if (evt.ctrlKey && [
					'r', 'R', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				].includes(evt.key)) {
					return;
				}
				// Ctrl+Shift+I, open Chrome dev tools
				if (evt.ctrlKey && evt.key === 'I') return;
				evt.preventDefault();
				switch (evt.key) {
					case 'ArrowUp':
						this.cameras.main.scrollY -= 25;
						return;
					case 'ArrowDown':
						this.cameras.main.scrollY += 25;
						return;
					case 'ArrowLeft':
						this.cameras.main.scrollX -= 25;
						return;
					case 'ArrowRight':
						this.cameras.main.scrollX += 25;
						return;
					case 'ContextMenu':
					case ' ':
						if (currentGame.activeUnit instanceof Unit) {
							openUnitActionMenu(currentGame.activeUnit.hex);
						}
						return;
				}
				doAction(evt);
			}).enabled = false;

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
			this.events.once('create', checkToStart);
		},
		update() {
		},
	},
};

function checkToStart() {
	if (currentGame.scenes.isActive('mainGameScene') && currentGame.scenes.isActive('mainControls')) {
		currentGame.startRound();
	}
}

// A scene function, for example in `create()`
function displayImageInHTML(imageKey, htmlElementId) {
	// Get the HTML <img> element by its ID
	const imgElement = document.getElementById(htmlElementId);
	/*
	if (!(imgElement instanceof HTMLImageElement) && imgElement instanceof Element) {
		imgElement = imgElement.querySelector('img') ?? (() => {
			const img = document.createElement('img');
			imgElement.append(img);
			return img;
		})();
	}
	/**/

	// Get the Texture instance from the Texture Manager
	const texture = this.textures.get(imageKey);

	if (texture && imgElement) {
		// Get the source image from the texture, which is an HTMLImageElement
		const imageSource = texture.getSourceImage();

		// Create a temporary canvas to convert the image to Base64
		const canvas = document.createElement('canvas');
		canvas.width = imageSource.width;
		canvas.height = imageSource.height;
		const context = canvas.getContext('2d');
		context.drawImage(imageSource, 0, 0);

		// Convert the canvas image to a data URI and set it as the src
		// imgElement.src = canvas.toDataURL();
		if (imgElement instanceof HTMLImageElement) {
			imgElement.parentElement.append(canvas);
		} else {
			imgElement.append(canvas);
		}
	}
}

yodasws.page('pageGame').setRoute({
	template: 'pages/game/game.html',
	canonicalRoute: '/game/',
	route: '/game/?',
}).on('load', () => {
	currentGame.players = [
		new Player(0),
		new Player(1),
		new Player(2),
	];
	const game = new Phaser.Game({
		...config,
		parent: document.querySelector('main'),
		dom: {
			createContainer: true,
		},
	});

	// TODO: House main controls above the world map
	game.scene.add('mainControls', {
		preload() {
			this.load.image('coins', `img/resources/coins.png`);
		},
		create() {
			const graphics = currentGame.graphics.mainControls = this.add.graphics({ x: 0, y: 0 });
			let lineY = 15;

			// Round and Current Turn Player's Name
			{
				currentGame.uiDisplays.round = this.add.text(14, lineY, `Round ${currentGame.turn}`, {
					fontFamily: 'Trebuchet MS',
					fontSize: '28px',
					color: 'white',
					stroke: 'black',
					strokeThickness: 5,
					maxLines: 1,
				});
				currentGame.uiDisplays.player = this.add.text(14 + currentGame.uiDisplays.round.displayWidth + 10, lineY + 2, '', {
					fontFamily: 'Trebuchet MS',
					fontSize: '26px',
					color: 'white',
					stroke: 'black',
					strokeThickness: 5,
					maxLines: 1,
				});
				lineY += currentGame.uiDisplays.player.displayHeight + 5;
			}

			// Money
			{
				lineY -= 15;
				const img = this.add.image(0, lineY, 'coins').setDepth(2);
				img.setScale(32 / img.width);
				img.x = 20 + img.displayWidth / 2;
				img.y = lineY += 20 + img.displayHeight / 2;
				currentGame.uiDisplays.money = this.add.text(img.x + img.displayWidth / 2 + 6, img.y - img.displayHeight / 2 - 4, currentGame.players[0].money.toLocaleString('en-Us'), {
					fontFamily: 'Trebuchet MS',
					fontSize: '28px',
					color: 'gold',
					stroke: 'black',
					strokeThickness: 5,
					maxLines: 1,
				}).setLetterSpacing(1);
				lineY += currentGame.uiDisplays.money.displayHeight;
			}

			graphics.fillStyle(0x000000, 0.5);
			graphics.fillRect(0, 0, config.width, lineY);

			this.input.keyboard.on('keydown', (evt) => {
				// Ctrl+R, reload; Ctrl+1, change browser tab
				if (evt.ctrlKey && [
					'r', 'R', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				].includes(evt.key)) {
					return;
				}
				// Ctrl+Shift+I, open Chrome dev tools
				if (evt.ctrlKey && evt.key === 'I') return;
				evt.preventDefault();
				switch (evt.key) {
					case 'F1':
						// TODO: Help
						break;
					case 'F2':
						// TODO: Remove all layers, return to main map
						currentGame.graphics.gfxClaims.destroy();
						break;
					case 'F3': {
						const graphics = currentGame.graphics.gfxClaims = currentGame.scenes.getScene('mainGameScene').add.graphics({ x: 0, y: 0 }).setDepth(depths.territoryLines - 1);
						// Show territorial claims
						grid.forEach((hex) => {
							if (!(hex.tile instanceof Tile)) return;
							if (!(hex.tile.claims() instanceof Map)) return;
							hex.tile.claims().forEach((intClaim, player) => {
								if (hex.tile.player === player) return;
								graphics.lineStyle(3, player.color);
								graphics.beginPath();
								// TODO: Draw as a dashed line
								// Draw points closer to center of hex
								const [firstCorner, ...otherCorners] = hex.corners.map(point => lineShift(point, hex, 0.9));
								graphics.moveTo(firstCorner.x, firstCorner.y);
								otherCorners.forEach(({x, y}) => {
									graphics.lineTo(x, y);
								});
								graphics.closePath();
								graphics.strokePath();
							});
						});
						break;
					}
					case 'F4':
						break;
					case 'F5':
						break;
				}
			});
			// buildMainControls();
			this.events.once('create', checkToStart);
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
			this.add.text(config.width - 100, 0, '× ', {
				fixedWidth: 100,
				fixedHeight: 100,
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
					lineOffset: 0.95 * tileScale,
				});
				// TODO: Show number of laborers on tile
				// TODO: Show tile improvement
				// TODO: Allow User to click tile to assign laborers
				// TODO: Show food production on tile
				if (hex.tile.laborers.size > 0) {
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
				}
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

	game.scene.add('tile-view', {
		preload() {
		},
		create({ hex }) {
			if (!(hex instanceof Honeycomb.Hex) || !(hex.tile instanceof Tile)) {
				game.scene.resume('mainGameScene');
				return;
			}
			console.log('Sam, tile-view created');
			game.scene.pause('mainGameScene');

			displayImageInHTML.bind(this)(`tile.${hex.terrain.terrain}`, 'terrain');
			const dom = document.getElementById('tile-view');
			dom.removeAttribute('hidden');

			// Start building graphics scene
			{
				// Lay black background
				const graphics = this.add.graphics({ x: 0, y: 0 }).setDepth(0);
				graphics.fillStyle(0x000000, 0.5);
				graphics.fillRect(0, 0, config.width, config.height);
			}

			// Set event listeners
			this.input.keyboard.enabled = true;
			this.input.keyboard.on('keydown', (evt) => {
				if (evt.key === 'Escape') {
					game.scene.stop('tile-view');
				}
			});

			this.events.on('sleep', () => {
				dom.setAttribute('hidden', true);
				dom.querySelectorAll('div').forEach((div) => div.innerHTML = '');
				console.log('Sam, tile-view sleep');
				game.domContainer.innerHTML = '';
				game.scene.wake('mainGameScene');
			}).on('shutdown', () => {
				dom.setAttribute('hidden', true);
				dom.querySelectorAll('div').forEach((div) => div.innerHTML = '');
				console.log('Sam, tile-view shutdown');
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
	game.domContainer.classList.add('game');
});
