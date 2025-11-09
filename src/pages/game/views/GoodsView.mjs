import { depths as Depths } from '../modules/Config.mjs';

const goodsSprites = new Map(); // key: Goods instance, value: Phaser.Sprite
const GoodsSpriteOptions = {
	ease: 'Linear',
	duration: 1000,
	yoyo: false,
};

export function renderGoods(goods, scene) {
	// TODO: Defensive checks?
	if (!goodsSprites.has(goods)) {
		goodsSprites.set(goods, scene.add.sprite(goods.hex.x, goods.hex.y, `goods.${goods.type}`).setDepth(Depths.goods));
	}
	const sprite = goodsSprites.get(goods);
	scene.tweens.add({
		targets: sprite,
		x: goods.hex.x,
		y: goods.hex.y,
		...GoodsSpriteOptions,
		onComplete(tween) {
			sprite.setVisible(goods.num > 0);
			tween.destroy();
		},
	});
}

export function removeGoods(goods) {
	const sprite = goodsSprites.get(goods);
	if (sprite) {
		sprite.destroy();
		goodsSprites.delete(goods);
	}
}
