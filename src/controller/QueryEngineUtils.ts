import {InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

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

const parseRoomsDatasetKey = (key: string, id: string): string => {
	return ""; // TODO rooms handling
};

const parseDatasetKey = (key: string, insight: InsightDataset): string => {
	const datasetKind = insight.kind;
	if (datasetKind === InsightDatasetKind.Sections) {
		return parseSectionsDatasetKey(key, insight.id);
	} else { // InsightDatasetKind.Rooms
		return parseRoomsDatasetKey(key, insight.id);
	}
};

const handleMCompare = (section: any, mComparison: any, insight: InsightDataset, comp: "GT" | "EQ" | "LT"): boolean => {
	const mkey = Object.keys(mComparison)[0];
	const sectionKey = parseDatasetKey(mkey, insight);
	let sectionValue: number;
	if (sectionKey === "Year" && section.Section === "overall") {
		sectionValue = 1900;
	} else {
		sectionValue = section[sectionKey];
	}

	if (comp === "GT") {
		return sectionValue > mComparison[mkey];
	} else if (comp === "EQ") {
		return sectionValue === mComparison[mkey];
	} else { // "LT"
		return sectionValue < mComparison[mkey];
	}
};

const handleSCompare = (section: any, sComparison: any, insight: InsightDataset): boolean => {
	const skey = Object.keys(sComparison)[0];
	const inputString = sComparison[skey];
	const sectionKey = parseDatasetKey(skey, insight);
	if (!(typeof inputString === "string")) {
		throw new InsightError("IS input string must be a string");
	}
	const inputNoAsterisk = inputString.replaceAll("*", "");
	const startsWithAsterisk = inputString.startsWith("*");
	const endsWithAsterisk = inputString.endsWith("*");

	if (startsWithAsterisk && endsWithAsterisk) {
		return section[sectionKey].includes(inputNoAsterisk);
	} else if (startsWithAsterisk) {
		return section[sectionKey].endsWith(inputNoAsterisk);
	} else if (endsWithAsterisk) {
		return section[sectionKey].startsWith(inputNoAsterisk);
	} else {
		return section[sectionKey] === sComparison[skey];
	}
};

const handleNegation = (section: any, negatedFilter: any, insight: InsightDataset): boolean => {
	return !handleFilter(section, negatedFilter, insight);
};

const handleLogic = (section: any, logicFilters: any, insight: InsightDataset, logic: "AND" | "OR"): boolean => {
	let result = true;
	if (logic === "AND") {
		for (const logicFilter of logicFilters) {
			result = result && handleFilter(section, logicFilter, insight);
		}
	} else if (logic === "OR") {
		result = false;
		for (const logicFilter of logicFilters) {
			result = result || handleFilter(section, logicFilter, insight);
		}
	} else {
		throw new InsightError("Invalid Logic Used");
	}

	return result;
};

const handleFilter = (section: any, filter: any, insight: InsightDataset): boolean => {
	if (filter.GT !== undefined) {
		return handleMCompare(section, filter.GT, insight, "GT");
	} else if (filter.EQ !== undefined) {
		return handleMCompare(section, filter.EQ, insight, "EQ");
	} else if (filter.LT !== undefined) {
		return handleMCompare(section, filter.LT, insight, "LT");
	} else if (filter.IS !== undefined) {
		return handleSCompare(section, filter.IS, insight);
	} else if (filter.NOT !== undefined) {
		return handleNegation(section, filter.NOT, insight);
	} else if (filter.AND !== undefined) {
		return handleLogic(section, filter.AND, insight, "AND");
	} else { // OR
		return handleLogic(section, filter.OR, insight, "OR");
	}
};

const handleWhere = (section: any, query: any, insight: InsightDataset): boolean => {
	const where = query.WHERE;
	let result = true;

	if (Object.keys(where).length === 0) {
		return result;
	}

	result = handleFilter(section, where, insight);

	return result;
};

const handleColumns = (section: any, query: any, insight: InsightDataset): InsightResult => {
	const columns = query.OPTIONS.COLUMNS;
	let result: InsightResult = {};

	let sectionValue;
	for (const column of columns) {
		const sectionKey = parseDatasetKey(column, insight);
		if (sectionKey === "Year" && section.Section === "overall") {
			sectionValue = 1900;
		} else if (sectionKey === "Year") {
			sectionValue = Number(section[sectionKey]);
		} else if (sectionKey === "id") {
			sectionValue = section[sectionKey].toString();
		} else {
			sectionValue = section[sectionKey];
		}
		result[column] = sectionValue;
	}
	return result;
};

const handleOrder = (unorderedQueryResult: any[], query: any, insight: InsightDataset): InsightResult[] => {
	let queryResult: InsightResult[];
	const order = query.OPTIONS.ORDER;
	const id = insight.id;

	if (order === undefined) {
		queryResult = unorderedQueryResult;
	} else if (order === id + "_avg" ||
		order === id + "_pass" ||
		order === id + "_fail" ||
		order === id + "_audit" ||
		order === id + "_year") {
		queryResult = unorderedQueryResult.sort((insightResA, insightResB) => {
			return insightResA[order] - insightResB[order];
		});
	} else if (order === id + "_dept" ||
		order === id + "_id" ||
		order === id + "_instructor" ||
		order === id + "_title" ||
		order === id + "_uuid") {
		queryResult = unorderedQueryResult.sort((insightResA, insightResB) => {
			if(insightResA[order] < insightResB[order]) {
				return -1;
			} else if (insightResA[order] > insightResB[order]) {
				return 1;
			} else {
				return 0;
			}
		});
	} else {
		throw new InsightError("Invalid dataset key in ORDER");
	}
	return queryResult;
};

export {getQueryDatasetID, handleWhere, handleColumns, handleOrder};
