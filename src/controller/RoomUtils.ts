import {get} from "http";
import JSZip from "jszip";
import {parse} from "parse5";
import {ChildNode, Document, DocumentFragment, Element, TextNode} from "parse5/dist/tree-adapters/default";
import {InsightError} from "./IInsightFacade";
interface BuildingInfo {
	fullname: string | null;
	shortname: string | null;
	address: string | null;
	lat: number | null;
	lon: number | null;
}

interface RoomOnlyInfo {
	number: string | null;
	seats: number | null;
	type: string | null;
	furniture: string | null;
	href: string | null;
}

const blankBuildingInfo = (): BuildingInfo => {
	return {fullname: null, shortname: null, address: null, lat: null, lon: null};
};

const blankRoomOnlyInfo = (): RoomOnlyInfo => {
	return {number: null, seats: null, type: null, furniture: null, href: null};
};

const getChildText = (node: ChildNode): string => {
	const textNode = (node as DocumentFragment).childNodes.find((child) => child.nodeName === "#text") as TextNode;
	return textNode?.value.trim();
};

const getChildNodes = (node: ChildNode): ChildNode[] => {
	return (node as DocumentFragment).childNodes;
};

const hasAttrValue = (node: Element, attrName: string, attrValue: string): boolean => {
	return node.attrs.some((attr) => attr.name === attrName && attr.value.split(" ").includes(attrValue));
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
			// Regex to check if href is a file path in ./campus/ dir
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
	let promises: Array<Promise<BuildingInfo | null>> = [];
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
	if (!buildingInfo) {
		return [];
	}
	buildingInfo.shortname = buildingShortName;

	// Append building info to each room
	// rooms_name: string; The room id; should be rooms_shortname+"_"+rooms_number.

	return rooms;
};

const parseBuildingInfo = async (inputNodes: ChildNode[]): Promise<BuildingInfo | null> => {
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
			const span = node.childNodes.find((child) => child.nodeName === "span");
			if (span) {
				buildingInfo.fullname = getChildText(span);
			}
		} else if (
			node.nodeName === "div" &&
			node.attrs?.find((attr) => attr.name === "class" && attr.value === "field-content")
		) {
			// Building address is in a <div> with class "field-content"
			buildingInfo.address = getChildText(node);
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
				res.on("data", (chunk) => (rawData += chunk));

				res.on("end", () => {
					const parsedData = JSON.parse(rawData);
					if (!parsedData.error) {
						buildingInfo.lat = parsedData.lat;
						buildingInfo.lon = parsedData.lon;
						resolve(buildingInfo);
					}
					resolve(null);
				});
			}
		);
	});
};

// Parse a <tr> node and return a room object if it is a valid room
const parseRoom = (inputNode: ChildNode): any => {
	const room = blankRoomOnlyInfo();
	let nodes = getChildNodes(inputNode);
	while (nodes.length > 0) {
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		// Any room info will be in a <td> node
		if (node.nodeName === "td") {
			if (hasAttrValue(node, "class", "views-field-field-room-number")) {
				const a = node.childNodes.find((child) => child.nodeName === "a") as Element;
				const value = a.attrs?.find((attr) => attr.name === "href")?.value;
				if (value) {
					room.href = value;
				}
				room.number = getChildText(a);
			} else if (hasAttrValue(node, "class", "views-field-field-room-capacity")) {
				room.seats = +getChildText(node);
			} else if (hasAttrValue(node, "class", "views-field-field-room-furniture")) {
				room.furniture = getChildText(node);
			} else if (hasAttrValue(node, "class", "views-field-field-room-type")) {
				room.type = getChildText(node);
			}
		} else {
			nodes = nodes.concat(getChildNodes(node));
		}
	}

	if (room.number && room.seats && room.type && room.furniture && room.href) {
		return room;
	}
	return null;
};

export {parseRooms};
