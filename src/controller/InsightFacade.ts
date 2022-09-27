import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private ids: string[];

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.ids = [];
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
		if (this.ids.includes(id)) {
			throw new InsightError("id already exists");
		}

		// TODO: Process content into a data structure
		// TODO: Write dataset to disk

		this.ids.push(id);
		return this.ids;
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
