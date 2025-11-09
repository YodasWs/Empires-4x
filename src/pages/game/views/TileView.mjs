// TODO: Fog-of-war implementation
// TODO: Display Improvement on the Tile (or do that in ImprovementView.mjs?)

const improvementSprites = new Map(); // key: Tile instance, value: Phaser.Sprite

export function renderImprovement(tile, scene) {
	const key = tile.improvement?.key;
	if (!key) return;

	if (!improvementSprites.has(tile)) {
		const sprite = scene.add.image(tile.hex.x, tile.hex.y, `improvements.${key}`)
			.setDepth(GameConfig.depths.improvement);
		improvementSprites.set(tile, sprite);
	}
}

export function removeImprovement(tile) {
	const sprite = improvementSprites.get(tile);
	if (sprite) {
		sprite.destroy();
		improvementSprites.delete(tile);
	}
}
