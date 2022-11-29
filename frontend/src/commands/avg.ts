import post from "axios";
import {ApplicationCommandOptionType, CommandInteraction} from "discord.js";
import {Command} from "./utils";

const queryAvg = async (interaction: CommandInteraction) => {
	await interaction.reply("Processing query...");

	// id defaults to sections
	const id = (interaction.options.get("id")?.value as String) ?? "sections";
	const percent = interaction.options.get("percent");
	if (!percent) {
		interaction.editReply("Error in percent");
		return;
	}
	const query = {
		WHERE: {
			GT: {
				sections_avg: percent.value as number,
			},
		},
		OPTIONS: {
			COLUMNS: ["overallAvg", `${id}_title`],
			ORDER: {
				dir: "DOWN",
				keys: ["overallAvg"],
			},
		},
		TRANSFORMATIONS: {
			GROUP: [`${id}_title`],
			APPLY: [
				{
					overallAvg: {
						AVG: `${id}_avg`,
					},
				},
			],
		},
	};

	post("http://localhost:4321/query", {
		method: "post",
		data: query,
	})
		.then((res) => {
			const queryResult = res.data.result;

			// Format the percents in the result
			const key = id + "_title";
			let reply = "";
			for (const result of queryResult) {
				// Round to 2 dec to try to align cols
				reply += `${(result.overallAvg as number).toFixed(2)}%\t${result[key]}\n`;
			}
			// Discord has max chars limit
			if (reply.length > 1900) {
				reply = reply.substring(0, 1900) + "\n...";
			}

			interaction.editReply("Courses with average >" + percent.value + "%:\n" + reply);
		})
		.catch((err) => {
			interaction.editReply("Error: " + err);
		});
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
