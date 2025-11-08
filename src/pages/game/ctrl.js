import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import { DoAction, OpenUnitActionMenu } from './modules/Actions.mjs';
import City from './modules/City.mjs';
import Faction from './modules/Faction.mjs';
import Goods from './modules/Goods.mjs';
import Laborer from './modules/Laborer.mjs';
import Nation from './modules/Nation.mjs';
import Tile from './modules/Tile.mjs';
import Unit from './modules/Unit.mjs';
import * as Hex from './modules/Hex.mjs';
import { currentGame } from './modules/Game.mjs';
import Scenes from './scenes/scenes.mjs';

const config = {
	type: Phaser.AUTO,
	...GameConfig.getWindowConfig(),
	zoom: GameConfig.scale,
	backgroundColor: '#71ABFF',
	scene: {
		key: 'title-screen',
		preload() {
		},
		create() {
		},
		update() {
		},
	},
};

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

	Promise.all([
		Promise.try(() => {
			game.scene.add('mainControls', Scenes.MainControls, true);
		}),
		Promise.try(() => {
			game.scene.add('mainGameScene', Scenes.MainGame, true);
		}),
	]).then(() => {
		console.log('Sam, scenes added');
		game.scene.start('mainGameScene');
		game.scene.start('mainControls');
		console.log('Sam, scenes started?');
		game.scene.moveAbove('mainGameScene', 'mainControls');
		console.log('Sam, scenes arranged?');
		if (currentGame.scenes.isActive('mainGameScene') && currentGame.scenes.isActive('mainControls')) {
			console.log('Sam, scenes active, starting round');
			currentGame.startRound();
		}
	});

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
