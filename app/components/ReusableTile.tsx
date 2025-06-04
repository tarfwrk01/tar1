import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TileProps {
  label: string;
  value?: string | number;
  onPress?: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  disabled?: boolean;
  loading?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  isSelected?: boolean;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  subtitle?: string;
  multiline?: boolean;
}

/**
 * Reusable tile component for consistent UI patterns
 */
const ReusableTile = memo(({
  label,
  value,
  onPress,
  style,
  labelStyle,
  valueStyle,
  icon,
  iconColor = '#666',
  iconSize = 20,
  disabled = false,
  loading = false,
  backgroundColor,
  borderColor,
  isSelected = false,
  rightElement,
  leftElement,
  subtitle,
  multiline = false,
}: TileProps) => {
  const tileStyle = [
    styles.tile,
    backgroundColor && { backgroundColor },
    borderColor && { borderColor },
    isSelected && styles.selectedTile,
    disabled && styles.disabledTile,
    style,
  ];

  const content = (
    <View style={styles.tileContent}>
      {leftElement && <View style={styles.leftElement}>{leftElement}</View>}
      
      <View style={styles.textContainer}>
        <Text style={[styles.label, labelStyle]} numberOfLines={multiline ? undefined : 1}>
          {label}
        </Text>
        
        {subtitle && (
          <Text style={[styles.subtitle, labelStyle]} numberOfLines={multiline ? undefined : 1}>
            {subtitle}
          </Text>
        )}
        
        {value !== undefined && (
          <Text style={[styles.value, valueStyle]} numberOfLines={multiline ? undefined : 1}>
            {loading ? 'Loading...' : value}
          </Text>
        )}
      </View>
      
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        </View>
      )}
      
      {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity style={tileStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={tileStyle}>{content}</View>;
});

ReusableTile.displayName = 'ReusableTile';

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
  },
  selectedTile: {
    borderColor: '#0066CC',
    backgroundColor: '#F3F9FF',
  },
  disabledTile: {
    opacity: 0.6,
  },
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#666',
  },
  iconContainer: {
    marginLeft: 8,
  },
  leftElement: {
    marginRight: 8,
  },
  rightElement: {
    marginLeft: 8,
  },
});

export default ReusableTile;

/**
 * Specialized tile variants for common use cases
 */

export const InfoTile = memo(({ label, value, ...props }: Omit<TileProps, 'onPress'>) => (
  <ReusableTile
    label={label}
    value={value}
    icon="information-circle-outline"
    iconColor="#0066CC"
    {...props}
  />
));

export const ActionTile = memo(({ label, onPress, ...props }: TileProps) => (
  <ReusableTile
    label={label}
    onPress={onPress}
    icon="chevron-forward-outline"
    iconColor="#666"
    {...props}
  />
));

export const StatusTile = memo(({ 
  label, 
  value, 
  isActive = false, 
  ...props 
}: TileProps & { isActive?: boolean }) => (
  <ReusableTile
    label={label}
    value={value}
    icon={isActive ? "checkmark-circle" : "close-circle"}
    iconColor={isActive ? "#4CAF50" : "#F44336"}
    backgroundColor={isActive ? "#E8F5E8" : "#FFEBEE"}
    borderColor={isActive ? "#4CAF50" : "#F44336"}
    {...props}
  />
));

export const EditableTile = memo(({ 
  label, 
  value, 
  onPress, 
  ...props 
}: TileProps) => (
  <ReusableTile
    label={label}
    value={value}
    onPress={onPress}
    icon="create-outline"
    iconColor="#0066CC"
    {...props}
  />
));

export const SelectableTile = memo(({ 
  label, 
  value, 
  isSelected = false, 
  onPress, 
  ...props 
}: TileProps & { isSelected?: boolean }) => (
  <ReusableTile
    label={label}
    value={value}
    onPress={onPress}
    isSelected={isSelected}
    icon={isSelected ? "checkmark-circle" : "radio-button-off"}
    iconColor={isSelected ? "#0066CC" : "#666"}
    {...props}
  />
));

/**
 * Tile group component for organizing related tiles
 */
export const TileGroup = memo(({ 
  children, 
  title, 
  style 
}: { 
  children: React.ReactNode; 
  title?: string; 
  style?: ViewStyle; 
}) => (
  <View style={[styles.tileGroup, style]}>
    {title && <Text style={styles.groupTitle}>{title}</Text>}
    {children}
  </View>
));

const groupStyles = StyleSheet.create({
  tileGroup: {
    marginVertical: 8,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});

// Merge styles
Object.assign(styles, groupStyles);
