import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import { DoAction, OpenUnitActionMenu } from './modules/Actions.mjs';
import City from './modules/City.mjs';
import Faction from './modules/Faction.mjs';
import Goods from './modules/Goods.mjs';
import Laborer from './modules/Laborer.mjs';
import Nation from './modules/Nation.mjs';
import Tile from './modules/Tile.mjs';
import Unit, * as UnitUtils from './modules/Unit.mjs';
import * as Hex from './modules/Hex.mjs';
import { currentGame } from './modules/Game.mjs';

const config = {
	type: Phaser.AUTO,
	...GameConfig.getWindowConfig(),
	zoom: GameConfig.scale,
	backgroundColor: '#71ABFF',
	scene: {
		key: 'mainGameScene',
		preload() {
			UnitUtils.init();
			// Load World Tile Images
			Object.entries(json.world.terrains).forEach(([key, terrain]) => {
				this.load.image(`tile.${key}`, `img/tiles/${terrain.tile}.png`);
			});
			this.load.spritesheet('cities', 'img/tiles/cities.png', {
				frameHeight: 200,
				frameWidth: 200,
			});
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
			Hex.Grid.forEach((hex) => {
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
						new Phaser.Geom.Polygon(Hex.Grid.getHex({ row: 0, col: 0}).corners),
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
				const w = Hex.Grid.pixelWidth;
				const h = Hex.Grid.pixelHeight;
				const padLeft = window.visualViewport.width / GameConfig.scale / 2;
				const padTop = window.visualViewport.height / GameConfig.scale / 2;
				this.cameras.main.setBounds(
					-padLeft,
					-padTop,
					w + padLeft * 2,
					h + padTop * 2
				);
				this.cameras.main.ignore([
					currentGame.graphics.territoryFills,
				]);

				const minimap = this.cameras.add(window.visualViewport.width / GameConfig.scale - 800, window.visualViewport.height / GameConfig.scale - 400, 800, 400);
				minimap.setZoom(0.2).setName('mini').setBackgroundColor(0x000000);
				minimap.centerOn(Hex.Grid.pixelWidth / 2, Hex.Grid.pixelHeight / 2);
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
					OpenUnitActionMenu(Hex.Grid.pointToHex({ x: pointer.worldX, y: pointer.worldY }));
				}
				// Reset drag state
				isDragging = false;
			});

			// TODO: Build Starting Players and Units
			currentGame.players[0].addUnit('rancher', 2, 3, this);
			currentGame.players[0].addUnit('farmer', 2, 4, this);
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
							OpenUnitActionMenu(currentGame.activeUnit.hex);
						}
						return;
				}
				DoAction(evt);
			}).enabled = false;

			this.events.on('pause', () => {
				console.log('Sam, mainGameScene paused');
				currentGame.scenes.sleep('mainControls');
				UnitUtils.hideActionSprites();
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
						Hex.Grid.forEach((hex) => {
							if (!Tile.isTile(hex.tile)) return;
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
			if (!Hex.isHex(data.hex) || !Tile.isTile(data.hex.tile)) {
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
			Hex.Grid.traverse(Honeycomb.spiral({
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
			if (!Hex.isHex(hex) || !Tile.isTile(hex.tile)) {
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

	Object.assign(currentGame, {
		scenes: game.scene,
		domContainer: game.domContainer,
	});
	game.domContainer.classList.add('game');
});
