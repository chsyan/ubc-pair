import JSZip from "jszip";
import {parse} from "parse5";
import {DocumentFragment} from "parse5/dist/tree-adapters/default";
import {InsightError} from "./IInsightFacade";

// Parse the zip file and return an array of room objects
const parseRooms = async (content: string): Promise<any[]> => {
	const rooms: any[] = [];

	// JSZip requied content to be b64e buffer
	const contentEncoded = Buffer.from(content, "base64");

	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(contentEncoded);
	} catch (err) {
		throw new InsightError("Error decoding zip file");
	}

	// Look for index.htm
	const indexFile = zip.file("index.htm");

	if (indexFile === null) {
		throw new InsightError("index.htm not found");
	}

	const indexContent = await indexFile.async("string");
	const document = parse(indexContent);
	let nodes = document.childNodes;
	const buildingFiles: string[] = [];
	while (nodes.length > 0) {
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		// Check for <tr> node
		// Must have class name of "views-field"
		if (node.nodeName === "tr") {
			// Check for <a> node
		}

		const childNodes = (node as DocumentFragment).childNodes;
		if (childNodes) {
			nodes = nodes.concat(childNodes);
		}
	}

	// if (rooms.length === 0) {
	// 	throw new InsightError("Must have at least one valid section");
	// }
	return rooms;
};

const parseBuilding = (node: DocumentFragment): any => {
	const room: any = {};
	const childNodes = node.childNodes;
};

export {parseRooms};
