import {InsightError} from "./IInsightFacade";

/*
*
* Validate Query Util
*
*/

const isExistingObject = (maybeObj: any, objName: string): boolean => {
	if (maybeObj === undefined) {
		return false;
	}
	if (typeof maybeObj !== "object") {
		throw new InsightError(objName + " must be an object");
	}
	return true;
};

const checkKeysLength = (obj: object, objName: string, expectedKeys: number): void => {
	let keyOrKeys = " keys";
	if (expectedKeys === 1) {
		keyOrKeys = " key";
	}
	if (Object.keys(obj).length !== expectedKeys) {
		throw new InsightError(objName + " should only have " + expectedKeys + keyOrKeys);
	}
};

const checkNonEmptyArray = (arr: any, key: string): void => {
	if (!Array.isArray(arr) || arr.length === 0) {
		throw new InsightError(key + " must be a non-empty array");
	}
};

const isValidKey = (key: any, type?: "mkey" | "skey"): boolean => {
	if (typeof key !== "string") {
		return false;
	}
	const isValidMKey = key.match(/^[^_]+_(avg|pass|fail|audit|year)$/g) !== null;
	const isValidSKey = key.match(/^[^_]+_(dept|id|instructor|title|uuid)$/g) !== null;
	if (type === "mkey") {
		return isValidMKey;
	} else if (type === "skey") {
		return isValidSKey;
	}
	return isValidSKey || isValidMKey;
};

const validateMCompare = (filter: any, mComparator: string): void => {
	checkKeysLength(filter[mComparator], mComparator, 1);
	const mKey = Object.keys(filter[mComparator])[0];
	if (!isValidKey(mKey, "mkey") || typeof filter[mComparator][mKey] !== "number") {
		throw new InsightError("invalid mkey or value used in " + mComparator);
	}
};

const validateSCompare = (filter: any): void => {
	checkKeysLength(filter.IS, "IS", 1);
	const sKey = Object.keys(filter.IS)[0];
	let invalidIsString = typeof filter.IS[sKey] !== "string" || !filter.IS[sKey].match(/^\*?[^*]*\*?$/g);
	if (!isValidKey(sKey, "skey") || invalidIsString) {
		throw new InsightError("invalid skey or value used");
	}
};

const validateLogic = (filter: any, logic: string): void => {
	checkNonEmptyArray(filter[logic], logic);
	for (const logicFilter of filter[logic]) {
		validateFilter(logicFilter, "Filters in " + logic);
	}
};

const validateFilter = (filter: any, name: string): void => {
	checkKeysLength(filter, name, 1);
	if (isExistingObject(filter.LT, "LT") || isExistingObject(filter.EQ, "EQ") || isExistingObject(filter.GT, "GT")) {
		validateMCompare(filter, Object.keys(filter)[0]);
	} else if (isExistingObject(filter.IS, "IS")) {
		validateSCompare(filter);
	} else if (isExistingObject(filter.NOT, "NOT")) {
		validateFilter(filter.NOT, "NOT");
	} else if (filter.OR !== undefined || filter.AND !== undefined) {
		validateLogic(filter, Object.keys(filter)[0]);
	} else {
		throw new InsightError("Invalid filter key");
	}
};

const validateColumns = (options: any): string[] => {
	let currDataset = "";
	let columns: string[] = [];

	checkNonEmptyArray(options.COLUMNS, "COLUMNS");
	for (const column of options.COLUMNS) {
		if (!isValidKey(column)) {
			throw new InsightError("Invalid key " + column + " in COLUMNS");
		}
		if (currDataset === "" && typeof column === "string") {
			currDataset = column.split("_", 1)[0];
		} else if (typeof column === "string" && column.split("_", 1)[0] !== currDataset) {
			throw new InsightError("Queries should only reference one dataset");
		}
		columns.push(column);
	}
	return columns;
};

const validateOrder = (options: any, numOptionKeys: number, columns: string[]): void => {
	if (numOptionKeys === 2 && options.ORDER === undefined) {
		throw new InsightError("Invalid key in OPTIONS");
	} else if (numOptionKeys === 2 && !isValidKey(options.ORDER)) {
		throw new InsightError("Invalid key " + options.ORDER + " in COLUMNS");
	} else if (numOptionKeys === 2 && !columns.includes(options.ORDER)) {
		throw new InsightError("ORDER must be in COLUMNS");
	}
};

const validateOptions = (options: any): void => {
	const numOptionKeys = Object.keys(options).length;
	let columns: string[] = [];

	// Validate COLUMNS
	if (numOptionKeys === 0 || options.COLUMNS === undefined) {
		throw new InsightError("OPTIONS missing COLUMNS");
	} else if (numOptionKeys <= 2) {
		columns = validateColumns(options);
	} else {
		throw new InsightError("OPTIONS has too many keys");
	}

	// Validate Possible ORDER
	validateOrder(options, numOptionKeys, columns);
};

const validateQuery = (query: any): void => {
	// Validate Syntax
	if (Object.keys(query).length !== 2) {
		throw new InsightError("query should only have 2 keys");
	}
	checkKeysLength(query, "Query", 2);
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

	// Validate Syntax - OPTIONS Block
	validateOptions(query.OPTIONS);
};

export {validateQuery};
