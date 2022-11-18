import {InsightDataset, InsightResult} from "./IInsightFacade";
import {parseDatasetKey} from "./QueryEngineUtils";
import Decimal from "decimal.js";

const applyMax = (group: any, applyOperand: string, insight: InsightDataset): number => {
	const applyOperandKey = parseDatasetKey(applyOperand, insight);

	let firstData = group.shift();
	let currentMax = firstData[applyOperandKey];
	for (const data of group) {
		if (data[applyOperandKey] > currentMax) {
			currentMax = data[applyOperandKey];
		}
	}
	group.push(firstData);
	return currentMax;
};

const applyMin = (group: any, applyOperand: string, insight: InsightDataset): number => {
	const applyOperandKey = parseDatasetKey(applyOperand, insight);

	let firstData = group.shift();
	let currentMin = firstData[applyOperandKey];
	for (const data of group) {
		if (data[applyOperandKey] < currentMin) {
			currentMin = data[applyOperandKey];
		}
	}
	group.push(firstData);
	return currentMin;
};

const applyCount = (group: any, applyOperand: string, insight: InsightDataset): number => {
	const applyOperandKey = parseDatasetKey(applyOperand, insight);

	let currentCount = 0;
	let uniqueOccurrences: any = [];
	for (const data of group) {
		if (!uniqueOccurrences.includes(data[applyOperandKey])) {
			currentCount += 1;
			uniqueOccurrences.push(data[applyOperandKey]);
		}
	}
	return currentCount;
};

const applyAvg = (group: any, applyOperand: string, insight: InsightDataset): number => {
	const applyOperandKey = parseDatasetKey(applyOperand, insight);

	let numRows = group.length;
	let total = new Decimal(0);
	for (const data of group) {
		let nextToAdd = new Decimal(data[applyOperandKey]);
		total = total.add(nextToAdd);
	}
	let avg = total.toNumber() / numRows;
	return Number(avg.toFixed(2));
};

const applySum = (group: any, applyOperand: string, insight: InsightDataset): number => {
	const applyOperandKey = parseDatasetKey(applyOperand, insight);

	let currentSum = 0;
	for (const data of group) {
		currentSum = currentSum + data[applyOperandKey];
	}
	return Number(currentSum.toFixed(2));
};

const getApplyKeyInsightResultValue = (group: any, applyOperation: any, insight: InsightDataset): any => {
	if (applyOperation.MAX !== undefined) {
		return applyMax(group, applyOperation.MAX, insight);
	} else if (applyOperation.MIN !== undefined) {
		return applyMin(group, applyOperation.MIN, insight);
	} else if (applyOperation.AVG !== undefined) {
		return applyAvg(group, applyOperation.AVG, insight);
	} else if (applyOperation.COUNT !== undefined) {
		return applyCount(group, applyOperation.COUNT, insight);
	} else { // SUM
		return applySum(group, applyOperation.SUM, insight);
	}
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

const groupInsightResult = (group: any, groupKeys: any, applyRules: any, columnKeys: string[], insight: InsightDataset):
	InsightResult => {

	let insightResult: InsightResult = {};

	for (const groupKey of groupKeys) {
		if (columnKeys.includes(groupKey)) {
			insightResult[groupKey] = getKeyInsightResultValue(groupKey, insight, group[0]);
		}
	}

	for (const applyRule of applyRules) {
		const applyKey = Object.keys(applyRule)[0];
		const applyOperation = applyRule[applyKey];

		if (columnKeys.includes(applyKey)) {
			insightResult[applyKey] = getApplyKeyInsightResultValue(group, applyOperation, insight);
		}
	}

	return insightResult;
};

const createMapKey = (data: any, groupKeys: string[], insight: InsightDataset): string => {
	let mapKey = "";
	for(const groupKey of groupKeys) {
		mapKey = mapKey + " " + groupKey + data[parseDatasetKey(groupKey, insight)].toString();
	}
	return mapKey;
};

export {createMapKey, getKeyInsightResultValue, groupInsightResult};
