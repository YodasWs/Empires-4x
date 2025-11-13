import * as GameConfig from '../modules/Config.mjs';

import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import { currentGame } from '../modules/Game.mjs';

const sceneKey = 'mainControls';

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


		this.game.events.emit(`scene-created-${sceneKey}`);
	},
	update() {
	},
};
