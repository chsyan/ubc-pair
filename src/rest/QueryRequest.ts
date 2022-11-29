import {Request, Response} from "express";
import InsightFacade from "../controller/InsightFacade";

const queryRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	try {
		const response = await facade.performQuery(req.body);
		res.status(200).send(response);
	} catch (err: any) {
		let error: Error = new Error("Invalid Query Request");
		if (err instanceof Error) {
			error = err;
		}
		res.status(400).send(error.message);
	}
};

export {queryRequest};
