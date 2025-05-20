import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface TabItem {
  key: string;
  icon: string;
  label: string;
}

interface VerticalTabViewProps {
  tabs: TabItem[];
  children: React.ReactNode[];
}

export default function VerticalTabView({ tabs, children }: VerticalTabViewProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === index && styles.activeTab
            ]}
            onPress={() => setActiveTab(index)}
          >
            <Ionicons
              name={tab.icon as any}
              size={24}
              color={activeTab === index ? '#0066CC' : '#666'}
            />
          </TouchableOpacity>
        ))}
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
    backgroundColor: '#f8f8f8',
    borderRightWidth: 0,
    borderRightColor: '#eee',
    paddingTop: 0,
  },
  tab: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  activeTab: {
    borderLeftColor: '#0066CC',
    backgroundColor: '#f0f7ff',
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Add extra padding at the bottom for scrolling
  },
});
