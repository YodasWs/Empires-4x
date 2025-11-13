import { currentGame } from './Game.mjs';

import * as Hex from './Hex.mjs';
import Unit from './Unit.mjs';

export default class InputManager {
	#scene
	#cursors

    constructor(scene) {
		if (!(scene instanceof globalThis.Phaser.Scene)) {
			throw new Error('InputManager requires a Phaser.Scene instance');
		}

        this.#scene = scene;
        this.#cursors = scene.input.keyboard.createCursorKeys();
		switch (this.#scene.scene.key) {
			case 'mainGameScene':
				this.#listenOnMainGameScene();
				break;
		}
	}

	disableKeyboardInput() {
		if (typeof this.#scene.input?.keyboard?.enabled === 'boolean') {
			this.#scene.input.keyboard.enabled = false;
		}
	}

	enableKeyboardInput() {
		if (typeof this.#scene.input?.keyboard?.enabled === 'boolean') {
			this.#scene.input.keyboard.enabled = true;
		}
	}

	#listenOnMainGameScene() {
		this.#scene.input.keyboard.on('keydown', (evt) => {
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
					// TODO: Move to scenes/MainGame.mjs
					// Show territorial claims
					const graphics = currentGame.graphics.gfxClaims = this.#scene.add.graphics({ x: 0, y: 0 }).setDepth(GameConfig.depths.territoryLines - 1);
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
				case 'ArrowUp':
					this.#scene.cameras.main.scrollY -= 25;
					return;
				case 'ArrowDown':
					this.#scene.cameras.main.scrollY += 25;
					return;
				case 'ArrowLeft':
					this.#scene.cameras.main.scrollX -= 25;
					return;
				case 'ArrowRight':
					this.#scene.cameras.main.scrollX += 25;
					return;
				case 'ContextMenu':
				case ' ':
					if (UnitUtils.isUnit(currentGame.activeUnit)) {
						currentGame.events.emit('open-unit-menu', currentGame.activeUnit.hex);
					}
					return;
			}

			if (['u', 'i', 'o', 'j', 'k', 'l'].includes(evt.key)) {
				if (!Unit.isMovableUnit(currentGame.activeUnit)) return;
				currentGame.activeUnit.doAction(evt.key);
			}
		});

		this.#scene.input.on('pointerup', (pointer) => {
			if (!pointer.isDown) {
				const hex = Hex.Grid.pointToHex({ x: pointer.worldX, y: pointer.worldY });
				scene.events.emit('hex-clicked', hex);
			}
		});

		// Pointer handling: support drag-to-pan (drag) and click-to-open (click)
		let isDragging = false;
		const dragStart = { x: 0, y: 0 };
		const camStart = { x: 0, y: 0 };
		let dragThreshold = 4; // default (pixels)

		this.#scene.input.on('pointerdown', (pointer) => {
			// Record starting positions (screen coords and camera scroll)
			dragStart.x = pointer.x;
			dragStart.y = pointer.y;
			camStart.x = this.#scene.cameras.main.scrollX;
			camStart.y = this.#scene.cameras.main.scrollY;
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

		this.#scene.input.on('pointermove', (pointer) => {
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
				const zoom = this.#scene.cameras.main.zoom || 1;
				this.#scene.cameras.main.setScroll(camStart.x - dx / zoom, camStart.y - dy / zoom);
			}
		});

		this.#scene.input.on('pointerup', (pointer) => {
			if (!isDragging) {
				// Treat as click
				currentGame.events.emit('hex-clicked', Hex.Grid.pointToHex({ x: pointer.worldX, y: pointer.worldY }));
			}
			// Reset drag state
			isDragging = false;
		});

		this.enableKeyboardInput();
    }

    destroy() {
        // Clean up listeners when the scene stops
    }
}
