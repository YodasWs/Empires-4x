import World from '../../../json/world.mjs';

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';

import City from './City.mjs';
import Goods from './Goods.mjs';
import Movable from './Movable.mjs';
import Unit from './Unit.mjs';

class gameHex extends Honeycomb.defineHex({
	dimensions: GameConfig.tileWidth / 2,
	orientation: Honeycomb.Orientation.FLAT,
	origin: 'topLeft',
}) {
	f_cost
	h_cost
	g_cost
}

export function isHex(hex) {
	return hex instanceof Honeycomb.Hex;
}

export const Grid = new Honeycomb.Grid(gameHex, Honeycomb.rectangle({ width: 15, height: 6 }));

export function isValidPath(path, GridInstance = Grid) {
	if (!Array.isArray(path) || path.length === 0 || path.some((hex) => !isHex(hex))) {
		return false;
	}
	for (let i = 1; i < path.length; i++) {
		const prevHex = path[i - 1];
		const currentHex = path[i];
		if (GridInstance.distance(prevHex, currentHex) !== 1) {
			return false;
		}
	}
	return true;
}

export function IsLegalMove(targetHex, movable) {
	if (!isHex(targetHex)) return false;
	if (!Movable.isInstanceofMovable(movable)) return false;

	if (Unit.isUnit(movable)) {
		// TODO: Check move into City
		if (targetHex.city instanceof City && targetHex.city.nation !== movable.faction.nation) {
			if (!movable.attack || !movable.attackCities) return false;
		}

		// TODO: Check for battle
		// const tileUnits = grabUnitsOnTile(row, col);
		let tileUnits;
		if (false) {
			if (!movable.attack) return false;
			if (units[tileUnits[0]].index == 'britton' && movable.faction == 'roman') return false;
		}
	} else if (Goods.isGoods(movable)) {
		// Uh, what do we need to check? Or is this all handled by MovementCost?
	}

	// Check that Movable has ability to move into terrain
	const moves = MovementCost(movable, targetHex);
	if (!Number.isFinite(moves)) return false;
	return moves <= movable.baseMovementPoints;
}

export function MovementCost(movable, nextHex, thisHex = movable.hex) {
	if (!isHex(nextHex)) {
		return Infinity;
	}
	if (!Movable.isInstanceofMovable(movable)) {
		return Infinity;
	}
	if (nextHex.terrain.isWater && !movable.moveOnWater) {
		// Is there a unit override for this terrain movement?
		return movable.movementCosts[nextHex.terrain.terrain] ?? Infinity;
	}
	// TODO: Include roads, terrain improvements, etc
	return movable.movementCosts[nextHex.terrain.terrain] ?? nextHex.terrain.movementCost ?? Infinity;
}
