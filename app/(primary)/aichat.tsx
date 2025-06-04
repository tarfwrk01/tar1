import { generateAPIUrl } from '@/utils';
import { useChat } from '@ai-sdk/react';
import { fetch as expoFetch } from 'expo/fetch';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AIChat() {
  const {
    messages,
    error,
    handleInputChange,
    input,
    handleSubmit,
    status,
  } = useChat({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: generateAPIUrl('/api/chat'),
    onError: (error) => {
      console.error('AI Chat Error:', error);
      const errorMessage = error instanceof Error
        ? `${error.message}. This may be due to an issue with the Groq API key or network connectivity.`
        : 'Failed to communicate with AI. Please try again.';
      Alert.alert('Error', errorMessage);
    },
    maxSteps: 5,
  });

  const scrollViewRef = React.useRef<ScrollView>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // Reset the chat
              handleSubmit(undefined as any, { data: { reset: true } });
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Start a conversation with the AI assistant
              </Text>
            </View>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.messageContainer,
                  m.role === 'user' ? styles.userMessage : styles.aiMessage
                ]}
              >
                <Text style={styles.messageRole}>
                  {m.role === 'user' ? 'You' : 'AI'}
                </Text>
                <Text style={styles.messageContent}>
                  {m.content || ''}
                </Text>
              </View>
            ))
          )}

          {(status === 'streaming' || status === 'submitted') && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0066CC" />
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={input}
            onChangeText={(text) =>
              handleInputChange({
                target: { value: text },
              } as unknown as React.ChangeEvent<HTMLInputElement>)
            }
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              ((status === 'streaming' || status === 'submitted') || !input.trim()) && styles.disabledButton
            ]}
            onPress={() => {
              if (status === 'ready' && input.trim()) {
                handleSubmit(undefined as any);
              }
            }}
            disabled={(status === 'streaming' || status === 'submitted') || !input.trim()}
          >
            <Text style={styles.sendButtonText}>
              {(status === 'streaming' || status === 'submitted') ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messagesContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  messageRole: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    width: 60,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    opacity: 0.5,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  errorText: {
    color: 'red',
    padding: 20,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
