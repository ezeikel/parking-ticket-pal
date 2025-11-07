import {
  OpenCV,
  ObjectType,
  DataTypes,
  InterpolationFlags,
  BorderTypes,
} from 'react-native-fast-opencv';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

/**
 * Orders document corners in consistent order:
 * [top-left, top-right, bottom-right, bottom-left]
 *
 * Algorithm:
 * 1. Find center point of all corners
 * 2. Sort by angle from center
 * 3. Identify top-left as corner with smallest x+y sum
 * 4. Order remaining corners clockwise from top-left
 */
export const orderCorners = (corners: DocumentCorner[]): DocumentCorner[] => {
  if (corners.length !== 4) {
    throw new Error('Exactly 4 corners required for ordering');
  }

  // Calculate center point
  const centerX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
  const centerY = corners.reduce((sum, c) => sum + c.y, 0) / 4;

  // Sort corners by angle from center (clockwise from top)
  const sortedCorners = [...corners].sort((a, b) => {
    const angleA = Math.atan2(a.y - centerY, a.x - centerX);
    const angleB = Math.atan2(b.y - centerY, b.x - centerX);
    return angleA - angleB;
  });

  // Find top-left corner (smallest x + y sum)
  let topLeftIndex = 0;
  let minSum = sortedCorners[0].x + sortedCorners[0].y;

  for (let i = 1; i < 4; i++) {
    const sum = sortedCorners[i].x + sortedCorners[i].y;
    if (sum < minSum) {
      minSum = sum;
      topLeftIndex = i;
    }
  }

  // Reorder starting from top-left, going clockwise
  const ordered: DocumentCorner[] = [];
  for (let i = 0; i < 4; i++) {
    ordered.push(sortedCorners[(topLeftIndex + i) % 4]);
  }

  return ordered;
};

/**
 * Calculate optimal destination rectangle dimensions
 * Preserves aspect ratio of detected document
 *
 * @param corners Ordered corners [TL, TR, BR, BL]
 * @returns Width and height for destination rectangle
 */
export const calculateDestinationSize = (corners: DocumentCorner[]): { width: number; height: number } => {
  if (corners.length !== 4) {
    throw new Error('Exactly 4 corners required');
  }

  const [topLeft, topRight, bottomRight, bottomLeft] = corners;

  // Calculate distances between corners
  const distance = (p1: DocumentCorner, p2: DocumentCorner) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Calculate width (use maximum of top and bottom edge lengths)
  const topWidth = distance(topLeft, topRight);
  const bottomWidth = distance(bottomLeft, bottomRight);
  const width = Math.max(topWidth, bottomWidth);

  // Calculate height (use maximum of left and right edge lengths)
  const leftHeight = distance(topLeft, bottomLeft);
  const rightHeight = distance(topRight, bottomRight);
  const height = Math.max(leftHeight, rightHeight);

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

/**
 * Apply perspective transform to correct document perspective
 *
 * Takes a captured photo and detected corners, applies perspective
 * correction to produce a flat, rectangular document image.
 *
 * @param imageBase64 Base64 encoded image data
 * @param corners Detected document corners (will be ordered automatically)
 * @returns Base64 encoded corrected image
 */
export const applyPerspectiveTransform = (
  imageBase64: string,
  corners: DocumentCorner[]
): string | null => {
  'worklet';

  if (!corners || corners.length !== 4) {
    console.error('Invalid corners for perspective transform');
    return null;
  }

  try {
    // 1. Order corners consistently
    const orderedCorners = orderCorners(corners);

    // 2. Calculate destination size
    const destSize = calculateDestinationSize(orderedCorners);

    // Limit maximum size to prevent memory issues
    const MAX_DIMENSION = 2000;
    let { width, height } = destSize;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // 3. Decode base64 to Mat
    // Note: This is a simplified version - actual implementation depends on
    // how your base64 image data is structured (with/without data URI prefix)
    // You may need to use a different approach to convert base64 to Mat
    // For now, this shows the OpenCV operations needed

    // TODO: Implement proper base64 to Mat conversion
    // This might require using a different approach or native module
    // since fast-opencv doesn't have direct base64 decode support

    // 4. Create source points (detected corners)
    const srcPoints = OpenCV.createObject(
      ObjectType.Point2fVector,
      orderedCorners.map((corner) =>
        OpenCV.createObject(ObjectType.Point2f, corner.x, corner.y)
      )
    );

    // 5. Create destination points (rectangle)
    const dstPoints = OpenCV.createObject(
      ObjectType.Point2fVector,
      [
        OpenCV.createObject(ObjectType.Point2f, 0, 0), // Top-left
        OpenCV.createObject(ObjectType.Point2f, width, 0), // Top-right
        OpenCV.createObject(ObjectType.Point2f, width, height), // Bottom-right
        OpenCV.createObject(ObjectType.Point2f, 0, height), // Bottom-left
      ]
    );

    // 6. Get perspective transformation matrix
    const matrix = OpenCV.invoke('getPerspectiveTransform', srcPoints, dstPoints);

    // 7. Apply perspective warp
    // Note: srcMat should be created from the captured photo
    // This is a placeholder showing the OpenCV operation
    /*
    const dstMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
    OpenCV.invoke(
      'warpPerspective',
      srcMat, // Source image Mat
      dstMat, // Destination Mat
      matrix, // Transformation matrix
      OpenCV.createObject(ObjectType.Size, width, height), // Output size
      InterpolationFlags.INTER_LINEAR, // Interpolation method
      BorderTypes.BORDER_CONSTANT, // Border mode
      OpenCV.createObject(ObjectType.Scalar, 255, 255, 255) // White border
    );

    // 8. Convert Mat back to base64
    // TODO: Implement Mat to base64 conversion
    const resultBase64 = matToBase64(dstMat);
    */

    // 9. Clean up OpenCV objects
    OpenCV.clearBuffers();

    // TODO: Return actual transformed image
    // For now, return null to indicate this needs proper implementation
    return null;

  } catch (error) {
    console.error('Perspective transform error:', error);
    OpenCV.clearBuffers(); // Ensure cleanup on error
    return null;
  }
};

/**
 * Helper function to calculate if perspective correction is needed
 * Returns true if document appears significantly skewed
 */
export const needsPerspectiveCorrection = (corners: DocumentCorner[]): boolean => {
  if (corners.length !== 4) return false;

  const ordered = orderCorners(corners);
  const [topLeft, topRight, bottomRight, bottomLeft] = ordered;

  // Calculate angles between edges
  const calculateAngle = (p1: DocumentCorner, p2: DocumentCorner, p3: DocumentCorner): number => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const angleRad = Math.acos(dot / (mag1 * mag2));
    return (angleRad * 180) / Math.PI;
  };

  // Check all four corner angles
  // For a rectangle, all angles should be close to 90 degrees
  const angles = [
    calculateAngle(bottomLeft, topLeft, topRight),
    calculateAngle(topLeft, topRight, bottomRight),
    calculateAngle(topRight, bottomRight, bottomLeft),
    calculateAngle(bottomRight, bottomLeft, topLeft),
  ];

  // If any angle deviates more than 15 degrees from 90, correction is needed
  const ANGLE_THRESHOLD = 15;
  return angles.some((angle) => Math.abs(angle - 90) > ANGLE_THRESHOLD);
};

/**
 * Get transformation matrix for perspective correction
 * This can be reused if capturing multiple frames of the same document
 */
export const getPerspectiveTransformMatrix = (
  corners: DocumentCorner[],
  outputWidth: number,
  outputHeight: number
) => {
  'worklet';

  const orderedCorners = orderCorners(corners);

  const srcPoints = OpenCV.createObject(
    ObjectType.Point2fVector,
    orderedCorners.map((corner) =>
      OpenCV.createObject(ObjectType.Point2f, corner.x, corner.y)
    )
  );

  const dstPoints = OpenCV.createObject(
    ObjectType.Point2fVector,
    [
      OpenCV.createObject(ObjectType.Point2f, 0, 0),
      OpenCV.createObject(ObjectType.Point2f, outputWidth, 0),
      OpenCV.createObject(ObjectType.Point2f, outputWidth, outputHeight),
      OpenCV.createObject(ObjectType.Point2f, 0, outputHeight),
    ]
  );

  const matrix = OpenCV.invoke('getPerspectiveTransform', srcPoints, dstPoints);

  return matrix;
};
