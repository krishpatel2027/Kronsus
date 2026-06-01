import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { updateStock } from '../services/api';
import { useOffline } from '../store/OfflineContext';

const AdjustStockScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const { isOnline, syncStatus } = useOffline();
  const [transactionType, setTransactionType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(product.stock || 0);

  useEffect(() => {
    setCurrentStock(product.stock || 0);
  }, [product]);

  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a positive integer');
      return;
    }

    if (transactionType === 'OUT' && qty > currentStock) {
      Alert.alert('Insufficient stock', `Cannot remove ${qty} units. Current stock is ${currentStock} units.`);
      return;
    }

    setLoading(true);
    try {
      const result = await updateStock(product.id, {
        transaction_type: transactionType,
        quantity: qty,
        notes,
      });

      if (result.success && result.message) {
        setCurrentStock(result.stock);
        Alert.alert('Success', result.message);
      } else {
        setCurrentStock(result.stock || currentStock);
        Alert.alert('Success', 'Stock updated');
      }

      setQuantity('');
      setNotes('');

      setTimeout(() => {
        navigation.goBack();
      }, 1000);

    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message ?? 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adjust Stock</Text>

      <View style={styles.infoContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.sku}>SKU: {product.sku}</Text>
        <Text style={styles.currentStock}>
          Current Stock: {currentStock}
          {!isOnline && ' (Offline)'}
        </Text>
      </View>

      {!isOnline && syncStatus.pending > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {syncStatus.pending} pending changes will sync when online
          </Text>
        </View>
      )}

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            transactionType === 'IN' && styles.toggleActive,
          ]}
          onPress={() => setTransactionType('IN')}
        >
          <Text style={styles.toggleText}>Add (+)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            transactionType === 'OUT' && styles.toggleActive,
          ]}
          onPress={() => setTransactionType('OUT')}
        >
          <Text style={styles.toggleText}>Subtract (-)</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      {transactionType === 'OUT' && (
        <Text style={styles.warningText}>
          Warning: Cannot exceed current stock of {currentStock}
        </Text>
      )}

      <TextInput
        style={[styles.input, styles.notes]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0066cc" />
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>
              {isOnline ? 'Submit' : 'Save Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sku: { fontSize: 14, color: '#6c757d', marginBottom: 8 },
  currentStock: { fontSize: 16, fontWeight: '500', color: '#007bff' },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  offlineText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
  toggleBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 8,
    minWidth: 120,
  },
  toggleActive: { backgroundColor: '#007bff' },
  toggleText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  input: {
    borderWidth: 2,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    fontSize: 16,
  },
  notes: {
    height: 80,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  warningText: {
    color: '#dc3545',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdjustStockScreen;
