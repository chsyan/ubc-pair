import {Request, Response} from "express";
import InsightFacade from "../controller/InsightFacade";

const listRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	const response = await facade.listDatasets();
	res.status(200).send(response);
};

export {listRequest};
