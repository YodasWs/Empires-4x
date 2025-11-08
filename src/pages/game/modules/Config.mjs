export const scale = 0.5;
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

if (globalThis.window === undefined) {
	globalThis.window = {
		visualViewport: {
			height: 1080,
			width: 1920,
		},
	};
}

export const getWindowConfig = () => ({
	height: window.visualViewport.height / scale,
	width: window.visualViewport.width / scale,
	offscreen: Math.max(window.visualViewport.width, window.visualViewport.height) * -2,
});

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
