import {Request, Response} from "express";
import {InsightDatasetKind} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

const addRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	try {
		console.log(`Server::addRequest(..) - params: ${JSON.stringify(req.params)}`);
		let kind: InsightDatasetKind;
		if (req.params.kind === InsightDatasetKind.Sections) {
			kind = InsightDatasetKind.Sections;
		} else if (req.params.kind === InsightDatasetKind.Rooms) {
			kind = InsightDatasetKind.Rooms;
		} else {
			throw new Error("Invalid InsightDatasetKind");
		}
		const response = await facade.addDataset(req.params.id, req.body, kind);
		res.status(200).json({result: response});
	} catch (err: any) {
		res.status(400).json({error: err.message});
	}
};

export {addRequest};
