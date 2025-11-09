import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import { DoAction, OpenUnitActionMenu } from './modules/Actions.mjs';
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

// A scene function, for example in `create()`
function displayImageInHTML({
	htmlElementId,
	imageKey,
	scene = currentGame.scenes.getScene('mainGameScene'),
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
		backgroundColor: '#71ABFF',
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
