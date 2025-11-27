import { depths as Depths } from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

const goodsSprites = new Map(); // key: Goods instance → GoodsViewDetail
const GoodsSpriteOptions = {
	ease: 'Linear',
	duration: 1000,
	yoyo: false,
};

class GoodsViewDetail {
	#position
	#scene
	#sprite

	constructor(goods, scene) {
		this.#position = { x: goods.hex.x, y: goods.hex.y };
		this.#scene = scene;
		this.#sprite = scene.add.sprite(this.#position.x, this.#position.y, `goods.${goods.goodsType}`)
			.setDepth(Depths.goods);
	}

	get scene() {
		return this.#scene;
	}

	get sprite() {
		return this.#sprite;
	}

	get x() {
		return this.#position.x;
	}
	get y() {
		return this.#position.y;
	}

	update(hex) {
		this.#position.x = hex.x;
		this.#position.y = hex.y;
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
			const promise = moveGoodsSprite(goods, goods.hex);
			detail.update(goods.hex);
			promise.then(() => {
				currentGame.events.emit('goods-moved', { goods, promise });
			});
		}

		detail.sprite.setVisible(true);
	});
}

function moveGoodsSprite(goods, targetHex) {
	const detail = goodsSprites.get(goods);
	if (!detail) return;

	return new Promise((resolve) => {
		detail.scene.tweens.add({
			targets: detail.sprite,
			x: targetHex.x,
			y: targetHex.y,
			ease: 'Quad.out',
			duration: 800,
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
