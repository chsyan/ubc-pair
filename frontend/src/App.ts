import {Client, GatewayIntentBits} from "discord.js";
import interaction from "./listeners/interaction";
import ready from "./listeners/ready";

// Get token from .env
require("dotenv").config();
export const token = process.env.TOKEN || "";

if (!token) {
	console.error("No token found");
	process.exit(1);
}

// Create client with intents
const client = new Client({
	intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
});

// Register listeners
ready(client);
interaction(client);

// Login to Discord
client.login(token);
