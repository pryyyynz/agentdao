"""
Budget Analyzer Service for AgentDAO
Analyzes grant proposal budgets for reasonability, market alignment, and red flags
"""

import json
import time
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import logging
from decimal import Decimal

from config import settings
from utils.common import get_utc_now


# Setup logger
logger = logging.getLogger(__name__)


class BudgetAnalyzer:
    """
    Budget analysis and validation service
    
    Evaluates grant budgets on:
    - Budget reasonability and completeness
    - Market rate alignment
    - Category-wise breakdown analysis
    - Red flag detection (unrealistic amounts)
    - Milestone structure generation
    
    Scoring: 0-100 (higher = better budget quality)
    """
    
    # Market rate benchmarks (USD per month or per project)
    MARKET_RATES = {
        'developer': {
            'junior': {'min': 3000, 'max': 6000, 'avg': 4500},
            'mid': {'min': 6000, 'max': 10000, 'avg': 8000},
            'senior': {'min': 10000, 'max': 20000, 'avg': 15000},
            'lead': {'min': 15000, 'max': 30000, 'avg': 22000}
        },
        'designer': {
            'junior': {'min': 2500, 'max': 5000, 'avg': 3500},
            'mid': {'min': 5000, 'max': 8000, 'avg': 6500},
            'senior': {'min': 8000, 'max': 15000, 'avg': 11000}
        },
        'marketing': {
            'social_media': {'min': 1000, 'max': 5000, 'avg': 3000},
            'content_creation': {'min': 2000, 'max': 8000, 'avg': 5000},
            'campaign': {'min': 5000, 'max': 50000, 'avg': 20000}
        },
        'audit': {
            'smart_contract': {'min': 10000, 'max': 100000, 'avg': 40000},
            'security': {'min': 5000, 'max': 50000, 'avg': 20000}
        },
        'infrastructure': {
            'hosting': {'min': 100, 'max': 2000, 'avg': 500},
            'domain': {'min': 10, 'max': 100, 'avg': 30},
            'services': {'min': 500, 'max': 5000, 'avg': 2000}
        }
    }
    
    # Recommended budget category distributions (percentages)
    CATEGORY_DISTRIBUTIONS = {
        'development': {
            'software': {'min': 40, 'max': 60, 'recommended': 50},
            'infrastructure': {'min': 35, 'max': 55, 'recommended': 45},
            'research': {'min': 30, 'max': 50, 'recommended': 40}
        },
        'marketing': {
            'software': {'min': 10, 'max': 20, 'recommended': 15},
            'infrastructure': {'min': 15, 'max': 25, 'recommended': 20},
            'research': {'min': 5, 'max': 15, 'recommended': 10}
        },
        'operations': {
            'software': {'min': 10, 'max': 20, 'recommended': 15},
            'infrastructure': {'min': 15, 'max': 25, 'recommended': 20},
            'research': {'min': 10, 'max': 20, 'recommended': 15}
        },
        'audits': {
            'software': {'min': 5, 'max': 15, 'recommended': 10},
            'infrastructure': {'min': 5, 'max': 15, 'recommended': 10},
            'research': {'min': 3, 'max': 10, 'recommended': 5}
        },
        'contingency': {
            'software': {'min': 5, 'max': 15, 'recommended': 10},
            'infrastructure': {'min': 5, 'max': 15, 'recommended': 10},
            'research': {'min': 5, 'max': 15, 'recommended': 10}
        }
    }
    
    def __init__(self):
        """Initialize Budget Analyzer"""
        logger.info("BudgetAnalyzer initialized")
    
    def parse_budget_breakdown(self, budget_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse and normalize budget breakdown
        
        Args:
            budget_data: Budget information
        
        Returns:
            Normalized budget breakdown
        """
        breakdown = {
            'total_amount': float(budget_data.get('total_amount', 0)),
            'currency': budget_data.get('currency', 'USD'),
            'duration_months': int(budget_data.get('duration_months', 6)),
            'categories': {},
            'items': []
        }
        
        # Parse budget items
        items = budget_data.get('budget_items', [])
        for item in items:
            category = item.get('category', 'other').lower()
            amount = float(item.get('amount', 0))
            
            # Add to category total
            if category not in breakdown['categories']:
                breakdown['categories'][category] = 0
            breakdown['categories'][category] += amount
            
            # Add item details
            breakdown['items'].append({
                'category': category,
                'description': item.get('description', ''),
                'amount': amount,
                'quantity': item.get('quantity', 1),
                'unit_cost': item.get('unit_cost', amount)
            })
        
        return breakdown
    
    def check_budget_reasonability(
        self,
        breakdown: Dict[str, Any],
        project_type: str = 'software'
    ) -> Dict[str, Any]:
        """
        Check if budget amounts are reasonable
        
        Args:
            breakdown: Parsed budget breakdown
            project_type: Type of project (software, infrastructure, research)
        
        Returns:
            Reasonability analysis results
        """
        analysis = {
            'is_reasonable': True,
            'total_score': 0,
            'category_scores': {},
            'issues': [],
            'warnings': []
        }
        
        total_amount = breakdown['total_amount']
        duration_months = breakdown['duration_months']
        categories = breakdown['categories']
        
        # Check if total amount is in reasonable range
        min_reasonable = duration_months * 5000  # $5k/month minimum
        max_reasonable = duration_months * 100000  # $100k/month maximum
        
        if total_amount < min_reasonable:
            analysis['issues'].append(
                f"Budget seems too low: ${total_amount:,.0f} for {duration_months} months "
                f"(minimum recommended: ${min_reasonable:,.0f})"
            )
            analysis['is_reasonable'] = False
        elif total_amount > max_reasonable:
            analysis['issues'].append(
                f"Budget seems unreasonably high: ${total_amount:,.0f} for {duration_months} months "
                f"(maximum reasonable: ${max_reasonable:,.0f})"
            )
            analysis['is_reasonable'] = False
        
        # Calculate category percentages
        category_percentages = {}
        for category, amount in categories.items():
            if total_amount > 0:
                percentage = (amount / total_amount) * 100
                category_percentages[category] = percentage
        
        # Check category distributions
        # Get distributions for project type, default to first available type
        if project_type in ['software', 'infrastructure', 'research']:
            distributions = self.CATEGORY_DISTRIBUTIONS
        else:
            distributions = self.CATEGORY_DISTRIBUTIONS
        
        for expected_category, category_types in distributions.items():
            # Get the ranges for this project type
            ranges = category_types.get(project_type, category_types.get('software', category_types.get(list(category_types.keys())[0])))
            actual_percentage = category_percentages.get(expected_category, 0)
            min_pct = ranges['min']
            max_pct = ranges['max']
            recommended_pct = ranges['recommended']
            
            # Score this category (0-100)
            if actual_percentage == 0:
                score = 0
                analysis['issues'].append(
                    f"Missing {expected_category} budget (recommended: {recommended_pct}% or "
                    f"${total_amount * recommended_pct / 100:,.0f})"
                )
            elif actual_percentage < min_pct:
                score = 30
                analysis['warnings'].append(
                    f"{expected_category.title()} budget is low: {actual_percentage:.1f}% "
                    f"(recommended: {recommended_pct}%)"
                )
            elif actual_percentage > max_pct:
                score = 50
                analysis['warnings'].append(
                    f"{expected_category.title()} budget is high: {actual_percentage:.1f}% "
                    f"(recommended: {recommended_pct}%)"
                )
            else:
                # Calculate score based on proximity to recommended
                deviation = abs(actual_percentage - recommended_pct) / recommended_pct
                score = max(70, 100 - (deviation * 100))
            
            analysis['category_scores'][expected_category] = score
        
        # Calculate overall score
        if analysis['category_scores']:
            analysis['total_score'] = sum(analysis['category_scores'].values()) / len(analysis['category_scores'])
        else:
            analysis['total_score'] = 0
        
        return analysis
    
    def compare_market_rates(self, breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare budget items with market rates
        
        Args:
            breakdown: Parsed budget breakdown
        
        Returns:
            Market rate comparison results
        """
        comparison = {
            'alignment_score': 0,
            'overpriced_items': [],
            'underpriced_items': [],
            'reasonable_items': [],
            'missing_items': []
        }
        
        total_items_checked = 0
        total_alignment_score = 0
        
        # Check each budget item
        for item in breakdown['items']:
            description = item['description'].lower()
            amount = item['amount']
            category = item['category']
            
            # Try to match with market rates
            matched_rate = None
            rate_category = None
            
            # Check developer rates
            if any(word in description for word in ['developer', 'engineer', 'programmer', 'dev']):
                rate_category = 'developer'
                if 'senior' in description or 'lead' in description:
                    matched_rate = self.MARKET_RATES['developer']['senior']
                elif 'junior' in description:
                    matched_rate = self.MARKET_RATES['developer']['junior']
                else:
                    matched_rate = self.MARKET_RATES['developer']['mid']
            
            # Check designer rates
            elif any(word in description for word in ['designer', 'design', 'ui', 'ux']):
                rate_category = 'designer'
                if 'senior' in description:
                    matched_rate = self.MARKET_RATES['designer']['senior']
                else:
                    matched_rate = self.MARKET_RATES['designer']['mid']
            
            # Check audit rates
            elif any(word in description for word in ['audit', 'security review', 'penetration test']):
                rate_category = 'audit'
                if 'smart contract' in description or 'contract' in description:
                    matched_rate = self.MARKET_RATES['audit']['smart_contract']
                else:
                    matched_rate = self.MARKET_RATES['audit']['security']
            
            # Check marketing rates
            elif any(word in description for word in ['marketing', 'advertising', 'promotion']):
                rate_category = 'marketing'
                if 'campaign' in description:
                    matched_rate = self.MARKET_RATES['marketing']['campaign']
                elif 'content' in description:
                    matched_rate = self.MARKET_RATES['marketing']['content_creation']
                else:
                    matched_rate = self.MARKET_RATES['marketing']['social_media']
            
            # Check infrastructure rates
            elif any(word in description for word in ['hosting', 'server', 'cloud', 'infrastructure']):
                rate_category = 'infrastructure'
                matched_rate = self.MARKET_RATES['infrastructure']['hosting']
            
            # Compare with market rate if matched
            if matched_rate:
                total_items_checked += 1
                
                # Adjust for duration if applicable
                duration = breakdown.get('duration_months', 1)
                if rate_category in ['developer', 'designer']:
                    # These are monthly rates
                    expected_min = matched_rate['min'] * duration
                    expected_max = matched_rate['max'] * duration
                    expected_avg = matched_rate['avg'] * duration
                else:
                    # These are per-project rates
                    expected_min = matched_rate['min']
                    expected_max = matched_rate['max']
                    expected_avg = matched_rate['avg']
                
                # Calculate alignment score for this item
                if amount < expected_min * 0.5:
                    # Severely underpriced
                    item_score = 20
                    comparison['underpriced_items'].append({
                        'description': item['description'],
                        'amount': amount,
                        'market_range': f"${expected_min:,.0f} - ${expected_max:,.0f}",
                        'deviation': f"{((expected_avg - amount) / expected_avg * 100):.0f}% below average"
                    })
                elif amount < expected_min:
                    # Underpriced
                    item_score = 50
                    comparison['underpriced_items'].append({
                        'description': item['description'],
                        'amount': amount,
                        'market_range': f"${expected_min:,.0f} - ${expected_max:,.0f}",
                        'deviation': f"{((expected_avg - amount) / expected_avg * 100):.0f}% below average"
                    })
                elif amount > expected_max * 2:
                    # Severely overpriced
                    item_score = 20
                    comparison['overpriced_items'].append({
                        'description': item['description'],
                        'amount': amount,
                        'market_range': f"${expected_min:,.0f} - ${expected_max:,.0f}",
                        'deviation': f"{((amount - expected_avg) / expected_avg * 100):.0f}% above average"
                    })
                elif amount > expected_max:
                    # Overpriced
                    item_score = 50
                    comparison['overpriced_items'].append({
                        'description': item['description'],
                        'amount': amount,
                        'market_range': f"${expected_min:,.0f} - ${expected_max:,.0f}",
                        'deviation': f"{((amount - expected_avg) / expected_avg * 100):.0f}% above average"
                    })
                else:
                    # Within reasonable range
                    # Calculate score based on proximity to average
                    deviation = abs(amount - expected_avg) / expected_avg
                    item_score = max(70, 100 - (deviation * 100))
                    comparison['reasonable_items'].append({
                        'description': item['description'],
                        'amount': amount,
                        'market_range': f"${expected_min:,.0f} - ${expected_max:,.0f}"
                    })
                
                total_alignment_score += item_score
        
        # Calculate overall alignment score
        if total_items_checked > 0:
            comparison['alignment_score'] = total_alignment_score / total_items_checked
        else:
            comparison['alignment_score'] = 50  # Default if no items could be checked
        
        # Check for missing critical items
        has_development = any(item['category'] == 'development' for item in breakdown['items'])
        has_audit = any(item['category'] in ['audit', 'audits', 'security'] for item in breakdown['items'])
        has_marketing = any(item['category'] == 'marketing' for item in breakdown['items'])
        
        if not has_development and breakdown['total_amount'] > 10000:
            comparison['missing_items'].append("No development costs specified")
        
        if not has_audit and breakdown['total_amount'] > 50000:
            comparison['missing_items'].append(
                "No security audit budgeted for project over $50k (recommended: $10k-$40k)"
            )
        
        if not has_marketing and breakdown['total_amount'] > 20000:
            comparison['missing_items'].append("No marketing budget specified")
        
        return comparison
    
    def detect_budget_red_flags(
        self,
        breakdown: Dict[str, Any],
        reasonability: Dict[str, Any],
        market_comparison: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Detect red flags in budget
        
        Args:
            breakdown: Parsed budget breakdown
            reasonability: Reasonability analysis
            market_comparison: Market rate comparison
        
        Returns:
            List of detected red flags
        """
        red_flags = []
        
        total_amount = breakdown['total_amount']
        categories = breakdown['categories']
        
        # Red flag: Extremely high or low total
        if total_amount > 500000:
            red_flags.append({
                'severity': 'high',
                'category': 'total_amount',
                'flag': f"Unusually high budget request: ${total_amount:,.0f}",
                'risk_score': -20
            })
        elif total_amount < 5000:
            red_flags.append({
                'severity': 'high',
                'category': 'total_amount',
                'flag': f"Unrealistically low budget: ${total_amount:,.0f}",
                'risk_score': -20
            })
        
        # Red flag: Missing essential categories
        if not categories.get('development', 0) and total_amount > 10000:
            red_flags.append({
                'severity': 'high',
                'category': 'completeness',
                'flag': "No development budget for technical project",
                'risk_score': -25
            })
        
        # Red flag: Overpriced items
        if len(market_comparison['overpriced_items']) > 3:
            red_flags.append({
                'severity': 'medium',
                'category': 'market_alignment',
                'flag': f"{len(market_comparison['overpriced_items'])} items significantly above market rates",
                'risk_score': -15
            })
        
        # Red flag: Poor category distribution
        if reasonability['total_score'] < 40:
            red_flags.append({
                'severity': 'medium',
                'category': 'distribution',
                'flag': "Poor budget distribution across categories",
                'risk_score': -10
            })
        
        # Red flag: Too much in one category
        if total_amount > 0:
            for category, amount in categories.items():
                percentage = (amount / total_amount) * 100
                if percentage > 70:
                    red_flags.append({
                        'severity': 'medium',
                        'category': 'distribution',
                        'flag': f"{category.title()} takes {percentage:.0f}% of budget (too concentrated)",
                        'risk_score': -10
                    })
        
        # Red flag: Vague or duplicate items
        descriptions = [item['description'].lower() for item in breakdown['items']]
        vague_terms = ['miscellaneous', 'other', 'various', 'expenses', 'costs']
        vague_count = sum(1 for desc in descriptions if any(term in desc for term in vague_terms))
        
        if vague_count > 2:
            red_flags.append({
                'severity': 'low',
                'category': 'clarity',
                'flag': f"{vague_count} vague budget items (need more specific descriptions)",
                'risk_score': -5
            })
        
        # Red flag: No contingency buffer
        has_contingency = any(
            'contingency' in item['description'].lower() or 'buffer' in item['description'].lower()
            for item in breakdown['items']
        )
        
        if not has_contingency and total_amount > 20000:
            red_flags.append({
                'severity': 'low',
                'category': 'planning',
                'flag': "No contingency buffer (recommended: 10% of budget)",
                'risk_score': -5
            })
        
        return red_flags
    
    def generate_milestone_structure(
        self,
        breakdown: Dict[str, Any],
        deliverables: List[str],
        timeline_months: int
    ) -> List[Dict[str, Any]]:
        """
        Generate recommended milestone payment structure
        
        Args:
            breakdown: Parsed budget breakdown
            deliverables: List of project deliverables
            timeline_months: Project timeline in months
        
        Returns:
            List of milestone recommendations
        """
        milestones = []
        total_amount = breakdown['total_amount']
        
        # Determine number of milestones (typically 3-6)
        if timeline_months <= 3:
            num_milestones = 2
        elif timeline_months <= 6:
            num_milestones = 3
        elif timeline_months <= 12:
            num_milestones = 4
        else:
            num_milestones = min(6, timeline_months // 3)
        
        # Milestone payment distribution (front-loaded slightly)
        if num_milestones == 2:
            distributions = [0.40, 0.60]  # 40%, 60%
        elif num_milestones == 3:
            distributions = [0.30, 0.35, 0.35]  # 30%, 35%, 35%
        elif num_milestones == 4:
            distributions = [0.25, 0.25, 0.25, 0.25]  # Even distribution
        else:
            # Even distribution for 5+ milestones
            distributions = [1.0 / num_milestones] * num_milestones
        
        # Create milestone structure
        months_per_milestone = timeline_months / num_milestones
        current_month = 0
        
        for i, distribution in enumerate(distributions):
            milestone_num = i + 1
            amount = total_amount * distribution
            target_month = int((i + 1) * months_per_milestone)
            
            # Assign deliverables to milestones
            deliverable_start = int(i * len(deliverables) / num_milestones)
            deliverable_end = int((i + 1) * len(deliverables) / num_milestones)
            milestone_deliverables = deliverables[deliverable_start:deliverable_end] if deliverables else []
            
            # Generate milestone description
            if milestone_num == 1:
                phase = "Project Kickoff & Foundation"
            elif milestone_num == num_milestones:
                phase = "Final Delivery & Launch"
            else:
                phase = f"Development Phase {milestone_num}"
            
            milestone = {
                'milestone_number': milestone_num,
                'title': f"Milestone {milestone_num}: {phase}",
                'amount': round(amount, 2),
                'percentage': round(distribution * 100, 1),
                'target_month': target_month,
                'deliverables': milestone_deliverables if milestone_deliverables else [
                    f"Deliverables for month {target_month}"
                ],
                'payment_trigger': 'Upon completion and verification of deliverables'
            }
            
            milestones.append(milestone)
        
        return milestones
    
    def calculate_budget_score(
        self,
        reasonability: Dict[str, Any],
        market_comparison: Dict[str, Any],
        red_flags: List[Dict[str, Any]],
        completeness_score: float
    ) -> Tuple[int, float]:
        """
        Calculate overall budget quality score
        
        Args:
            reasonability: Reasonability analysis
            market_comparison: Market comparison results
            red_flags: Detected red flags
            completeness_score: Budget completeness score
        
        Returns:
            Tuple of (budget_score 0-100, confidence 0-1)
        """
        # Weighted scoring
        weights = {
            'reasonability': 0.30,
            'market_alignment': 0.25,
            'completeness': 0.25,
            'red_flags': 0.20
        }
        
        # Calculate component scores
        reasonability_score = reasonability.get('total_score', 0)
        market_score = market_comparison.get('alignment_score', 50)
        
        # Red flags penalty
        red_flag_penalty = sum(flag.get('risk_score', 0) for flag in red_flags)
        red_flag_score = max(0, 100 + red_flag_penalty)  # Start at 100, subtract penalties
        
        # Calculate weighted score
        total_score = (
            reasonability_score * weights['reasonability'] +
            market_score * weights['market_alignment'] +
            completeness_score * weights['completeness'] +
            red_flag_score * weights['red_flags']
        )
        
        total_score = max(0, min(100, total_score))  # Clamp to 0-100
        
        # Calculate confidence
        confidence = 0.7  # Base confidence
        if len(market_comparison['reasonable_items']) > 3:
            confidence += 0.15
        if len(red_flags) == 0:
            confidence += 0.10
        if reasonability_score > 70:
            confidence += 0.05
        
        confidence = min(confidence, 1.0)
        
        return int(total_score), confidence
    
    def analyze_budget(
        self,
        grant_id: str,
        budget_data: Dict[str, Any],
        project_type: str = 'software',
        deliverables: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive budget analysis
        
        Args:
            grant_id: Grant proposal ID
            budget_data: Budget information
            project_type: Type of project
            deliverables: List of project deliverables
        
        Returns:
            Complete budget analysis results
        """
        start_time = time.time()
        
        logger.info(f"Starting budget analysis for grant {grant_id}")
        
        # Parse budget breakdown
        breakdown = self.parse_budget_breakdown(budget_data)
        
        # Check reasonability
        reasonability = self.check_budget_reasonability(breakdown, project_type)
        
        # Compare with market rates
        market_comparison = self.compare_market_rates(breakdown)
        
        # Calculate completeness score
        expected_categories = ['development', 'marketing', 'operations', 'audits']
        present_categories = len([c for c in expected_categories if c in breakdown['categories']])
        completeness_score = (present_categories / len(expected_categories)) * 100
        
        # Detect red flags
        red_flags = self.detect_budget_red_flags(breakdown, reasonability, market_comparison)
        
        # Calculate overall score
        budget_score, confidence = self.calculate_budget_score(
            reasonability,
            market_comparison,
            red_flags,
            completeness_score
        )
        
        # Generate milestone structure
        timeline_months = breakdown.get('duration_months', 6)
        milestones = self.generate_milestone_structure(
            breakdown,
            deliverables or [],
            timeline_months
        )
        
        # Compile recommendations
        recommendations = []
        if budget_score >= 80:
            recommendations.append("✅ Budget is well-structured and reasonable")
        elif budget_score >= 60:
            recommendations.append("⚠️ Budget needs minor adjustments")
        else:
            recommendations.append("❌ Budget requires significant revision")
        
        if market_comparison['overpriced_items']:
            recommendations.append(
                f"Review {len(market_comparison['overpriced_items'])} overpriced items"
            )
        
        if market_comparison['underpriced_items']:
            recommendations.append(
                f"Consider increasing {len(market_comparison['underpriced_items'])} underpriced items"
            )
        
        if market_comparison['missing_items']:
            recommendations.extend([
                f"Add: {item}" for item in market_comparison['missing_items'][:3]
            ])
        
        if not any('contingency' in str(item).lower() for item in breakdown['items']):
            recommendations.append(f"Add 10% contingency buffer (${breakdown['total_amount'] * 0.1:,.0f})")
        
        execution_time = time.time() - start_time
        
        result = {
            'grant_id': grant_id,
            'budget_score': budget_score,
            'confidence': confidence,
            'quality_level': 'excellent' if budget_score >= 80 else 'good' if budget_score >= 60 else 'needs_improvement',
            'total_amount': breakdown['total_amount'],
            'currency': breakdown['currency'],
            'duration_months': breakdown['duration_months'],
            'reasonability_score': reasonability['total_score'],
            'market_alignment_score': market_comparison['alignment_score'],
            'completeness_score': completeness_score,
            'category_breakdown': breakdown['categories'],
            'red_flags': red_flags,
            'overpriced_items': market_comparison['overpriced_items'][:5],
            'underpriced_items': market_comparison['underpriced_items'][:5],
            'missing_items': market_comparison['missing_items'],
            'recommendations': recommendations,
            'suggested_milestones': milestones,
            'metadata': {
                'execution_time_seconds': round(execution_time, 2),
                'analysis_timestamp': get_utc_now().isoformat(),
                'project_type': project_type,
                'items_analyzed': len(breakdown['items'])
            }
        }
        
        logger.info(f"Budget analysis complete for grant {grant_id}: score={budget_score}, quality={result['quality_level']}")
        
        return result


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test budget analyzer with sample data"""
    
    from logging_config import setup_logging
    setup_logging(log_level="DEBUG")
    
    # Sample budget data - Well-structured
    good_budget = {
        'total_amount': 50000,
        'currency': 'USD',
        'duration_months': 6,
        'budget_items': [
            {'category': 'development', 'description': 'Senior Developer (6 months)', 'amount': 90000, 'quantity': 1},
            {'category': 'development', 'description': 'Mid-level Developer (6 months)', 'amount': 48000, 'quantity': 1},
            {'category': 'design', 'description': 'UI/UX Designer (3 months)', 'amount': 19500, 'quantity': 1},
            {'category': 'audits', 'description': 'Smart Contract Security Audit', 'amount': 35000, 'quantity': 1},
            {'category': 'marketing', 'description': 'Marketing Campaign', 'amount': 15000, 'quantity': 1},
            {'category': 'operations', 'description': 'Infrastructure & Hosting', 'amount': 3000, 'quantity': 1},
            {'category': 'contingency', 'description': 'Contingency Buffer (10%)', 'amount': 21050, 'quantity': 1}
        ]
    }
    
    # Update total to match sum
    good_budget['total_amount'] = sum(item['amount'] for item in good_budget['budget_items'])
    
    deliverables = [
        'Smart contract development',
        'Frontend application',
        'Backend API',
        'Security audit',
        'Documentation',
        'Deployment'
    ]
    
    # Create analyzer
    analyzer = BudgetAnalyzer()
    
    # Perform analysis
    print("\n" + "="*80)
    print("BUDGET ANALYSIS TEST")
    print("="*80)
    
    result = analyzer.analyze_budget(
        grant_id="grant-budget-test-001",
        budget_data=good_budget,
        project_type='software',
        deliverables=deliverables
    )
    
    print(f"\n💰 BUDGET QUALITY SCORE: {result['budget_score']}/100 ({result['quality_level'].upper()})")
    print(f"   Confidence: {result['confidence']:.0%}")
    print(f"   Total Amount: ${result['total_amount']:,.0f} over {result['duration_months']} months")
    
    print(f"\n📊 COMPONENT SCORES:")
    print(f"   Reasonability: {result['reasonability_score']:.0f}/100")
    print(f"   Market Alignment: {result['market_alignment_score']:.0f}/100")
    print(f"   Completeness: {result['completeness_score']:.0f}/100")
    
    print(f"\n📈 CATEGORY BREAKDOWN:")
    for category, amount in result['category_breakdown'].items():
        percentage = (amount / result['total_amount']) * 100
        print(f"   {category.title()}: ${amount:,.0f} ({percentage:.1f}%)")
    
    print(f"\n🚨 RED FLAGS ({len(result['red_flags'])}):")
    if result['red_flags']:
        for flag in result['red_flags']:
            severity = flag.get('severity', 'unknown').upper()
            print(f"  [{severity}] {flag.get('flag', 'N/A')}")
    else:
        print(f"  • None detected")
    
    print(f"\n💡 RECOMMENDATIONS ({len(result['recommendations'])}):")
    for rec in result['recommendations']:
        print(f"  • {rec}")
    
    print(f"\n🎯 SUGGESTED MILESTONES ({len(result['suggested_milestones'])}):")
    for milestone in result['suggested_milestones']:
        print(f"\n  {milestone['title']}")
        print(f"    Amount: ${milestone['amount']:,.0f} ({milestone['percentage']}%)")
        print(f"    Target: Month {milestone['target_month']}")
        print(f"    Deliverables: {len(milestone['deliverables'])}")
    
    print(f"\n⏱️  Execution Time: {result['metadata']['execution_time_seconds']}s")
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETE")
    print("="*80)
