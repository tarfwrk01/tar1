import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from './TopBar';

interface LayoutWrapperProps {
  children: React.ReactNode;
  showTopBar?: boolean;
  topBarTitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: React.ReactNode;
}

export default function LayoutWrapper({
  children,
  showTopBar = true,
  topBarTitle,
  showBackButton = false,
  onBackPress,
  rightIcon
}: LayoutWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Status bar spacing */}
      <View style={{ 
        height: Platform.OS === 'android' ? insets.top : 0,
        backgroundColor: '#fff' 
      }} />
      
      {/* TopBar - stable across all screens */}
      {showTopBar && (
        <TopBar 
          title={topBarTitle}
          showBackButton={showBackButton}
          onBackPress={onBackPress}
          rightIcon={rightIcon}
        />
      )}
      
      {/* Content */}
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
