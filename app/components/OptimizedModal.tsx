import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
    BackHandler,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface OptimizedModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  headerStyle?: any;
  contentStyle?: any;
  scrollable?: boolean;
  keyboardAvoidingView?: boolean;
  onShow?: () => void;
  onDismiss?: () => void;
  rightHeaderElement?: React.ReactNode;
  leftHeaderElement?: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: number;
}

/**
 * Optimized modal component with performance enhancements
 */
const OptimizedModal = memo(({
  visible,
  onClose,
  title,
  children,
  fullScreen = false,
  showCloseButton = true,
  closeOnBackdrop = true,
  animationType = 'slide',
  headerStyle,
  contentStyle,
  scrollable = true,
  keyboardAvoidingView = true,
  onShow,
  onDismiss,
  rightHeaderElement,
  leftHeaderElement,
  footer,
  maxHeight,
}: OptimizedModalProps) => {
  const modalRef = useRef<Modal>(null);
  const { height: screenHeight } = Dimensions.get('window');

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Memoized close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoized backdrop press handler
  const handleBackdropPress = useCallback(() => {
    if (closeOnBackdrop) {
      handleClose();
    }
  }, [closeOnBackdrop, handleClose]);

  // Memoized header component
  const renderHeader = useCallback(() => {
    if (!title && !showCloseButton && !rightHeaderElement && !leftHeaderElement) {
      return null;
    }

    return (
      <View style={[styles.header, headerStyle]}>
        <View style={styles.headerLeft}>
          {leftHeaderElement}
        </View>
        
        <View style={styles.headerCenter}>
          {title && (
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          )}
        </View>
        
        <View style={styles.headerRight}>
          {rightHeaderElement}
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-outline" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [title, showCloseButton, rightHeaderElement, leftHeaderElement, headerStyle, handleClose]);

  // Memoized content component
  const renderContent = useCallback(() => {
    const contentContainerStyle = [
      styles.content,
      maxHeight && { maxHeight },
      contentStyle,
    ];

    if (scrollable) {
      return (
        <ScrollView
          style={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <View style={contentContainerStyle}>
        {children}
      </View>
    );
  }, [children, scrollable, maxHeight, contentStyle]);

  // Memoized modal content
  const modalContent = useCallback(() => {
    const containerStyle = fullScreen 
      ? styles.fullScreenContainer 
      : [styles.modalContainer, { maxHeight: maxHeight || screenHeight * 0.9 }];

    const content = (
      <View style={containerStyle}>
        {renderHeader()}
        {renderContent()}
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    );

    if (keyboardAvoidingView) {
      return (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }

    return content;
  }, [
    fullScreen,
    maxHeight,
    screenHeight,
    renderHeader,
    renderContent,
    footer,
    keyboardAvoidingView,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      ref={modalRef}
      visible={visible}
      animationType={animationType}
      transparent={!fullScreen}
      onShow={onShow}
      onDismiss={onDismiss}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      {fullScreen ? (
        <SafeAreaView style={styles.fullScreenWrapper}>
          {modalContent()}
        </SafeAreaView>
      ) : (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            {modalContent()}
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </Modal>
  );
});

OptimizedModal.displayName = 'OptimizedModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export default OptimizedModal;

/**
 * Specialized modal variants for common use cases
 */

export const ConfirmationModal = memo(({
  visible,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = '#0066CC',
  cancelColor = '#666',
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  cancelColor?: string;
}) => (
  <OptimizedModal
    visible={visible}
    onClose={onClose}
    title={title}
    fullScreen={false}
    scrollable={false}
    footer={
      <View style={confirmationStyles.buttonContainer}>
        <TouchableOpacity
          style={[confirmationStyles.button, { backgroundColor: cancelColor }]}
          onPress={onClose}
        >
          <Text style={confirmationStyles.buttonText}>{cancelText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[confirmationStyles.button, { backgroundColor: confirmColor }]}
          onPress={onConfirm}
        >
          <Text style={confirmationStyles.buttonText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    }
  >
    <View style={confirmationStyles.content}>
      <Text style={confirmationStyles.message}>{message}</Text>
    </View>
  </OptimizedModal>
));

const confirmationStyles = StyleSheet.create({
  content: {
    padding: 20,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});


