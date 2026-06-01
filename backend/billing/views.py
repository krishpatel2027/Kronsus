import stripe
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

stripe.api_key = settings.STRIPE_SECRET_KEY

User = get_user_model()


class SubscriptionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def create_checkout_session(self, request):
        try:
            customer_id = request.user.stripe_customer_id
            if not customer_id:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    metadata={'user_id': request.user.id}
                )
                customer_id = customer.id
                request.user.stripe_customer_id = customer_id
                request.user.save()

            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': settings.STRIPE_PRICE_ID,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=settings.STRIPE_SUCCESS_URL,
                cancel_url=settings.STRIPE_CANCEL_URL,
                metadata={'user_id': request.user.id}
            )
            return Response({'url': session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def stripe_webhook(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return HttpResponse(status=400)

        if event['type'] == 'checkout.session.completed':
            session = event['data'].object
            user_id = session.get('metadata', {}).get('user_id')
            if user_id:
                user = User.objects.get(pk=user_id)
                user.subscription_status = 'active'
                user.save()

        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data'].object
            customer_id = subscription.customer
            user = User.objects.get(stripe_customer_id=customer_id)
            status_value = subscription.status
            user.subscription_status = status_value
            user.stripe_subscription_id = subscription.id
            user.save()

        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data'].object
            customer_id = subscription.customer
            user = User.objects.get(stripe_customer_id=customer_id)
            user.subscription_status = 'canceled'
            user.save()

        return HttpResponse(status=200)
