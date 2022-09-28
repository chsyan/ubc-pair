import * as JSZip from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

/*
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	private insightDatasets: InsightDataset[];

	// TODO: Store loaded datasets here so not reading from fs everytime
	private datasetEntries: Map<string, any[]>;

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.insightDatasets = [];
		this.datasetEntries = new Map<string, any[]>();
	}

	private validateId(id: string): void {
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
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Validate id
		this.validateId(id);

		// Check for duplicate ids
		for (const dataset in this.insightDatasets) {
			const storedId = this.insightDatasets[dataset].id;
			if (storedId === id) {
				throw new InsightError("id already exists");
			}
		}

		const sections: any[] = [];

		// Unzip content and add to sections
		try {
			// JSZip requires content to be b64e
			const contentEncoded = Buffer.from(content, "base64");
			const zipContent = await JSZip.loadAsync(contentEncoded);
			const filePaths = Object.keys(zipContent.files);

			filePaths.map(async (path) => {
				const fileObj = zipContent.file(path);

				// Check if file exists to satisfy compiler
				if (fileObj === null) {
					return;
				}

				// Parse the file contents as JSON
				const parsedContents = JSON.parse(await fileObj.async("string"));

				// Add file data to entries
				for (const entry of parsedContents.result) {
					sections.push(entry);
				}
			});
		} catch (err) {
			throw new InsightError("Error decoding zip file");
		}

		// TODO: Write sections to disk
		// Maybe add in a folder with the id as the directory name
		// Can probably write the entire sections array as a JSON file or something

		// Add this new dataset to datasets
		const newDataset: InsightDataset = {
			id: id,
			kind: kind,
			numRows: sections.length,
		};
		this.insightDatasets.push(newDataset);

		// Return the ids of all datasets
		return this.insightDatasets.map((dataset) => dataset.id);
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
