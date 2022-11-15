import {InsightError} from "./IInsightFacade";

const mkeyOrderUp = (insightResA: any, insightResB: any, order: string): number => {
	return insightResA[order] - insightResB[order];
};

const mkeyOrderDown = (insightResA: any, insightResB: any, order: string): number => {
	return insightResB[order] - insightResA[order];
};

const skeyOrderUp = (insightResA: any, insightResB: any, order: string): number => {
	if(insightResA[order] < insightResB[order]) {
		return -1;
	} else if (insightResA[order] > insightResB[order]) {
		return 1;
	} else {
		return 0;
	}
};

const skeyOrderDown = (insightResA: any, insightResB: any, order: string): number => {
	if(insightResB[order] < insightResA[order]) {
		return -1;
	} else if (insightResB[order] > insightResA[order]) {
		return 1;
	} else {
		return 0;
	}
};

const directionalOrder = (insightResA: any, insightResB: any, order: any, mkeys: string[], skeys: string[]): number => {
	const dir = order["dir"];
	const orderKeys = order["keys"];

	let compareFnResult = 0;
	for (const orderKey of orderKeys) {
		if (dir === "UP" && mkeys.includes(orderKey.split("_")[1])) {
			compareFnResult = mkeyOrderUp(insightResA, insightResB, orderKey);
		} else if (dir === "DOWN" && mkeys.includes(orderKey.split("_")[1])) {
			compareFnResult = mkeyOrderDown(insightResA, insightResB, orderKey);
		} else if (dir === "UP" && skeys.includes(orderKey.split("_")[1])) {
			compareFnResult = skeyOrderUp(insightResA, insightResB, orderKey);
		} else if (dir === "DOWN" && skeys.includes(orderKey.split("_")[1])) {
			compareFnResult = skeyOrderDown(insightResA, insightResB, orderKey);
		} else {
			throw new InsightError("Invalid Order Object in ORDER");
		}

		if (compareFnResult !== 0) {
			return compareFnResult;
		}
	}

	return compareFnResult;
};

export {directionalOrder, skeyOrderUp, mkeyOrderUp};
