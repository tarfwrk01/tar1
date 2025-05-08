import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Complete project proposal', completed: false, priority: 'high' },
    { id: '2', title: 'Review pull requests', completed: false, priority: 'medium' },
    { id: '3', title: 'Update documentation', completed: true, priority: 'low' },
    { id: '4', title: 'Fix UI bugs', completed: false, priority: 'high' },
    { id: '5', title: 'Prepare for team meeting', completed: false, priority: 'medium' },
  ]);

  const toggleTaskCompletion = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Ionicons name="flag" size={16} color="#e53935" />;
      case 'medium':
        return <Ionicons name="flag" size={16} color="#fb8c00" />;
      case 'low':
        return <Ionicons name="flag" size={16} color="#43a047" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Tasks" />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add-circle" size={24} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.taskList}>
          {tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => toggleTaskCompletion(task.id)}
            >
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleTaskCompletion(task.id)}
              >
                {task.completed ? (
                  <Ionicons name="checkmark-circle" size={24} color="#0066CC" />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="#999" />
                )}
              </TouchableOpacity>

              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.completed && styles.completedTask
                  ]}
                >
                  {task.title}
                </Text>
                <View style={styles.taskMeta}>
                  {getPriorityIcon(task.priority)}
                  <Text style={styles.priorityText}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-vertical" size={20} color="#999" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  moreButton: {
    padding: 4,
  },
});
