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
  '/exercises/chest/barbell_bench_press.webp': require('../../public/exercises/chest/barbell_bench_press.webp'),
  '/exercises/chest/kneeling_push_up.webp': require('../../public/exercises/chest/kneeling_push_up.webp'),
  '/exercises/chest/shoulder_tap.webp': require('../../public/exercises/chest/shoulder_tap.webp'),
  '/exercises/chest/dumbbell_svend_press.webp': require('../../public/exercises/chest/dumbbell_svend_press.webp'),
  '/exercises/chest/pseudo_planche_push_up.webp': require('../../public/exercises/chest/pseudo_planche_push_up.webp'),
  '/exercises/chest/archer_push_up.webp': require('../../public/exercises/chest/archer_push_up.webp'),
  '/exercises/chest/dumbbell_squeeze_press_on_floor.webp': require('../../public/exercises/chest/dumbbell_squeeze_press_on_floor.webp'),
  '/exercises/chest/single_arm_push_up.webp': require('../../public/exercises/chest/single_arm_push_up.webp'),
  '/exercises/chest/above_head_chest_stretch.webp': require('../../public/exercises/chest/above_head_chest_stretch.webp'),
  '/exercises/chest/hands_release_push_up.webp': require('../../public/exercises/chest/hands_release_push_up.webp'),
  '/exercises/chest/arm_crossover.webp': require('../../public/exercises/chest/arm_crossover.webp'),
  '/exercises/chest/cable_lying_fly.webp': require('../../public/exercises/chest/cable_lying_fly.webp'),
  '/exercises/chest/cobra_push_up.webp': require('../../public/exercises/chest/cobra_push_up.webp'),
  '/exercises/chest/doorway_chest_stretch.webp': require('../../public/exercises/chest/doorway_chest_stretch.webp'),
  '/exercises/chest/dynamic_chest_stretch.webp': require('../../public/exercises/chest/dynamic_chest_stretch.webp'),
  '/exercises/chest/kneeling_rotational_push_up.webp': require('../../public/exercises/chest/kneeling_rotational_push_up.webp'),
  '/exercises/chest/smith_decline_bench_press.webp': require('../../public/exercises/chest/smith_decline_bench_press.webp'),
  '/exercises/chest/standing_fly.webp': require('../../public/exercises/chest/standing_fly.webp'),
  '/exercises/chest/coner_wall_chest_stretch.webp': require('../../public/exercises/chest/coner_wall_chest_stretch.webp'),
  '/exercises/chest/barbell_incline_close_grip_bench_press.webp': require('../../public/exercises/chest/barbell_incline_close_grip_bench_press.webp'),
  '/exercises/chest/decline_pullover.webp': require('../../public/exercises/chest/decline_pullover.webp'),
  '/exercises/chest/power_push_away.webp': require('../../public/exercises/chest/power_push_away.webp'),
  '/exercises/chest/chest_bench_dip.webp': require('../../public/exercises/chest/chest_bench_dip.webp'),
  '/exercises/chest/bent_arm_chest_stretch.webp': require('../../public/exercises/chest/bent_arm_chest_stretch.webp'),
  '/exercises/chest/cable_decline_fly.webp': require('../../public/exercises/chest/cable_decline_fly.webp'),
  '/exercises/chest/smith_bench_press.webp': require('../../public/exercises/chest/smith_bench_press.webp'),
  '/exercises/chest/incline_fly.webp': require('../../public/exercises/chest/incline_fly.webp'),
  '/exercises/chest/lever_pec_deck_fly.webp': require('../../public/exercises/chest/lever_pec_deck_fly.webp'),
  '/exercises/chest/dumbbell_bench_press.webp': require('../../public/exercises/chest/dumbbell_bench_press.webp'),
  '/exercises/chest/dumbbell_incline_bench_press.webp': require('../../public/exercises/chest/dumbbell_incline_bench_press.webp'),
  '/exercises/chest/incline_bench_press.webp': require('../../public/exercises/chest/incline_bench_press.webp'),
  '/exercises/chest/lever_seated_fly.webp': require('../../public/exercises/chest/lever_seated_fly.webp'),
  '/exercises/chest/pike_push_up.webp': require('../../public/exercises/chest/pike_push_up.webp'),
  '/exercises/chest/pullover.webp': require('../../public/exercises/chest/pullover.webp'),
  '/exercises/chest/decline_bench_press.webp': require('../../public/exercises/chest/decline_bench_press.webp'),
  '/exercises/chest/decline_push_up.webp': require('../../public/exercises/chest/decline_push_up.webp'),
  '/exercises/chest/lying_hammer_press.webp': require('../../public/exercises/chest/lying_hammer_press.webp'),
  '/exercises/chest/incline_push_up.webp': require('../../public/exercises/chest/incline_push_up.webp'),
  '/exercises/chest/wide_hand_push_up.webp': require('../../public/exercises/chest/wide_hand_push_up.webp'),
  '/exercises/chest/cable_low_fly.webp': require('../../public/exercises/chest/cable_low_fly.webp'),
  '/exercises/chest/cable_middle_fly.webp': require('../../public/exercises/chest/cable_middle_fly.webp'),
  '/exercises/chest/cable_standing_fly.webp': require('../../public/exercises/chest/cable_standing_fly.webp'),
  '/exercises/chest/deep_push_up.webp': require('../../public/exercises/chest/deep_push_up.webp'),
  '/exercises/chest/dumbbell_lying_on_floor_chest_press.webp': require('../../public/exercises/chest/dumbbell_lying_on_floor_chest_press.webp'),
  '/exercises/chest/fly.webp': require('../../public/exercises/chest/fly.webp'),
  '/exercises/chest/push_up.webp': require('../../public/exercises/chest/push_up.webp'),
  '/exercises/chest/smith_incline_bench_press.webp': require('../../public/exercises/chest/smith_incline_bench_press.webp'),
  '/exercises/chest/dumbbell_decline_bench_press.webp': require('../../public/exercises/chest/dumbbell_decline_bench_press.webp'),
  '/exercises/chest/standing_one_arm_chest_stretch.webp': require('../../public/exercises/chest/standing_one_arm_chest_stretch.webp'),
  '/exercises/chest/chest_dip.webp': require('../../public/exercises/chest/chest_dip.webp'),
  '/exercises/chest/straight_arms_backward_chest_stretch.webp': require('../../public/exercises/chest/straight_arms_backward_chest_stretch.webp'),
  '/exercises/chest/dumbbell_floor_fly.webp': require('../../public/exercises/chest/dumbbell_floor_fly.webp'),
  '/exercises/chest/dumbbell_decline_fly.webp': require('../../public/exercises/chest/dumbbell_decline_fly.webp'),
  '/exercises/chest/kneeling_wide_hand_push_up.webp': require('../../public/exercises/chest/kneeling_wide_hand_push_up.webp'),
  '/exercises/chest/knuckle_push_up.webp': require('../../public/exercises/chest/knuckle_push_up.webp'),
  '/exercises/chest/barbell_floor_chest_press.webp': require('../../public/exercises/chest/barbell_floor_chest_press.webp'),
  '/exercises/chest/scapula_push_up.webp': require('../../public/exercises/chest/scapula_push_up.webp'),
  '/exercises/chest/reverse_chest_stretch.webp': require('../../public/exercises/chest/reverse_chest_stretch.webp'),
  '/exercises/chest/weighted_svend_press.webp': require('../../public/exercises/chest/weighted_svend_press.webp'),
  '/exercises/chest/assisted_weighted_push_up.webp': require('../../public/exercises/chest/assisted_weighted_push_up.webp'),
  '/exercises/chest/hyght_dumbbell_fly.webp': require('../../public/exercises/chest/hyght_dumbbell_fly.webp'),
  '/exercises/chest/dumbbell_alternate_bench_press.webp': require('../../public/exercises/chest/dumbbell_alternate_bench_press.webp'),
  '/exercises/chest/decline_wide_grip_pres.webp': require('../../public/exercises/chest/decline_wide_grip_pres.webp'),
  '/exercises/chest/barbell_wide_bench_press.webp': require('../../public/exercises/chest/barbell_wide_bench_press.webp'),
  '/exercises/chest/kneeling_chest_stretch.webp': require('../../public/exercises/chest/kneeling_chest_stretch.webp'),
  '/exercises/chest/finger_push_up.webp': require('../../public/exercises/chest/finger_push_up.webp'),
  '/exercises/cardio/double_jump_rope.webp': require('../../public/exercises/cardio/double_jump_rope.webp'),
  '/exercises/cardio/jump_rope.webp': require('../../public/exercises/cardio/jump_rope.webp'),
  '/exercises/cardio/skip_jump_rope.webp': require('../../public/exercises/cardio/skip_jump_rope.webp'),
  '/exercises/cardio/mountain_climber.webp': require('../../public/exercises/cardio/mountain_climber.webp'),
  '/exercises/cardio/walking.webp': require('../../public/exercises/cardio/walking.webp'),
  '/exercises/cardio/walking_on_treadmill.webp': require('../../public/exercises/cardio/walking_on_treadmill.webp'),
  '/exercises/cardio/stationary_bike_run.webp': require('../../public/exercises/cardio/stationary_bike_run.webp'),
  '/exercises/cardio/jump_box.webp': require('../../public/exercises/cardio/jump_box.webp'),
  '/exercises/cardio/stationary_bike_walk.webp': require('../../public/exercises/cardio/stationary_bike_walk.webp'),
  '/exercises/cardio/jumping_jack.webp': require('../../public/exercises/cardio/jumping_jack.webp'),
  '/exercises/cardio/riding_bicycle.webp': require('../../public/exercises/cardio/riding_bicycle.webp'),
  '/exercises/cardio/sprint.webp': require('../../public/exercises/cardio/sprint.webp'),
  '/exercises/cardio/quick_feet_run.webp': require('../../public/exercises/cardio/quick_feet_run.webp'),
  '/exercises/cardio/high_knee_squat.webp': require('../../public/exercises/cardio/high_knee_squat.webp'),
  '/exercises/cardio/butt_kicks.webp': require('../../public/exercises/cardio/butt_kicks.webp'),
  '/exercises/cardio/high_knee_skip.webp': require('../../public/exercises/cardio/high_knee_skip.webp'),
  '/exercises/cardio/place_jog.webp.webp': require('../../public/exercises/cardio/place_jog.webp.webp'),
  '/exercises/cardio/run.webp': require('../../public/exercises/cardio/run.webp'),
  '/exercises/cardio/frog_hops.webp': require('../../public/exercises/cardio/frog_hops.webp'),
  '/exercises/cardio/battling_ropes.webp': require('../../public/exercises/cardio/battling_ropes.webp'),
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

  const effectiveUri = rawUri || (isBenchPress ? '/exercises/chest/barbell_bench_press.webp' : undefined);

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
