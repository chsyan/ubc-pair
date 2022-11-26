import {Client} from "discord.js";
import {commands} from "../commands/utils";

const interaction = async (client: Client) => {
	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isChatInputCommand()) {
			return;
		}

		// Get command from our registered commands
		const command = commands.find((command) => command.name === interaction.commandName);
		if (!command) {
			interaction.reply("Command not found");
			return;
		}

		command.execute(interaction);
	});
};

export default interaction;
