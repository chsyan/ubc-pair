import {
	ChatInputApplicationCommandData,
	ClientApplication,
	CommandInteractionOptionResolver,
	REST,
	Routes,
} from "discord.js";
import {token} from "../App";
import dataset from "./dataset";
import { CommandInteraction } from 'discord.js';

interface Command extends ChatInputApplicationCommandData {
	execute: (interaction: CommandInteraction) => Promise<void>;
}

const commands: Command[] = [dataset];

const loadCommands = async (app: ClientApplication, commands: Command[]) => {
	const rest = new REST({version: "10"}).setToken(token);

	(async () => {
		try {
			console.log(`Loading ${commands.length} slash commands`);

			await rest.put(Routes.applicationCommands(app.id), {
				body: commands,
			});

			console.log(`Loaded ${commands.length} slash commands`);
		} catch (error) {
			console.error(error);
		}
	})();
};

export {Command, loadCommands, commands};
