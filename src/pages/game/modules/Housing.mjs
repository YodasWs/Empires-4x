import * as Hex from './Hex.mjs';

export default class Housing {
	#hex;
	#laborers = new Set();
	#numUnits;

	constructor({
		hex,
		numUnits = 1,
	}) {
		if (!Hex.isHex(hex)) {
			throw new TypeError('Housing expects to be assigned object instance of Hex!');
		}
		this.#hex = hex;
		this.#numUnits = numUnits;
	}

	get hex() {
		return this.#hex;
	}

	get laborers() {
		return this.#laborers;
	}
	set laborers(val) {
		if (!Laborer.isLaborer(val)) {
			throw new TypeError('City.laborers expects to be assigned object instance of Laborer!');
		}
		if (this.#laborers.size >= this.#numUnits) {
			throw new Error('Housing.laborers cannot exceed numUnits!');
		}
		laborers.add(val);
	}

	get numUnits() {
		return this.#numUnits;
	}
}
