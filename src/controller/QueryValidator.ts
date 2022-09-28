import {InsightError} from "./IInsightFacade";

export class QueryValidator {

	constructor() {
		console.log("QueryValidator::init()");
	}

	private isExistingObject(maybeObject: any): boolean {
		return maybeObject !== undefined && typeof maybeObject === "object" && maybeObject !== null;
	}

	private validateFilter(filter: any): void {
		if (Object.keys(filter).length !== 1) {
			throw new InsightError("filter should only have 1 key");
		}
		// Validate MCOMPARISON
		if (this.isExistingObject(filter.LT) || this.isExistingObject(filter.EQ) || this.isExistingObject(filter.GT)) {
			let mComparator = Object.keys(filter)[0];
			if(Object.keys(filter[mComparator]).length !== 1) {
				throw new InsightError("MComparator should only have 1 key");
			}
			let mKey = Object.keys(filter[mComparator])[0];
			if(!mKey.match(/^[^_]+_(avg|pass|fail|audit|year)$/g) || typeof filter[mComparator][mKey] !== "number") {
				throw new InsightError("invalid key or value used ");
			}
		}

		// TODO: Validate SCOMPARISON

		// TODO: Validate NEGATION

		// TODO: Validate LOGIC-COMPARISON
	};

	public validateQuery(query: any): void {
		// Validate Syntax
		if (Object.keys(query).length !== 2) {
			throw new InsightError("query should only have 2 keys");
		}
		if (!this.isExistingObject(query.WHERE)) {
			throw new InsightError("query missing WHERE");
		}
		if (!this.isExistingObject(query.OPTIONS)) {
			throw new InsightError("query missing OPTIONS");
		}
		// Validate Syntax - WHERE Block
		if(Object.keys(query.WHERE).length !== 0) {
			this.validateFilter(query.WHERE);
		}

		// TODO: Validate Syntax - OPTIONS Block

		// TODO: Validate Semantic
	};
}
