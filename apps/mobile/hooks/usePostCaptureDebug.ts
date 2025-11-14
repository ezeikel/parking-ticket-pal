import { useReducer, useCallback } from 'react';

/**
 * Debug state for PostCapturePreview component
 * Tracks the rendering pipeline to diagnose corner visibility issues
 */
export type PostCaptureDebugState = {
  componentInitialized: boolean;
  hasImageBase64: boolean;
  imageBase64Length: number;
  hasDetectedCorners: boolean;
  detectedCornersCount: number;
  initialCornersSet: boolean;
  imageDimensionsReceived: boolean;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  imageRatio: number;
  containerRatio: number;
  displayBoundsCalculated: boolean;
  displayWidth: number;
  displayHeight: number;
  displayOffsetX: number;
  displayOffsetY: number;
  scaledCornersCount: number;
  overlayRendering: boolean;
  svgLinesRendering: boolean;
  svgLineCount: number;
  cornerHandlesRendering: boolean;
  cornerHandleCount: number;
  lastLayoutUpdate: string;
};

/**
 * Actions for debug state reducer
 * Each action represents a specific stage in the rendering pipeline
 */
export type DebugAction =
  | {
      type: 'COMPONENT_INIT';
      payload: {
        hasImageBase64: boolean;
        imageBase64Length: number;
        hasDetectedCorners: boolean;
        detectedCornersCount: number;
      };
    }
  | {
      type: 'IMAGE_DIMENSIONS_RECEIVED';
      payload: { width: number; height: number };
    }
  | { type: 'IMAGE_DIMENSIONS_FAILED' }
  | {
      type: 'LAYOUT_UPDATED';
      payload: { containerWidth: number; containerHeight: number };
    }
  | {
      type: 'DISPLAY_BOUNDS_CALCULATED';
      payload: {
        imageRatio: number;
        containerRatio: number;
        displayWidth: number;
        displayHeight: number;
        displayOffsetX: number;
        displayOffsetY: number;
      };
    }
  | { type: 'DISPLAY_BOUNDS_FAILED' }
  | { type: 'CORNERS_SCALED'; payload: { count: number } }
  | {
      type: 'OVERLAY_RENDERING';
      payload: { rendering: boolean; cornerHandleCount: number };
    }
  | {
      type: 'SVG_LINES_RENDERING';
      payload: { rendering: boolean; lineCount: number };
    };

/**
 * Initial debug state
 */
const initialState: PostCaptureDebugState = {
  componentInitialized: false,
  hasImageBase64: false,
  imageBase64Length: 0,
  hasDetectedCorners: false,
  detectedCornersCount: 0,
  initialCornersSet: false,
  imageDimensionsReceived: false,
  imageWidth: 0,
  imageHeight: 0,
  containerWidth: 0,
  containerHeight: 0,
  imageRatio: 0,
  containerRatio: 0,
  displayBoundsCalculated: false,
  displayWidth: 0,
  displayHeight: 0,
  displayOffsetX: 0,
  displayOffsetY: 0,
  scaledCornersCount: 0,
  overlayRendering: false,
  svgLinesRendering: false,
  svgLineCount: 0,
  cornerHandlesRendering: false,
  cornerHandleCount: 0,
  lastLayoutUpdate: '',
};

/**
 * Reducer for debug state
 * Handles all state transitions with clear action types
 */
function debugReducer(
  state: PostCaptureDebugState,
  action: DebugAction
): PostCaptureDebugState {
  switch (action.type) {
    case 'COMPONENT_INIT':
      return {
        ...state,
        componentInitialized: true,
        hasImageBase64: action.payload.hasImageBase64,
        imageBase64Length: action.payload.imageBase64Length,
        hasDetectedCorners: action.payload.hasDetectedCorners,
        detectedCornersCount: action.payload.detectedCornersCount,
        initialCornersSet: true,
      };

    case 'IMAGE_DIMENSIONS_RECEIVED':
      return {
        ...state,
        imageDimensionsReceived: true,
        imageWidth: action.payload.width,
        imageHeight: action.payload.height,
      };

    case 'IMAGE_DIMENSIONS_FAILED':
      return {
        ...state,
        imageDimensionsReceived: false,
      };

    case 'LAYOUT_UPDATED':
      return {
        ...state,
        containerWidth: action.payload.containerWidth,
        containerHeight: action.payload.containerHeight,
        lastLayoutUpdate: new Date().toLocaleTimeString(),
      };

    case 'DISPLAY_BOUNDS_CALCULATED':
      return {
        ...state,
        imageRatio: action.payload.imageRatio,
        containerRatio: action.payload.containerRatio,
        displayBoundsCalculated: true,
        displayWidth: action.payload.displayWidth,
        displayHeight: action.payload.displayHeight,
        displayOffsetX: action.payload.displayOffsetX,
        displayOffsetY: action.payload.displayOffsetY,
      };

    case 'DISPLAY_BOUNDS_FAILED':
      return {
        ...state,
        displayBoundsCalculated: false,
      };

    case 'CORNERS_SCALED':
      return {
        ...state,
        scaledCornersCount: action.payload.count,
      };

    case 'OVERLAY_RENDERING':
      return {
        ...state,
        overlayRendering: action.payload.rendering,
        cornerHandlesRendering: action.payload.rendering,
        cornerHandleCount: action.payload.cornerHandleCount,
      };

    case 'SVG_LINES_RENDERING':
      return {
        ...state,
        svgLinesRendering: action.payload.rendering,
        svgLineCount: action.payload.lineCount,
      };

    default:
      return state;
  }
}

/**
 * Custom hook for PostCapturePreview debug state
 * Only active when enabled (preview builds with EXPO_PUBLIC_SHOW_DEBUG_PANELS)
 *
 * @param enabled - Whether debug tracking is enabled
 * @returns Debug state and dispatch function
 */
export function usePostCaptureDebug(enabled: boolean) {
  const [state, dispatch] = useReducer(debugReducer, initialState);

  // Return null state and no-op dispatch if disabled
  // This allows production builds to completely skip debug overhead
  if (!enabled) {
    return {
      debugState: null,
      dispatch: () => {},
    };
  }

  return {
    debugState: state,
    dispatch,
  };
}
