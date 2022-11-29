import {Request, Response} from "express";
import {InsightError, NotFoundError} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

const removeRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	try {
		console.log(`Server::removeRequest(..) - params: ${JSON.stringify(req.params)}`);
		const response = await facade.removeDataset(req.params.id);
		res.status(200).send(response);
	} catch (err: any) {
		if (err instanceof InsightError) {
			res.status(400).send(err.message);
		} else if (err instanceof NotFoundError) {
			res.status(404).send(err.message);
		} else {
			res.status(400).send("Invalid Delete Request");
		}
	}
};

export {removeRequest};
