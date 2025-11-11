import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

const unitSprites = new Map(); // key: Unit instance → Phaser.Sprite

export function renderUnit(unit, scene) {
	if (unit.deleted) {
		destroyUnitSprite(unit);
		return;
	}

	if (!unitSprites.has(unit)) {
		const sprite = scene.add.sprite(unit.hex.x, unit.hex.y, `unit.${unit.unitType}`)
			.setTint(0x383838)
			.setDepth(GameConfig.depths.inactiveUnits);
		sprite.setScale(GameConfig.unitWidth / sprite.width);
		unitSprites.set(unit, sprite);
	}
	const sprite = unitSprites.get(unit);

	sprite.setVisible(true);

	if (currentGame.activeUnit === unit) {
		sprite.setTint(0xffffff).setDepth(GameConfig.depths.activeUnit);
	} else {
		sprite.setTint(0x383838).setDepth(GameConfig.depths.inactiveUnits);
	}
}

export function moveUnitSprite(unit, targetHex, scene) {
	const sprite = unitSprites.get(unit);
	if (!sprite) return;

	return new Promise((resolve) => {
		scene.tweens.add({
			targets: sprite,
			x: targetHex.x,
			y: targetHex.y,
			ease: 'Quad.inOut',
			duration: 800,
			yoyo: false,
			onComplete: () => resolve(),
		});
	});
}

export function destroyUnitSprite(unit) {
	if (!unitSprites.has(unit)) {
		return;
	}
	const sprite = unitSprites.get(unit);
	sprite.setVisible(false);
	sprite.destroy();
	unitSprites.delete(unit);
}
