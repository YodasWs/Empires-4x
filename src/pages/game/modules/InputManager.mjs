import { currentGame } from './Game.mjs';

import * as Hex from './Hex.mjs';
import Unit from './Unit.mjs';

export default class InputManager {
	#cursors
	#scene
	#sceneKey
	#shiftKey

    constructor(scene) {
		if (!(scene instanceof globalThis.Phaser.Scene)) {
			throw new Error('InputManager requires a Phaser.Scene instance');
		}

		this.#scene = scene;
		this.#shiftKey = scene.input.keyboard.addKey(globalThis.Phaser.Input.Keyboard.KeyCodes.SHIFT);
		switch (this.#sceneKey = this.#scene.scene.key) {
			case 'city-view':
				this.#listenOnCityViewScene();
				break;
			case 'tile-view':
				this.#listenOnTileViewScene();
				break;
			case 'mainGameScene':
				this.#listenOnMainGameScene();
				break;
		}
	}

	disableKeyboardInput() {
		const kbd = this.#scene.input?.keyboard;
		if (typeof (kbd ?? false) !== 'object') {
			return;
		}
		kbd.enabled = false;
		kbd.removeCapture('SPACE');
		kbd.removeCapture('UP');
		kbd.removeCapture('DOWN');
		kbd.removeCapture('LEFT');
		kbd.removeCapture('RIGHT');
	}

	enableKeyboardInput() {
		const kbd = this.#scene.input?.keyboard;
		if (typeof (kbd ?? false) !== 'object') {
			return;
		}
		kbd.enabled = true;
		switch (this.#sceneKey) {
			case 'mainGameScene':
				this.#cursors = kbd.createCursorKeys();
				break;
		}
	}

	update() {
		switch (this.#sceneKey) {
			case 'mainGameScene':
				const cam = this.#scene.cameras.main;
				const speed = this.#shiftKey.isDown ? 25 : 5;

				if (this.#cursors.left.isDown) {
					cam.scrollX -= speed;
				} else if (this.#cursors.right.isDown) {
					cam.scrollX += speed;
				}

				if (this.#cursors.up.isDown) {
					cam.scrollY -= speed;
				} else if (this.#cursors.down.isDown) {
					cam.scrollY += speed;
				}
				break;
		}
	}

	#listenOnCityViewScene() {
		// Set event listeners
		this.#scene.input.keyboard.on('keydown', (evt) => {
			if (evt.key === 'Escape') {
				this.#scene.scene.stop('city-view');
			}
		});
	}

	#listenOnTileViewScene() {
		document.querySelector('#tile-view').addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});

		// Set event listeners
		this.#scene.input.keyboard.on('keydown', (evt) => {
			if (evt.key === 'Escape') {
				this.#scene.scene.stop('tile-view');
			}
		});

		this.enableKeyboardInput();
	}

	#listenOnMainGameScene() {
		currentGame.domContainer.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});
		this.#scene.input.manager.canvas.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});

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
				case 'q':
					break;
				case 'w':
					currentGame.events.emit('key-pressed', 'wait');
					return;
				case 'e':
					break;
				case 'r':
					break;
				case 't':
					break;
				case 'y':
					break;
				case 'u':
					// Handled below
					break;
				case 'i':
					// Handled below
					break;
				case 'o':
					// Handled below
					break;
				case 'p':
					break;
				case 'a':
					break;
				case 's':
					currentGame.events.emit('key-pressed', 'skip');
					return;
				case 'd':
					break;
				case 'F':
					currentGame.events.emit('key-pressed', 'build-farm');
					break;
				case 'f':
					break;
				case 'g':
					break;
				case 'h':
					break;
				case 'j':
					// Handled below
					break;
				case 'k':
					// Handled below
					break;
				case 'l':
					// Handled below
					break;
				case 'z':
					break;
				case 'x':
					break;
				case 'c':
					break;
				case 'v':
					break;
				case 'b':
					break;
				case 'n':
					break;
				case 'm':
					break;
				case 'Escape':
					currentGame.events.emit('esc-pressed');
					break;
				case 'F1':
					// TODO: Help
					break;
				case 'F2':
					break;
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
			}

			if (['u', 'i', 'o', 'j', 'k', 'l'].includes(evt.key)) {
				if (!Unit.isMovableUnit(currentGame.activeUnit)) return;
				currentGame.activeUnit.doAction(evt.key);
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
			// Treat as click
			if (!isDragging) {
				const hex = Hex.Grid.pointToHex({ x: pointer.worldX, y: pointer.worldY });
				if (Hex.isHex(hex)) {
					currentGame.events.emit('hex-clicked', { hex });
				}
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
