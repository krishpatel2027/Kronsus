import { database } from '../database';
import { Product, StockTransaction } from '../database/schema';
import { fetchProducts, fetchTransactions } from '../services/api';
import { syncStockTransaction } from './syncService';

export class OfflineService {
  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.syncInProgress = false;
  }

  // Set online status
  setOnlineStatus(status) {
    this.isOnline = status;
    if (status && this.syncQueue.length > 0) {
      this.processSyncQueue();
    }
  }

  // Get all products from local database
  async getLocalProducts() {
    return await database.collections.get('products').query().fetch();
  }

  // Get all stock transactions from local database
  async getLocalTransactions() {
    return await database.collections.get('stock_transactions').query().fetch();
  }

  // Get product by ID from local database
  async getProductById(id) {
    return await database.collections.get('products').find(id);
  }

  // Create or update product locally
  async upsertProduct(productData) {
    const productCollection = database.collections.get('products');
    
    // Check if product exists locally
    const existingProduct = await productCollection.query(
      Q.where('sku', productData.sku)
    ).fetch();

    if (existingProduct.length > 0) {
      // Update existing product
      const product = existingProduct[0];
      await product.update(p => ({
        ...p,
        name: productData.name,
        description: productData.description,
        stock: productData.stock || 0,
        synced: true,
        syncError: null,
      }));
      return product;
    } else {
      // Create new product
      return await database.write(async () => {
        const product = await productCollection.create(p => ({
          ...p,
          remoteId: productData.id.toString(),
          companyId: productData.company_id,
          name: productData.name,
          sku: productData.sku,
          description: productData.description,
          stock: productData.stock || 0,
          synced: true,
        }));
        return product;
      });
    }
  }

  async batchUpsertProducts(products) {
    await database.write(async () => {
      for (const productData of products) {
        await this.upsertProduct(productData);
      }
    });
  }

  async updateProductStock(product, stock, synced = true) {
    await database.write(async () => {
      await product.update(p => ({
        ...p,
        stock: stock,
        synced: synced,
      }));
    });
  }

  // Create stock transaction locally
  async createStockTransaction(transactionData) {
    return await database.write(async () => {
      const transaction = await database.collections.get('stock_transactions').create(t => ({
        ...t,
        companyId: transactionData.company_id,
        productId: transactionData.product_id,
        transactionType: transactionData.transaction_type,
        quantity: transactionData.quantity,
        notes: transactionData.notes || '',
        createdAt: Date.now(),
        synced: false, // Mark as pending sync
      }));
      return transaction;
    });
  }

  // Sync pending transactions when online
  async syncPendingTransactions() {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    const pendingTransactions = await database.collections.get('stock_transactions').query(
      Q.where('synced', false)
    ).fetch();

    for (const transaction of pendingTransactions) {
      try {
        await syncStockTransaction(transaction);
        await transaction.update(t => ({ ...t, synced: true, syncError: null }));
      } catch (error) {
        await transaction.update(t => ({ ...t, syncError: error.message }));
        console.error('Failed to sync transaction:', error);
      }
    }

    this.syncInProgress = false;
  }

  // Sync products when online
  async syncProducts() {
    if (!this.isOnline) return;

    try {
      // Fetch products from API
      const apiResponse = await fetchProducts();
      const products = apiResponse.results || apiResponse;

      // Sync each product
      for (const productData of products) {
        await this.upsertProduct(productData);
      }
    } catch (error) {
      console.error('Failed to sync products:', error);
    }
  }

  // Get current stock for a product
  async getProductStock(productId) {
    const product = await this.getProductById(productId);
    if (!product) return 0;

    // Calculate stock from local transactions
    const transactions = await database.collections.get('stock_transactions').query(
      Q.where('product_id', productId)
    ).fetch();

    let stock = product.stock || 0;
    for (const transaction of transactions) {
      if (transaction.transactionType === 'IN') {
        stock += transaction.quantity;
      } else if (transaction.transactionType === 'OUT') {
        stock -= transaction.quantity;
      }
    }

    return stock;
  }

  // Check if we need to sync
  async needsSync() {
    const pendingTransactions = await database.collections.get('stock_transactions').query(
      Q.where('synced', false)
    ).fetch();
    return pendingTransactions.length > 0;
  }
}

export const offlineService = new OfflineService();