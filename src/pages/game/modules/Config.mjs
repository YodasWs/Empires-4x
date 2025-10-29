export const tileWidth = 200;
export const unitWidth = 80;
export const depths = {
	offscreen: 0,
	map: 1,
	territoryFills: 2,
	territoryLines: 2,
	improvement: 5,
	road: 6,
	cities: 10,
	inactiveUnits: 11,
	goods: 20,
	actionSprites: 98,
	activeUnit: 100,
};

// Helper to find a point along a line between two points
export function lineShift(point1, point2, t = 0.9) {
	const m = (point1.y - point2.y) / (point1.x - point2.x)
	const b = point1.y - m * point1.x
	const x = (point1.x - point2.x) * t + point2.x;
	return {
		x,
		y: m * x + b,
	};
}
