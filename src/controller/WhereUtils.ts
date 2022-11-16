import {InsightDataset, InsightError} from "./IInsightFacade";
import {parseDatasetKey} from "./QueryEngineUtils";

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

export {handleFilter};
