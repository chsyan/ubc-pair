import JSZip, {JSZipObject} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

/*
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	private insightDatasets: InsightDataset[];

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.insightDatasets = [];
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
		const ids = [];
		for (const dataset in this.insightDatasets) {
			const storedId = this.insightDatasets[dataset].id;
			ids.push(storedId);
			if (storedId === id) {
				throw new InsightError("id already exists");
			}
		}

		// Content comes in as string decoded from b64, but JSZip requires it to be encoded
		const contentEncoded = Buffer.from(content, "base64");
		const zipContent = await JSZip.loadAsync(contentEncoded);
		zipContent.forEach(async (_path: string, file: JSZipObject) => {
			if (!file.dir) {
				const fileContent = await file.async("string");
				const obj = JSON.parse(fileContent);
				// Entries are in a result array
		// TODO: Process content into a data structure
			}
		});

		// TODO: Write dataset to disk

		const newDataset: InsightDataset = {
			id: id,
			kind: kind,
			numRows: 0, // TODO: Get the number of rows
		};
		this.insightDatasets.push(newDataset);
		ids.push(id);
		return ids;
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
