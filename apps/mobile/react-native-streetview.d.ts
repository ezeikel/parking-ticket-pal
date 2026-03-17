declare module 'react-native-streetview' {
  import { Component } from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  interface StreetViewProps {
    style?: StyleProp<ViewStyle>;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    pov?: {
      tilt: number;
      bearing: number;
      zoom: number;
    };
    allGesturesEnabled?: boolean;
    onError?: (event: { nativeEvent: { error: string } }) => void;
    onSuccess?: (event: { nativeEvent: { success: boolean } }) => void;
  }

  export default class StreetView extends Component<StreetViewProps> {}
}
