import {Client} from "discord.js";
import {adminCommands, regularCommands} from "../commands/utils";
import {isAdmin} from "../utils";

const interaction = async (client: Client) => {
	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isChatInputCommand()) {
			return;
		}

		// Get command from our registered commands
		const regularCommand = regularCommands.find((command) => command.name === interaction.commandName);
		const adminCommand = adminCommands.find((command) => command.name === interaction.commandName);
		if (regularCommand) {
			regularCommand.execute(interaction);
		} else if (adminCommand) {
			if (isAdmin(interaction.member?.user.id ?? "")) {
				adminCommand.execute(interaction);
			} else {
				const username = interaction.member?.user.username ?? "Unknown";
				await interaction.reply({
					content: `${username} is not in the sudoers file. This incident will be reported.`,
					ephemeral: true,
				});
			}
		} else {
			interaction.reply("Command not found");
		}
	});
};

export default interaction;
