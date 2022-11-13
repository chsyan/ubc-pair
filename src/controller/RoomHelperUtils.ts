import {ChildNode, DocumentFragment, TextNode, Element} from "parse5/dist/tree-adapters/default";

// nulls are helpful for logic
interface BuildingOnlyInfo {
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

interface RoomInfo {
	fullname: string;
	shortname: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	number: string;
	seats: number;
	type: string;
	furniture: string;
	href: string;
}

// Create object with null fields
const blankBuildingInfo = (): BuildingOnlyInfo => {
	return {fullname: null, shortname: null, address: null, lat: null, lon: null};
};

const blankRoomOnlyInfo = (): RoomOnlyInfo => {
	return {number: null, seats: null, type: null, furniture: null, href: null};
};

// Probably a better way to do this, loop over object keys?
const populatedBuildingInfo = (buildingInfo: BuildingOnlyInfo): boolean => {
	return (
		buildingInfo.fullname !== null &&
		buildingInfo.shortname !== null &&
		buildingInfo.address !== null &&
		buildingInfo.lat !== null &&
		buildingInfo.lon !== null
	);
};

const populatedRoomOnlyInfo = (roomOnlyInfo: RoomOnlyInfo): boolean => {
	return (
		roomOnlyInfo.number !== null &&
		roomOnlyInfo.seats !== null &&
		roomOnlyInfo.type !== null &&
		roomOnlyInfo.furniture !== null &&
		roomOnlyInfo.href !== null
	);
};

// Some helpers for common actions

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

// Given an array of RoomOnlyInfo, return an array of RoomInfo by appending building info to it
// Assumes that both room and building only infos are "populated" (no null fields)
const appendBuildingInfo = (roomsOnlyInfo: RoomOnlyInfo[], buildingInfo: BuildingOnlyInfo) => {
	return roomsOnlyInfo.map((roomOnly) => {
		return {
			...buildingInfo,
			...roomOnly,
			name: buildingInfo.shortname + "_" + roomOnly.number,
		} as RoomInfo;
	});
};

export {
	BuildingOnlyInfo,
	RoomOnlyInfo,
	RoomInfo,
	blankBuildingInfo,
	blankRoomOnlyInfo,
	populatedBuildingInfo,
	populatedRoomOnlyInfo,
	getChildText,
	getChildNodes,
	hasAttrValue,
	appendBuildingInfo,
};
