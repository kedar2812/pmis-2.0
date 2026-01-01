"""
ETP (Every Transaction Payment) Billing Integration Service

This module provides robust calculation of statutory deductions and recoveries
for RA Bills based on the ETPMaster configuration. It reads active charges
from the masters table and applies them dynamically.

Key Features:
- Dynamic charge calculation based on ETPMaster
- Audit trail for all calculated deductions
- Support for different calculation bases (Gross, Works, Material, etc.)
- Configurable effective dates for policy changes
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from masters.models import ETPMaster


class ETPCalculationService:
    """
    Service class for calculating ETP deductions and recoveries on RA Bills.
    
    Usage:
        service = ETPCalculationService()
        deductions = service.calculate_all_deductions(gross_amount=1000000)
        total_deductions = service.get_total_deductions(deductions)
        net_payable = service.calculate_net_payable(gross_amount, gst_amount, deductions)
    """
    
    # Precision for monetary calculations (2 decimal places)
    PRECISION = Decimal('0.01')
    
    def __init__(self, reference_date: Optional[timezone.datetime] = None):
        """
        Initialize the service.
        
        Args:
            reference_date: Date to use for checking charge effectiveness.
                           Defaults to current date.
        """
        self.reference_date = reference_date or timezone.now().date()
        self._charges_cache = None
    
    def get_active_charges(self, charge_type: Optional[str] = None) -> List[ETPMaster]:
        """
        Fetch all active ETP charges from the database.
        
        Args:
            charge_type: Optional filter for 'Deduction', 'Recovery', 'Levy', 'Addition'
            
        Returns:
            List of active ETPMaster instances
        """
        queryset = ETPMaster.objects.filter(
            is_active=True,
            effective_date__lte=self.reference_date
        )
        
        if charge_type:
            queryset = queryset.filter(charge_type=charge_type)
        
        return list(queryset.order_by('charge_type', 'code'))
    
    def _get_calculation_base(
        self, 
        basis: str, 
        gross_amount: Decimal,
        works_component: Optional[Decimal] = None,
        material_cost: Optional[Decimal] = None,
        labour_cost: Optional[Decimal] = None,
        net_payable: Optional[Decimal] = None
    ) -> Decimal:
        """
        Determine the base amount for calculation based on the charge configuration.
        
        Args:
            basis: The basis of calculation from ETPMaster
            gross_amount: Total gross bill value
            works_component: Optional works component amount
            material_cost: Optional material cost amount
            labour_cost: Optional labour cost amount
            net_payable: Optional net payable for recursive calculations
            
        Returns:
            The base amount to apply the percentage to
        """
        basis_mapping = {
            'Gross Bill Value': gross_amount,
            'Works Component Only': works_component or gross_amount,
            'Material Cost': material_cost or Decimal('0'),
            'Labour Cost': labour_cost or Decimal('0'),
            'Net Payable': net_payable or gross_amount,
        }
        
        return basis_mapping.get(basis, gross_amount)
    
    def calculate_single_charge(
        self,
        charge: ETPMaster,
        gross_amount: Decimal,
        works_component: Optional[Decimal] = None,
        material_cost: Optional[Decimal] = None,
        labour_cost: Optional[Decimal] = None
    ) -> Dict:
        """
        Calculate a single ETP charge.
        
        Args:
            charge: The ETPMaster instance
            gross_amount: Gross bill amount
            works_component: Optional works component
            material_cost: Optional material cost
            labour_cost: Optional labour cost
            
        Returns:
            Dict with charge details and calculated amount
        """
        base_amount = self._get_calculation_base(
            charge.basis_of_calculation,
            gross_amount,
            works_component,
            material_cost,
            labour_cost
        )
        
        # Calculate the charge amount
        rate = Decimal(str(charge.rate_percentage))
        amount = (base_amount * rate / Decimal('100')).quantize(
            self.PRECISION, 
            rounding=ROUND_HALF_UP
        )
        
        return {
            'charge_id': str(charge.id),
            'code': charge.code,
            'name': charge.name,
            'charge_type': charge.charge_type,
            'rate_percentage': float(rate),
            'basis': charge.basis_of_calculation,
            'base_amount': float(base_amount),
            'calculated_amount': float(amount),
            'account_head': charge.account_head or '',
            'govt_reference': charge.govt_reference or '',
        }
    
    def calculate_all_deductions(
        self,
        gross_amount: Decimal,
        works_component: Optional[Decimal] = None,
        material_cost: Optional[Decimal] = None,
        labour_cost: Optional[Decimal] = None,
        exclude_charges: Optional[List[str]] = None
    ) -> Dict[str, List[Dict]]:
        """
        Calculate all applicable ETP deductions and recoveries.
        
        Args:
            gross_amount: The gross bill amount
            works_component: Optional works component amount
            material_cost: Optional material cost
            labour_cost: Optional labour cost
            exclude_charges: List of charge codes to exclude
            
        Returns:
            Dict with 'deductions', 'recoveries', 'levies', 'additions' keys
        """
        gross_amount = Decimal(str(gross_amount))
        works_component = Decimal(str(works_component)) if works_component else None
        material_cost = Decimal(str(material_cost)) if material_cost else None
        labour_cost = Decimal(str(labour_cost)) if labour_cost else None
        exclude_charges = exclude_charges or []
        
        charges = self.get_active_charges()
        
        result = {
            'deductions': [],
            'recoveries': [],
            'levies': [],
            'additions': [],
        }
        
        for charge in charges:
            if charge.code in exclude_charges:
                continue
                
            calculated = self.calculate_single_charge(
                charge,
                gross_amount,
                works_component,
                material_cost,
                labour_cost
            )
            
            # Categorize by charge type
            type_key = {
                'Deduction': 'deductions',
                'Recovery': 'recoveries',
                'Levy': 'levies',
                'Addition': 'additions',
            }.get(charge.charge_type, 'deductions')
            
            result[type_key].append(calculated)
        
        return result
    
    def get_total_deductions(self, calculated_charges: Dict[str, List[Dict]]) -> Decimal:
        """
        Sum up all deductions, recoveries, and levies.
        
        Args:
            calculated_charges: Result from calculate_all_deductions
            
        Returns:
            Total deduction amount
        """
        total = Decimal('0')
        
        for key in ['deductions', 'recoveries', 'levies']:
            for charge in calculated_charges.get(key, []):
                total += Decimal(str(charge['calculated_amount']))
        
        return total.quantize(self.PRECISION, rounding=ROUND_HALF_UP)
    
    def get_total_additions(self, calculated_charges: Dict[str, List[Dict]]) -> Decimal:
        """
        Sum up all additions.
        
        Args:
            calculated_charges: Result from calculate_all_deductions
            
        Returns:
            Total additions amount
        """
        total = Decimal('0')
        
        for charge in calculated_charges.get('additions', []):
            total += Decimal(str(charge['calculated_amount']))
        
        return total.quantize(self.PRECISION, rounding=ROUND_HALF_UP)
    
    def calculate_net_payable(
        self,
        gross_amount: Decimal,
        gst_amount: Decimal,
        calculated_charges: Dict[str, List[Dict]],
        other_deductions: Decimal = Decimal('0'),
        advances_recovery: Decimal = Decimal('0')
    ) -> Decimal:
        """
        Calculate the final net payable amount.
        
        Formula: Gross + GST + Additions - Deductions - Recoveries - Levies - Other - Advances
        
        Args:
            gross_amount: Gross bill value
            gst_amount: GST amount
            calculated_charges: Result from calculate_all_deductions
            other_deductions: Any manual/other deductions
            advances_recovery: Mobilization/material advance recovery
            
        Returns:
            Net payable amount
        """
        gross_amount = Decimal(str(gross_amount))
        gst_amount = Decimal(str(gst_amount))
        other_deductions = Decimal(str(other_deductions))
        advances_recovery = Decimal(str(advances_recovery))
        
        total_deductions = self.get_total_deductions(calculated_charges)
        total_additions = self.get_total_additions(calculated_charges)
        
        net_payable = (
            gross_amount 
            + gst_amount 
            + total_additions 
            - total_deductions 
            - other_deductions 
            - advances_recovery
        )
        
        return net_payable.quantize(self.PRECISION, rounding=ROUND_HALF_UP)
    
    def generate_bill_summary(
        self,
        gross_amount: Decimal,
        gst_percentage: Decimal = Decimal('18'),
        works_component: Optional[Decimal] = None,
        material_cost: Optional[Decimal] = None,
        labour_cost: Optional[Decimal] = None,
        other_deductions: Decimal = Decimal('0'),
        advances_recovery: Decimal = Decimal('0'),
        retention_percentage: Decimal = Decimal('0')
    ) -> Dict:
        """
        Generate a complete bill calculation summary.
        
        Args:
            gross_amount: Gross bill value
            gst_percentage: GST percentage to apply
            works_component: Optional works component
            material_cost: Optional material cost
            labour_cost: Optional labour cost
            other_deductions: Manual deductions
            advances_recovery: Advance recovery amount
            retention_percentage: Security deposit percentage
            
        Returns:
            Complete bill summary with all calculations
        """
        gross_amount = Decimal(str(gross_amount))
        gst_percentage = Decimal(str(gst_percentage))
        
        # Calculate GST
        gst_amount = (gross_amount * gst_percentage / Decimal('100')).quantize(
            self.PRECISION, rounding=ROUND_HALF_UP
        )
        
        total_before_deductions = gross_amount + gst_amount
        
        # Calculate retention/security deposit
        retention_amount = Decimal('0')
        if retention_percentage > 0:
            retention_amount = (gross_amount * Decimal(str(retention_percentage)) / Decimal('100')).quantize(
                self.PRECISION, rounding=ROUND_HALF_UP
            )
        
        # Calculate all ETP charges
        calculated_charges = self.calculate_all_deductions(
            gross_amount,
            works_component,
            material_cost,
            labour_cost
        )
        
        total_statutory_deductions = self.get_total_deductions(calculated_charges)
        total_additions = self.get_total_additions(calculated_charges)
        
        # Calculate net payable
        net_payable = self.calculate_net_payable(
            gross_amount,
            gst_amount,
            calculated_charges,
            Decimal(str(other_deductions)) + retention_amount,
            Decimal(str(advances_recovery))
        )
        
        return {
            'gross_amount': float(gross_amount),
            'gst_percentage': float(gst_percentage),
            'gst_amount': float(gst_amount),
            'total_before_deductions': float(total_before_deductions),
            
            'statutory_charges': calculated_charges,
            'total_statutory_deductions': float(total_statutory_deductions),
            'total_additions': float(total_additions),
            
            'retention_percentage': float(retention_percentage),
            'retention_amount': float(retention_amount),
            
            'other_deductions': float(other_deductions),
            'advances_recovery': float(advances_recovery),
            
            'total_deductions': float(
                total_statutory_deductions 
                + Decimal(str(other_deductions)) 
                + retention_amount 
                + Decimal(str(advances_recovery))
            ),
            
            'net_payable': float(net_payable),
            
            'calculated_at': self.reference_date.isoformat(),
        }


# Helper function for quick calculations
def calculate_bill_deductions(
    gross_amount: float,
    gst_percentage: float = 18.0,
    retention_percentage: float = 0.0,
    other_deductions: float = 0.0,
    advances_recovery: float = 0.0,
) -> Dict:
    """
    Quick helper to calculate bill deductions.
    
    Args:
        gross_amount: Gross bill value
        gst_percentage: GST percentage (default 18%)
        retention_percentage: Security deposit percentage
        other_deductions: Manual deductions
        advances_recovery: Advance recovery
        
    Returns:
        Complete bill summary
    """
    service = ETPCalculationService()
    return service.generate_bill_summary(
        gross_amount=Decimal(str(gross_amount)),
        gst_percentage=Decimal(str(gst_percentage)),
        retention_percentage=Decimal(str(retention_percentage)),
        other_deductions=Decimal(str(other_deductions)),
        advances_recovery=Decimal(str(advances_recovery)),
    )
