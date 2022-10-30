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

const checkKeysLength = (obj: object, objName: string, expectedNumKeys: number): void => {
	let keyOrKeys = " keys";
	if (expectedNumKeys === 1) {
		keyOrKeys = " key";
	}
	if (Object.keys(obj).length !== expectedNumKeys) {
		throw new InsightError(objName + " should only have " + expectedNumKeys + keyOrKeys);
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
	const isValidMKey = key.match(/^[^_]+_(avg|pass|fail|audit|year|lat|lon|seats)$/g) !== null;
	const isValidSKey = key.match(/^[^_]+_(dept|id|instructor|title|uuid)$/g) !== null;
	const isValidRoomKey = key.match(/^room_(fullname|shortname|number|name|address|type|furniture|href)$/g) !== null;
	if (type === "mkey") {
		return isValidMKey;
	} else if (type === "skey") {
		return isValidSKey;
	}
	return isValidSKey || isValidMKey || isValidRoomKey;
};

const isValidApplyKey = (applyKey: any): boolean => {
	if (typeof applyKey === "string") {
		return applyKey.match(/^[^_]+$/g) !== null;
	}
	return false;
};

const isValidAnyKey = (anyKey: any): boolean => {
	return isValidKey(anyKey) || isValidApplyKey(anyKey);
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

	checkNonEmptyArray(options.COLUMNS, "COLUMNS"); // pushes apply keys but checks dataset for keys
	for (const column of options.COLUMNS) {
		if (!isValidAnyKey(column)) {
			throw new InsightError("Invalid key " + column + " in COLUMNS");
		}
		if (isValidKey(column) && currDataset === "") {
			currDataset = column.split("_", 1)[0];
		} else if (isValidKey(column) && column.split("_", 1)[0] !== currDataset) {
			throw new InsightError("Queries should only reference one dataset");
		}
		columns.push(column);
	}
	return columns;
};

const validateOrderKey = (order: string, columns: string[]): void => {
	if (!columns.includes(order)) {
		throw new InsightError("ORDER must be in COLUMNS");
	}
};

const validateOrderObj = (order: any, columns: string[]): void => {
	const expectedNumKeys = 2;
	checkKeysLength(order, "ORDER", expectedNumKeys);

	if (order.dir === undefined) {
		throw new InsightError("ORDER missing 'dir' key");
	} else if (order.dir !== "UP" || order.dir !== "DOWN") {
		throw new InsightError("Invalid ORDER direction");
	}

	if (order.keys === undefined) {
		throw new InsightError("ORDER missing 'keys' key");
	}
	checkNonEmptyArray(order.keys, "ORDER keys");
	for (const key of order.keys) {
		validateOrderKey(key, columns);
	}
};

const validateOrder = (options: any, columns: string[]): void => {
	const order = options.ORDER;
	if (isValidAnyKey(order)) {
		validateOrderKey(order, columns);
	} else if (isExistingObject(order, "ORDER")) {
		validateOrderObj(order, columns);
	} else {
		throw new InsightError("Invalid key " + options.ORDER + " in COLUMNS");
	}
};

const validateOptions = (options: any): string[] => {
	const numOptionKeys = Object.keys(options).length;
	const maxOptionKeys = 2;
	let columns: string[] = [];

	// Validate COLUMNS
	if (numOptionKeys === 0 || options.COLUMNS === undefined) {
		throw new InsightError("OPTIONS missing COLUMNS");
	} else if (numOptionKeys <= maxOptionKeys) {
		columns = validateColumns(options);
	} else {
		throw new InsightError("OPTIONS has too many keys");
	}

	// Validate Possible ORDER
	if (numOptionKeys === maxOptionKeys && options.ORDER === undefined) {
		throw new InsightError("Invalid key in OPTIONS");
	} else if (numOptionKeys === maxOptionKeys) {
		validateOrder(options, columns);
	}

	return columns;
};

const validateQuery = (query: any): void => {
	let expectedNumKeys = 2;
	let columns: string[];

	// Validate Syntax
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
	columns = validateOptions(query.OPTIONS);

	// Validate Syntax - TRANSFORMATIONS Block
	if (isExistingObject(query.TRANSFORMATIONS, "TRANSFORMATIONS")) {
		expectedNumKeys = 3;
		// TODO: validateTransformations (uses columns)
	}

	checkKeysLength(query, "Query", expectedNumKeys);
};

export {validateQuery};
