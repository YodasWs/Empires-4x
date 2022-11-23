const scale = 1;
const tileWidth = 200;
const actionSprites = {
	moveU: { src: 'img/actions/moveU.png', key: 'u' },
	moveI: { src: 'img/actions/moveI.png', key: 'i' },
	moveO: { src: 'img/actions/moveO.png', key: 'o' },
	moveJ: { src: 'img/actions/moveJ.png', key: 'j' },
	moveK: { src: 'img/actions/moveK.png', key: 'k' },
	moveL: { src: 'img/actions/moveL.png', key: 'l' },
};
let cursors = null;
const players = [
	new Player(),
];

function Player() {
	const units = [];
	Object.defineProperties(this, {
		units: {
			get: () => units,
		},
	});
}
Object.defineProperties(Player.prototype, {
	addUnit: {
		value(row, col) {
			this.units.push(new Unit(row, col));
		},
	},
});

function Unit(row, col) {
	Object.defineProperties(this, {
		col: {
			enumerable: true,
			get: () => col,
		},
		row: {
			enumerable: true,
			get: () => row,
		},
	});
}

const config = {
	type: Phaser.AUTO,
	height: 1200,
	width: 1600,
	zoom: 0.7,
	backgroundColor: '#71ABFF',
	scene: {
		preload() {
			// Load World Tile Images
			Object.entries(json.world.terrains).forEach(([key, terrain]) => {
				this.load.image('tile.' + key, 'img/tiles/' + terrain.tile + '.png');
			});
			// Load images for player's action
			this.load.image('activeUnit', 'img/activeUnit.png');
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				this.load.image(action, sprite.src);
			});
		},
		create() {
			// Place Game Board Tiles
			json.world.world.forEach((row, i) => {
				row.forEach((tile, j) => {
					const { x, y } = getCoords(i, j);
					Object.assign(tile, {
						sprite: this.add.image(x, y, 'tile.' + tile.terrain).setScale(scale),
						text: this.add.text(x - tileWidth / 2 * scale, y + tileWidth / 2 / 3, i + '×' + j, {
							fixedWidth: tileWidth,
							font: '12pt Courier',
							align: 'center',
							color: 'white',
						}).setOrigin(0).setScale(scale),
					});
				});
			});
			players[0].addUnit(1, 1);
			console.log('Sam, players:', players);
		},
		update() {
		},
	},
};

const [ getTileX, getTileY ] = (() => {
	const deltaX = tileWidth * (Math.sqrt(3) - 1) * scale ;
	const deltaY = tileWidth * (2 * Math.sqrt(2) - 2) * scale;
	const halfTile = tileWidth / 2 * scale;
	return [
		function (row, col) {
			if (!col && col !== 0) return -300;
			return col * deltaX + halfTile;
		},
		function (row, col) {
			if ((!row && row !== 0) || (!col && col !== 0)) return -300;
			return row * deltaY + (col % 2 ? deltaY / 2 : 0) + halfTile * Math.sqrt(3) / 2;
		},
	];
})();

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
