import {InsightError} from "./IInsightFacade";

export class QueryValidator {

	constructor() {
		console.log("QueryValidator::init()");
	}

	private isExistingObject(maybeObj: any, maybeObjName: string): boolean {
		if (maybeObj === undefined) {
			return false;
		}
		if (typeof maybeObj !== "object") {
			throw new InsightError(maybeObjName + " must be an object");
		}
		return true;
	}

	private numberKeyChecker(obj: object, objName: string, expectedKeys: number): void {
		let keyOrKeys = " keys";
		if (expectedKeys === 1) {
			keyOrKeys = " key";
		}
		if (Object.keys(obj).length !== expectedKeys) {
			throw new InsightError(objName + " should only have " + expectedKeys + keyOrKeys);
		}
	}

	private validateFilter(filter: any, name: string): void {
		this.numberKeyChecker(filter, name, 1);
		if (this.isExistingObject(filter.LT, "LT") ||
			this.isExistingObject(filter.EQ, "EQ") ||
			this.isExistingObject(filter.GT, "GT")) {
			const mComparator = Object.keys(filter)[0];
			this.numberKeyChecker(filter[mComparator], mComparator, 1);
			const mKey = Object.keys(filter[mComparator])[0];
			if (!mKey.match(/^[^_]+_(avg|pass|fail|audit|year)$/g) || typeof filter[mComparator][mKey] !== "number") {
				throw new InsightError("invalid mkey or value used in " + mComparator);
			}
		} else if (this.isExistingObject(filter.IS, "IS")) {
			this.numberKeyChecker(filter.IS, "IS", 1);
			const sKey = Object.keys(filter.IS)[0];
			let invalidIsString = typeof filter.IS[sKey] !== "string" ||
				!filter.IS[sKey].match(/^\*?[^*]*\*?$/g);
			if (!sKey.match(/^[^_]+_(dept|id|instructor|title|uuid)$/g) || invalidIsString) {
				throw new InsightError("invalid skey or value used");
			}
		} else if (this.isExistingObject(filter.NOT, "NOT")) {
			this.validateFilter(filter.NOT, "NOT");
		} else if (this.isExistingObject(filter.OR, "OR") || this.isExistingObject(filter.AND, "AND")) {
			const logic = Object.keys(filter)[0];
			if(!Array.isArray(filter[logic]) || filter[logic].length === 0) {
				throw new InsightError(logic + " must be a non-empty array");
			}
			for (const logicFilter of filter[logic]) {
				this.validateFilter(logicFilter, "Filters in " + logic);
			}
		} else {
			throw new InsightError("Invalid filter key");
		}
	};

	public validateQuery(query: any): void {
		// Validate Syntax
		if (Object.keys(query).length !== 2) {
			throw new InsightError("query should only have 2 keys");
		}
		this.numberKeyChecker(query, "Query", 2);
		if (!this.isExistingObject(query.WHERE, "WHERE")) {
			throw new InsightError("query missing WHERE");
		}
		if (!this.isExistingObject(query.OPTIONS, "OPTIONS")) {
			throw new InsightError("query missing OPTIONS");
		}
		// Validate Syntax - WHERE Block
		if (Object.keys(query.WHERE).length !== 0) {
			this.validateFilter(query.WHERE, "WHERE");
		}

		// TODO: Validate Syntax - OPTIONS Block

		// TODO: Validate Semantic
	};
}
