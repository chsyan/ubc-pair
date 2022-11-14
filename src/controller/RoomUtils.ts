import {get} from "http";
import JSZip from "jszip";
import {parse} from "parse5";
import {ChildNode, Document, DocumentFragment, Element, TextNode} from "parse5/dist/tree-adapters/default";
import {InsightError} from "./IInsightFacade";
import {
	getChildNodes,
	BuildingOnlyInfo,
	blankBuildingInfo,
	getChildText,
	blankRoomOnlyInfo,
	hasAttrValue,
	appendBuildingInfo,
	RoomInfo,
	RoomOnlyInfo,
	populatedRoomOnlyInfo,
	populatedBuildingInfo,
} from "./RoomHelperUtils";

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
	const buildingFiles = parseIndexContent(parse(indexContent));

	if (buildingFiles.length === 0) {
		throw new InsightError("No buildings found in index.htm");
	}

	// Parse each building file
	const rooms: any[] = await parseBuildings(buildingFiles, zip);

	return rooms;
};

// Parse the index file and return an array of building file paths
const parseIndexContent = (document: Document): string[] => {
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

// Given an array of building file paths, parse each building file and return an array of rooms
const parseBuildings = async (buildingFiles: string[], zip: JSZip) => {
	let rooms: RoomInfo[] = [];

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
	return rooms.sort((a, b) => a.shortname.localeCompare(b.shortname));
};

// Parse an individual building document/file
const parseBuilding = async (document: Document): Promise<RoomInfo[]> => {
	const roomsOnly: RoomOnlyInfo[] = [];
	let nodes = document.childNodes; // "stack" of nodes to visit

	// Not sure how else to set an variable for http promise, so empty array here
	let httpPromise: Array<Promise<BuildingOnlyInfo>> = [];

	let buildingShortName: string | null = null;

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
			// Building info (excluding shotname) is in a <div> with id "building-info"
			const children = getChildNodes(node);
			httpPromise.push(parseBuildingInfo(children));
		} else if (node.nodeName === "tr") {
			// If <tr> node, try to  parse as room
			const room = parseRoom(node);
			if (room) {
				roomsOnly.push(room);
			}
		} else {
			// Add child nodes to stack and continue searching
			nodes = nodes.concat(getChildNodes(node));
		}
	}

	const buildingInfo = await Promise.any(httpPromise); // Get building info without shortname
	buildingInfo.shortname = buildingShortName; // Add shortname

	// Make sure building info is populated
	if (populatedBuildingInfo(buildingInfo)) {
		// Append building info to each room
		return appendBuildingInfo(roomsOnly, buildingInfo);
	}

	return [];
};

// Given the div nodes containing building info, parse (+ make the http req) and return building info (can have null fields);
const parseBuildingInfo = async (inputNodes: ChildNode[]): Promise<BuildingOnlyInfo> => {
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
		get(
			"http://cs310.students.cs.ubc.ca:11316/api/v1/project_team232/" + buildingInfo.address?.replace(" ", "%20"),
			(res) => {
				// https://www.golinuxcloud.com/http-get-request-in-node-js/
				// Get the raw data from response
				let rawData = "";
				res.on("data", (chunk) => (rawData += chunk));

				// end listener happens when all data is received
				res.on("end", () => {
					const parsedData = JSON.parse(rawData);
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

// Parse a <tr> node and return a room object if it is a valid room. Only returns populated RoomOnlyInfo
const parseRoom = (inputNode: ChildNode): RoomOnlyInfo | null => {
	const room = blankRoomOnlyInfo();
	let nodes = getChildNodes(inputNode);
	while (nodes.length > 0) {
		const node = nodes.pop();
		if (!node) {
			continue;
		}

		// Any room info will be in a <td> node
		if (node.nodeName === "td" && hasAttrValue(node, "class", "views-field")) {
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

	// Make sure all the required fields are not null
	if (populatedRoomOnlyInfo(room)) {
		return room;
	}
	return null;
};

export {parseRooms};
