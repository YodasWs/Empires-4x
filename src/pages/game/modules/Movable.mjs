import World from '../../../json/world.mjs';
import * as Honeycomb from 'honeycomb-grid';

import Faction from './Faction.mjs';
import * as Hex from './Hex.mjs';

// Thanks to https://github.com/AlurienFlame/Honeycomb and https://www.redblobgames.com/pathfinding/a-star/introduction.html
function FindPath(start, end, movable, Grid) {
	if (!Hex.isHex(start)) {
		throw new TypeError('FindPath expects a Hex as start!');
	}
	if (!Hex.isHex(end)) {
		throw new TypeError('FindPath expects a Hex as end!');
	}
	if (!Movable.isInstanceofMovable(movable)) {
		throw new TypeError('FindPath expects a Movable!');
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

			// If Movable cannot move here, do not include in path
			if (!Hex.IsLegalMove(neighbor, movable)) return;

			// g_cost is movement cost from start
			neighbor.g_cost = current.g_cost + Hex.MovementCost(movable, neighbor, current);
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
		return [];
	}

	// TODO: Return the hexes from end.parent back
	const path = [end];
	let pathHex = end;
	do {
		pathHex = pathHex.parent;
		if (pathHex !== start) {
			path.unshift(pathHex);
		}
	} while (Hex.isHex(pathHex?.parent));

	return path;
}

export default class Movable {
	#base = World.StandardMovable;
	#deleted = false;
	#faction
	#hex
	#moveIterator = null;
	#moves = 0;
	#path = [];

	constructor({ base = {}, hex, faction }) {
		if (!Hex.isHex(hex)) {
			throw new TypeError('Movable expects to be assigned a Hex!');
		}

		this.#faction = Faction.isFaction(faction) ? faction : hex.tile.faction;
		this.#hex = hex;
		this.#base = {
			...this.#base,
			...base,
			movementCosts: {
				...this.#base.movementCosts,
				...base.movementCosts,
			},
		};
	}

	get baseMovementPoints() {
		return this.#base.movementPoints;
	}

	get deleted() {
		return this.#deleted;
	}
	set deleted(val) {
		this.#deleted = !!val;
	}

	get faction() {
		return this.#faction;
	}

	get hex() {
		return this.#hex;
	}

	get movementCosts() {
		return this.#base.movementCosts;
	}

	get moveOnWater() {
		return this.#base.moveOnWater || false;
	}

	get moves() {
		return this.#moves;
	}

	get row() {
		return this.#hex.row;
	}
	get col() {
		return this.#hex.col;
	}

	activate() {
		this.#moves = this.#base.movementPoints;

		// TODO: Continue on path
		if (Array.isArray(this.#path) && this.#path.length > 0) {
			this.#moveIterator = this.#FollowPathGenerator();
			return;
		}

		this.#moveIterator = null;
	}

	deactivate(endMoves = false) {
		if (endMoves === true) {
			this.#moves = 0;
		}
	}

	destroy() {
		this.#moves = 0;
		this.#path = [];
		this.deleted = true;
		this.#moveIterator = null;
	}

	prepareForNewTurn() {
		this.#moves = this.#base.movementPoints;
	}

	*#FollowPathGenerator() {
		while (this.#path.length > 0) {
			const nextHex = this.#path[0];
			const cost = Hex.MovementCost(this, nextHex);
			if (this.#moves < cost) {
				this.deactivate(true);
				break;
			}
			this.#moves -= cost
			this.#hex = nextHex;
			yield this.#path.shift();
		}
	}

	setPath(targetHex, Grid = Hex.Grid) {
		if (!Hex.isHex(targetHex)) {
			throw new TypeError('Movable.setPath expects to be assigned a Hex!');
		}

		const path = FindPath(this.#hex, targetHex, this, Grid);
		if (!Hex.isValidPath(path, Grid)) {
			// TODO: Warn User no path was found
			console.warn('Sam, no path found!');
			return this.#moveIterator = null;
		}

		this.#path = path;
		return this.#moveIterator = this.#FollowPathGenerator();
	}

	moveOneStep() {
		if (this.#moveIterator !== null) {
			const result = this.#moveIterator.next();
			this.#hex = result.value;
			if (result.done || this.#path.length <= 0) {
				this.#moveIterator = null;
				if (this.#moves <= 0) {
					this.deactivate(true);
				}
			}
		}
	}

	static isInstanceofMovable(movable) {
		return movable instanceof Movable;
	}
	static isActivatableMovable(movable) {
		return Movable.isInstanceofMovable(movable) && movable.deleted === false;
	}
	static isMovableCanMove(movable) {
		return Movable.isActivatableMovable(movable) && movable.moves > 0;
	}
}
