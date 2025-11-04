type Point = {
  x: number;
  y: number;
  time: number;
};

// convert point group data to SVG path
export const pointsToSvg = (pointGroups: Point[][]): string => {
  try {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 500 200">`;

    pointGroups.forEach((points) => {
      if (points.length === 0) return;

      let path = `<path d="M ${points[0].x} ${points[0].y}`;

      // add line segments to each point
      for (let i = 1; i < points.length; i += 1) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }

      // close the path
      path += `" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
      svg += path;
    });

    // close SVG
    svg += `</svg>`;

    return svg;
  } catch (error) {
    console.error('Error in pointsToSvg:', error);
    throw error;
  }
};

export const convertSignaturePointsToSvg = async (
  jsonString: string,
): Promise<string> => {
  try {
    const parsed = JSON.parse(jsonString);

    // Check if it's already SVG data from mobile (expo-drawpad)
    if (parsed.svg && typeof parsed.svg === 'string') {
      // Mobile sends { svg: "<svg>...</svg>" }
      return parsed.svg;
    }

    // Otherwise, it's point groups from web (react-signature-canvas)
    const svg = pointsToSvg(parsed);

    return svg;
  } catch (error) {
    console.error('Error in convertSignaturePointsToSvg:', error);
    throw new Error('Invalid signature point data format');
  }
};
