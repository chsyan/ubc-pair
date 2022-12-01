import {Request, Response} from "express";
import InsightFacade from "../controller/InsightFacade";

const avgRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	try {
		if (isNaN(Number(req.params.percent))) {
			throw new Error("Percent Value Must be a Number");
		} else {
			const percent = Number(req.params.percent);
			const avgQuery = {
				WHERE: {
					GT: {
						sections_avg: percent
					},
				},
				OPTIONS: {
					COLUMNS: ["overallAvg", "sections_title"],
					ORDER: {
						dir: "DOWN",
						keys: ["overallAvg"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_title"],
					APPLY: [
						{
							overallAvg: {
								AVG: "sections_avg",
							},
						},
					],
				},
			};
			const response = await facade.performQuery(avgQuery);
			res.status(200).json({result: response});
		}
	} catch (err: any) {
		if (err.message === "Query references dataset not added") {
			res.status(400).json({error: "No 'sections' dataset has been added yet"});
		} else {
			res.status(400).json({error: err.message});
		}
	}
};

export {avgRequest};
