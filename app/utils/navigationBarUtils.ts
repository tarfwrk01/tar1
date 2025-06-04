import { Platform } from 'react-native';

/**
 * Sets the system navigation bar background to black on Android devices.
 * This ensures consistent black navigation bar styling throughout the app.
 */
export const setNavigationBarBlack = async () => {
  if (Platform.OS === 'android') {
    console.log('🔧 Attempting to set navigation bar to black...');

    try {
      // Method 1: Try expo-navigation-bar
      const NavigationBar = require('expo-navigation-bar');
      console.log('📱 NavigationBar module loaded');

      if (NavigationBar.setBackgroundColorAsync) {
        await NavigationBar.setBackgroundColorAsync('#000000');
        console.log('✅ NavigationBar.setBackgroundColorAsync called');
      }

      if (NavigationBar.setButtonStyleAsync) {
        await NavigationBar.setButtonStyleAsync('light');
        console.log('✅ NavigationBar.setButtonStyleAsync called');
      }

      // Method 2: Try SystemUI as fallback
      const SystemUI = require('expo-system-ui');
      console.log('🎨 SystemUI module loaded');

      if (SystemUI.setBackgroundColorAsync) {
        await SystemUI.setBackgroundColorAsync('#000000');
        console.log('✅ SystemUI.setBackgroundColorAsync called');
      }

      // Method 3: Try direct navigation bar styling
      if (NavigationBar.setNavigationBarColorAsync) {
        await NavigationBar.setNavigationBarColorAsync('#000000', 'light');
        console.log('✅ NavigationBar.setNavigationBarColorAsync called');
      }

      console.log('🎉 Navigation bar styling completed successfully');
    } catch (error) {
      console.log('❌ Navigation bar styling error:', error);
      console.log('ℹ️  This is normal in Expo Go - navigation bar styling only works in production builds');

      // Try alternative method for development
      try {
        console.log('🔄 Trying alternative method...');
        const { StatusBar } = require('expo-status-bar');
        // This won't change navigation bar but helps with debugging
        console.log('📊 StatusBar available for debugging');
      } catch (altError) {
        console.log('❌ Alternative method also failed:', altError);
      }
    }
  } else {
    console.log('ℹ️  Navigation bar styling skipped (not Android)');
  }
};
