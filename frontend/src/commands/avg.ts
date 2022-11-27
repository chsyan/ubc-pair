import {ApplicationCommandOptionType, CommandInteraction} from "discord.js";
import {insightFacade} from "../App";
import {Command} from "./utils";

const queryAvg = async (interaction: CommandInteraction) => {
	await interaction.reply({content: "Processing query...", ephemeral: true});

	// id defaults to sections
	const id = (interaction.options.get("id")?.value as String) ?? "sections";
	const percent = interaction.options.get("percent");
	if (!percent) {
		await interaction.reply("Error in percent");
		return;
	}
	const query = {
		WHERE: {
			GT: {
				sections_avg: percent.value as number,
			},
		},
		OPTIONS: {
			COLUMNS: ["overallAvg", "sections_title"],
			ORDER: {
				dir: "DOWN",
				keys: ["overallAvg"],
			},
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_title"],
			APPLY: [
				{
					overallAvg: {
						AVG: "sections_avg",
					},
				},
			],
		},
	};

	// TODO: Change this to use api
	const queryResult = await insightFacade.performQuery(query);

	// Get the maximum string length of title column
	const key = id + "_title";
	let reply = "";
	for (const result of queryResult) {
		// Round to 2 dec to try to align cols
		reply += `${(result.overallAvg as number).toFixed(2)}\t${result[key]}\n`;
	}
	await interaction.editReply("Query result:\n" + reply);
	// await interaction.reply(JSON.stringify(result, null, 2));
};

const avg: Command = {
	name: "avg",
	description: "Get the sections with averages higher than x%",
	options: [
		{
			name: "percent",
			description: "Minimum percentage of a section",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
		{
			name: "id",
			description: "Dataset id (default: sections)",
			type: ApplicationCommandOptionType.String,
		},
	],
	execute: async (interaction: CommandInteraction) => {
		queryAvg(interaction);
	},
};

export default avg;
