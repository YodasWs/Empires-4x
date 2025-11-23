import World from '../../../json/world.mjs';
import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';

import City from '../modules/City.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import { currentGame } from '../modules/Game.mjs';

import InputManager from '../modules/InputManager.mjs';

let thisCity = null;
let domProductionQueue = null;

function hideProductionQueue() {
	if (domProductionQueue) {
		domProductionQueue.setAttribute('hidden', 'true');
		domProductionQueue.innerHTML = '';
	}
}

export default {
	key: 'city-view',
	preload() {
	},
	create(data) {
		if (!Hex.isHex(data.hex) || !Tile.isTile(data.hex.tile) || !City.isCity(data.hex.city)) {
			this.scene.resume('mainGameScene');
			return;
		}
		this.scene.pause('mainGameScene');
		this.scene.moveAbove('mainControls', 'city-view');
		const windowConfig = GameConfig.getWindowConfig();

		thisCity = data.hex.city;
		domProductionQueue ??= document.getElementById('production-queue');

		{
			domProductionQueue.innerHTML = '';
			const select = document.createElement('select');
			{
				const option = document.createElement('option');
				option.text = '-- Select Unit Type --';
				option.value = '';
				select.appendChild(option);
			}
			Object.keys(World.units).forEach((unitKey) => {
				const option = document.createElement('option');
				option.value = unitKey;
				option.text = World.units[unitKey].name;
				select.appendChild(option);
			});
			domProductionQueue.appendChild(select);

			const button = document.createElement('button');
			button.innerText = 'Add to Queue';
			button.addEventListener('click', () => {
				thisCity.addToQueue({
					faction: currentGame.currentPlayer,
					unitType: select.options[select.selectedIndex].value,
				});
			});
			button.disabled = true;
			domProductionQueue.appendChild(button);

			select.addEventListener('change', () => {
				button.disabled = select.options[select.selectedIndex].value === '';
			});

			domProductionQueue.appendChild(document.createElement('ul'));

			domProductionQueue.removeAttribute('hidden');
			domProductionQueue.style.zIndex = 1;
		}

		// Start building graphics scene
		{
			// Lay black background
			const graphics = this.add.graphics({ x: 0, y: 0 }).setDepth(0);
			graphics.fillStyle(0x000000, 0.5);
			graphics.fillRect(0, 0, windowConfig.width, windowConfig.height);
		}
		const graphics = this.add.graphics({ x: 0, y: 0 }).setDepth(1);

		// Close button
		graphics.fillStyle(0x000000, 1);
		graphics.fillRect(windowConfig.width - 100, 0, 100, 100);
		this.add.text(windowConfig.width - 100, 0, '× ', {
			fixedWidth: 100,
			fixedHeight: 100,
			font: '60pt Trebuchet MS',
			align: 'right',
			color: 'white',
			stroke: 'black',
			strokeThickness: 7,
		}).setDepth(2).setInteractive().on('pointerdown', () => {
			this.scene.stop('city-view');
		});

		// Important constants for translating city tiles locations
		const [offsetX, offsetY] = [data.hex.x, data.hex.y];
		// TODO: Need to either make sure tiles fit in screen or that user can pan camera

		const tileScale = Math.min(windowConfig.height, windowConfig.width) / 7 / GameConfig.tileWidth;
		const center = {
			x: windowConfig.width / 2,
			y: windowConfig.height / 3,
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

		this.inputManager = new InputManager(this);

		this.events.on('sleep', () => {
			hideProductionQueue();
			this.scene.wake('mainGameScene');
		}).on('shutdown', () => {
			hideProductionQueue();
			this.scene.wake('mainGameScene');
		});
	},
	update() {
		const queueList = document.querySelector('#production-queue > ul');
		if (queueList.querySelectorAll('li').length !== thisCity.queue.length) {
			queueList.innerHTML = '';
			thisCity.queue.forEach(({ faction, unitType }) => {
				const listItem = document.createElement('li');
				listItem.innerText = `${faction.name}: ${World.units[unitType].name}`;
				queueList.appendChild(listItem);
			});
		}
	},
}
