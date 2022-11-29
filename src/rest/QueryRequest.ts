import {Request, Response} from "express";
import InsightFacade from "../controller/InsightFacade";

const queryRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	try {
		const response = await facade.performQuery(req.body);
		res.status(200).json({result: response});
	} catch (err: any) {
		res.status(400).json({error: err.message});
	}
};

export {queryRequest};
