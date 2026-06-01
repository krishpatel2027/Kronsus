from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, F
from django.db import transaction as db_transaction
from .models import StockTransaction
from .serializers import StockTransactionSerializer
from products.models import Product
from products.serializers import ProductSerializer
from backend.users.permissions import IsCompanyMember, HasActiveSubscription


class StockTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember, HasActiveSubscription]

    def get_queryset(self):
        return StockTransaction.objects.filter(company=self.request.user.company).select_related('product', 'user')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def stock_adjustment(request):
    try:
        product_id = request.data.get('product_id')
        transaction_type = request.data.get('type')
        quantity = request.data.get('quantity')
        notes = request.data.get('note', '')

        if not all([product_id, transaction_type, quantity]):
            return Response(
                {'error': 'Missing required fields: product_id, type, quantity'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_types = dict(StockTransaction.TRANSACTION_TYPES).keys()
        if transaction_type not in valid_types:
            return Response(
                {'error': f'Invalid transaction type. Must be one of: {list(valid_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quantity = int(quantity)
            if quantity <= 0:
                return Response(
                    {'error': 'Quantity must be a positive number'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Quantity must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with db_transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(
                    id=product_id,
                    company=request.user.company
                )
            except Product.DoesNotExist:
                return Response(
                    {'error': 'Product not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )

            if transaction_type == 'OUT' and product.current_stock < quantity:
                return Response(
                    {'error': f'Cannot remove {quantity} units. Only {product.current_stock} available.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if transaction_type == 'IN':
                new_stock = F('current_stock') + quantity
            elif transaction_type == 'OUT':
                new_stock = F('current_stock') - quantity
            else:
                new_stock = quantity

            Product.objects.filter(id=product_id).update(current_stock=new_stock)
            product.refresh_from_db()

            stock_transaction = StockTransaction.objects.create(
                company=request.user.company,
                product=product,
                user=request.user,
                quantity=quantity,
                transaction_type=transaction_type,
                notes=notes
            )

        return Response({
            'message': 'Stock adjustment completed successfully',
            'product': ProductSerializer(product).data,
            'transaction': StockTransactionSerializer(stock_transaction).data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'An error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sync_push(request):
    try:
        transactions = request.data.get('transactions', [])
        if not isinstance(transactions, list):
            return Response({'error': 'Transactions must be a list'}, status=status.HTTP_400_BAD_REQUEST)
        if not transactions:
            return Response({'error': 'No transactions provided'}, status=status.HTTP_400_BAD_REQUEST)

        applied_transactions = []
        skipped_transactions = []

        for i, transaction in enumerate(transactions):
            try:
                if not isinstance(transaction, dict):
                    skipped_transactions.append({'index': i, 'error': 'Transaction must be an object'})
                    continue

                required_fields = ['product_id', 'type', 'quantity']
                if not all(field in transaction for field in required_fields):
                    skipped_transactions.append({'index': i, 'product_id': transaction.get('product_id'), 'error': 'Missing required fields'})
                    continue

                valid_types = dict(StockTransaction.TRANSACTION_TYPES).keys()
                transaction_type = transaction['type']
                if transaction_type not in valid_types:
                    skipped_transactions.append({'index': i, 'product_id': transaction['product_id'], 'error': 'Invalid transaction type'})
                    continue

                try:
                    quantity = int(transaction['quantity'])
                    if quantity <= 0:
                        skipped_transactions.append({'index': i, 'product_id': transaction['product_id'], 'error': 'Quantity must be positive'})
                        continue
                except (ValueError, TypeError):
                    skipped_transactions.append({'index': i, 'product_id': transaction['product_id'], 'error': 'Invalid quantity'})
                    continue

                with db_transaction.atomic():
                    try:
                        product = Product.objects.select_for_update().get(
                            id=transaction['product_id'],
                            company=request.user.company
                        )
                    except Product.DoesNotExist:
                        skipped_transactions.append({'index': i, 'product_id': transaction['product_id'], 'error': 'Product not found'})
                        continue

                    if transaction_type == 'OUT' and product.current_stock < quantity:
                        skipped_transactions.append({'index': i, 'product_id': transaction['product_id'], 'error': 'Insufficient stock'})
                        continue

                    if transaction_type == 'IN':
                        new_stock = F('current_stock') + quantity
                    elif transaction_type == 'OUT':
                        new_stock = F('current_stock') - quantity
                    else:
                        new_stock = quantity

                    Product.objects.filter(id=transaction['product_id']).update(current_stock=new_stock)
                    product.refresh_from_db()

                    stock_transaction = StockTransaction.objects.create(
                        company=request.user.company,
                        product=product,
                        user=request.user,
                        quantity=quantity,
                        transaction_type=transaction_type,
                        notes=transaction.get('note', '')
                    )

                applied_transactions.append({
                    'product_id': transaction['product_id'],
                    'new_stock': product.current_stock,
                    'transaction_id': stock_transaction.id
                })

            except Exception as e:
                skipped_transactions.append({'index': i, 'product_id': transaction.get('product_id'), 'error': str(e)})

        summary = {
            'total_transactions': len(transactions),
            'applied_count': len(applied_transactions),
            'skipped_count': len(skipped_transactions),
            'applied_transactions': applied_transactions,
            'skipped_transactions': skipped_transactions,
        }

        http_status = status.HTTP_207_MULTI_STATUS if (applied_transactions and skipped_transactions) else (status.HTTP_200_OK if not skipped_transactions else status.HTTP_400_BAD_REQUEST)
        return Response(summary, status=http_status)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
