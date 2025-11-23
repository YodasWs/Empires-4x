import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

const unitSprites = new Map(); // key: Unit instance → UnitViewDetail

class UnitViewDetail {
	#position
	#scene
	#sprite

	constructor(unit, scene) {
		this.#position = { x: unit.hex.x, y: unit.hex.y };
		this.#scene = scene;
		this.#sprite = scene.add.sprite(this.#position.x, this.#position.y, `unit.${unit.unitType}`)
			.setTint(0x383838)
			.setDepth(GameConfig.depths.inactiveUnits);
		this.#sprite.setScale(GameConfig.unitWidth / this.#sprite.width);
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

export function registerUnitToView(unit, scene) {
	if (!unitSprites.has(unit)) {
		unitSprites.set(unit, new UnitViewDetail(unit, scene));
	}
	return unitSprites.has(unit);
}

export function renderUnits() {
	unitSprites.forEach((detail, unit) => {
		if (unit.deleted) {
			destroyUnitSprite(unit);
			return;
		}

		if (detail.x !== unit.hex.x || detail.y !== unit.hex.y) {
			const promise = moveUnitSprite(unit, unit.hex);
			detail.update(unit.hex);
			promise.then(() => {
				console.log('Sam, emitting unit-moved');
				currentGame.events.emit('unit-moved', { unit, promise });
			});
		}

		detail.sprite.setVisible(true);

		if (currentGame.activeUnit === unit) {
			detail.sprite.setTint(0xffffff).setDepth(GameConfig.depths.activeUnit);
		} else {
			detail.sprite.setTint(0x383838).setDepth(GameConfig.depths.inactiveUnits);
		}
	});
}

function moveUnitSprite(unit, targetHex) {
	const detail = unitSprites.get(unit);
	if (!detail) return;

	return new Promise((resolve) => {
		currentGame.events.emit('unit-moving', { unit });
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

export function destroyUnitSprite(unit) {
	if (!unitSprites.has(unit)) {
		return;
	}
	const detail = unitSprites.get(unit);
	detail.sprite.setVisible(false);
	detail.sprite.destroy();
	unitSprites.delete(unit);
}
