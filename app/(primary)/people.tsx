import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';

type Person = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
};

export default function PeopleScreen() {
  const people: Person[] = [
    {
      id: '1',
      name: 'Alex Johnson',
      role: 'Product Manager',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      online: true,
    },
    {
      id: '2',
      name: 'Sarah Williams',
      role: 'UX Designer',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      online: true,
    },
    {
      id: '3',
      name: 'Michael Brown',
      role: 'Frontend Developer',
      avatar: 'https://randomuser.me/api/portraits/men/46.jpg',
      online: false,
    },
    {
      id: '4',
      name: 'Emily Davis',
      role: 'Backend Developer',
      avatar: 'https://randomuser.me/api/portraits/women/67.jpg',
      online: true,
    },
    {
      id: '5',
      name: 'David Wilson',
      role: 'QA Engineer',
      avatar: 'https://randomuser.me/api/portraits/men/78.jpg',
      online: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="People" />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Team Members</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.peopleList}>
          {people.map(person => (
            <TouchableOpacity key={person.id} style={styles.personCard}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: person.avatar }}
                  style={styles.avatar}
                />
                <View
                  style={[
                    styles.statusIndicator,
                    person.online ? styles.statusOnline : styles.statusOffline
                  ]}
                />
              </View>

              <View style={styles.personInfo}>
                <Text style={styles.personName}>{person.name}</Text>
                <Text style={styles.personRole}>{person.role}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={20} color="#0066CC" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="call-outline" size={20} color="#0066CC" />
                </TouchableOpacity>
              </View>
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
  searchButton: {
    padding: 4,
  },
  peopleList: {
    flex: 1,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#9E9E9E',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  personRole: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});
