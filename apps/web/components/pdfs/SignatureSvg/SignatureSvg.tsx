import { View, StyleSheet, Svg, Path } from '@react-pdf/renderer';

type SignatureSvgProps = {
  signaturePaths?: string[];
  signatureViewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  width?: number;
  height?: number;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0, // 10
  },
});

const SignatureSvg = ({
  signaturePaths,
  signatureViewBox,
  width = 120,
  height = 60,
}: SignatureSvgProps) => {
  // Use provided signature data or fallback to default
  const paths =
    signaturePaths && signaturePaths.length > 0
      ? signaturePaths
      : ['M 20,80 C 40,10 60,10 80,80 S 120,150 160,80'];

  const viewBox = signatureViewBox || { x: 0, y: 0, width: 300, height: 150 };

  // Calculate scale to fit the signature within the specified dimensions
  const scaleX = width / viewBox.width;
  const scaleY = height / viewBox.height;
  const scale = Math.min(scaleX, scaleY);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg
        width={width}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        {paths.map((pathData) => (
          <Path
            key={`signature-path-${pathData.substring(0, 10)}`}
            d={pathData}
            stroke="black"
            strokeWidth={2}
            fill="none"
            transform={`scale(${scale})`}
          />
        ))}
      </Svg>
    </View>
  );
};

export default SignatureSvg;
