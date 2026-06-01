# StockAdjustmentView Implementation

## Overview
Implemented a Django Rest Framework `StockAdjustmentView` for handling stock adjustments with atomic operations and comprehensive validation.

## Features Implemented

### 1. Transaction Types
- **IN**: Increase stock quantity
- **OUT**: Decrease stock quantity (with validation)
- **ADJUST**: Manual stock adjustment (can be positive or negative)

### 2. Validation Rules
- **Authentication Required**: All requests must be authenticated
- **Company Access Control**: Users can only modify products from their company
- **OUT Validation**: Prevents stock from going below zero
- **Quantity Validation**: Must be positive integers only
- **Required Fields**: `product_id`, `type`, `quantity` are mandatory

### 3. Atomic Operations
- Uses `django.db.transaction.atomic()` for database consistency
- Uses `F()` expressions for stock updates to prevent race conditions
- Transaction and product updates are bundled in a single atomic operation

### 4. Audit Trail
- Creates `StockTransaction` records for every adjustment
- Records user, timestamp, quantity change, and notes
- Returns both updated product and transaction data

## API Endpoint

### POST /api/stock/adjust/
```json
{
  "product_id": 1,
  "type": "IN",
  "quantity": 50,
  "note": "Added new stock shipment"
}
```

## Request Parameters

### Required Fields
- `product_id` (integer): ID of the product to adjust
- `type` (string): Transaction type - "IN", "OUT", or "ADJUST"
- `quantity` (integer): Amount to adjust (must be positive)

### Optional Fields
- `note` (string): Optional notes about the transaction

## Response Format

### Success Response (200 OK)
```json
{
  "message": "Stock adjustment completed successfully",
  "product": {
    "id": 1,
    "company": 1,
    "name": "Test Product",
    "sku": "SKU001",
    "current_stock": 150,
    "created_at": "2026-05-30T10:00:00Z"
  },
  "transaction": {
    "id": 1,
    "product": 1,
    "product_name": "Test Product",
    "product_sku": "SKU001",
    "user": 1,
    "quantity": 50,
    "transaction_type": "IN",
    "timestamp": "2026-05-30T10:00:00Z",
    "notes": "Added new stock shipment"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Missing required fields: product_id, type, quantity"
}
```

```json
{
  "error": "Invalid transaction type. Must be one of: ['IN', 'OUT', 'ADJUST']"
}
```

```json
{
  "error": "Quantity must be a positive number"
}
```

```json
{
  "error": "Cannot remove 150 units. Only 100 available."
}
```

#### 404 Not Found
```json
{
  "error": "Product not found or access denied"
}
```

#### 403 Forbidden
```json
{
  "error": "Authentication credentials were not provided."
}
```

#### 500 Internal Server Error
```json
{
  "error": "An error occurred: [error details]"
}
```

## Implementation Details

### Security
- **Authentication**: Requires authenticated users
- **Authorization**: Users can only modify products from their company
- **Data Integrity**: Atomic operations prevent race conditions

### Database Operations
```python
# Atomic transaction with F() expressions
with db_transaction.atomic():
    if transaction_type == 'IN':
        new_stock = F('current_stock') + quantity
    elif transaction_type == 'OUT':
        new_stock = F('current_stock') - quantity
    else:  # ADJUST
        new_stock = F('current_stock') + quantity
    
    Product.objects.filter(id=product_id).update(current_stock=new_stock)
    
    # Create transaction record
    StockTransaction.objects.create(...)
```

### Validation Flow
1. Check authentication
2. Validate required fields exist
3. Validate transaction type is valid
4. Validate quantity is positive integer
5. Check product exists and belongs to user's company
6. Validate OUT transactions don't exceed available stock
7. Perform atomic stock update and transaction creation

## Testing

Comprehensive test suite includes:

### Positive Tests
- IN, OUT, and ADJUST transactions
- Proper stock updates
- Transaction record creation
- Response format validation

### Negative Tests
- Missing required fields
- Invalid transaction types
- Negative/zero quantities
- Insufficient stock for OUT transactions
- Non-existent products
- Cross-company access attempts
- Unauthenticated access

### Concurrency Tests
- Multiple rapid requests to test atomicity
- Race condition prevention verification

Run tests with:
```bash
python manage.py test core.tests.StockAdjustmentTests
```

## File Structure

```
core/
├── models.py          # Product and StockTransaction models (already existed)
├── views.py           # StockAdjustmentView implementation
├── serializers.py     # ProductSerializer and StockTransactionSerializer
├── urls.py            # API URL routing
└── tests.py           # Comprehensive test suite
```

## Performance Considerations

- **Atomic Operations**: Ensures data consistency under concurrent access
- **F() Expressions**: Prevents race conditions by using database-level operations
- **Efficient Queries**: Minimal database queries with proper indexing
- **Pagination**: Already configured for product listings

## Error Handling

- Comprehensive input validation
- Graceful error responses with clear messages
- Database transaction rollback on errors
- Proper HTTP status codes

## Extension Points

The view can be easily extended to support:
- Additional transaction types
- Custom validation rules
- Bulk operations
- Advanced audit logging
- Integration with external systems