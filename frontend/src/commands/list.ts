import {CommandInteraction} from "discord.js";
import {insightFacade} from "../App";
import {Command} from "./utils";

const listDatasets = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Getting list of datasets...", ephemeral: true});
	// TODO: Change this to use api
	const datasets = await insightFacade.listDatasets();
	if (datasets.length === 0) {
		await interaction.editReply("No datasets found");
	} else {
		await interaction.editReply("Cached ids: " + JSON.stringify(datasets, null, 2));
	}
};

const list: Command = {
	name: "list",
	description: "List cached datasets",
	execute: async (interaction: CommandInteraction) => {
		listDatasets(interaction);
	},
};

export default list;
