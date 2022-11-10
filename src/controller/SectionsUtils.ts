import JSZip from "jszip";
import {InsightError} from "./IInsightFacade";

const requiredMKeys = ["Avg", "Pass", "Fail", "Audit", "Year"];
const requiredSKeys = ["Subject", "Course", "Professor", "Title", "id"];

// Parse sections from content and return an array of section objects
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
				// Each file can contain multiple sections
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

// Parse a single section and return a section object
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

export {parseSections};
