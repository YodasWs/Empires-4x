const scale = 0.5;
const tileWidth = 200;
const actionSprites = {
	moveU: { src: 'img/actions/moveU.png', key: 'u' },
	moveI: { src: 'img/actions/moveI.png', key: 'i' },
	moveO: { src: 'img/actions/moveO.png', key: 'o' },
	moveJ: { src: 'img/actions/moveJ.png', key: 'j' },
	moveK: { src: 'img/actions/moveK.png', key: 'k' },
	moveL: { src: 'img/actions/moveL.png', key: 'l' },
};
const config = {
	type: Phaser.AUTO,
	height: 600,
	width: 800,
	scene: {
		preload() {
			// Load Images
			Object.entries(json.world.terrains).forEach(([key, terrain]) => {
				this.load.image('tile.' + key, 'img/tiles/' + terrain.tile + '.png');
			});
			this.load.image('activeUnit', 'img/activeUnit.png');
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				this.load.image(action, sprite.src);
			});
		},
		create() {
			json.world.world.forEach((row, i) => {
				row.forEach((tile, j) => {
					const { x, y } = getCoords(i, j);
					Object.assign(tile, {
						sprite: this.add.tileSprite(x, y, tileWidth, tileWidth, 'tile.' + tile.terrain).setScale(scale),
						text: this.add.text(x - tileWidth / 2 * scale, y + tileWidth / 2 / 3, i + '×' + j, {
							fixedWidth: tileWidth,
							font: '12pt Courier',
							align: 'center',
							color: 'white',
						}).setOrigin(0).setScale(scale),
					});
				});
			});
		},
		update() {
		},
	},
};

function getTileX(row, col) {
	if (!col && col !== 0) return -300;
	return col * tileWidth * 74 / 100 * scale + tileWidth / 10;
}
function getTileY(row, col) {
	if ((!row && row !== 0) || (!col && col !== 0)) return -300;
	return row * tileWidth * 86 / 100 * scale + (col % 2 ? tileWidth * 86 / 100 * scale / 2 : 0);
}
function getCoords(row, col) {
	return {
		x: getTileX(row, col),
		y: getTileY(row, col),
	};
}

yodasws.page('pageGame').setRoute({
	template: 'pages/game/game.html',
	canonicalRoute: '/game/',
	route: '/game/?',
}).on('load', () => {
	console.log('Sam, json:', json);
	// TODO: Build World Map
	const game = new Phaser.Game(Object.assign({}, config, {
		parent: document.querySelector('main'),
	}));
});
