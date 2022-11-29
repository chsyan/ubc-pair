import get from "axios";
import {CommandInteraction} from "discord.js";
import {apiUrl} from "../App";
import {Command} from "./utils";

const listDatasets = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Getting list of datasets...", ephemeral: true});
	get(apiUrl + "/datasets").then((res) => {
		const datasets = res.data.result;
		if (datasets.length === 0) {
			interaction.editReply("No datasets found");
		} else {
			interaction.editReply("Added datasets: " + JSON.stringify(datasets, null, 2));
		}
	});
};

const list: Command = {
	name: "list",
	description: "List cached datasets",
	execute: async (interaction: CommandInteraction) => {
		listDatasets(interaction);
	},
};

export default list;
