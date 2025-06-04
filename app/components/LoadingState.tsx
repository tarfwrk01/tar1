import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
  showMessage?: boolean;
  fullScreen?: boolean;
}

/**
 * Reusable loading state component
 */
const LoadingState = memo(({
  message = 'Loading...',
  size = 'large',
  color = '#0066CC',
  style,
  showMessage = true,
  fullScreen = false
}: LoadingStateProps) => {
  const containerStyle = [
    fullScreen ? styles.fullScreenContainer : styles.container,
    style
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {showMessage && (
        <Text style={[styles.message, { color }]}>
          {message}
        </Text>
      )}
    </View>
  );
});

LoadingState.displayName = 'LoadingState';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingState;
