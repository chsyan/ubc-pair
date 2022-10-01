import {InsightError} from "./IInsightFacade";

const isExistingObject = (maybeObj: any, maybeObjName: string): boolean => {
	if (maybeObj === undefined) {
		return false;
	}
	if (typeof maybeObj !== "object") {
		throw new InsightError(maybeObjName + " must be an object");
	}
	return true;
};

const numberKeyChecker = (obj: object, objName: string, expectedKeys: number): void => {
	let keyOrKeys = " keys";
	if (expectedKeys === 1) {
		keyOrKeys = " key";
	}
	if (Object.keys(obj).length !== expectedKeys) {
		throw new InsightError(objName + " should only have " + expectedKeys + keyOrKeys);
	}
};

const validateFilter = (filter: any, name: string): void => {
	numberKeyChecker(filter, name, 1);
	if (isExistingObject(filter.LT, "LT") ||
			isExistingObject(filter.EQ, "EQ") ||
			isExistingObject(filter.GT, "GT")) {
		const mComparator = Object.keys(filter)[0];
		numberKeyChecker(filter[mComparator], mComparator, 1);
		const mKey = Object.keys(filter[mComparator])[0];
		if (!mKey.match(/^[^_]+_(avg|pass|fail|audit|year)$/g) || typeof filter[mComparator][mKey] !== "number") {
			throw new InsightError("invalid mkey or value used in " + mComparator);
		}
	} else if (isExistingObject(filter.IS, "IS")) {
		numberKeyChecker(filter.IS, "IS", 1);
		const sKey = Object.keys(filter.IS)[0];
		let invalidIsString = typeof filter.IS[sKey] !== "string" ||
				!filter.IS[sKey].match(/^\*?[^*]*\*?$/g);
		if (!sKey.match(/^[^_]+_(dept|id|instructor|title|uuid)$/g) || invalidIsString) {
			throw new InsightError("invalid skey or value used");
		}
	} else if (isExistingObject(filter.NOT, "NOT")) {
		validateFilter(filter.NOT, "NOT");
	} else if (isExistingObject(filter.OR, "OR") || isExistingObject(filter.AND, "AND")) {
		const logic = Object.keys(filter)[0];
		if(!Array.isArray(filter[logic]) || filter[logic].length === 0) {
			throw new InsightError(logic + " must be a non-empty array");
		}
		for (const logicFilter of filter[logic]) {
			validateFilter(logicFilter, "Filters in " + logic);
		}
	} else {
		throw new InsightError("Invalid filter key");
	}
};

const validateQuery = (query: any): void => {
		// Validate Syntax
	if (Object.keys(query).length !== 2) {
		throw new InsightError("query should only have 2 keys");
	}
	numberKeyChecker(query, "Query", 2);
	if (!isExistingObject(query.WHERE, "WHERE")) {
		throw new InsightError("query missing WHERE");
	}
	if (!isExistingObject(query.OPTIONS, "OPTIONS")) {
		throw new InsightError("query missing OPTIONS");
	}
		// Validate Syntax - WHERE Block
	if (Object.keys(query.WHERE).length !== 0) {
		validateFilter(query.WHERE, "WHERE");
	}

		// TODO: Validate Syntax - OPTIONS Block

		// TODO: Validate Semantic
};

export {validateQuery};
