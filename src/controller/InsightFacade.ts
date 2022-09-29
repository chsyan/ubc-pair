import {outputJSON, pathExists} from "fs-extra";
import {dataDir, DatasetSections, parseBufferContent as parseContentBuffer, validateId} from "./DatasetUtils";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

/*
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	private datasetSections: DatasetSections[];

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasetSections = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Validate id
		validateId(id);

		// Check for duplicate id in memory
		for (const dataset in this.datasetSections) {
			if (this.datasetSections[dataset].insight.id === id) {
				throw new InsightError("id already exists");
			}
		}

		// Check for duplicate id in disk
		if (await pathExists(`${dataDir}/${id}.json`)) {
			throw new InsightError("id already exists");
		}
		// Maybe one of these checks for duplicates is redundant?

		// Get sections from content buffer
		const sections = await parseContentBuffer(content);

		const newDataset: DatasetSections = {
			insight: {
				id: id,
				kind: kind,
				numRows: sections.length,
			},
			sections: sections,
		};

		// Add new dataset to memory
		this.datasetSections.push(newDataset);

		// Write new dataset to disk
		try {
			await outputJSON(`${dataDir}/${id}.json`, newDataset);
		} catch (err) {
			throw new InsightError("Error writing dataset to disk");
		}

		// Return the ids of all datasets
		return this.datasetSections.map((dataset) => dataset.insight.id);
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
