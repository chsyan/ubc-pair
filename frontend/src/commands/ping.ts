import {CommandInteraction} from "discord.js";
import {Command} from "./utils";

const ping: Command = {
	name: "ping",
	description: "Reply with pong",
	execute: async (interaction: CommandInteraction) => {
		await interaction.reply({content: "Pong!"});
	},
};

export default ping;
