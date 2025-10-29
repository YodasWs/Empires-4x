import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import City from './modules/City.mjs';
import Faction from './modules/Faction.mjs';
import Goods from './modules/Goods.mjs';
import Laborer from './modules/Laborer.mjs';
import Nation from './modules/Nation.mjs';
import Tile from './modules/Tile.mjs';
import Unit from './modules/Unit.mjs';

const offscreen = Math.max(window.visualViewport.width, window.visualViewport.height) * -2;

class gameHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	f_cost
	h_cost
	g_cost
}

const grid = new Honeycomb.Grid(gameHex, Honeycomb.rectangle({ width: 15, height: 6 }));

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
			// Adjust each Nations' and Factions' claims on Territory
			this.nations.forEach((nation) => {
				if (hex.tile.nation === nation) {
					// Strengthen top claimant's claim
					hex.tile.claimTerritory(nation, 1);
				} else if (hex.tile.claims(nation) > 0) {
					// Weaken foreign claimant's claim
					hex.tile.claimTerritory(nation, -1);
				}
			});
			this.players.forEach((player) => {
				if (hex.tile.faction === player) {
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
					FoodSprites.push(new Goods({
						type: 'food',
						num: food,
						hex,
					}));
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
		if (!(this.currentPlayer instanceof Faction)) {
			throw new TypeError(`Player ${intPlayer} is not a Faction Object`);
		}

		// Sam, TODO: Show message to User whose turn it is
		currentGame.uiDisplays.faction.setText(`${this.currentPlayer.name}'s Turn`)
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
			if (!(hex.tile instanceof Tile) || !(hex.tile.faction instanceof Faction)) return;
			if (fill === false) {
				graphics.lineStyle(lineWidth, hex.tile.faction.color);
			} else {
				graphics.fillStyle(hex.tile.faction.color);
			}
			graphics.beginPath();
			// Draw points closer to center of hex
			const [firstCorner, ...otherCorners] = hex.corners.map(point => GameConfig.lineShift(point, hex, lineOffset));
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
		currentGame.uiDisplays.faction.setX(14 + currentGame.uiDisplays.round.displayWidth + 10)
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
		FoodSprites = FoodSprites.filter(({ num, sprite }) => {
			return num > 0 && sprite instanceof Phaser.GameObjects.Sprite && sprite.active;
		});

		// Move Food towards nearest City
		FoodSprites.forEach((FoodSprite, i) => {
			let { faction, hex, num: food, sprite, type } = FoodSprite;
			if (type !== 'food') {
				return;
			}
			if (food <= 0) {
				sprite.setActive(false);
				sprite.destroy();
				return;
			}

			// Leave Food on tile for Laborers
			if (hex.tile.laborers.size > 0 && hex.tile.food < hex.tile.laborers.size * Laborer.FOOD_CONSUMPTION) {
				const neededFood = Math.max(0, hex.tile.laborers.size * Laborer.FOOD_CONSUMPTION - hex.tile.food);
				const takeFood = Math.min(neededFood, food);
				FoodSprite.num = food -= takeFood;
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
									faction.money += food * 10;
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
			if (type === 'food' && ++FoodSprite.rounds > 5) {
				sprite.setActive(false);
				sprite.destroy();
			}
		});

		grid.forEach((hex) => {
			if (hex.tile.laborers.size > 0 && hex.tile.food < hex.tile.laborers.size * Laborer.FOOD_CONSUMPTION) {
				// TODO: Laborer Starves!
			}

			// TODO: Feed Laborers from Tile food reserves
			hex.tile.food -= hex.tile.laborers.size * Laborer.FOOD_CONSUMPTION;
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

// The basic resource transporter unit, used to move Goods to the nearest City
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
	if (!(nextHex instanceof Honeycomb.Hex)) {
		return Infinity;
	}
	if (unit !== ResourceTransporter && !(unit instanceof Unit)) {
		return Infinity;
	}
	if (nextHex.terrain.isWater && !unit.base.moveOnWater) {
		// Is there a unit override for this terrain movement?
		return unit.base.movementCosts[nextHex.terrain.terrain] ?? Infinity;
	}
	// TODO: Include roads, terrain improvements, etc
	return unit.base.movementCosts[nextHex.terrain.terrain] ?? nextHex.terrain.movementCost ?? Infinity;
}

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
			return hex.tile?.faction === currentGame.currentPlayer && hex.city instanceof City;
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
		doAction({ unit, faction }) {
			if (this.isValidOption({ unit })) {
				currentGame.closeUnitActionMenu();

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
		if (targetHex.city instanceof City && targetHex.city.nation !== unit.faction.nation) {
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
			if (unit.faction === currentGame.currentPlayer || !currentGame.activeUnit) {
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
			if (Actions['c'].isValidOption({ hex, faction: currentGame.activeUnit.faction })) {
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
			Object.entries(json.world.goods).forEach(([key, resource]) => {
				if (typeof resource.tile === 'string' && resource.tile.length > 0) {
					this.load.image(`goods.${key}`, `img/resources/${resource.tile}.png`);
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
				territoryFills: this.add.graphics({ x: 0, y: 0 }).setDepth(GameConfig.depths.territoryFills),
				territoryLines: this.add.graphics({ x: 0, y: 0 }).setDepth(GameConfig.depths.territoryLines),
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
					sprite: this.add.image(hex.x, hex.y, `tile.${tile.terrain}`).setDepth(GameConfig.depths.map).setInteractive(
						new Phaser.Geom.Polygon(grid.getHex({ row: 0, col: 0}).corners),
						Phaser.Geom.Polygon.Contains
					),
					text: this.add.text(hex.x - GameConfig.tileWidth / 2, hex.y + GameConfig.tileWidth / 3.6, hex.row + '×' + hex.col, {
						fixedWidth: GameConfig.tileWidth,
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
						nation: currentGame.nations[hex.city.nation],
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
function displayImageInHTML({
	htmlElementId,
	imageKey,
	scene = currentGame.scenes.getScene('mainGameScene'),
} = {}) {
	// Get the HTML <img> element by its ID
	const imgElement = document.getElementById(htmlElementId);

	// Get the Texture instance from the Texture Manager
	const texture = scene.textures.get(imageKey);

	if (texture instanceof Phaser.Textures.Texture && imgElement instanceof Element) {
		// Get the source image from the texture, which is an HTMLImageElement
		imgElement.append(texture.getSourceImage());
	}
}

yodasws.page('pageGame').setRoute({
	template: 'pages/game/game.html',
	canonicalRoute: '/game/',
	route: '/game/?',
}).on('load', () => {
	currentGame.nations = [
		new Nation({
			index: 0,
		}),
	];
	currentGame.players = [
		new Faction({
			index: 0,
		}),
		new Faction({
			index: 1,
		}),
		new Faction({
			index: 2,
		}),
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
				currentGame.uiDisplays.faction = this.add.text(14 + currentGame.uiDisplays.round.displayWidth + 10, lineY + 2, '', {
					fontFamily: 'Trebuchet MS',
					fontSize: '26px',
					color: 'white',
					stroke: 'black',
					strokeThickness: 5,
					maxLines: 1,
				});
				lineY += currentGame.uiDisplays.faction.displayHeight + 5;
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
						break;
						const graphics = currentGame.graphics.gfxClaims = currentGame.scenes.getScene('mainGameScene').add.graphics({ x: 0, y: 0 }).setDepth(GameConfig.depths.territoryLines - 1);
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
								const [firstCorner, ...otherCorners] = hex.corners.map(point => GameConfig.lineShift(point, hex, 0.9));
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

			const tileScale = Math.min(config.height, config.width) / 7 / GameConfig.tileWidth;
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
					const fixedWidth = GameConfig.tileWidth * tileScale;
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
			const dom = document.getElementById('tile-view');

			// Display Terrain Information
			displayImageInHTML({
				imageKey: `tile.${hex.terrain.terrain}`,
				htmlElementId: 'terrain',
				scene: this,
			});
			const elTerrain = document.getElementById('terrain');
			if (elTerrain instanceof Element) {
				const div = document.createElement('div');
				div.classList.add('name');
				div.innerHTML = hex.terrain.name;
				elTerrain.appendChild(div);
			}
			console.log('Sam, terrain:', hex.terrain);

			// Display Improvement Information
			if (hex.tile.improvement?.image instanceof Phaser.GameObjects.Image) {
				const elImprovement = document.getElementById('improvements');
				if (elImprovement instanceof Element) {
					// Create new Phaser canvas
					const canvas = (() => {
						if (this.textures.exists('tile-view-improvement')) {
							return this.textures.get('tile-view-improvement');
						}
						return this.textures.createCanvas('tile-view-improvement', GameConfig.tileWidth, GameConfig.tileWidth);
					})();
					const elCanvas = canvas.getCanvas();
					const graphics = canvas.getContext();
					// Render a white hexagon to the canvas
					const blandHex = Honeycomb.defineHex({
						dimensions: GameConfig.tileWidth / 2,
						orientation: Honeycomb.Orientation.FLAT,
						origin: 'topLeft',
					});
					const oneGrid = new Honeycomb.Grid(blandHex, Honeycomb.rectangle({ width: 1, height: 1 }));
					const tileHex = oneGrid.getHex({ row: 0, col: 0 });

					graphics.fillStyle = 'white';
					graphics.beginPath();
					const [firstCorner, ...otherCorners] = tileHex.corners.map(point => ({ x: point.x, y: point.y - tileHex.y + 100 }));
					graphics.moveTo(firstCorner.x, firstCorner.y);
					otherCorners.forEach(({x, y}) => {
						graphics.lineTo(x, y);
					});
					graphics.closePath();
					graphics.fill();

					// Render improvement image to the canvas
					const img = this.textures.get(`improvements.${hex.tile.improvement.key}`).getSourceImage();
					const x = canvas.width / 2 - img.width / 2;
					const y = canvas.height / 2 - img.height / 2;
					canvas.drawFrame(`improvements.${hex.tile.improvement.key}`, null, x, y);

					// Place canvas into HTML
					canvas.refresh();
					elImprovement.appendChild(elCanvas);

					// Add improvement name
					const div = document.createElement('div');
					div.classList.add('name');
					div.innerHTML = hex.tile.improvement.title;
					elImprovement.appendChild(div);
				}
				console.log('Sam, improvement:', hex.tile.improvement);
			}

			// Show Tile View
			dom.removeAttribute('hidden');

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
