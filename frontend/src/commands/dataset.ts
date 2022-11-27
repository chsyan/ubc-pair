import {ApplicationCommandOptionType, CommandInteraction, InteractionType} from "discord.js";
import {get} from "https";
import {InsightDatasetKind} from "../../../src/controller/IInsightFacade";
import {insightFacade} from "../App";
import {Command} from "./utils";

const listDatasets = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Getting list of datasets...", ephemeral: true});
	const datasets = await insightFacade.listDatasets();
	if (datasets.length === 0) {
		await interaction.editReply("No datasets found");
	} else {
		await interaction.editReply("Cached ids: " + JSON.stringify(datasets, null, 2));
	}
};

const addDataset = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Processing file...", ephemeral: true});

	const file = interaction.options.get("attachment");
	const fileUrl = file?.attachment?.url;
	if (fileUrl) {
		get(fileUrl, (res) => {
			// Get the raw data from response
			res.setEncoding("base64");
			let rawData = "";
			res.on("data", (chunk) => (rawData += chunk));

			res.on("end", async () => {
				const id = new Date().getTime().toString();
				const ids = await insightFacade.addDataset(id, rawData, InsightDatasetKind.Sections);
				await interaction.editReply(`Successfully added ${id}. \n Cached ids: ${ids.join(", ")}`);
			});
		});
	}
};

const removeDataset = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Removing dataset...", ephemeral: true});
	// TODO
};

const dataset: Command = {
	name: "dataset",
	description: "Add, remove, or list datasets",
	options: [
		{
			name: "list",
			description: "List all datasets",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "add",
			description: "Add a dataset",
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "attachment",
					description: "Zip folder of courses/rooms",
					type: ApplicationCommandOptionType.Attachment,
					required: true,
				},
			],
		},
		{
			name: "remove",
			description: "Remove a dataset",
			type: ApplicationCommandOptionType.Subcommand,
		},
	],
	execute: async (interaction: CommandInteraction) => {
		// https://www.reddit.com/r/Discordjs/comments/w3bhv0/comment/igvhmx0/?utm_source=share&utm_medium=web2x&context=3
		// Saved by reddit
		if (interaction.type !== InteractionType.ApplicationCommand) return;
		if (!interaction.isChatInputCommand()) return;

		const subCommand = interaction.options.getSubcommand();
		if (subCommand === "list") {
			await listDatasets(interaction);
		} else if (subCommand === "add") {
			await addDataset(interaction);
		} else if (subCommand === "remove") {
			await removeDataset(interaction);
		} else {
			await interaction.reply("Command not found");
		}
	},
};

export default dataset;
