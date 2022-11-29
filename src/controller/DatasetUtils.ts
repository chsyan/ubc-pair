import {pathExists, pathExistsSync, readdir, readJSON, readJSONSync} from "fs-extra";
import {InsightDataset, InsightError} from "./IInsightFacade";
import {readdirSync} from "fs";

interface Dataset {
	insight: InsightDataset;
	data: any[];
}

const dataDir = "./data";

// Throw an error if the id is invalid
const validateId = (id: string): void => {
	/*
	 * From the spec:
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 */
	if (id.length === 0) {
		throw new InsightError("id cannot be empty");
	}
	if (id.includes("_")) {
		throw new InsightError("id cannot contain underscores");
	}
	if (id.trim().length === 0) {
		throw new InsightError("id cannot only be whitespace");
	}

	// Parse the regex as an extra check
	if (!id.match(/^[^_]+$/)) {
		throw new InsightError("id is invalid");
	}
};

const readDataDir = (): Dataset[] => {
	// If data dir doesn't exist, return empty array
	if (!(pathExistsSync(dataDir))) {
		return [];
	}

	// Map filenames to datasets
	const fileNames = readdirSync(dataDir);
	const datasets: Dataset[] = [];
	for (const fileName of fileNames) {
		datasets.push(readDatasetSync(fileName.replace(".json", "")));
	}

	return datasets;
};

const readDatasetSync = (id: string): Dataset => {
	try {
		return readJSONSync(`${dataDir}/${id}.json`);
	} catch (err) {
		throw new InsightError("Error reading dataset from disk");
	}
};

const readDataset = async (id: string): Promise<Dataset> => {
	try {
		const dataset = await readJSON(`${dataDir}/${id}.json`);
		return dataset;
	} catch (err) {
		throw new InsightError("Error reading dataset from disk");
	}
};

export {validateId, Dataset, dataDir, readDataDir, readDataset};
