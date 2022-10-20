import {InsightError, InsightResult} from "./IInsightFacade";

/*
*
* Process Query Util (POST-VALIDATION)
*
*/

const getQueryDatasetID = (query: any): string => {
	return query.OPTIONS.COLUMNS[0].split("_", 1)[0];
};

const parseDatasetKey = (key: string, id: string): string => {
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

const handleMCompare = (section: any, mComparison: any, id: string, comparator: "GT" | "EQ" | "LT"): boolean => {
	const mkey = Object.keys(mComparison)[0];
	const sectionKey = parseDatasetKey(mkey, id);
	let sectionValue: number;
	if (sectionKey === "Year" && section.Section === "overall") {
		sectionValue = 1900;
	} else {
		sectionValue = section[sectionKey];
	}

	if (comparator === "GT") {
		return sectionValue > mComparison[mkey];
	} else if (comparator === "EQ") {
		return sectionValue === mComparison[mkey];
	} else { // "LT"
		return sectionValue < mComparison[mkey];
	}
};

const handleSCompare = (section: any, sComparison: any, id: string): boolean => {
	const skey = Object.keys(sComparison)[0];
	const inputString = sComparison[skey];
	const sectionKey = parseDatasetKey(skey, id);
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

const handleNegation = (section: any, negatedFilter: any, id: string): boolean => {
	return !handleFilter(section, negatedFilter, id);
};

const handleLogic = (section: any, logicFilters: any, id: string, logic: "AND" | "OR"): boolean => {
	let result = true;
	if (logic === "AND") {
		for (const logicFilter of logicFilters) {
			result = result && handleFilter(section, logicFilter, id);
		}
	} else if (logic === "OR") {
		result = false;
		for (const logicFilter of logicFilters) {
			result = result || handleFilter(section, logicFilter, id);
		}
	} else {
		throw new InsightError("Invalid Logic Used");
	}

	return result;
};

const handleFilter = (section: any, filter: any, id: string): boolean => {
	if (filter.GT !== undefined) {
		return handleMCompare(section, filter.GT, id, "GT");
	} else if (filter.EQ !== undefined) {
		return handleMCompare(section, filter.EQ, id, "EQ");
	} else if (filter.LT !== undefined) {
		return handleMCompare(section, filter.LT, id, "LT");
	} else if (filter.IS !== undefined) {
		return handleSCompare(section, filter.IS, id);
	} else if (filter.NOT !== undefined) {
		return handleNegation(section, filter.NOT, id);
	} else if (filter.AND !== undefined) {
		return handleLogic(section, filter.AND, id, "AND");
	} else { // OR
		return handleLogic(section, filter.OR, id, "OR");
	}
};

const handleWhere = (section: any, query: any, id: string): boolean => {
	const where = query.WHERE;
	let result = true;

	if (Object.keys(where).length === 0) {
		return result;
	}

	result = handleFilter(section, where, id);

	return result;
};

const handleColumns = (section: any, query: any, id: string): InsightResult => {
	const columns = query.OPTIONS.COLUMNS;
	let result: InsightResult = {};

	let sectionValue;
	for (const column of columns) {
		const sectionKey = parseDatasetKey(column, id);
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

const handleOrder = (unorderedQueryResult: any[], query: any, id: string): InsightResult[] => {
	let queryResult: InsightResult[];
	const order = query.OPTIONS.ORDER;

	if (order === id + "_avg" ||
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
			if (!isNaN(Number(insightResA)) && !isNaN(Number(insightResB))) {
				return Number(insightResA) - Number(insightResB);
			} else if(insightResA[order] < insightResB[order]) {
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
