from rest_framework import permissions


class IsCompanyMember(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return getattr(obj, 'company', None) == getattr(request.user, 'company', None)


class HasActiveSubscription(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.subscription_status == 'active'
