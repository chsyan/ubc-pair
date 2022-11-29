import {Request, Response} from "express";

const echo = (req: Request, res: Response): void => {
	try {
		console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
		const response = performEcho(req.params.msg);
		res.status(200).json({result: response});
	} catch (err) {
		res.status(400).json({error: err});
	}
};

const performEcho = (msg: string): string => {
	if (typeof msg !== "undefined" && msg !== null) {
		return `${msg}...${msg}`;
	} else {
		return "Message not provided";
	}
};

export {echo};
