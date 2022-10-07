
import {validateQuery, getQueryDataset} from "./QueryUtils";
import {outputJSON, pathExists, remove} from "fs-extra";
import {dataDir, DatasetSections, parseBuffer, validateId} from "./DatasetUtils";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

/*
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	private readonly datasetSections: DatasetSections[];

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasetSections = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Validate id
		validateId(id);

		/*
		 * Check both in memory and disk for duplicate ids. If data dir is deleted, in memory datasets are still valid.
		 * If we use a different instance of InsightFacade, we still want to check for duplicates across instances.
		 */
		for (const dataset in this.datasetSections) {
			if (this.datasetSections[dataset].insight.id === id) {
				throw new InsightError("id already exists");
			}
		}

		if (await pathExists(`${dataDir}/${id}.json`)) {
			throw new InsightError("id already exists");
		}

		// Get sections from content buffer
		const sections = await parseBuffer(content);

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

	public async removeDataset(id: string): Promise<string> {
		// Validate id
		validateId(id);

		// Search disk for dataset
		const path = `${dataDir}/${id}.json`;
		if (await pathExists(path)) {
			// Remove dataset from disk
			try {
				await remove(path);
			} catch (err) {
				throw new InsightError("Error removing dataset from disk");
			}
		}

		// Search memory for dataset
		for (let i = 0; i < this.datasetSections.length; i++) {
			if (this.datasetSections[i].insight.id === id) {
				// Remove dataset from memory
				return this.datasetSections.splice(i, 1)[0].insight.id;
			}
		}

		throw new NotFoundError("id not found");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Validate query
		if (typeof query !== "object" || query === null) {
			throw new InsightError("input query was not an 'object'");
		}
		validateQuery(query);

		// TODO: Query Engine
		const queryDatasetID = getQueryDataset(query);
		const existInDisk = await pathExists(`${dataDir}/${queryDatasetID}.json`);
		const existInMemory = (): boolean => {
			for (const dataset in this.datasetSections) {
				if (this.datasetSections[dataset].insight.id === queryDatasetID) {
					return  true;
				}
			}
			return false;
		};
		if (!existInDisk || !existInMemory()) {
			throw new InsightError("Query references dataset not added");
		}

		return Promise.reject("Not implemented.");
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// Get added datasets from memory
		return this.datasetSections.map((dataset) => dataset.insight);
	}
}

