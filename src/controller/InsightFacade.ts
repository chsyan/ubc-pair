import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import {
	QueryValidator,
} from "./QueryValidator";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private queryValidator: QueryValidator;
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.queryValidator = new QueryValidator();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Validate query
		if (typeof query !== "object" || query === null) {
			throw new InsightError("input query was not an 'object'");
		}
		this.queryValidator.validateQuery(query);

		// TODO: Query Engine

		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
