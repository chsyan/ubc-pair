import {readJSON} from "fs-extra";
import * as JSZip from "jszip";
import {InsightDataset, InsightError} from "./IInsightFacade";

interface DatasetSections {
	insight: InsightDataset;
	sections: any[];
}

const dataDir = "./data";

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

const parseBufferContent = async (content: string): Promise<any[]> => {
	const sections: any[] = [];

	// JSZip requied content to be b64e buffer
	const contentEncoded = Buffer.from(content, "base64");

	try {
		const zip = await JSZip.loadAsync(contentEncoded);
		const filePaths = Object.keys(zip.files);
		const filePromises = filePaths.map(async (filePath) => {
			const file = zip.file(filePath);

			// Skip non files and also satisfy compiler.
			if (file === null) {
				return Promise.resolve();
			}

			return file.async("string").then((fileContent) => {
				// Parse the file contents as JSON
				for (const section of JSON.parse(fileContent).result) {
					sections.push(section);
				}
			});
		});

		await Promise.all(filePromises);
	} catch (err) {
		throw new InsightError("Error decoding zip file");
	}
	return sections;
};

const readDataset = async (id: string): Promise<DatasetSections> => {
	try {
		const dataset = await readJSON(`${dataDir}/${id}.json`);
		return dataset;
	} catch (err) {
		throw new InsightError("Error reading dataset from disk");
	}
};

export {validateId, parseBufferContent, DatasetSections, dataDir, readDataset};
