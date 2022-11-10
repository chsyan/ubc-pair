import JSZip from "jszip";
import {parse} from "parse5";
import {ChildNode, Document, DocumentFragment} from "parse5/dist/tree-adapters/default";
import {InsightError} from "./IInsightFacade";

// Parse the zip file and return an array of room objects
const parseRooms = async (content: string): Promise<any[]> => {
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

	if (!indexFile) {
		throw new InsightError("index.htm not found");
	}

	const indexContent = await indexFile.async("string");
	const document = parse(indexContent);
	const buildingFiles = parseDocument(document);
	if (buildingFiles.length === 0) {
		throw new InsightError("No buildings found in index.htm");
	}
	const rooms: any[] = await parseBuildings(buildingFiles, zip);

	return rooms;
};

const getChildNodes = (node: ChildNode): ChildNode[] => {
	return (node as DocumentFragment).childNodes;
};

const parseDocument = (document: Document): string[] => {
	let nodes = document.childNodes;
	const buildingFiles: string[] = [];
	while (nodes.length > 0) {
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		// Check for <a> node with href to file in campus directory
		// Check that the parent node is <td> with class "views-field"
		if (
			node.nodeName === "a" &&
			node.parentNode?.nodeName === "td" &&
			node.parentNode?.attrs.find(
				(attr) => attr.name === "class" && attr.value.split(" ").includes("views-field")
			)
		) {
			const href = node.attrs?.find((attr) => attr.name === "href");
			if (href && !buildingFiles.includes(href.value) && /^\.?\/?campus\//.test(href.value)) {
				buildingFiles.push(href.value);
			}
		}

		nodes = nodes.concat(getChildNodes(node));
	}
	return buildingFiles;
};

const parseBuildings = async (buildingFiles: string[], zip: JSZip) => {
	const rooms: any[] = [];
	const filePromises = buildingFiles.map(async (filePath) => {
		const file = zip.file(filePath);

		// Skip non files and also satisfy compiler.
		if (file === null) {
			return Promise.resolve();
		}

		return file.async("string").then((fileContent) => {
			// TODO: Parse the html file
		});
	});

	await Promise.all(filePromises);
	return rooms;
};

const parseBuilding = (node: DocumentFragment): any => {
	const room: any = {};
	const childNodes = node.childNodes;
};

export {parseRooms};
