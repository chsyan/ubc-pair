import put from "axios";
import * as fs from "fs-extra";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {adminIds, apiUrl} from "./App";

const apiAddDataset = async (id: string, data: Buffer, kind: InsightDatasetKind) => {
	put(`${apiUrl}/dataset/${id}/${kind}`, {
		headers: {
			"Content-Type": "application/x-zip-compressed",
		},
		method: "put",
		data: data,
	})
		.then(() => {
			console.log("Loaded default dataset " + id);
		})
		.catch((err) => {
			console.log(`Error adding dataset ${id}. ${err.response.data.error}`);
		});
};

const loadDefaultDatasets = async () => {
	console.log("Loading default datasets");

	const dataLocation = "./frontend/data/";
	apiAddDataset("sections", fs.readFileSync(dataLocation + "pair.zip"), InsightDatasetKind.Sections);
	apiAddDataset("rooms", fs.readFileSync(dataLocation + "rooms.zip"), InsightDatasetKind.Rooms);
};

const isAdmin = (id: string) => {
	return adminIds.includes(id);
};

export {loadDefaultDatasets, isAdmin};
