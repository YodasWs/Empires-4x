import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';

export default {
	key: 'tile-view',
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
}
