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
		console.log('Sam, tile-view created');
		this.scene.pause('mainGameScene');
		const dom = document.getElementById('tile-view');

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
		console.log('Sam, terrain:', hex.terrain);

		// Display Improvement Information
		if (hex.tile.improvement?.image instanceof Phaser.GameObjects.Image) {
			const elImprovement = dom.querySelector('#improvements');
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

		if (hex.tile.laborers instanceof Set) {
			console.log('Sam, we have a laborers set!', hex.tile.laborers.size);
			const elLaborers = dom.querySelector('#laborers');
			hex.tile.laborers.forEach((laborer) => {
				const img = document.createElement('img');
				img.src = this.textures.get(laborer.sprite).getSourceImage().src;
				elLaborers.appendChild(img);
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
			console.log('Sam, tile-view sleep');
			this.scene.wake('mainGameScene');
			this.inputManager.disableKeyboardInput();
		}).on('shutdown', () => {
			dom.setAttribute('hidden', true);
			dom.querySelectorAll('div').forEach((div) => div.innerHTML = '');
			console.log('Sam, tile-view shutdown');
			this.scene.wake('mainGameScene');
		});
	},
	update() {
	},
}
