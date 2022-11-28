import * as fs from "fs-extra";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {adminIds, insightFacade} from "./App";

// Probably move this to different file
const loadDefaultDatasets = async () => {
	console.log("Loading default datasets");

	// Taken from InsightFacade.spec.ts
	// TODO: Change this to use api
	fs.removeSync("./data");

	const datasetContents = new Map<string, string>();
	const datasetsToLoad: {[key: string]: string} = {
		sections: "./frontend/data/pair.zip",
		rooms: "./frontend/data/rooms.zip",
	};

	for (const key of Object.keys(datasetsToLoad)) {
		const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
		datasetContents.set(key, content);
	}

	Promise.all([
		insightFacade.addDataset("sections", datasetContents.get("sections") ?? "", InsightDatasetKind.Sections),
		insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms),
	])
		.then(() => {
			console.log("Loaded default datasets");
		})
		.catch((_err) => {
			console.log("Error loading default datasets");
		});
};

const isAdmin = (id: string) => {
	return adminIds.includes(id);
};

export {loadDefaultDatasets, isAdmin};
