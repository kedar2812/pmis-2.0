from django.contrib import admin
from .models import Tender, Bid, Contract, Variation


@admin.register(Tender)
class TenderAdmin(admin.ModelAdmin):
    list_display = ['tender_no', 'title', 'project', 'status', 'estimated_value', 'submission_deadline']
    list_filter = ['status', 'tender_type', 'project']
    search_fields = ['tender_no', 'title', 'description']
    date_hierarchy = 'created_at'


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ['tender', 'bidder', 'bid_amount', 'status', 'combined_score', 'submission_date']
    list_filter = ['status', 'tender']
    search_fields = ['tender__tender_no', 'bidder__name']


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['contract_no', 'contractor', 'project', 'contract_value', 'status', 'start_date', 'end_date']
    list_filter = ['status', 'project']
    search_fields = ['contract_no', 'contractor__name']
    date_hierarchy = 'created_at'


@admin.register(Variation)
class VariationAdmin(admin.ModelAdmin):
    list_display = ['variation_no', 'contract', 'title', 'amount', 'status', 'variation_type']
    list_filter = ['status', 'variation_type']
    search_fields = ['variation_no', 'title', 'description']
