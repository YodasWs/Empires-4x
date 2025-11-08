import * as GameConfig from '../modules/Config.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import { currentGame } from '../modules/Game.mjs';

export default {
	preload() {
	},
	create(data) {
		const config = GameConfig.getWindowConfig();
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
}
