import {InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import {Dataset} from "./DatasetUtils";
import {directionalOrder, isOrderedByXKey, mkeyOrderUp, skeyOrderUp} from "./OrderUtils";
import {handleFilter} from "./WhereUtils";
import {createMapKey, getKeyInsightResultValue, groupInsightResult} from "./ColumnTransformationsUtils";

/*
*
* Process Query Util (POST-VALIDATION)
*
*/

const parseSectionsDatasetKey = (key: string, id: string): string => {
	if (key === id + "_avg") {
		return "Avg";
	} else if (key === id + "_pass") {
		return "Pass";
	} else if (key === id + "_fail") {
		return "Fail";
	} else if (key === id + "_audit") {
		return "Audit";
	} else if (key === id + "_year") {
		return "Year";
	} else if (key === id + "_dept") {
		return "Subject";
	} else if (key === id + "_id") {
		return "Course";
	} else if (key === id + "_instructor") {
		return "Professor";
	} else if (key === id + "_title") {
		return "Title";
	} else if (key === id + "_uuid") {
		return "id";
	} else {
		throw new InsightError("Invalid dataset key cannot be parsed");
	}
};

const parseRoomsDatasetKey = (key: string): string => {
	const roomKeys = ["lat", "lon", "seats", "fullname", "shortname", "number", "name", "address", "type", "furniture",
		"href"];
	if (!roomKeys.includes(key.split("_")[1])) {
		throw new InsightError("Invalid dataset key cannot be parsed");
	}
	return key.split("_")[1];
};

const parseDatasetKey = (key: string, insight: InsightDataset): string => {
	const datasetKind = insight.kind;
	if (datasetKind === InsightDatasetKind.Sections) {
		return parseSectionsDatasetKey(key, insight.id);
	} else { // InsightDatasetKind.Rooms
		return parseRoomsDatasetKey(key);
	}
};

const handleWhere = (data: any, query: any, insight: InsightDataset): boolean => {
	const where = query.WHERE;
	let result = true;

	if (Object.keys(where).length === 0) {
		return result;
	}

	result = handleFilter(data, where, insight);

	return result;
};

const handleColumns = (data: any, query: any, insight: InsightDataset): InsightResult => {
	const columns = query.OPTIONS.COLUMNS;
	let result: InsightResult = {};

	for (const column of columns) {
		result[column] = getKeyInsightResultValue(column, insight, data);
	}
	return result;
};

const handleTransformations = (dataset: any, query: any, insight: InsightDataset): InsightResult[] => {
	const columnKeys = query.OPTIONS.COLUMNS;
	const groupKeys = query.TRANSFORMATIONS.GROUP;
	const applyRules = query.TRANSFORMATIONS.APPLY;
	let groups = new Map();
	let result: InsightResult[] = [];

	for(const data of dataset) {
		let mapKey = createMapKey(data, groupKeys, insight);
		if (!groups.has(mapKey)) {
			groups.set(mapKey, []);
		}
		groups.get(mapKey).push(data);
	}

	groups.forEach((group) => {
		result.push(groupInsightResult(group, groupKeys, applyRules, columnKeys, insight));
	});

	return result;
};

const handleOrder = (unorderedQueryResult: any[], query: any): InsightResult[] => {
	let queryResult: InsightResult[];
	const order = query.OPTIONS.ORDER;
	let applyRules = [];
	let mkeys = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
	let skeys = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name", "address",
		"type", "furniture", "href"];

	if (query.TRANSFORMATIONS !== undefined) {
		applyRules = query.TRANSFORMATIONS.APPLY;
	}
	for (const applyRule of applyRules) {
		const applyKey = Object.keys(applyRule)[0];
		const applyOperand = Object.values(applyRule[applyKey])[0];

		if (typeof applyOperand === "string" && mkeys.includes(applyOperand.split("_")[1])) {
			mkeys.push(applyKey);
		} else {
			skeys.push(applyKey);
		}
	}

	if (order === undefined) {
		queryResult = unorderedQueryResult;
	} else if (typeof order === "string" && isOrderedByXKey(mkeys, order)) {
		queryResult = unorderedQueryResult.sort((insightResA, insightResB) => {
			return mkeyOrderUp(insightResA, insightResB, order);
		});
	} else if (typeof order === "string" && isOrderedByXKey(skeys, order)) {
		queryResult = unorderedQueryResult.sort((insightResA, insightResB) => {
			return skeyOrderUp(insightResA, insightResB, order);
		});
	} else if (typeof order === "object") {
		queryResult = unorderedQueryResult.sort((insightResA, insightResB) => {
			return directionalOrder(insightResA, insightResB, order, mkeys, skeys);
		});
	} else {
		throw new InsightError("Invalid dataset key in ORDER");
	}
	return queryResult;
};

const getQueryDatasetID = (query: any): string => {
	let columns: string[] = query.OPTIONS.COLUMNS;
	let queryDatasetID = "";
	for (const column of columns) {
		if (column.includes("_")) {
			queryDatasetID = column.split("_", 1)[0];
		}
	}
	if (queryDatasetID === "" && query.TRANSFORMATIONS !== undefined) {
		queryDatasetID = query.TRANSFORMATIONS.GROUP[0].split("_", 1)[0];
	}
	return queryDatasetID;
};

const getQueryResult = (queryDataset: Dataset, query: any): InsightResult[] => {
	const datasetInsight = queryDataset.insight;
	let filtered = queryDataset.data.filter((data: any) => handleWhere(data, query, datasetInsight));
	let unordered: InsightResult[];
	if (query.TRANSFORMATIONS !== undefined) {
		unordered = handleTransformations(filtered, query, datasetInsight);
	} else {
		unordered = filtered.map((data: any) => handleColumns(data, query, datasetInsight));
	}
	return handleOrder(unordered, query);
};

export {getQueryDatasetID, handleWhere, handleColumns, handleOrder, getQueryResult, parseDatasetKey};
