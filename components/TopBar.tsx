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
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="menu-outline" size={24} color="black" />
        </TouchableOpacity>
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

          {/* Bottom fixed icons */}
          <View style={styles.bottomIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToAgents}
            >
              <Text style={styles.emojiIcon}>✨</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToProfile}
            >
              <Text style={styles.emojiIcon}>😊</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={navigateToSettings}
            >
              <Text style={styles.emojiIcon}>⚙️</Text>
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
  },
  menuButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 50, // Added bottom padding to ensure content doesn't overlap with bottom icons
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
    paddingTop: 16,
    paddingBottom: 36, // Increased bottom padding to ensure emojis are fully visible
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48, // Increased width for more space
    height: 48, // Increased height for more space
    marginRight: 16,
    padding: 0, // Removed padding that was causing the emoji to be cut off
  },
  emojiIcon: {
    fontSize: 24,
    textAlign: 'center', // Ensure text is centered
    lineHeight: 48, // Match the height of the button for vertical centering
  },
});
