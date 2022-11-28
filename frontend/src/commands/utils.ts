import {ChatInputApplicationCommandData, ClientApplication, CommandInteraction, REST, Routes} from "discord.js";
import {token} from "../App";
import add from "./add";
import avg from "./avg";
import list from "./list";

interface Command extends ChatInputApplicationCommandData {
	execute: (interaction: CommandInteraction) => Promise<void>;
}

const regularCommands: Command[] = [avg];
const adminCommands: Command[] = [add, list];
const commands = regularCommands.concat(adminCommands);

const loadCommands = async (app: ClientApplication, commands: Command[]) => {
	try {
		const rest = new REST({version: "10"}).setToken(token);
		console.log(`Loading ${commands.length} slash commands`);

		await rest.put(Routes.applicationCommands(app.id), {
			body: commands,
		});

		console.log(`Loaded ${commands.length} slash commands`);
	} catch (_err) {
		console.error("Error loading slash commands");
	}
};

export {Command, loadCommands, commands, regularCommands, adminCommands};
