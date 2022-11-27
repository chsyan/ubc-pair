import {ApplicationCommandOptionType, CommandInteraction, InteractionType} from "discord.js";
import {get} from "https";
import {InsightDatasetKind} from "../../../src/controller/IInsightFacade";
import {insightFacade} from "../App";
import {Command} from "./utils";

// Wrapped addDataset. Return empty array on error.
const addDatasetWrapped = async (id: string, data: string, kind: InsightDatasetKind) => {
	try {
		const ids = await insightFacade.addDataset(id, data, kind);
		return ids;
	} catch (_err) {
		return [];
	}
};

const addDataset = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Processing file...", ephemeral: true});

	const file = interaction.options.get("attachment")?.attachment?.url;
	// kind is either the provided value or defauls to sections
	let kind = (interaction.options.get("kind")?.value as InsightDatasetKind) ?? InsightDatasetKind.Sections;
	const id = (interaction.options.get("id")?.value as string) ?? new Date().getTime().toString();
	if (!file) {
		await interaction.editReply("Error retrieving file");
		return;
	}
	get(file, (res) => {
		// Set encoding since addDataset expects b64e
		res.setEncoding("base64");
		let rawData = "";
		res.on("data", (chunk) => (rawData += chunk));

		res.on("end", async () => {
			let ids: string[] = [];

			ids = await addDatasetWrapped(id, rawData, kind);
			if (ids.length === 0) {
				// If above fails, try again as rooms kind since default (no kind provided) is sections
				kind = InsightDatasetKind.Rooms;
				await interaction.editReply(`Error adding dataset as ${kind}. Trying to add as ${kind}...`);
				ids = await addDatasetWrapped(id, rawData, kind);
			}

			// Reply with the right response depending on if there was a successful addDataset or not
			if (ids.length === 0) {
				await interaction.editReply("Error adding dataset");
			} else {
				await interaction.editReply(
					`Successfully added ${kind} with id: ${id}.\nCached ids: ${ids.join(", ")}`
				);
			}
		});
	});
};

const add: Command = {
	name: "add",
	description: "Add a dataset",
	options: [
		{
			// Required attachment
			name: "attachment",
			description: "Zip folder of courses/rooms",
			type: ApplicationCommandOptionType.Attachment,
			required: true,
		},
		{
			// Optional id
			name: "id",
			description: "Id of the dataset",
			type: ApplicationCommandOptionType.String,
		},
		{
			// Optional dataset kind
			name: "kind",
			description: "Kind of dataset (sections/rooms)",
			type: ApplicationCommandOptionType.String,
			choices: [
				{
					name: "sections",
					value: InsightDatasetKind.Sections,
				},
				{
					name: "rooms",
					value: InsightDatasetKind.Rooms,
				},
			],
		},
	],
	execute: async (interaction: CommandInteraction) => {
		addDataset(interaction);
	},
};

export default add;
