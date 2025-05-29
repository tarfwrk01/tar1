import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface TabItem {
  key: string;
  icon: string;
  label: string;
  iconLibrary?: 'Ionicons' | 'MaterialIcons';
}

interface VerticalTabViewProps {
  tabs: TabItem[];
  children: React.ReactNode[];
}

export default function VerticalTabView({ tabs, children }: VerticalTabViewProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Helper function to render the appropriate icon
  const renderIcon = (tab: TabItem, isActive: boolean) => {
    const color = isActive ? '#0066CC' : '#666';
    const size = 24;

    if (tab.iconLibrary === 'MaterialIcons') {
      return (
        <MaterialIcons
          name={tab.icon as any}
          size={size}
          color={color}
        />
      );
    } else {
      return (
        <Ionicons
          name={tab.icon as any}
          size={size}
          color={color}
        />
      );
    }
  };

  // Separate bottom tabs (options and inventory) from other tabs
  const inventoryTabIndex = tabs.findIndex(tab => tab.key === 'inventory');
  const optionsTabIndex = tabs.findIndex(tab => tab.key === 'options');
  const regularTabs = tabs.filter(tab => tab.key !== 'inventory' && tab.key !== 'options');
  const inventoryTab = inventoryTabIndex !== -1 ? tabs[inventoryTabIndex] : null;
  const optionsTab = optionsTabIndex !== -1 ? tabs[optionsTabIndex] : null;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {/* Regular tabs */}
        <View style={styles.regularTabsContainer}>
          {regularTabs.map((tab, index) => {
            const originalIndex = tabs.findIndex(t => t.key === tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === originalIndex && styles.activeTab
                ]}
                onPress={() => setActiveTab(originalIndex)}
              >
                {renderIcon(tab, activeTab === originalIndex)}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom tabs (Options and Inventory) */}
        {(optionsTab || inventoryTab) && (
          <View style={styles.bottomTabContainer}>
            {optionsTab && (
              <TouchableOpacity
                key={optionsTab.key}
                style={[
                  styles.tab,
                  styles.bottomTab,
                  activeTab === optionsTabIndex && styles.activeTab
                ]}
                onPress={() => setActiveTab(optionsTabIndex)}
              >
                {renderIcon(optionsTab, activeTab === optionsTabIndex)}
              </TouchableOpacity>
            )}
            {inventoryTab && (
              <TouchableOpacity
                key={inventoryTab.key}
                style={[
                  styles.tab,
                  activeTab === inventoryTabIndex && styles.activeTab
                ]}
                onPress={() => setActiveTab(inventoryTabIndex)}
              >
                {renderIcon(inventoryTab, activeTab === inventoryTabIndex)}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.tabContent}>
        <ScrollView style={styles.scrollContent}>
          {children[activeTab]}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  tabBar: {
    width: 50,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    paddingTop: 0,
    justifyContent: 'space-between',
  },
  regularTabsContainer: {
    flex: 1,
  },
  bottomTabContainer: {
    paddingBottom: 16,
  },
  tab: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  bottomTab: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  activeTab: {
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
    backgroundColor: '#f0f7ff',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Add extra padding at the bottom for scrolling
  },
});
