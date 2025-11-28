import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import './modules/Actions.mjs';
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
import './views/ActionsView.mjs';

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
		type: Phaser.AUTO,
		...GameConfig.getWindowConfig(),
		zoom: GameConfig.scale,
		backgroundColor: '#000000',
		scene: {
			key: 'title-screen',
			preload() {
			},
			create() {
			},
			update() {
			},
		},
		parent: document.querySelector('main'),
		dom: {
			createContainer: true,
		},
	});

	Promise.all(Object.values(Scenes).map((scene) => {
		game.scene.add(scene.key, scene, scene.autoStart || false);
		if (scene.autoStart) {
			return new Promise((resolve) => {
				game.events.once(`scene-created-${scene.key}`, resolve);
			});
		}
		return true;
	})).then(() => {
		currentGame.events.emit('phaser-ready');
	}).then(() => {
		game.scene.moveAbove('mainGameScene', 'mainControls');
		if (game.scene.isActive('mainGameScene') && game.scene.isActive('mainControls')) {
			currentGame.startRound();
		}
	});

	Object.assign(currentGame, {
		scenes: game.scene,
		domContainer: game.domContainer,
	});
	game.domContainer.classList.add('game');
});
