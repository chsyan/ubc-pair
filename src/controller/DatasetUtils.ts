import {pathExists, readdir, readJSON} from "fs-extra";
import * as JSZip from "jszip";
import {InsightDataset, InsightError} from "./IInsightFacade";

interface DatasetSections {
	insight: InsightDataset;
	sections: any[];
}

const dataDir = "./data";

const requiredKeys = ["Avg", "Pass", "Fail", "Audit", "Year", "Subject", "Course", "Professor", "Title", "id"];
const requiredMKeys = ["Avg", "Pass", "Fail", "Audit", "Year"];
const requiredSKeys = ["Subject", "Course", "Professor", "Title", "id"];

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

const parseBuffer = async (content: string): Promise<any[]> => {
	const sections: any[] = [];

	// JSZip requied content to be b64e buffer
	const contentEncoded = Buffer.from(content, "base64");

	try {
		const zip = await JSZip.loadAsync(contentEncoded);

		// Only consider files inside ./courses/ dir
		const filePaths = Object.keys(zip.files).filter((filePath) => /courses\/*/.test(filePath));

		const filePromises = filePaths.map(async (filePath) => {
			const file = zip.file(filePath);

			// Skip non files and also satisfy compiler.
			if (file === null) {
				return Promise.resolve();
			}

			return file.async("string").then((fileContent) => {
				// Parse the file contents as JSON
				for (const section of JSON.parse(fileContent).result) {
					const parsedSection = parseSection(section);
					if (parsedSection) {
						sections.push(parseSection(section));
					}
				}
			});
		});

		await Promise.all(filePromises);
	} catch (err) {
		throw new InsightError("Error decoding zip file");
	}
	if (sections.length === 0) {
		throw new InsightError("Must have at least one valid section");
	}
	return sections;
};

const parseSection = (section: any) => {
	// Check that the file has all appropriate fields.
  // Return undefined if it doesn't.
	for (const sKey of requiredSKeys) {
		if (section[sKey] === undefined) {
			return;
		}
		section[sKey] = String(section[sKey]);
	}
	for (const mKey of requiredMKeys) {
		if (section[mKey] === undefined) {
			return;
		}
		section[mKey] = Number(section[mKey]);
	}
	return section;
};

const readDataDir = async (): Promise<DatasetSections[]> => {
	// If data dir doesn't exist, return empty array
	if (!(await pathExists(dataDir))) {
		return [];
	}

	// Map filenames to datasets
	const fileNames = await readdir(dataDir);
	const datasets: DatasetSections[] = [];
	const readDatasetPromises = fileNames.map(async (fileName) => {
		// Remove the .json file extension
		return readDataset(fileName.replace(".json", "")).then((dataset) => {
			datasets.push(dataset);
		});
	});
	await Promise.all(readDatasetPromises);

	return datasets;
};

const readDataset = async (id: string): Promise<DatasetSections> => {
	try {
		const dataset = await readJSON(`${dataDir}/${id}.json`);
		return dataset;
	} catch (err) {
		throw new InsightError("Error reading dataset from disk");
	}
};

export {validateId, parseBuffer, DatasetSections, dataDir, readDataDir, readDataset};
