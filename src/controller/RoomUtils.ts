import {rejects} from "assert";
import {get} from "http";
import JSZip from "jszip";
import {parse} from "parse5";
import {ChildNode, Document, DocumentFragment, Node, TextNode} from "parse5/dist/tree-adapters/default";
import {InsightError} from "./IInsightFacade";
interface BuildingInfo {
	fullname: string | null;
	shortname: string | null;
	address: string | null;
	lat: number | null;
	lon: number | null;
}

const blankBuildingInfo = (): BuildingInfo => {
	return {
		fullname: null,
		shortname: null,
		address: null,
		lat: null,
		lon: null,
	};
};

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

	// Parse index.htm
	const indexContent = await indexFile.async("string");
	const buildingFiles = parseDocument(parse(indexContent));

	if (buildingFiles.length === 0) {
		throw new InsightError("No buildings found in index.htm");
	}

	// Parse each building file
	const rooms: any[] = await parseBuildings(buildingFiles, zip);
	return rooms;
};

const getChildNodes = (node: ChildNode): ChildNode[] => {
	return (node as DocumentFragment).childNodes;
};

const parseDocument = (document: Document): string[] => {
	let nodes = document.childNodes; // "stack" of nodes to visit
	const buildingFiles: string[] = [];
	while (nodes.length > 0) {
		// Get the next node to visit
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		// Not sure if there could be multiple <a> nodes in a <td> node, this accounts for that
		if (
			node.nodeName === "a" && // Check for <a> node
			node.parentNode?.nodeName === "td" && // Check for <td> parent node
			node.parentNode?.attrs.find(
				// Check for class attribute "views-field"
				(attr) => attr.name === "class" && attr.value.split(" ").includes("views-field")
			)
		) {
			// File path is in href attribute
			const href = node.attrs?.find((attr) => attr.name === "href");
			// Remove leading ./ or / from file path
			const path = href?.value.replace(/^\.?\/?/, "");
			// Regex to check if href is a file path in ./campus dir
			if (path && !buildingFiles.includes(path) && /^campus\//.test(path)) {
				buildingFiles.push(path);
			}
		} else {
			// Add child nodes to stack
			nodes = nodes.concat(getChildNodes(node));
		}
	}
	return buildingFiles;
};

const parseBuildings = async (buildingFiles: string[], zip: JSZip) => {
	let rooms: any[] = [];

	// Parse each building file
	const filePromises = buildingFiles.map(async (filePath) => {
		const file = zip.file(filePath);

		// Skip non files
		if (file === null) {
			return Promise.resolve();
		}

		return file.async("string").then(async (fileContent) => {
			const buildingRooms = await parseBuilding(parse(fileContent));
			if (buildingRooms.length > 0) {
				rooms = rooms.concat(buildingRooms);
			}
		});
	});

	await Promise.all(filePromises);
	return rooms;
};

const parseBuilding = async (document: Document): Promise<any> => {
	const rooms = [];
	let nodes = document.childNodes; // "stack" of nodes to visit
	let promises: Array<Promise<BuildingInfo>> = [];
	let buildingShortName = "";

	// Look for rooms and building info
	while (nodes.length > 0) {
		// Get the next node to visit
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		// Not sure where exactly shortname is, so I'm just going to assume it's in the the canonical link
		if (
			node.nodeName === "link" &&
			node.attrs?.find((attr) => attr.name === "rel" && attr.value.split(" ").includes("canonical"))
		) {
			const href = node.attrs?.find((attr) => attr.name === "href");
			if (href) {
				buildingShortName = href.value.trim();
			}
		} else if (
			node.nodeName === "div" &&
			node.attrs?.find((attr) => attr.name === "id" && attr.value.split(" ").includes("building-info"))
		) {
			// Building info is in a <div> with id "building-info"
			const children = getChildNodes(node);
			promises.push(parseBuildingInfo(children));
		} else if (node.nodeName === "tr") {
			// If <tr> node, try to  parse as room
			const room = parseRoom(node);
			if (room) {
				rooms.push(room);
			}
		} else {
			// Add child nodes to stack and continue searching
			nodes = nodes.concat(getChildNodes(node));
		}
	}

	const buildingInfo = await Promise.any(promises);
	buildingInfo.shortname = buildingShortName;

	return rooms;
};

const parseBuildingInfo = async (inputNodes: ChildNode[]): Promise<BuildingInfo> => {
	const buildingInfo = blankBuildingInfo();
	let nodes = [...inputNodes];
	while (nodes.length > 0) {
		// Get the next node to visit
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		if (node.nodeName === "h2") {
			// Building name is in <h2> node
			// Look into the span node for the building name
			const span = node.childNodes.find((child) => child.nodeName === "span") as DocumentFragment;
			const text = span?.childNodes.find((child) => child.nodeName === "#text") as TextNode;
			buildingInfo.fullname = text.value.trim();
		} else if (
			node.nodeName === "div" &&
			node.attrs?.find((attr) => attr.name === "class" && attr.value === "field-content")
		) {
			// Building address is in a <div> with class "field-content"
			const text = node.childNodes.find((child) => child.nodeName === "#text") as TextNode;
			buildingInfo.address = text?.value.trim();
		} else {
			nodes = nodes.concat(getChildNodes(node));
		}
	}

	return new Promise((resolve) => {
		// https://www.golinuxcloud.com/http-get-request-in-node-js/
		get(
			"http://cs310.students.cs.ubc.ca:11316/api/v1/project_team232/" + buildingInfo.address?.replace(" ", "%20"),
			(res) => {
				// get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team232/6270%20University%20Boulevard", (res) => {
				let rawData = "";
				res.on("data", (chunk) => {
					rawData += chunk;
				});

				res.on("end", () => {
					const parsedData = JSON.parse(rawData);
					// console.log(parsedData);
					if (!parsedData.error) {
						buildingInfo.lat = parsedData.lat;
						buildingInfo.lon = parsedData.lon;
					}
					resolve(buildingInfo);
				});
			}
		);
	});
};

// Parse a <tr> node and return a room object if it is a valid room
const parseRoom = (node: ChildNode): any => {
	// rooms_fullname: string; Full building name (e.g., "Hugh Dempster Pavilion").
	// rooms_shortname: string; Short building name (e.g., "DMP").
	// rooms_number: string; The room number. Not always a number, so represented as a string.
	// rooms_name: string; The room id; should be rooms_shortname+"_"+rooms_number.
	// rooms_address: string; The building address. (e.g., "6245 Agronomy Road V6T 1Z4").
	// rooms_lat: number; The latitude of the building, as received via HTTP request.
	// rooms_lon: number; The longitude of the building, as received via HTTP request.
	// rooms_seats: number; The number of seats in the room. The default value for this field is 0.
	// rooms_type: string; The room type (e.g., "Small Group").
	// rooms_furniture: string; The room furniture (e.g., "Classroom-Movable Tables & Chairs").
	// rooms_href: string; The link to full details online (e.g., "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201").
	return null;
};

export {parseRooms};
