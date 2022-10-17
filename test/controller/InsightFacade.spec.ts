import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import {beforeEach} from "mocha";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDirectory = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here, and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		sections: "./test/resources/archives/pair.zip",
		noCoursesDir: "./test/resources/archives/notCourses.zip",
		noValidSection: "./test/resources/archives/notValid.zip",
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run of the test suite
		fs.removeSync(persistDirectory);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});

		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "sections";
			const content: string = datasetContents.get("sections") ?? "";
			const expected: string[] = [id];
			return insightFacade
				.addDataset(id, content, InsightDatasetKind.Sections)
				.then((result: string[]) => expect(result).to.deep.equal(expected));
		});

		//
		// Tests Added From c0:
		//

		describe("List Datasets", function () {
			it("should list no datasets", function () {
				return insightFacade.listDatasets().then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([]);
				});
			});

			it("should list one dataset", function () {
				const sections: string = datasetContents.get("sections") ?? "";
				return insightFacade
					.addDataset("sections", sections, InsightDatasetKind.Sections)
					.then(() => {
						return insightFacade.listDatasets();
					})
					.then((insightDatasets) => {
						expect(insightDatasets).to.deep.equal([
							{
								id: "sections",
								kind: InsightDatasetKind.Sections,
								numRows: 64612,
							},
						]);
						expect(insightDatasets).to.be.an.instanceof(Array);
						expect(insightDatasets).to.have.length(1);
					});
			});

			it("should list multiple datasets", function () {
				const sections: string = datasetContents.get("sections") ?? "";
				return insightFacade
					.addDataset("sections", sections, InsightDatasetKind.Sections)
					.then(() => {
						return insightFacade.addDataset("sections-2", sections, InsightDatasetKind.Sections);
					})
					.then(() => {
						return insightFacade.listDatasets();
					})
					.then((insightDatasets) => {
						expect(insightDatasets).to.be.an.instanceof(Array);
						expect(insightDatasets).to.have.length(2);
						const insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "sections");
						expect(insightDatasetCourses).to.exist;
						expect(insightDatasetCourses).to.deep.equal({
							id: "sections",
							kind: InsightDatasetKind.Sections,
							numRows: 64612,
						});
					});
			});
		});

		describe("Add Datasets", function () {
			it("should reject add w/ InsightError (underscore)", function () {
				const sections: string = datasetContents.get("sections") ?? "";
				const result = insightFacade.addDataset("_", sections, InsightDatasetKind.Sections);
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});

			it("should reject add w/ InsightError (whitespace)", function () {
				const sections: string = datasetContents.get("sections") ?? "";
				const result = insightFacade.addDataset("  ", sections, InsightDatasetKind.Sections);
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});

			it("should reject add w/ InsightError (repeated id)", function () {
				const sections: string = datasetContents.get("sections") ?? "";
				return insightFacade.addDataset("courses", sections, InsightDatasetKind.Sections).then(() => {
					const result = insightFacade.addDataset("courses", sections, InsightDatasetKind.Sections);
					return expect(result).eventually.to.be.rejectedWith(InsightError);
				});
			});

			it("should reject add w/ InsightError (incorrect dir name)", function () {
				const noCoursesDir: string = datasetContents.get("noCoursesDir") ?? "";
				const result = insightFacade.addDataset("noCoursesDir", noCoursesDir, InsightDatasetKind.Sections);
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});

			it("should reject add w/ InsightError (no valid sections)", function () {
				const noValidSection: string = datasetContents.get("noValidSection") ?? "";
				const result = insightFacade.addDataset("noValidSection", noValidSection, InsightDatasetKind.Sections);
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});

		describe("Remove Datasets", function () {
			it("should reject remove w/ NotFoundError (dataset not added)", function () {
				const result = insightFacade.removeDataset("courses");
				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
			});

			it("should reject remove w/ NotFoundError when deleting the same dataset", async function () {
				const sections: string = datasetContents.get("sections") ?? "";
				await insightFacade.addDataset("sections", sections, InsightDatasetKind.Sections);
				await insightFacade.removeDataset("sections");
				const result = insightFacade.removeDataset("sections");
				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
			});

			it("should add and remove one dataset", async function () {
				const sections: string = datasetContents.get("sections") ?? "";
				await insightFacade.addDataset("sections", sections, InsightDatasetKind.Sections);
				const result = await insightFacade.removeDataset("sections");
				expect(result).to.be.equal("sections");
				return insightFacade.listDatasets().then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([]);
				});
			});

			it("should reject remove w/ InsightError (underscore)", async function () {
				const result = insightFacade.removeDataset("_");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});

			it("should reject remove w/ InsightError (whitespace)", async function () {
				const result = insightFacade.removeDataset("   ");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the "queries" directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset(
					"sections",
					datasetContents.get("sections") ?? "",
					InsightDatasetKind.Sections
				),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDirectory);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);

		// Run the tests in test/resources/noOrderQueries without any regard to order
		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests without order",
			(input) => insightFacade.performQuery(input),
			"./test/resources/noOrderQueries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
				assertOnResult: (actual: any, expected: any) => {
					expect(actual.length).to.equal(expected.length);

					for (const key in actual) {
						expect(expected).to.deep.include(actual[key]);
					}
				},
			}
		);
	});
});
