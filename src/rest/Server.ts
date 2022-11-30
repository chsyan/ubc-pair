import express, {Application} from "express";
import * as http from "http";
import cors from "cors";
import {echo} from "./Echo";
import {addRequest} from "./AddRequest";
import {removeRequest} from "./RemoveRequest";
import {queryRequest} from "./QueryRequest";
import {listRequest} from "./ListRequest";
import InsightFacade from "../controller/InsightFacade";
import {avgIDRequest} from "./AvgIDRequest";
import {avgRequest} from "./AvgRequest";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	public insightFacade: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.insightFacade = new InsightFacade();
		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", echo);

		// TODO: your other endpoints should go here
		this.express.put("/dataset/:id/:kind", (req, res) => {
			addRequest(req, res, this.insightFacade).then(() => console.log("addRequest Complete"));
		});
		this.express.delete("/dataset/:id", (req, res) => {
			removeRequest(req, res, this.insightFacade).then(() => console.log("removeRequest Complete"));
		});
		this.express.post("/query", (req, res) => {
			queryRequest(req, res, this.insightFacade).then(() => console.log("queryRequest Complete"));
		});
		this.express.get("/datasets", (req, res) => {
			listRequest(req, res, this.insightFacade).then(() => console.log("listRequest Complete"));
		});
		this.express.post("/avg/:percent/:id", (req, res) => {
			avgIDRequest(req, res, this.insightFacade).then(() => console.log("avgIDRequest Complete"));
		});
		this.express.post("/avg/:percent", (req, res) => {
			avgRequest(req, res, this.insightFacade).then(() => console.log("avgRequest Complete"));
		});
	}

}

export {Server};
