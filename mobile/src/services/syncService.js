import { database } from '../database';
import { StockTransaction } from '../database/schema';
import { api } from './api';
import { offlineService } from './offlineService';

export const syncService = {
  /**
   * The Synchronization Engine
   * Processes all pending local changes and pushes them to the server.
   */
  async synchronize() {
    if (!offlineService.isOnline) {
      throw new Error('Cannot sync: Device is offline');
    }

    // 1. Pull latest state from server first (to resolve potential conflicts)
    await this.pullLatestState();

    // 2. Identify all unsynced local transactions
    // We sort by createdAt to ensure changes are applied in the exact order they happened
    const pendingTransactions = await database.collections.get('stock_transactions')
      .query(Q.where('synced', false))
      .fetch();

    // Sort by timestamp ascending
    const sortedTransactions = pendingTransactions.sort((a, b) => a.createdAt - b.createdAt);

    let successCount = 0;
    let failureCount = 0;

    for (const transaction of sortedTransactions) {
      try {
        await this.pushTransaction(transaction);
        successCount++;
      } catch (error) {
        failureCount++;
        await transaction.update(t => ({
          ...t,
          syncError: `Conflict/Error: ${error.message}`,
        }));
      }
    }

    return {
      successCount,
      failureCount,
      total: sortedTransactions.length,
    };
  },

  async pullLatestState() {
    // Fetch products and update local state
    const { data } = await api.get('/products/');
    const products = data.results ?? data;

    await database.write(async () => {
      for (const pData of products) {
        const localProduct = await database.collections.get('products').query(
          Q.where('remote_id', pData.id.toString())
        ).fetch();

        if (localProduct.length > 0) {
          await localProduct[0].update(p => ({
            ...p,
            stock: pData.stock,
            synced: true,
          }));
        } else {
          await database.collections.get('products').create(p => ({
            ...p,
            remoteId: pData.id.toString(),
            name: pData.name,
            sku: pData.sku,
            stock: pData.stock,
            companyId: pData.company_id,
            synced: true,
          }));
        }
      }
    });
  },

  async pushTransaction(localTx) {
    const payload = {
      product_id: localTx.productId,
      transaction_type: localTx.transactionType,
      quantity: localTx.quantity,
      notes: localTx.notes || '',
    };

    try {
      // The backend handles the stock subtraction/addition. 
      // If the backend returns a 400 (e.g., Insufficient Stock), 
      // it's a conflict that the user must resolve.
      const response = await api.post(`/products/${localTx.productId}/stock/`, payload);

      await database.write(async () => {
        await localTx.update(t => ({
          ...t,
          remoteId: response.data.id.toString(),
          synced: true,
          syncError: null,
        }));
      });
    } catch (error) {
      // Handle 400 Bad Request (Conflict: e.g. stock went negative on server)
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Server-side stock conflict');
      }
      throw error;
    }
  },
};