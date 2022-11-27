import {Client} from "discord.js";
import * as fs from "fs-extra";
import {InsightDatasetKind} from "../../../src/controller/IInsightFacade";
import {insightFacade} from "../App";
import {commands, loadCommands} from "../commands/utils";

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

const ready = async (client: Client) => {
	client.on("ready", async () => {
		if (!client.user || !client.application) {
			return;
		}
		console.log("Logged in as " + client.user.tag);

		// load slash commands
		loadCommands(client.application, commands);

		// load some default datasets
		loadDefaultDatasets();
	});
};

export default ready;
