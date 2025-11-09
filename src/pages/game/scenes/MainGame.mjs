import * as GameConfig from '../modules/Config.mjs';

import City from '../modules/City.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import Unit, * as UnitUtils from '../modules/Unit.mjs';
import { currentGame } from '../modules/Game.mjs';

const sceneKey = 'mainGameScene';

export default {
	key: sceneKey,
	autoStart: true,
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

		const windowConfig = GameConfig.getWindowConfig();
		// Add Game Sprites and Images
		currentGame.sprActiveUnit = this.add.image(windowConfig.offscreen, windowConfig.offscreen, 'activeUnit').setActive(false);

		{
			// TODO: Calculate the zoom and size to show the whole map
			const w = Hex.Grid.pixelWidth;
			const h = Hex.Grid.pixelHeight;
			const padLeft = windowConfig.width / 2;
			const padTop = windowConfig.height / 2;
			this.cameras.main.setBounds(
				-padLeft,
				-padTop,
				w + padLeft * 2,
				h + padTop * 2
			);
			this.cameras.main.ignore([
				currentGame.graphics.territoryFills,
			]);

			const minimap = this.cameras.add(windowConfig.width - 800, windowConfig.height - 400, 800, 400);
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

		this.game.events.emit(`scene-created-${sceneKey}`);
	},
	update() {
	},
};
