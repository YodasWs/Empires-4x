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

	async *#FollowPathGenerator() {
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

	setPath(targetHex) {
		if (!Hex.isHex(targetHex)) {
			throw new TypeError('Movable.setPath expects to be assigned a Hex!');
		}

		const path = Hex.FindPath(this.#hex, targetHex, this);
		if (!Hex.isValidPath(path)) {
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
			if (result.done) {
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
