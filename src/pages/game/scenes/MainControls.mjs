import * as GameConfig from '../modules/Config.mjs';

export default {
	preload() {
		this.load.image('coins', `img/resources/coins.png`);
	},
	create() {
		const graphics = currentGame.graphics.mainControls = this.add.graphics({ x: 0, y: 0 });
		let lineY = 15;

		// Round and Current Turn Player's Name
		{
			currentGame.uiDisplays.round = this.add.text(14, lineY, `Round ${currentGame.turn}`, {
				fontFamily: 'Trebuchet MS',
				fontSize: '28px',
				color: 'white',
				stroke: 'black',
				strokeThickness: 5,
				maxLines: 1,
			});
			currentGame.uiDisplays.faction = this.add.text(14 + currentGame.uiDisplays.round.displayWidth + 10, lineY + 2, '', {
				fontFamily: 'Trebuchet MS',
				fontSize: '26px',
				color: 'white',
				stroke: 'black',
				strokeThickness: 5,
				maxLines: 1,
			});
			lineY += currentGame.uiDisplays.faction.displayHeight + 5;
		}

		// Money
		{
			lineY -= 15;
			const img = this.add.image(0, lineY, 'coins').setDepth(2);
			img.setScale(32 / img.width);
			img.x = 20 + img.displayWidth / 2;
			img.y = lineY += 20 + img.displayHeight / 2;
			currentGame.uiDisplays.money = this.add.text(img.x + img.displayWidth / 2 + 6, img.y - img.displayHeight / 2 - 4, currentGame.players[0].money.toLocaleString('en-Us'), {
				fontFamily: 'Trebuchet MS',
				fontSize: '28px',
				color: 'gold',
				stroke: 'black',
				strokeThickness: 5,
				maxLines: 1,
			}).setLetterSpacing(1);
			lineY += currentGame.uiDisplays.money.displayHeight;
		}

		graphics.fillStyle(0x000000, 0.5);
		graphics.fillRect(0, 0, GameConfig.getWindowConfig().width, lineY);

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
				case 'F1':
					// TODO: Help
					break;
				case 'F2':
					// TODO: Remove all layers, return to main map
					currentGame.graphics.gfxClaims.destroy();
					break;
				case 'F3': {
					break;
					const graphics = currentGame.graphics.gfxClaims = currentGame.scenes.getScene('mainGameScene').add.graphics({ x: 0, y: 0 }).setDepth(GameConfig.depths.territoryLines - 1);
					// Show territorial claims
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
		});
	},
	update() {
	},
};
