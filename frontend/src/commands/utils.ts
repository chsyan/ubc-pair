import {ChatInputApplicationCommandData, ClientApplication, CommandInteraction, REST, Routes} from "discord.js";
import {token} from "../App";
import ping from "./ping";

interface Command extends ChatInputApplicationCommandData {
	execute: (interaction: CommandInteraction) => Promise<void>;
}

const commands: Command[] = [ping];

const loadCommands = async (app: ClientApplication, commands: Command[]) => {
	const rest = new REST({version: "10"}).setToken(token);

	(async () => {
		try {
			console.log(`Reloading ${commands.length} slash commands`);

			await rest.put(Routes.applicationCommands(app.id), {
				body: commands,
			});

			console.log(`Reloaded ${commands.length} slash commands`);
		} catch (error) {
			console.error(error);
		}
	})();
};

export {Command, loadCommands, commands};
