import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';
import World from '../../../json/world.mjs';

import { currentGame } from '../modules/Game.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';

import InputManager from '../modules/InputManager.mjs';

// A scene function, for example in `create()`
function displayImageInHTML({
	htmlElementId,
	imageKey,
	scene,
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

export default {
	key: 'tile-view',
	preload() {
	},
	create({ hex }) {
		if (!Hex.isHex(hex) || !Tile.isTile(hex.tile)) {
			currentGame.scenes.resume('mainGameScene');
			return;
		}
		this.scene.pause('mainGameScene');
		const dom = document.getElementById('tile-view');

		Object.keys(World.laborers).forEach((laborerType) => {
			this.load.image(`laborers.${laborerType}`, `img/laborers/${laborerType}.png`);
		});
		Object.entries(World.improvements).forEach(([key, improvement]) => {
			if (typeof improvement.tile === 'string' && improvement.tile.length > 0) {
				this.load.image(`improvements.${key}`, `img/improvements/${improvement.tile}.png`);
			}
		});

		// Display Terrain Information
		displayImageInHTML({
			imageKey: `tile.${hex.terrain.terrain}`,
			htmlElementId: 'terrain',
			scene: this,
		});
		const elTerrain = dom.querySelector('#terrain');
		if (elTerrain instanceof Element) {
			const div = document.createElement('div');
			div.classList.add('name');
			div.innerHTML = hex.terrain.name;
			elTerrain.appendChild(div);
		}

		// Display Improvement Information
		if (hex.tile.improvement) {
			const elImprovement = dom.querySelector('#improvements');
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
			const [firstCorner, ...otherCorners] = tileHex.corners.map(point => GameConfig.lineShift(
				{ x: point.x, y: point.y - tileHex.y + 100 },
				{ x: tileHex.y, y: tileHex.y },
				0.80,
			));

			graphics.moveTo(firstCorner.x, firstCorner.y);
			otherCorners.forEach(({x, y}) => {
				graphics.lineTo(x, y);
			});
			graphics.closePath();
			graphics.fill();

			// Render improvement image to the canvas
			const img = this.textures.get(`improvements.${hex.tile.improvement.key}`).getSourceImage();
			const x = (canvas.width - img.width) / 2 - 2;
			const y = (canvas.height - img.height) / 2;
			canvas.drawFrame(`improvements.${hex.tile.improvement.key}`, null, x, y);

			// Place canvas into HTML
			canvas.refresh();
			elImprovement.appendChild(elCanvas);

			// Add improvement name
			const div = document.createElement('div');
			div.classList.add('name');
			div.innerHTML = hex.tile.improvement.title;
			elImprovement.appendChild(div);
			console.log('Sam, improvement:', hex.tile.improvement);
		}

		if (hex.tile.laborers instanceof Set) {
			const elLaborers = dom.querySelector('#laborers');
			hex.tile.laborers.forEach((laborer) => {
				displayImageInHTML({
					imageKey: `laborers.${laborer.type}`,
					htmlElementId: 'laborers',
					scene: this,
				});
			});
		} else {
			console.log('Sam, no laborers set…');
		}

		// Show Tile View
		dom.removeAttribute('hidden');

		this.inputManager = new InputManager(this);

		this.events.on('sleep', () => {
			dom.setAttribute('hidden', true);
			dom.querySelectorAll('div').forEach((div) => div.innerHTML = '');
			this.scene.wake('mainGameScene');
			this.inputManager.disableKeyboardInput();
		}).on('shutdown', () => {
			dom.setAttribute('hidden', true);
			dom.querySelectorAll('div').forEach((div) => div.innerHTML = '');
			this.scene.wake('mainGameScene');
		});
	},
	update() {
	},
}
