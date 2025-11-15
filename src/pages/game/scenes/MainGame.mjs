import * as GameConfig from '../modules/Config.mjs';

import City from '../modules/City.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import * as UnitUtils from '../modules/Unit.mjs';
import { currentGame, GoodsOnBoard } from '../modules/Game.mjs';

import InputManager from '../modules/InputManager.mjs';

import { renderGoods } from '../views/GoodsView.mjs';
import { registerUnitToView, renderUnits } from '../views/UnitView.mjs';
import { removeImprovement, renderImprovement } from '../views/TileView.mjs';

const sceneKey = 'mainGameScene';

let MainGameScene = null;

export const ActionSprites = {
	spriteOnActiveUnit: null,
	shortcutKeys: [],
};

function hideActionSprites() {
	if (globalThis.Phaser === undefined) {
		return;
	}
	const windowConfig = GameConfig.getWindowConfig();
	ActionSprites.spriteOnActiveUnit?.setActive(false).setPosition(windowConfig.offscreen, windowConfig.offscreen).setDepth(GameConfig.depths.offscreen);
	while (ActionSprites.shortcutKeys.length > 0) {
		ActionSprites.shortcutKeys.pop().destroy();
	}
}
currentGame.events.on('unit-deactivated', hideActionSprites);
currentGame.events.on('unit-activated', hideActionSprites);

export function ShowActiveUnitHelpSprites(event) {
	if (globalThis.Phaser === undefined) {
		return;
	}
	const unit = event.detail.unit;

	const hex = unit.hex;
	ActionSprites.spriteOnActiveUnit.setActive(true).setVisible(true).setPosition(hex.x, hex.y).setDepth(GameConfig.depths.actionSprites);

	// Set text and listeners on hexes to move unit
	[
		'L',
		'K',
		'J',
		'U',
		'I',
		'O',
	].forEach((move) => {
		const [row, col] = UnitUtils.actionTileCoordinates(move.toLowerCase(), unit.row, unit.col);
		const hex = Hex.Grid.getHex({ row, col });
		if (Hex.IsLegalMove(hex, unit)) {
			const text = MainGameScene.add.text(
				hex.x - GameConfig.tileWidth / 2,
				hex.y + GameConfig.tileWidth / 6,
				move,
				{
					fixedWidth: GameConfig.tileWidth,
					font: '25pt Trebuchet MS',
					align: 'center',
					color: 'khaki',
					stroke: 'black',
					strokeThickness: 7,
				}
			).setOrigin(0).setDepth(GameConfig.depths.actionSprites);
			ActionSprites.shortcutKeys.push(text);
			MainGameScene.cameras.getCamera('mini').ignore(text);
		}
	});
}
currentGame.events.on('unit-activated', ShowActiveUnitHelpSprites);

function CenterCameraOnActiveUnit(event) {
	if (globalThis.Phaser === undefined) {
		return;
	}
	const hex = event.detail.unit.hex;
	MainGameScene.cameras.main.pan(hex.x, hex.y, 500, 'Linear', true);
}
currentGame.events.on('unit-activated', CenterCameraOnActiveUnit);

currentGame.events.on('unit-created', (evt) => {
	registerUnitToView(evt.detail.unit, MainGameScene);
});

export default {
	key: sceneKey,
	autoStart: true,
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
		MainGameScene = this;

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
		ActionSprites.spriteOnActiveUnit = this.add.image(windowConfig.offscreen, windowConfig.offscreen, 'activeUnit').setActive(false);

		// Define the cameras for the world view and minimap
		{
			// TODO: Calculate the zoom and size to show the whole map
			// World View
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

			// Minimap View
			const minimap = this.cameras.add(windowConfig.width - 800, windowConfig.height - 400, 800, 400);
			minimap.setZoom(0.2).setName('mini').setBackgroundColor(0x000000);
			minimap.centerOn(Hex.Grid.pixelWidth / 2, Hex.Grid.pixelHeight / 2);
			minimap.ignore([
				currentGame.graphics.territoryLines,
				ActionSprites.spriteOnActiveUnit,
			]);
		}

		// TODO: Build Starting Players and Units
		currentGame.players[0].addUnit('rancher', Hex.Grid.getHex({ row: 2, col: 3 }), this);
		currentGame.players[0].addUnit('farmer', Hex.Grid.getHex({ row: 2, col: 4 }), this);
		currentGame.players[0].addUnit('miner', Hex.Grid.getHex({ row: 2, col: 2 }), this);
		currentGame.players[0].addUnit('settler', Hex.Grid.getHex({ row: 3, col: 3 }), this);
		currentGame.players[0].addUnit('builder', Hex.Grid.getHex({ row: 1, col: 3 }), this);

		this.inputManager = new InputManager(this);

		this.events.on('pause', () => {
			console.log('Sam, mainGameScene paused');
			currentGame.scenes.sleep('mainControls');
			hideActionSprites();
			this.inputManager.disableKeyboardInput();
		});
		this.events.on('resume', () => {
			console.log('Sam, mainGameScene resumed');
			currentGame.scenes.wake('mainControls');
			currentGame.currentPlayer.activateUnit();
			this.inputManager.enableKeyboardInput();
		}).on('wake', () => {
			console.log('Sam, mainGameScene woken');
			currentGame.scenes.wake('mainControls');
			currentGame.currentPlayer.activateUnit();
			this.inputManager.enableKeyboardInput();
		});

		this.game.events.emit(`scene-created-${sceneKey}`);
	},
	update() {
		this.inputManager.update();
		renderUnits();
		// TODO: Optimize by only updating changed goods
		GoodsOnBoard.forEach(item => renderGoods(item, this));
		Hex.Grid.forEach((hex) => {
			// TODO: Optimize by only updating changed tiles
			if (hex.tile.improvement.key) {
				renderImprovement(hex.tile, this);
			} else {
				removeImprovement(hex.tile);
			}
		});
	},
};
