import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title = 'Chat' }: TopBarProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const navigateToProfile = () => {
    console.log('Navigating to profile screen');
    setModalVisible(false);

    // Navigate immediately without delay for instant transition
    try {
      // Use replace for instant transition without animation
      router.replace({
        pathname: '/(settings)/profile',
        params: { from: 'topbar' }
      });
      console.log('Instant navigation to profile initiated');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback if needed
      router.navigate('/(settings)/profile');
    }
  };

  const navigateToSettings = () => {
    setModalVisible(false);
    // You can implement settings navigation here
    // For now, we'll just close the modal
    console.log('Navigate to settings (not implemented)');
  };

  const navigateToAgents = () => {
    console.log('Navigating to agents screen');
    setModalVisible(false);

    // Navigate immediately without delay for instant transition
    try {
      // Use replace for instant transition without animation
      router.replace('/(agents)');
      console.log('Instant navigation to agents initiated');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to another approach if needed
      router.navigate('/(agents)');
      console.log('Fallback navigation to agents initiated');
    }
  };



  return (
    <>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="menu-outline" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rightPlaceholder} />
      </View>

      {/* Full Screen Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>

          {/* Modal content */}
          <View style={styles.modalContent}>
            {/* Empty content area - can be filled with other content later */}
          </View>

          {/* Bottom fixed icons - Left aligned without labels */}
          <View style={styles.bottomIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToAgents}
            >
              <Text style={styles.emojiIcon}>🕹️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToProfile}
            >
              <Text style={styles.emojiIcon}>👋</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToSettings}
            >
              <Text style={styles.emojiIcon}>🎮</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    flex: 1,
    textAlign: 'left',
    marginLeft: 8, // Add some left margin for better spacing
  },
  menuButton: {
    padding: 4,
    width: 32,
  },
  rightPlaceholder: {
    width: 32,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 50, // Adjusted for the smaller bottom bar
    backgroundColor: 'white',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  modalContent: {
    flex: 1,
  },
  bottomIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 36,
    marginRight: 16,
    padding: 0,
  },
  emojiIcon: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 36,
  },
});
