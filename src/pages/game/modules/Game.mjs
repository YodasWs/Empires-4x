import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';

import City from './City.mjs';
import Faction from './Faction.mjs';
import Goods from './Goods.mjs';
import Laborer from './Laborer.mjs';
import Tile from './Tile.mjs';
import * as Hex from './Hex.mjs';

let FoodSprites = [];
const FoodSpriteOptions = {
	ease: 'Linear',
	duration: 1000,
	yoyo: false,
};

export const currentGame = {
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
		Hex.Grid.forEach((hex) => {
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
		Hex.Grid.forEach((hex) => {
			if (hex.city instanceof City) {
				const city = hex.city;
				Hex.Grid.traverse(Honeycomb.spiral({
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
		(Hex.isHex(thisHex) ? [thisHex] : Hex.Grid).forEach((hex) => {
			if (!Tile.isTile(hex.tile) || !(hex.tile.faction instanceof Faction)) return;
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
		Hex.Grid.forEach((hex) => {
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
				const dist = Hex.Grid.distance(hex, cityHex);
				if (dist < closestDistance) {
					closestHex = cityHex;
					closestDistance = dist;
				}
			});

			if (Hex.isHex(closestHex) && closestHex.city instanceof City) {
				const path = Hex.FindPath(hex, closestHex);
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

		Hex.Grid.forEach((hex) => {
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
		if (typeof Element !== 'undefined' && this.domContainer instanceof Element) {
			this.domContainer.innerHTML = '';
		}
	},
};
