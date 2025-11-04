import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SignatureSvgProps {
  uri: string;
  width: number;
  height: number;
  refreshTrigger?: number;
}

interface ParsedPath {
  d: string;
  stroke?: string;
  strokeWidth?: string;
  fill?: string;
}

const SignatureSvg: React.FC<SignatureSvgProps> = ({ uri, width, height, refreshTrigger }) => {
  const [paths, setPaths] = useState<ParsedPath[]>([]);
  const [viewBox, setViewBox] = useState<string>('0 0 100 100');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndParseSvg = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add cache-busting parameter to force fresh fetch
        const cacheBustUrl = `${uri}?t=${Date.now()}`;
        const response = await fetch(cacheBustUrl, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
        }

        const svgText = await response.text();

        // Extract all path elements and calculate bounding box
        const pathRegex = /<path([^>]*)\/>/g;
        const extractedPaths: ParsedPath[] = [];
        const coordinates: number[] = [];

        let match;
        while ((match = pathRegex.exec(svgText)) !== null) {
          const pathAttrs = match[1];

          const dMatch = pathAttrs.match(/d="([^"]*)"/);
          const strokeMatch = pathAttrs.match(/stroke="([^\"]*)"/);
          const strokeWidthMatch = pathAttrs.match(/stroke-width="([^\"]*)"/);
          const fillMatch = pathAttrs.match(/fill="([^\"]*)"/);

          if (dMatch) {
            const pathData = dMatch[1];
            extractedPaths.push({
              d: pathData,
              stroke: strokeMatch ? strokeMatch[1] : '#000000',
              strokeWidth: strokeWidthMatch ? strokeWidthMatch[1] : '2',
              fill: fillMatch ? fillMatch[1] : 'none',
            });

            // Extract all coordinates from the path data to calculate bounds
            const coordMatches = pathData.matchAll(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g);
            for (const coordMatch of coordMatches) {
              coordinates.push(parseFloat(coordMatch[1]), parseFloat(coordMatch[2]));
            }
          }
        }

        // Calculate bounding box from coordinates
        if (coordinates.length > 0) {
          const xCoords = coordinates.filter((_, i) => i % 2 === 0);
          const yCoords = coordinates.filter((_, i) => i % 2 === 1);

          const minX = Math.min(...xCoords);
          const maxX = Math.max(...xCoords);
          const minY = Math.min(...yCoords);
          const maxY = Math.max(...yCoords);

          const padding = 10; // Add some padding around the signature
          const calculatedViewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
          setViewBox(calculatedViewBox);
        } else {
          // Fallback to default if no coordinates found
          setViewBox('0 0 500 200');
        }

        setPaths(extractedPaths);
        setLoading(false);
      } catch (err) {
        console.error('Error loading SVG:', err);
        setError(err instanceof Error ? err.message : 'Failed to load signature');
        setLoading(false);
      }
    };

    if (uri) {
      fetchAndParseSvg();
    }
  }, [uri, refreshTrigger]);

  if (loading) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: '#999' }}>Failed to load signature</Text>
      </View>
    );
  }

  if (paths.length === 0) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: '#999' }}>No signature data</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={width} height={height} viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {paths.map((path, index) => (
          <Path
            key={index}
            d={path.d}
            stroke={path.stroke}
            strokeWidth={path.strokeWidth}
            fill={path.fill}
          />
        ))}
      </Svg>
    </View>
  );
};

export default SignatureSvg;
