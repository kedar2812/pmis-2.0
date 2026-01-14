from rest_framework import serializers
from .models import BankBranch


class BankBranchSerializer(serializers.ModelSerializer):
    """Serializer for bank branch details"""
    
    class Meta:
        model = BankBranch
        fields = [
            'ifsc_code',
            'bank_name',
            'branch_name',
            'address',
            'city',
            'district',
            'state',
            'contact',
            'rtgs',
            'neft',
            'imps',
            'upi',
            'is_active',
        ]
        read_only_fields = fields  # All fields are read-only for public API


class BankListSerializer(serializers.Serializer):
    """Simple serializer for bank names list"""
    bank_name = serializers.CharField()
