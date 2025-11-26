import * as GameConfig from '../modules/Config.mjs';

import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import { currentGame } from '../modules/Game.mjs';

const sceneKey = 'mainControls';

const uiDisplays = new Map(); // key: display type → Phaser.Text
const imgs = new Map(); // key: resource type → Phaser.Image

export default {
	key: sceneKey,
	autoStart: true,
	preload() {
		this.load.image('coins', `img/resources/coins.png`);
	},
	create() {
		const graphics = currentGame.graphics.mainControls = this.add.graphics({ x: 0, y: 0 });
		let lineY = 15;

		// Round and Current Turn Player's Name
		{
			uiDisplays.set('round', this.add.text(14, lineY, `Round ${currentGame.turn}`, {
				fontFamily: 'Trebuchet MS',
				fontSize: '28px',
				color: 'white',
				stroke: 'black',
				strokeThickness: 5,
				maxLines: 1,
			}));
			uiDisplays.set('faction', this.add.text(14 + uiDisplays.get('round').displayWidth + 10, lineY + 2, '', {
				fontFamily: 'Trebuchet MS',
				fontSize: '26px',
				color: 'white',
				stroke: 'black',
				strokeThickness: 5,
				maxLines: 1,
			}));
			lineY += uiDisplays.get('faction').displayHeight + 5;
		}

		// Money
		{
			lineY -= 15;
			const imgMoney = this.add.image(0, lineY, 'coins').setDepth(2);
			imgMoney.setScale(32 / imgMoney.width);
			imgMoney.x = 20 + imgMoney.displayWidth / 2;
			imgMoney.y = lineY += 20 + imgMoney.displayHeight / 2;
			uiDisplays.set('money', this.add.text(imgMoney.x + imgMoney.displayWidth / 2 + 6, imgMoney.y - imgMoney.displayHeight / 2 - 4, currentGame.players[0].money.toLocaleString('en-Us'), {
				fontFamily: 'Trebuchet MS',
				fontSize: '28px',
				color: 'gold',
				stroke: 'black',
				strokeThickness: 5,
				maxLines: 1,
			}).setLetterSpacing(1));
			imgs.set('money', imgMoney);
			lineY += uiDisplays.get('money').displayHeight;
		}

		graphics.fillStyle(0x000000, 0.5);
		graphics.fillRect(0, 0, GameConfig.getWindowConfig().width, lineY);


		this.game.events.emit(`scene-created-${sceneKey}`);
	},
	update() {
		uiDisplays.forEach((display, key) => {
			switch (key) {
				case 'money': {
					if (display.oldValue === currentGame.players[0].money) return;
					uiDisplays.get('money').setText(currentGame.players[0].money.toLocaleString('en-Us'));
					display.oldValue = currentGame.players[0].money;
					return;
				}
				case 'faction':
					if (!currentGame.currentPlayer) return;
					if (display.oldValue === currentGame.currentPlayer.name) return;
					uiDisplays.get('faction').setText(`${currentGame.currentPlayer.name}'s Turn`)
						.setX(14 + uiDisplays.get('round').displayWidth + 10)
						.setColor(currentGame.currentPlayer.index === 0 ? 'goldenrod' : 'lightgrey');
					return;
				case 'round': {
					if (currentGame.betweenRounds) {
						uiDisplays.get('faction').setX(14 + uiDisplays.get('round').displayWidth + 10)
							.setText('End of Round')
							.setColor('lightgrey');
						return;
						if (display.oldValue === currentGame.turn) return;
						uiDisplays.get('round').setText(`Round ${currentGame.turn}`)
							.setColor('white');
						return;
					}
				}
			}
		});
	},
};
