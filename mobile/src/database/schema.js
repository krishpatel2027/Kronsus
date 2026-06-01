import { Database } from '@nozbe/watermelondb';
import { Schema } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { app } from './app';

const schema = new Schema({
  companies: {
    columns: [
      { name: 'remote_id', type: 'string', isOptional: true },
      { name: 'name', type: 'string' },
    ],
  },
  users: {
    columns: [
      { name: 'remote_id', type: 'string', isOptional: true },
      { name: 'username', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'company_id', type: 'string', isIndexed: true },
    ],
  },
  products: {
    columns: [
      { name: 'remote_id', type: 'string', isOptional: true },
      { name: 'company_id', type: 'string', isIndexed: true },
      { name: 'name', type: 'string' },
      { name: 'sku', type: 'string', isIndexed: true },
      { name: 'description', type: 'string', isOptional: true },
      { name: 'stock', type: 'number', defaultValue: 0 },
      { name: 'synced', type: 'boolean', defaultValue: true },
      { name: 'sync_error', type: 'string', isOptional: true },
    ],
  },
  stock_transactions: {
    columns: [
      { name: 'remote_id', type: 'string', isOptional: true },
      { name: 'company_id', type: 'string', isIndexed: true },
      { name: 'product_id', type: 'string', isIndexed: true },
      { name: 'transaction_type', type: 'string' },
      { name: 'quantity', type: 'number' },
      { name: 'notes', type: 'string', isOptional: true },
      { name: 'synced', type: 'boolean', defaultValue: true },
      { name: 'sync_error', type: 'string', isOptional: true },
      { name: 'created_at', type: 'number' },
    ],
  },
});

export const database = new Database({
  schema,
  adapter: app,
});

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class Company extends Model {
  static table = 'companies';

  @field('name') name;
  @field('remote_id') remoteId;
}

export class User extends Model {
  static table = 'users';

  @field('username') username;
  @field('email') email;
  @field('remote_id') remoteId;
  @field('company_id') companyId;
}

export class Product extends Model {
  static table = 'products';

  @field('name') name;
  @field('sku') sku;
  @field('description') description;
  @field('company_id') companyId;
  @field('remote_id') remoteId;
  @field('stock') stock;
  @field('synced') synced;
  @field('sync_error') syncError;
}

export class StockTransaction extends Model {
  static table = 'stock_transactions';

  @field('company_id') companyId;
  @field('product_id') productId;
  @field('transaction_type') transactionType;
  @field('quantity') quantity;
  @field('notes') notes;
  @field('remote_id') remoteId;
  @field('synced') synced;
  @field('sync_error') syncError;
  @field('created_at') createdAt;
}
