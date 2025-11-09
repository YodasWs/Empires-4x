import World from '../../../json/world.mjs';

import Faction from './Faction.mjs';
import * as Hex from './Hex.mjs';

export default class Movable {
	#base = World.StandardMovable;
	#deleted = false;
	#faction
	#hex
	#moveIterator = null;
	#moves = 0;
	#path = [];

	constructor({ base, hex, faction }) {
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

	get moves() {
		return this.#moves;
	}
	set moves(val) {
		if (!Number.isInteger(val) || val < 0) {
			throw new TypeError('Movable.moves expects to be assigned a nonnegative integer!');
		}
		this.#moves = val;
	}

	activate() {
		this.moves = this.#base.movementPoints;

		// Continue on path
		if (Array.isArray(this.#path) && this.#path.length > 0) {
			this.#moveIterator = this.#PathGenerator();
			return;
		}

		this.#moveIterator = null;
	}

	destroy() {
		this.moves = 0;
		this.#path = [];
		this.deleted = true;
		this.#moveIterator = null;
	}

	async *#PathGenerator() {
		while (this.#path.length > 0) {
			const nextHex = this.#path[0];
			const cost = Hex.MovementCost(this, nextHex);
			if (this.#moves < cost) {
				this.deactivate(true);
				break;
			}
			this.#moves -= cost
			this.#hex = nextHex;
			this.#path.shift();
			yield;
		}
	}

	setPath(targetHex) {
		if (!Hex.isHex(targetHex)) {
			throw new TypeError('Movable.setPath expects to be assigned a Hex!');
		}

		const path = Hex.FindPath(this.#hex, hex, this);
		if (!Array.isArray(path) || path.length === 0) {
			// TODO: Warn User no path was found
			console.warn('Sam, no path found!');
			return;
		}
		if (Array.isArray(path) && path.length > 0) {
			this.#path = path;
			return this.#moveIterator = this.#PathGenerator();
		}
	}

	moveOneStep() {
		if (this.#moveIterator !== null) {
			const result = this.#moveIterator.next();
			if (result.done) {
				this.#moveIterator = null;
			}
		}
	}
}
Movable.isInstanceofMovable = function isInstanceofMovable(movable) {
	return movable instanceof Movable;
}
Movable.isActivatableMovable = function isActivatableMovable(movable) {
	return Movable.isInstanceofMovable(movable) && movable.deleted === false;
}
Movable.isMovableCanMove = function isMovableCanMove(movable) {
	return Movable.isActivatableMovable(movable) && movable.moves > 0;
}
