import * as Honeycomb from 'honeycomb-grid';
import * as Hex from '../modules/Hex.mjs';
import Faction from '../modules/Faction.mjs';
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
		if (!Faction.isFaction(faction)) {
			throw new TypeError('FogOfWar.startTileFogState expects to be assigned object instance of Faction!');
		}
		if (!Hex.isHex(hex)) {
			throw new TypeError('FogOfWar.startTileFogState expects to be assigned object instance of Hex!');
		}
		if (!fogOfWarMaps.has(faction)) {
			fogOfWarMaps.set(faction, new Map());
		}
		const factionFogMap = fogOfWarMaps.get(faction);
		factionFogMap.set(hex, 'unexplored');
		if (faction.index === 0) {
			hex.sprite.setTint(fogOfWarTints[factionFogMap.get(hex)])
				.setDepth(GameConfig.depths.unexplored);
		}
	}

	static exploreTileForFaction(faction, hex) {
		if (!Faction.isFaction(faction)) {
			throw new TypeError('FogOfWar.exploreTileForFaction expects to be assigned object instance of Faction!');
		}
		if (!Hex.isHex(hex)) {
			throw new TypeError('FogOfWar.exploreTileForFaction expects to be assigned object instance of Hex!');
		}
		if (!fogOfWarMaps.has(faction)) {
			fogOfWarMaps.set(faction, new Map());
		}
		const factionFogMap = fogOfWarMaps.get(faction);
		factionFogMap.set(hex, 'explored');
		if (faction.index === 0) {
			hex.sprite.setTint(fogOfWarTints[factionFogMap.get(hex)])
				.setDepth(GameConfig.depths.map)
				.setInteractive(
					new Phaser.Geom.Polygon(hex.corners),
					Phaser.Geom.Polygon.Contains
				);
			currentGame.events.emit('hex-hidden', { hex });
		}
	}

	static viewTileForFaction(faction, hex) {
		if (!Faction.isFaction(faction)) {
			throw new TypeError('FogOfWar expects to be assigned object instance of Faction!');
		}
		if (!Hex.isHex(hex)) {
			throw new TypeError('FogOfWar expects to be assigned object instance of Hex!');
		}
		if (!fogOfWarMaps.has(faction)) {
			fogOfWarMaps.set(faction, new Map());
		}
		const factionFogMap = fogOfWarMaps.get(faction);
		factionFogMap.set(hex, 'visible');
		if (faction.index === 0) {
			hex.sprite.setTint(fogOfWarTints[factionFogMap.get(hex)])
				.setDepth(GameConfig.depths.map)
				.setInteractive(
					new Phaser.Geom.Polygon(hex.corners),
					Phaser.Geom.Polygon.Contains
				);
			currentGame.events.emit('hex-visible', { hex });
		}
	}

	static isHexVisible(faction, hex) {
		if (!Faction.isFaction(faction)) {
			throw new TypeError('FogOfWar.isHexVisible expects to be assigned object instance of Faction!');
		}
		if (!Hex.isHex(hex)) {
			throw new TypeError('FogOfWar.isHexVisible expects to be assigned object instance of Hex!');
		}
		if (!Hex.isHex(hex)) {
			return false;
		}
		if (!fogOfWarMaps.has(faction)) {
			return false;
		}
		return fogOfWarMaps.get(faction).get(hex) === 'visible';
	}

	static isHexExplored(faction, hex) {
		if (!Faction.isFaction(faction)) {
			throw new TypeError('FogOfWar.isHexExplored expects to be assigned object instance of Faction!');
		}
		if (!Hex.isHex(hex)) {
			throw new TypeError('FogOfWar.isHexExplored expects to be assigned object instance of Hex!');
		}
		if (!Hex.isHex(hex)) {
			return false;
		}
		if (!fogOfWarMaps.has(faction)) {
			return false;
		}
		return fogOfWarMaps.get(faction).get(hex) !== 'unexplored';
	}
}

export function setTileVisibility(Grid = Hex.Grid) {
	currentGame.players[0].units.forEach((unit) => {
		if (unit.deleted) return;
		Grid.traverse(Honeycomb.spiral({
			start: unit.hex,
			radius: unit.sightDistance,
		})).forEach((hex) => {
			if (!Hex.isHex(hex)) return;
			FogOfWar.viewTileForFaction(unit.faction, hex);
		});
	});
}

function removeTileVisibility(unit, priorHex = unit.hex, Grid = Hex.Grid) {
	if (unit.faction.index !== 0) return;
	Grid.traverse(Honeycomb.spiral({
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
	// TODO: Need to show out-of-date information due to Fog of War
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
