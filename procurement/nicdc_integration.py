"""
NICDC Procurement Portal Integration Service

This module handles two-way synchronization between PMIS and the NICDC Procurement Portal.
The integration supports:
1. Pushing tenders to NICDC portal
2. Pulling tender updates from NICDC portal
3. Receiving webhook notifications for bid submissions

Configuration:
- Set NICDC_PORTAL_API_URL in .env
- Set NICDC_PORTAL_API_KEY in .env
"""
import logging
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone
import requests

logger = logging.getLogger(__name__)


class NICDCPortalService:
    """
    Service for integrating with NICDC Procurement Portal.
    
    The NICDC portal is the central government procurement system.
    This service enables:
    - Publishing tenders to the portal
    - Syncing bid submissions back to PMIS
    - Status synchronization
    """
    
    def __init__(self):
        self.base_url = getattr(settings, 'NICDC_PORTAL_API_URL', None)
        self.api_key = getattr(settings, 'NICDC_PORTAL_API_KEY', None)
        self.enabled = bool(self.base_url and self.api_key)
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'X-Source-System': 'PMIS-ZIA',
        }
    
    def is_configured(self) -> bool:
        """Check if NICDC integration is configured."""
        return self.enabled
    
    def publish_tender(self, tender) -> Optional[str]:
        """
        Publish a tender to NICDC Procurement Portal.
        
        Returns the NICDC reference ID if successful.
        """
        if not self.enabled:
            logger.warning("NICDC Portal integration not configured")
            return None
        
        payload = {
            'source_system': 'PMIS-ZIA',
            'source_ref': str(tender.id),
            'tender_no': tender.tender_no,
            'title': tender.title,
            'description': tender.description,
            'estimated_value': str(tender.estimated_value),
            'tender_type': tender.tender_type,
            'publish_date': tender.publish_date.isoformat() if tender.publish_date else None,
            'submission_deadline': tender.submission_deadline.isoformat() if tender.submission_deadline else None,
            'project': {
                'name': tender.project.name if tender.project else None,
                'location': tender.project.location if tender.project else None,
            }
        }
        
        try:
            response = requests.post(
                f'{self.base_url}/api/v1/tenders/',
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            nicdc_ref = data.get('reference_id')
            
            # Store the NICDC reference back to tender
            tender.nicdc_portal_ref = nicdc_ref
            tender.save(update_fields=['nicdc_portal_ref'])
            
            logger.info(f"Tender {tender.tender_no} published to NICDC: {nicdc_ref}")
            return nicdc_ref
            
        except requests.RequestException as e:
            logger.error(f"Failed to publish tender to NICDC: {e}")
            return None
    
    def sync_tender_status(self, tender) -> bool:
        """
        Sync tender status from NICDC Portal.
        """
        if not self.enabled or not tender.nicdc_portal_ref:
            return False
        
        try:
            response = requests.get(
                f'{self.base_url}/api/v1/tenders/{tender.nicdc_portal_ref}/',
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            # Update local tender with portal status
            # (mapping depends on NICDC portal schema)
            
            return True
            
        except requests.RequestException as e:
            logger.error(f"Failed to sync tender from NICDC: {e}")
            return False
    
    def fetch_bids(self, tender) -> list:
        """
        Fetch bids submitted via NICDC Portal.
        """
        if not self.enabled or not tender.nicdc_portal_ref:
            return []
        
        try:
            response = requests.get(
                f'{self.base_url}/api/v1/tenders/{tender.nicdc_portal_ref}/bids/',
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            
            return response.json().get('bids', [])
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch bids from NICDC: {e}")
            return []
    
    def update_contract_status(self, contract) -> bool:
        """
        Update contract status on NICDC Portal.
        """
        if not self.enabled or not contract.tender.nicdc_portal_ref:
            return False
        
        payload = {
            'contract_no': contract.contract_no,
            'contractor_name': contract.contractor.name,
            'contract_value': str(contract.contract_value),
            'status': contract.status,
            'signing_date': contract.signing_date.isoformat() if contract.signing_date else None,
        }
        
        try:
            response = requests.post(
                f'{self.base_url}/api/v1/tenders/{contract.tender.nicdc_portal_ref}/contract/',
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            return True
            
        except requests.RequestException as e:
            logger.error(f"Failed to update contract on NICDC: {e}")
            return False


# Singleton instance
nicdc_service = NICDCPortalService()


def process_nicdc_webhook(payload: Dict[str, Any]) -> bool:
    """
    Process incoming webhook from NICDC Portal.
    
    Webhook events:
    - bid_submitted: New bid received
    - tender_closed: Tender deadline passed
    - clarification_requested: Bidder requested clarification
    """
    from .models import Tender, Bid
    
    event_type = payload.get('event_type')
    tender_ref = payload.get('tender_reference')
    
    try:
        tender = Tender.objects.get(nicdc_portal_ref=tender_ref)
    except Tender.DoesNotExist:
        logger.warning(f"Tender not found for NICDC ref: {tender_ref}")
        return False
    
    if event_type == 'bid_submitted':
        # Create bid record from webhook data
        bid_data = payload.get('bid_data', {})
        # Process bid creation...
        logger.info(f"Bid received via NICDC webhook for {tender.tender_no}")
        return True
    
    elif event_type == 'tender_closed':
        tender.status = 'BID_OPEN'
        tender.save(update_fields=['status'])
        return True
    
    return False
