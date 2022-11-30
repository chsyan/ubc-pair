import {Request, Response} from "express";
import InsightFacade from "../controller/InsightFacade";

const avgIDRequest = async (req: Request, res: Response, facade: InsightFacade) => {
	try {
		if (isNaN(Number(req.params.percent))) {
			throw new Error("Percent Value Must be a Number");
		} else {
			const percent = Number(req.params.percent);
			const id = req.params.id;
			const idAvg = id + "_avg";
			let obj: any = {};
			obj[idAvg] = percent;
			const avgQuery = {
				WHERE: {
					GT: obj,
				},
				OPTIONS: {
					COLUMNS: ["overallAvg", `${id}_title`],
					ORDER: {
						dir: "DOWN",
						keys: ["overallAvg"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: [`${id}_title`],
					APPLY: [
						{
							overallAvg: {
								AVG: `${id}_avg`,
							},
						},
					],
				},
			};
			const response = await facade.performQuery(avgQuery);
			res.status(200).json({result: response});
		}
	} catch (err: any) {
		res.status(400).json({error: err.message});
	}
};

export {avgIDRequest};
