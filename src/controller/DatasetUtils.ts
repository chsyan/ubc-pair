import {pathExists, readdir, readJSON} from "fs-extra";
import {InsightDataset, InsightError} from "./IInsightFacade";

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

const readDataDir = async (): Promise<Dataset[]> => {
	// If data dir doesn't exist, return empty array
	if (!(await pathExists(dataDir))) {
		return [];
	}

	// Map filenames to datasets
	const fileNames = await readdir(dataDir);
	const datasets: Dataset[] = [];
	const readDatasetPromises = fileNames.map(async (fileName) => {
		// Remove the .json file extension
		return readDataset(fileName.replace(".json", "")).then((dataset) => {
			datasets.push(dataset);
		});
	});
	await Promise.all(readDatasetPromises);

	return datasets;
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
