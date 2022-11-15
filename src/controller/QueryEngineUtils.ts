import {InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import {Dataset} from "./DatasetUtils";
import {directionalOrder, mkeyOrderUp, skeyOrderUp} from "./OrderUtils";

/*
*
* Process Query Util (POST-VALIDATION)
*
*/

const getQueryDatasetID = (query: any): string => {
	return query.OPTIONS.COLUMNS[0].split("_", 1)[0];
};

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

const handleMCompare = (data: any, mComparison: any, insight: InsightDataset, comp: "GT" | "EQ" | "LT"): boolean => {
	const mkey = Object.keys(mComparison)[0];
	const dataKey = parseDatasetKey(mkey, insight);
	let dataValue: number;
	if (dataKey === "Year" && data.Section === "overall") {
		dataValue = 1900;
	} else {
		dataValue = data[dataKey];
	}

	if (comp === "GT") {
		return dataValue > mComparison[mkey];
	} else if (comp === "EQ") {
		return dataValue === mComparison[mkey];
	} else { // "LT"
		return dataValue < mComparison[mkey];
	}
};

const handleSCompare = (data: any, sComparison: any, insight: InsightDataset): boolean => {
	const skey = Object.keys(sComparison)[0];
	const inputString = sComparison[skey];
	const dataKey = parseDatasetKey(skey, insight);
	if (!(typeof inputString === "string")) {
		throw new InsightError("IS input string must be a string");
	}
	const inputNoAsterisk = inputString.replaceAll("*", "");
	const startsWithAsterisk = inputString.startsWith("*");
	const endsWithAsterisk = inputString.endsWith("*");

	if (startsWithAsterisk && endsWithAsterisk) {
		return data[dataKey].includes(inputNoAsterisk);
	} else if (startsWithAsterisk) {
		return data[dataKey].endsWith(inputNoAsterisk);
	} else if (endsWithAsterisk) {
		return data[dataKey].startsWith(inputNoAsterisk);
	} else {
		return data[dataKey] === sComparison[skey];
	}
};

const handleNegation = (data: any, negatedFilter: any, insight: InsightDataset): boolean => {
	return !handleFilter(data, negatedFilter, insight);
};

const handleLogic = (data: any, logicFilters: any, insight: InsightDataset, logic: "AND" | "OR"): boolean => {
	let result = true;
	if (logic === "AND") {
		for (const logicFilter of logicFilters) {
			result = result && handleFilter(data, logicFilter, insight);
		}
	} else if (logic === "OR") {
		result = false;
		for (const logicFilter of logicFilters) {
			result = result || handleFilter(data, logicFilter, insight);
		}
	} else {
		throw new InsightError("Invalid Logic Used");
	}

	return result;
};

const handleFilter = (data: any, filter: any, insight: InsightDataset): boolean => {
	if (filter.GT !== undefined) {
		return handleMCompare(data, filter.GT, insight, "GT");
	} else if (filter.EQ !== undefined) {
		return handleMCompare(data, filter.EQ, insight, "EQ");
	} else if (filter.LT !== undefined) {
		return handleMCompare(data, filter.LT, insight, "LT");
	} else if (filter.IS !== undefined) {
		return handleSCompare(data, filter.IS, insight);
	} else if (filter.NOT !== undefined) {
		return handleNegation(data, filter.NOT, insight);
	} else if (filter.AND !== undefined) {
		return handleLogic(data, filter.AND, insight, "AND");
	} else { // OR
		return handleLogic(data, filter.OR, insight, "OR");
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

const getKeyInsightResultValue = (column: any, insight: InsightDataset, data: any): any => {
	const dataKey = parseDatasetKey(column, insight);
	if (dataKey === "Year" && data.Section === "overall") {
		return 1900;
	} else if (dataKey === "Year") {
		return Number(data[dataKey]);
	} else if (dataKey === "id") {
		return data[dataKey].toString();
	} else {
		return data[dataKey];
	}
};

const handleColumns = (data: any, query: any, insight: InsightDataset): InsightResult => {
	const columns = query.OPTIONS.COLUMNS;
	let result: InsightResult = {};

	for (const column of columns) {
		result[column] = getKeyInsightResultValue(column, insight, data);
	}
	return result;
};

const createMapKey = (data: any, groupKeys: string[], insight: InsightDataset): string => {
	let mapKey = "";
	for(const groupKey of groupKeys) {
		mapKey = mapKey + " " + data[parseDatasetKey(groupKey, insight)].toString();
	}
	return mapKey;
};

const groupInsightResult = (group: any, groupKeys: any, applyRules: any, insight: InsightDataset): InsightResult => {
	let insightResult: InsightResult = {};

	for (const groupKey of groupKeys) {
		insightResult[groupKey] = getKeyInsightResultValue(groupKey, insight, group[0]);
	}

	// TODO applyRule handling (parseDatasetKey when retrieving data from section/room for operation)

	return insightResult;
};

const handleTransformations = (dataset: any, transformations: any, insight: InsightDataset): InsightResult[] => {
	const groupKeys = transformations.GROUP;
	const applyRules = transformations.APPLY;
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
		result.push(groupInsightResult(group, groupKeys, applyRules, insight));
	});

	return result;
};

const handleOrder = (unorderedQueryResult: any[], query: any): InsightResult[] => {
	let queryResult: InsightResult[];
	const order = query.OPTIONS.ORDER;
	let mkeys = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
	let skeys = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name", "address",
		"type", "furniture", "href"];
	// TODO applyKey handling

	if (order === undefined) {
		queryResult = unorderedQueryResult;
	} else if (typeof order === "string" && mkeys.includes(order.split("_")[1])) {
		queryResult = unorderedQueryResult.sort((insightResA, insightResB) => {
			return mkeyOrderUp(insightResA, insightResB, order);
		});
	} else if (typeof order === "string" && skeys.includes(order.split("_")[1])) {
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

const getQueryResult = (queryDataset: Dataset, query: any): InsightResult[] => {
	const datasetInsight = queryDataset.insight;
	let filtered = queryDataset.data.filter((data: any) => handleWhere(data, query, datasetInsight));
	let unordered: InsightResult[];
	if (query.TRANSFORMATIONS !== undefined) {
		unordered = handleTransformations(filtered, query.TRANSFORMATIONS, datasetInsight);
	} else {
		unordered = filtered.map((data: any) => handleColumns(data, query, datasetInsight));
	}
	return handleOrder(unordered, query);
};

export {getQueryDatasetID, handleWhere, handleColumns, handleOrder, getQueryResult};
