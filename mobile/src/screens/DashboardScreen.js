import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { fetchProducts } from '../services/api';
import { AuthContext } from '../store/AuthContext';
import { useOffline } from '../store/OfflineContext';

const DashboardScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const { isOnline, syncStatus, syncData, syncInProgress, checkSyncStatus } = useOffline();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
      if (isOnline) {
        await checkSyncStatus();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Unable to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleSync = async () => {
    if (syncStatus.pending > 0) {
      Alert.alert(
        'Sync Pending',
        `You have ${syncStatus.pending} pending transactions. Do you want to sync them now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sync Now', 
            onPress: () => syncData()
          }
        ]
      );
    } else {
      Alert.alert('No Pending Sync', 'All transactions are already synced.');
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProducts);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, !isOnline && styles.offlineItem]}
      onPress={() => navigation.navigate('AdjustStock', { product: item })}
    >
      <View style={styles.itemRow}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={[styles.stock, !isOnline && styles.offlineText]}>
          Stock: {item.stock ?? 0}
          {!isOnline && ' (Offline)'}
        </Text>
      </View>
      <Text style={styles.sku}>SKU: {item.sku}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('BarcodeScanner')}
            style={styles.scanBtn}
          >
            <Text style={styles.scanBtnText}>Scan</Text>
          </TouchableOpacity>
          {syncStatus.pending > 0 && (
            <TouchableOpacity 
              onPress={handleSync}
              style={[styles.syncButton, syncInProgress && styles.syncButtonDisabled]}
              disabled={syncInProgress}
            >
              <Text style={styles.syncButtonText}>
                {syncInProgress ? 'Syncing...' : `Sync (${syncStatus.pending})`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline. Changes will be saved locally.</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0066cc" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListFooterComponent={syncInProgress && <ActivityIndicator size="small" color="#0066cc" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0066cc"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  scanBtn: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#0066cc', fontSize: 16 },
  offlineBanner: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  list: { paddingBottom: 20 },
  item: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  offlineItem: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '500' },
  stock: { fontSize: 16, color: '#555' },
  sku: { fontSize: 14, color: '#888', marginTop: 2 },
});

export default DashboardScreen;
