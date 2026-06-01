from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Company, User


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['created_at']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'company']
        read_only_fields = ['company']


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    company_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'company_name')

    def create(self, validated_data):
        company_name = validated_data.pop('company_name')
        password = validated_data.pop('password')
        company, _ = Company.objects.get_or_create(name=company_name)
        user = User.objects.create(company=company, **validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'company_id': user.company.id if getattr(user, 'company', None) else None,
        }
        return data
