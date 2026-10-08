import React from 'react';
import { View, Image, Platform, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_SVGS } from '../assets/categorySvgs';
import { colors } from '../theme/colors';

interface CategoryIconProps {
  category: string;
  size?: number;
  isSelected?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 38,
  isSelected = false,
}) => {
  const normalizedKey = category.toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (normalizedKey === 'all') {
    return (
      <View style={[styles.center, { width: size, height: size }]}>
        <Ionicons
          name="apps"
          size={size * 0.65}
          color={isSelected ? '#FFFFFF' : colors.primary}
        />
      </View>
    );
  }

  const svgXml = CATEGORY_SVGS[normalizedKey];

  if (svgXml) {
    return (
      <View style={[styles.center, { width: size, height: size }]}>
        <SvgXml xml={svgXml} width={size} height={size} />
      </View>
    );
  }

  // Fallback for Web if not found in embedded map
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.center, { width: size, height: size }]}>
        <Image
          source={{ uri: `/categories/${normalizedKey}.svg` }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Fallback icon if no SVG found
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Ionicons
        name="barbell-outline"
        size={size * 0.65}
        color={isSelected ? colors.primary : colors.textMuted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
