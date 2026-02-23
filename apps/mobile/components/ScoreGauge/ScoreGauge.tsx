import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLock } from '@fortawesome/pro-solid-svg-icons';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type ScoreGaugeProps = {
  score: number;
  size?: 'sm' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  locked?: boolean;
  potentialSavings?: number;
  showSavings?: boolean;
};

const getScoreColor = (score: number) => {
  if (score >= 60) return { stroke: '#00A699', label: 'Good' };
  if (score >= 40) return { stroke: '#FFB400', label: 'Fair' };
  return { stroke: '#FF5A5F', label: 'Low' };
};

const sizeConfig = {
  sm: {
    width: 64,
    height: 36,
    strokeWidth: 5,
    scoreFontSize: 14,
    labelFontSize: 8,
    lockIconSize: 8,
  },
  lg: {
    width: 140,
    height: 78,
    strokeWidth: 8,
    scoreFontSize: 28,
    labelFontSize: 12,
    lockIconSize: 12,
  },
};

const formatSavings = (pence: number) => {
  return `£${Math.round(pence / 100)}`;
};

const ScoreGauge = ({
  score,
  size = 'sm',
  showLabel = false,
  animated = true,
  locked = false,
  potentialSavings,
  showSavings = false,
}: ScoreGaugeProps) => {
  const config = sizeConfig[size];
  const { stroke, label } = getScoreColor(score);

  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = Math.PI * radius;

  const startX = config.strokeWidth / 2;
  const endX = config.width - config.strokeWidth / 2;
  const centerY = config.height;

  const arcPath = `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (!locked) {
      progress.set(animated
        ? withTiming(score / 100, { duration: 800, easing: Easing.out(Easing.cubic) })
        : score / 100);
    }
  }, [score, animated, locked]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  if (locked) {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: config.width, height: config.height, position: 'relative' }}>
          <Svg
            width={config.width}
            height={config.height + 4}
            viewBox={`0 0 ${config.width} ${config.height + 4}`}
            style={{ opacity: 0.4 }}
          >
            <Path
              d={arcPath}
              fill="none"
              stroke="#E5E5E5"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
          </Svg>
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <FontAwesomeIcon icon={faLock} size={config.lockIconSize} color="#717171" />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Bold',
                fontSize: size === 'sm' ? 11 : config.scoreFontSize,
                color: '#717171',
              }}
            >
              --
            </Text>
          </View>
        </View>
        {showLabel && (
          <Text
            style={{
              marginTop: 2,
              fontFamily: 'PlusJakartaSans-Medium',
              fontSize: config.labelFontSize,
              color: '#717171',
            }}
          >
            Upgrade
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: config.width, height: config.height, position: 'relative' }}>
        <Svg
          width={config.width}
          height={config.height + 4}
          viewBox={`0 0 ${config.width} ${config.height + 4}`}
        >
          {/* Background arc */}
          <Path
            d={arcPath}
            fill="none"
            stroke="#E5E5E5"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <AnimatedPath
            d={arcPath}
            fill="none"
            stroke={stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            animatedProps={animatedProps}
          />
        </Svg>
        {/* Score text */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize: config.scoreFontSize,
              color: stroke,
            }}
          >
            {score}%
          </Text>
        </View>
      </View>

      {showLabel && (
        <Text
          style={{
            marginTop: 2,
            fontFamily: 'PlusJakartaSans-Medium',
            fontSize: config.labelFontSize,
            color: stroke,
          }}
        >
          {label}
        </Text>
      )}

      {showSavings && potentialSavings !== undefined && potentialSavings > 0 && (
        <View style={{ marginTop: 4, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Medium',
              fontSize: config.labelFontSize,
              color: '#717171',
            }}
          >
            Potential savings
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize: config.labelFontSize,
              color: '#00A699',
            }}
          >
            {formatSavings(potentialSavings)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default ScoreGauge;
