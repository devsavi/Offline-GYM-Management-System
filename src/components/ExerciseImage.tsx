import React, { useState } from 'react';
import { View, Image, StyleSheet, Platform, ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { CategoryIcon } from './CategoryIcon';

interface ExerciseImageProps {
  exercise: {
    id?: string;
    name?: string;
    category: string;
    image_uri?: string;
  };
  size?: number;
  width?: number | string;
  height?: number;
  resizeMode?: 'contain' | 'cover';
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/** Returns true if the URI points to an SVG (path ending in .svg or data:image/svg+xml) */
const isSvgUri = (uri: string): boolean =>
  uri.endsWith('.svg') || uri.startsWith('data:image/svg+xml');

/**
 * Bundled exercise images keyed by their image_uri path.
 * Using require() for local raster assets ensures they are bundled by Metro
 * and work correctly on both web and native without any path-resolution issues.
 */
const BUNDLED_IMAGES: Record<string, any> = {
  '/exercises/chest/bench_press.webp': require('../../public/exercises/chest/bench_press.webp'),
};

export const ExerciseImage: React.FC<ExerciseImageProps> = ({
  exercise,
  size = 110,
  width,
  height,
  resizeMode = 'contain',
  containerStyle,
  imageStyle,
}) => {
  const [loadError, setLoadError] = useState(false);

  const rawUri = exercise.image_uri?.trim();

  // For built-in bench press, ensure the path is set even if the DB row
  // was seeded before image_uri column existed.
  const isBenchPress =
    exercise.id === 'ex_ch_1' ||
    (exercise.name?.toLowerCase().includes('bench press') &&
      exercise.category?.toLowerCase() === 'chest');

  const effectiveUri = rawUri || (isBenchPress ? '/exercises/chest/bench_press.webp' : undefined);

  const containerW = width ?? size;
  const containerH = height ?? size;

  // Fallback: no URI or failed load → category icon
  if (!effectiveUri || loadError) {
    return (
      <View
        style={[
          styles.container,
          { width: containerW as any, height: containerH },
          containerStyle,
        ]}
      >
        <CategoryIcon
          category={exercise.category}
          size={typeof containerH === 'number' ? Math.round(containerH * 0.75) : size}
        />
      </View>
    );
  }

  const svgWidth = typeof containerW === 'number' ? containerW : undefined;
  const svgHeight = typeof containerH === 'number' ? containerH : undefined;

  const renderImage = () => {
    // Check for a bundled local asset first — works on web + native without serving issues
    const bundledSource = BUNDLED_IMAGES[effectiveUri];
    if (bundledSource) {
      return (
        <Image
          source={bundledSource}
          style={[{ width: '100%', height: '100%' }, imageStyle]}
          resizeMode={resizeMode}
          onError={() => setLoadError(true)}
        />
      );
    }

    if (Platform.OS === 'web') {
      // Web: <Image> renders as <img>, handles all formats including SVG
      return (
        <Image
          source={{ uri: effectiveUri }}
          style={[{ width: '100%', height: '100%' }, imageStyle]}
          resizeMode={resizeMode}
          onError={() => setLoadError(true)}
        />
      );
    }

    if (isSvgUri(effectiveUri)) {
      // Native + remote/data SVG URI → SvgUri from react-native-svg
      return (
        <SvgUri
          uri={effectiveUri}
          width={svgWidth ?? '100%'}
          height={svgHeight ?? '100%'}
          onError={() => setLoadError(true)}
        />
      );
    }

    // Native + raster URI (user-uploaded custom image)
    return (
      <Image
        source={{ uri: effectiveUri }}
        style={[{ width: '100%', height: '100%' }, imageStyle]}
        resizeMode={resizeMode}
        onError={() => setLoadError(true)}
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        { width: containerW as any, height: containerH },
        containerStyle,
      ]}
    >
      {renderImage()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
