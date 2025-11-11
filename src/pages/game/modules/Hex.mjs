import World from '../../../json/world.mjs';

import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './Config.mjs';

import City from './City.mjs';
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

// Thanks to https://github.com/AlurienFlame/Honeycomb and https://www.redblobgames.com/pathfinding/a-star/introduction.html
export function FindPath(start, end, unit) {
	if (!Movable.isInstanceofMovable(unit)) {
		throw new TypeError('FindPath expects a Movable unit!');
	}
	let openHexes = [];
	let closedHexes = [];
	let explored = 0;
	let foundPath = false;

	// Initialize path
	start.parent = undefined;
	openHexes.push(start);
	start.g_cost = 0;

	while (openHexes.length > 0) {
		// Sort array by f_cost, then by h_cost for hexes with equal f_cost
		const current = openHexes.sort((a, b) => a.f_cost - b.f_cost || a.h_cost - b.h_cost)[0];

		// Check if finished
		if (current === end) {
			foundPath = true;
			break;
		}

		openHexes = openHexes.filter((hex) => current !== hex);
		closedHexes.push(current);

		// Check the neighbors
		Grid.traverse(Honeycomb.ring({
			center: [ current.q, current.r ],
			radius: 1,
		})).forEach((neighbor) => {
			// If checked path already
			if (closedHexes.includes(neighbor)) return;

			// If Unit cannot move here, do not include in path
			if (!IsLegalMove(neighbor, unit)) return;

			// g_cost is movement cost from start
			neighbor.g_cost = current.g_cost + MovementCost(unit, neighbor, current);
			// h_cost is simple distance to end
			neighbor.h_cost = Grid.distance(current, end);
			// f_cost is sum of above two
			neighbor.f_cost = neighbor.g_cost + neighbor.h_cost;

			if (!openHexes.includes(neighbor)) {
				neighbor.parent = current;
				explored++;
				openHexes.push(neighbor);
			}
		});
	}

	if (!foundPath) {
		return;
	}

	// TODO: Return the hexes from end.parent back
	const path = [end];
	let pathHex = end;
	do {
		pathHex = pathHex.parent;
		if (pathHex !== start) {
			path.unshift(pathHex);
		}
	} while (isHex(pathHex?.parent));

	return path;
}

export function isValidPath(path) {
	if (!Array.isArray(path) || path.length === 0 || path.some((hex) => !isHex(hex))) {
		return false;
	}
	for (let i = 1; i < path.length; i++) {
		const prevHex = path[i - 1];
		const currentHex = path[i];
		if (Grid.distance(prevHex, currentHex) !== 1) {
			return false;
		}
	}
	return true;
}

export function IsLegalMove(targetHex, unit) {
	if (!isHex(targetHex)) return false;

	if (unit instanceof Unit) {
		// TODO: Check move into City
		if (targetHex.city instanceof City && targetHex.city.nation !== unit.faction.nation) {
			if (!unit.attack || !unit.attackCities) return false;
		}

		// TODO: Check for battle
		// const tileUnits = grabUnitsOnTile(row, col);
		let tileUnits;
		if (false) {
			if (!unit.attack) return false;
			if (units[tileUnits[0]].index == 'britton' && unit.faction == 'roman') return false;
		}
	}

	// Check movement into terrain
	const moves = MovementCost(unit, targetHex);
	if (!Number.isFinite(moves)) return false;
	return moves <= unit.moves;
}

export function MovementCost(movable, nextHex, thisHex = movable.hex) {
	if (!isHex(nextHex)) {
		return Infinity;
	}
	if (!Movable.isInstanceofMovable(movable)) {
		return Infinity;
	}
	if (nextHex.terrain.isWater && !movable.base.moveOnWater) {
		// Is there a unit override for this terrain movement?
		return movable.base.movementCosts[nextHex.terrain.terrain] ?? Infinity;
	}
	// TODO: Include roads, terrain improvements, etc
	return movable.base.movementCosts[nextHex.terrain.terrain] ?? nextHex.terrain.movementCost ?? Infinity;
}
