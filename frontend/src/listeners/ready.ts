import {Client} from "discord.js";
import {commands, loadCommands} from "../commands/utils";

const ready = async (client: Client) => {
	client.on("ready", async () => {
		if (!client.user || !client.application) {
			return;
		}
		console.log("Logged in as " + client.user.tag);

		// load slash commands
		loadCommands(client.application, commands);
	});
};

export default ready;
