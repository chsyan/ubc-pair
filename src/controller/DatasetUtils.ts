import {pathExists, readdir, readJSON} from "fs-extra";
import JSZip from "jszip";
import {parse} from "parse5";
import {Document, DocumentFragment} from "parse5/dist/tree-adapters/default";
import {InsightDataset, InsightError} from "./IInsightFacade";

interface Dataset {
	insight: InsightDataset;
	sections: any[];
}

const dataDir = "./data";

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

const parseSections = async (content: string): Promise<any[]> => {
	const sections: any[] = [];

	// JSZip requied content to be b64e buffer
	const contentEncoded = Buffer.from(content, "base64");

	try {
		const zip = await JSZip.loadAsync(contentEncoded);

		// Only consider entries inside courses dir
		const coursesZip = zip.folder("courses");
		let filePaths: string[] = [];
		if (coursesZip) {
			// Ignore subdirs
			filePaths = Object.keys(coursesZip.files).filter(
				(path) => /courses\/*/.test(path) && path.split("/").length === 2
			);
		}

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

const parseRooms = async (content: string): Promise<any[]> => {
	const rooms: any[] = [];

	// JSZip requied content to be b64e buffer
	const contentEncoded = Buffer.from(content, "base64");

	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(contentEncoded);
	} catch (err) {
		throw new InsightError("Error decoding zip file");
	}

	// Look for index.htm
	const indexFile = zip.file("index.htm");

	if (indexFile === null) {
		throw new InsightError("index.htm not found");
	}

	const indexContent = await indexFile.async("string");
	const document = parse(indexContent);
	let nodes = document.childNodes;
	while (nodes.length > 0) {
		const node = nodes.pop();
		// Look for <tr> nodeNames
		if (!node) {
			continue;
		}

		// Check for <tr> node
		if (node.nodeName === "tr") {
			const room = parseRoom(node);
			if (room) {
				rooms.push(room);
			}
		}

		const childNodes = (node as DocumentFragment).childNodes;
		if (childNodes) {
			nodes = nodes.concat(childNodes);
		}
	}

	// if (rooms.length === 0) {
	// 	throw new InsightError("Must have at least one valid section");
	// }
	return rooms;
};

const parseRoom = (node: any): any => {
	const room: any = {};
	const childNodes = node.childNodes;
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

export {validateId, parseSections, parseRooms, Dataset, dataDir, readDataDir, readDataset};
