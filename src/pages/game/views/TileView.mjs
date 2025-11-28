import * as Honeycomb from 'honeycomb-grid';
import * as Hex from '../modules/Hex.mjs';
import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

const fogOfWarTints = {
	visible: 0xFFFFFF, // No tint
	explored: 0x7F7F7F, // Gray tint
	unexplored: 0x000000, // Black tint
};
const fogOfWarMaps = new Map(); // key: Faction instance, value: Map of Hex instance → fog state
export class FogOfWar {
	static startTileFogState(faction, hex) {
		if (!fogOfWarMaps.has(faction)) {
			fogOfWarMaps.set(faction, new Map());
		}
		const factionFogMap = fogOfWarMaps.get(faction);
		factionFogMap.set(hex, 'unexplored');
		hex.sprite.setTint(fogOfWarTints[factionFogMap.get(hex)])
			.setDepth(GameConfig.depths.unexplored);
	}

	static exploreTileForFaction(faction, hex) {
		if (!fogOfWarMaps.has(faction)) {
			fogOfWarMaps.set(faction, new Map());
		}
		const factionFogMap = fogOfWarMaps.get(faction);
		factionFogMap.set(hex, 'explored');
		hex.sprite.setTint(fogOfWarTints[factionFogMap.get(hex)])
			.setDepth(GameConfig.depths.map)
			.setInteractive(
				new Phaser.Geom.Polygon(hex.corners),
				Phaser.Geom.Polygon.Contains
			);
	}

	static viewTileForFaction(faction, hex) {
		if (!fogOfWarMaps.has(faction)) {
			fogOfWarMaps.set(faction, new Map());
		}
		const factionFogMap = fogOfWarMaps.get(faction);
		factionFogMap.set(hex, 'visible');
		hex.sprite.setTint(fogOfWarTints[factionFogMap.get(hex)])
			.setDepth(GameConfig.depths.map)
			.setInteractive(
				new Phaser.Geom.Polygon(hex.corners),
				Phaser.Geom.Polygon.Contains
			);
	}
}

export function setTileVisibility() {
	currentGame.players[0].units.forEach((unit) => {
		if (unit.deleted) return;
		Hex.Grid.traverse(Honeycomb.spiral({
			start: unit.hex,
			radius: unit.sightDistance,
		})).forEach((hex) => {
			if (!Hex.isHex(hex)) return;
			FogOfWar.viewTileForFaction(unit.faction, hex);
		});
	});
}

function removeTileVisibility(unit, priorHex = unit.hex) {
	if (unit.faction.index !== 0) return;
	Hex.Grid.traverse(Honeycomb.spiral({
		start: priorHex,
		radius: unit.sightDistance,
	})).forEach((hex) => {
		if (!Hex.isHex(hex)) return;
		FogOfWar.exploreTileForFaction(unit.faction, hex);
	});
}
currentGame.events.on('unit-destroyed', (evt) => {
	removeTileVisibility(evt.detail.unit);
	setTileVisibility();
});

currentGame.events.on('unit-moving', (evt) => {
	const { unit, priorHex } = evt.detail;
	if (unit.faction.index !== 0) return;
	removeTileVisibility(unit, priorHex);
	setTileVisibility();
});

// Display Improvement on the Tile (or do that in ImprovementView.mjs?)
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
