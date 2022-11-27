const tileWidth = 200;

const actionSprites = (() => {
	const deltaX = tileWidth * (Math.sqrt(3) - 1);
	const deltaY = tileWidth * (2 * Math.sqrt(2) - 2);
	const halfTile = tileWidth / 2;
	const polygonPoints = [
		{ x: -2, y: 0 },
		{ x: -1, y: 0 - Math.sqrt(3) },
		{ x: 1, y: 0 - Math.sqrt(3) },
		{ x: 2, y: 0 },
		{ x: 1, y: Math.sqrt(3) },
		{ x: -1, y: Math.sqrt(3) },
	].map((point) => ({
		x: point.x * tileWidth / 4 + 150,
		y: point.y * tileWidth / 4 + 150,
	}));
	return {
		moveU: {
			src: 'img/actions/moveU.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x - deltaX,
				y: point.y - deltaY / 2,
			})),
			key: 'u',
		},
		moveI: {
			src: 'img/actions/moveI.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x,
				y: point.y - deltaY,
			})),
			key: 'i',
		},
		moveO: {
			src: 'img/actions/moveO.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x + deltaX,
				y: point.y - deltaY / 2,
			})),
			key: 'o',
		},
		moveJ: {
			src: 'img/actions/moveJ.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x - deltaX,
				y: point.y + deltaY / 2,
			})),
			key: 'j',
		},
		moveK: {
			src: 'img/actions/moveK.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x,
				y: point.y + deltaY,
			})),
			key: 'k',
		},
		moveL: {
			src: 'img/actions/moveL.png',
			polygon: polygonPoints.map((point) => ({
				x: point.x + deltaX,
				y: point.y + deltaY / 2,
			})),
			key: 'l',
		},
	};
})();
const players = [
	new Player(),
];

const activeUnitDepth = 100;

const currentGame = {
	players,
	turn: 0,
	activeUnit: null,
	currentPlayer: null,
	sprActiveUnit: null,
	startRound() {
		this.startTurn(0);
	},
	startTurn(player) {
		if (!Number.isFinite(player)) {
			throw new TypeError(`Unknown player ${player}`);
		}
		this.currentPlayer = this.players[player];
		if (!(this.currentPlayer instanceof Player)) {
			throw new TypeError(`Player ${player} is not a Player Object`);
		}
		// Reset each unit's movement points
		this.currentPlayer.units.forEach((unit) => {
			unit.moves = unit.base.movementPoints;
		});
		// Activate first unit
		this.currentPlayer.units[0].activate();
	},
	endTurn() {
	},
	endRound() {
	},
};

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
		value(unitType, row, col, game) {
			this.units.push(new Unit(unitType, row, col, game));
		},
	},
});

function actionTileCoordinates(action, row, col) {
	switch (action) {
		case 'moveU':
			if (col % 2 == 0) row--;
			col--;
			break;
		case 'moveI':
			row--;
			break;
		case 'moveO':
			if (col % 2 == 0) row--;
			col++;
			break;
		case 'moveJ':
			if (col % 2 == 1) row++;
			col--;
			break;
		case 'moveK':
			row++;
			break;
		case 'moveL':
			if (col % 2 == 1) row++;
			col++;
			break;
	}
	return [row, col];
}

function Unit(unitType, row, col, game) {
	// Check unitType exists
	const base = json.world.units[unitType];
	if (typeof base !== 'object' || base === null) {
		throw new TypeError(`Unknown unit '${unitType}'`);
	}
	// Add sprite
	const { x, y } = getCoords(row, col);
	const sprite = game.add.sprite(x, y, `unit.${unitType}`);
	// Define properties
	Object.defineProperties(this, {
		base: {
			enumerable: true,
			get: () => base,
		},
		sprite: {
			enumerable: true,
			get: () => sprite,
		},
		col: {
			enumerable: true,
			get: () => col,
			set(val) {
				if (0 <= val && col <= board.cols) col = val;
			},
		},
		row: {
			enumerable: true,
			get: () => row,
			set(val) {
				if (0 <= val && row <= board.rows) row = val;
			},
		},
	});
}
Object.assign(Unit.prototype, {
	activate() {
		const { x, y } = getCoords(this.row, this.col);
		this.sprite.setDepth(activeUnitDepth);
		currentGame.sprActiveUnit.setPosition(x, y).setDepth(activeUnitDepth - 1);
		Object.entries(actionSprites).forEach(([action, sprite]) => {
			const [row, col] = actionTileCoordinates(action, this.row, this.col);
			if (isLegalMove(this, row, col)) {
				const { x, y } = getCoords(this.row, this.col);
				sprite.img.setPosition(x, y).setDepth(activeUnitDepth - 2);
			} else {
				sprite.img.setPosition(-300, -300).setDepth(0);
			}
		});
		currentGame.activeUnit = this;
	},
	deactivate() {
		currentGame.sprActiveUnit.setPosition(-300, -300).setDepth(0);
		Object.entries(actionSprites).forEach(([action, sprite]) => {
			sprite.img.setPosition(-300, -300).setDepth(0);
		});
		currentGame.activeUnit = null;
	},
	move(action) {
		const [row, col] = actionTileCoordinates(action, this.row, this.col);
		if (!isLegalMove(this, row, col)) {
			throw new Error('Tried to make illegal move!');
		}
		this.row = row;
		this.col = col;
		const { x, y } = getCoords(this.row, this.col);
		this.sprite.setPosition(x, y).setDepth(1);
		const target = json.world.world[row][col];
		this.moves -= this.base.movementCosts[target.terrain];
		if (this.moves > 0) {
			this.activate();
		} else {
			this.deactivate();
		}
	},
});

function doAction(action) {
	if (currentGame.currentPlayer !== players[0]) {
		throw new Error('This is not the player\'s turn!');
	}
	switch (action) {
		case 'moveU':
		case 'moveI':
		case 'moveO':
		case 'moveJ':
		case 'moveK':
		case 'moveL':
			console.log('Sam, doAction, activeUnit:', currentGame.activeUnit);
			currentGame.activeUnit.move(action);
			break;
	}
}

function isLegalMove(unit, row, col) {
	// Check Board Bounds
	if (row < 0 || col < 0) return false;
	if (row > board.rows || col > board.cols) return false;
	let tileUnits;

	// Grab Target Tile
	if (!Array.isArray(json.world.world[row])) return false;
	const target = json.world.world[row][col];
	if (typeof target !== 'object' || target === null) return false;

	// TODO: Check move into City
	switch (target.city) {
	}

	// TODO: Check for battle
	// const tileUnits = grabUnitsOnTile(row, col);
	if (false) {
		if (unit.attack == 0) return false;
		if (units[tileUnits[0]].faction == 'britton' && unit.faction == 'roman') return false;
	}
	console.log('Sam, isLegalMove, unit:', unit);

	// Check movement into terrain
	const movementCost = unit.base.movementCosts[target.terrain];
	if (!Number.isFinite(movementCost)) return false;
	if (movementCost <= unit.moves) return true;
	return false;
}

const board = {
	rows: 0,
	cols: 0,
};

const config = {
	type: Phaser.AUTO,
	height: 1200,
	width: 1600,
	zoom: 0.8,
	backgroundColor: '#71ABFF',
	scene: {
		preload() {
			// Load World Tile Images
			Object.entries(json.world.terrains).forEach(([key, terrain]) => {
				this.load.image(`tile.${key}`, `img/tiles/${terrain.tile}.png`);
			});
			// Load images for player's action
			this.load.image('activeUnit', 'img/activeUnit.png');
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				this.load.image(action, sprite.src);
			});
			// Load Unit Images
			Object.keys(json.world.units).forEach((unit) => {
				this.load.image(`unit.${unit}`, `img/units/${unit}.png`);
			});
		},
		create() {
			// Place Game Board Tiles
			json.world.world.forEach((row, i) => {
				board.rows = Math.max(board.rows, i);
				row.forEach((tile, j) => {
					board.cols = Math.max(board.cols, i);
					const { x, y } = getCoords(i, j);
					Object.assign(tile, {
						sprite: this.add.image(x, y, `tile.${tile.terrain}`),
						text: this.add.text(x - tileWidth / 2, y + tileWidth / 2 / 3, i + '×' + j, {
							fixedWidth: tileWidth,
							font: '12pt Trebuchet MS',
							align: 'center',
							color: 'white',
						}).setOrigin(0),
					});
				});
			});
			// Add Game Sprites and Images
			currentGame.sprActiveUnit = this.add.image(-300, -300, 'activeUnit');
			Object.entries(actionSprites).forEach(([action, sprite]) => {
				sprite.img = this.add.image(-300, -300, action);
				sprite.img.setInteractive(
					new Phaser.Geom.Polygon(sprite.polygon),
					Phaser.Geom.Polygon.Contains,
				).on('pointerdown', () => {
					console.log('Sam, pointerdown on', action);
					doAction(action);
				});
			});

			// TODO: Build Starting Players and Units
			players[0].addUnit('warrior', Math.floor(Math.random() * 2 + 1), Math.floor(Math.random() + 1), this);
			console.log('Sam, players:', players);
			console.log('Sam, unit 1:', players[0].units[0]);

			currentGame.startRound();
		},
		update() {
		},
	},
};

const [ getTileX, getTileY ] = (() => {
	const deltaX = tileWidth * (Math.sqrt(3) - 1);
	const deltaY = tileWidth * (2 * Math.sqrt(2) - 2);
	const halfTile = tileWidth / 2;
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
	const game = new Phaser.Game(Object.assign({}, config, {
		parent: document.querySelector('main'),
	}));
});
