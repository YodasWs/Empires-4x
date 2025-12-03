import { depths as Depths } from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';
import { FogOfWar } from './TileView.mjs';
import * as Hex from '../modules/Hex.mjs';

const goodsSprites = new Map(); // key: Goods instance → GoodsViewDetail
const GoodsSpriteOptions = {
	ease: 'Linear',
	duration: 1000,
	yoyo: false,
};

class GoodsViewDetail {
	#hex
	#scene
	#sprite

	constructor(goods, scene) {
		this.#hex = goods.hex;
		this.#scene = scene;
		this.#sprite = scene.add.sprite(this.#hex.x, this.#hex.y, `goods.${goods.goodsType}`)
			.setDepth(Depths.goods);
		this.#sprite.setVisible(FogOfWar.isHexVisible(currentGame.players[0], goods.hex));
	}

	get hex() {
		return this.#hex;
	}

	get scene() {
		return this.#scene;
	}

	get sprite() {
		return this.#sprite;
	}

	get x() {
		return this.#hex.x;
	}
	get y() {
		return this.#hex.y;
	}

	update(hex) {
		if (Hex.isHex(hex)) {
			this.#hex = hex;
		}
	}
}

export function registerGoodsToView(goods, scene) {
	if (!goodsSprites.has(goods)) {
		goodsSprites.set(goods, new GoodsViewDetail(goods, scene));
	}
	return goodsSprites.has(goods);
}

export function renderGoods() {
	goodsSprites.forEach((detail, goods) => {
		if (goods.deleted) {
			destroyGoodsSprite(goods);
			return;
		}

		if (detail.x !== goods.hex.x || detail.y !== goods.hex.y) {
			const promise = moveGoodsSprite(goods, detail.hex);
			detail.update(goods.hex);
			promise.then(() => {
				currentGame.events.emit('goods-moved', { goods, promise });
			});
		}
	});
}

currentGame.events.on('hex-visible', (evt) => {
	const { hex } = evt.detail;
	goodsSprites.forEach((detail, goods) => {
		if (detail.hex === hex) detail.sprite.setVisible(true);
	});
});

currentGame.events.on('hex-hidden', (evt) => {
	const { hex } = evt.detail;
	goodsSprites.forEach((detail, goods) => {
		if (detail.hex === hex) detail.sprite.setVisible(false);
	});
});

function moveGoodsSprite(goods, oldHex) {
	const detail = goodsSprites.get(goods);
	if (!detail) return;

	const duration = 800;

	const oldVisible = FogOfWar.isHexVisible(currentGame.players[0], oldHex);
	const newVisible = FogOfWar.isHexVisible(currentGame.players[0], goods.hex);

	if (!oldVisible && !newVisible) {
		detail.sprite.setX(goods.hex.x).setY(goods.hex.y).setVisible(false);
		return Promise.resolve();
	}

	if (oldVisible && !newVisible) {
		detail.sprite.setVisible(true);
		return new Promise((resolve) => {
			detail.scene.tweens.add({
				targets: detail.sprite,
				x: (goods.hex.x + oldHex.x) / 2,
				y: (goods.hex.y + oldHex.y) / 2,
				ease: 'Quad.out',
				duration: duration / 2,
				yoyo: false,
				onComplete(tween) {
					detail.sprite.setX(goods.hex.x).setY(goods.hex.y).setVisible(false);
					tween.destroy();
					resolve();
				},
			});
		});
	}

	if (!oldVisible && newVisible) {
		return new Promise((resolve) => {
			detail.sprite.setX((goods.hex.x + oldHex.x) / 2).setY((goods.hex.y + oldHex.y) / 2).setVisible(false);
			setTimeout(resolve, duration / 2);
		}).then(() => {
			detail.sprite.setVisible(true);
			return new Promise((resolve) => {
				detail.scene.tweens.add({
					targets: detail.sprite,
					x: goods.hex.x,
					y: goods.hex.y,
					ease: 'Linear',
					duration: duration / 2,
					yoyo: false,
					onComplete(tween) {
						tween.destroy();
						resolve();
					},
				});
			});
		});
	}

	return new Promise((resolve) => {
		detail.sprite.setVisible(true);
		detail.scene.tweens.add({
			targets: detail.sprite,
			x: goods.hex.x,
			y: goods.hex.y,
			ease: 'Quad.out',
			duration,
			yoyo: false,
			onComplete(tween) {
				tween.destroy();
				resolve();
			},
		});
	});
}

export function destroyGoodsSprite(goods) {
	if (!goodsSprites.has(goods)) {
		return;
	}
	const detail = goodsSprites.get(goods);
	detail.sprite.setVisible(false);
	detail.sprite.destroy();
	goodsSprites.delete(goods);
}
