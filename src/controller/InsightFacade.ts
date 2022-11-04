import {validateQuery} from "./QueryValidationUtils";
import {getQueryDatasetID, handleWhere, handleColumns, handleOrder} from "./QueryEngineUtils";
import {outputJSON, pathExists, remove} from "fs-extra";
import {dataDir, Dataset, parseSections, validateId, readDataset, parseRooms} from "./DatasetUtils";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";

/*
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	private readonly dataset: Dataset[];

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.dataset = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Validate id
		validateId(id);

		/*
		 * Check both in memory and disk for duplicate ids. If data dir is deleted, in memory datasets are still valid.
		 * If we use a different instance of InsightFacade, we still want to check for duplicates across instances.
		 */
		for (const dataset in this.dataset) {
			if (this.dataset[dataset].insight.id === id) {
				throw new InsightError("id already exists");
			}
		}

		if (await pathExists(`${dataDir}/${id}.json`)) {
			throw new InsightError("id already exists");
		}

		// Get sections from content buffer
		let newDataset: Dataset;
		if (kind === InsightDatasetKind.Sections) {
			const sections = await parseSections(content);

			newDataset = {
				insight: {
					id: id,
					kind: kind,
					numRows: sections.length,
				},
				sections: sections,
			};
		} else {
			// InsightDatasetKind.Courses
			const sections = await parseRooms(content);

			newDataset = {
				insight: {
					id: id,
					kind: kind,
					numRows: sections.length,
				},
				sections: sections,
			};
		}

		// Add new dataset to memory
		this.dataset.push(newDataset);

		// Write new dataset to disk
		try {
			await outputJSON(`${dataDir}/${id}.json`, newDataset);
		} catch (err) {
			throw new InsightError("Error writing dataset to disk");
		}

		// Return the ids of all datasets
		return this.dataset.map((dataset) => dataset.insight.id);
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
		for (let i = 0; i < this.dataset.length; i++) {
			if (this.dataset[i].insight.id === id) {
				// Remove dataset from memory
				return this.dataset.splice(i, 1)[0].insight.id;
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

		const queryDatasetID = getQueryDatasetID(query);
		let queryDatasetIndex: any = null;
		let queryResult: InsightResult[];
		const existInMemory = (): boolean => {
			for (const dataset in this.dataset) {
				if (this.dataset[dataset].insight.id === queryDatasetID) {
					queryDatasetIndex = dataset;
					return true;
				}
			}
			return false;
		};

		if (existInMemory()) {
			let queryDataset = this.dataset[queryDatasetIndex];
			let filtered = queryDataset.sections.filter((section: any) => handleWhere(section, query, queryDatasetID));
			let unordered = filtered.map((section: any) => handleColumns(section, query, queryDatasetID));
			queryResult = handleOrder(unordered, query, queryDatasetID);
		} else {
			const existInDisk = await pathExists(`${dataDir}/${queryDatasetID}.json`);
			if (!existInDisk) {
				throw new InsightError("Query references dataset not added");
			}
			queryResult = await readDataset(queryDatasetID)
				.then((queryDataset) => {
					this.dataset.push(queryDataset);
					return queryDataset.sections.filter((section) => handleWhere(section, query, queryDatasetID));
				})
				.then((filteredSections) => {
					return filteredSections.map((section) => handleColumns(section, query, queryDatasetID));
				})
				.then((unorderedQueryResult) => {
					return handleOrder(unorderedQueryResult, query, queryDatasetID);
				});
		}

		if (queryResult.length > 5000) {
			throw new ResultTooLargeError("Query resulted in more than 5000 results");
		}

		return queryResult;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// Get added datasets from memory
		return this.dataset.map((dataset) => dataset.insight);
	}
}
