"""
Impact Analyzer Service for AgentDAO
Evaluates grant proposals for ecosystem impact and community benefit using Groq AI
"""

import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from groq import Groq
from groq.types.chat import ChatCompletion

from config import settings
from utils.common import get_utc_now
from models import ImpactEvaluationResult


# Setup logger
logger = logging.getLogger(__name__)


class ImpactAnalyzer:
    """
    Impact and ecosystem benefit analyzer using Groq AI
    
    Evaluates grant proposals on:
    - Alignment with DAO mission and objectives
    - User/community benefits and value proposition
    - Ecosystem gaps the proposal addresses
    - Long-term sustainability and maintenance
    - Network effects and ecosystem growth potential
    
    Scoring: -2 (strongly negative) to +2 (strongly positive)
    """
    
    def __init__(self):
        """Initialize Impact Analyzer with Groq API client"""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
        self.temperature = settings.GROQ_TEMPERATURE
        self.max_tokens = settings.GROQ_MAX_TOKENS
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        
        logger.info(f"ImpactAnalyzer initialized with model: {self.model}")
    
    def _create_impact_prompt(self, proposal: Dict[str, Any]) -> str:
        """
        Create detailed prompt for impact evaluation
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Formatted prompt string
        """
        prompt = f"""You are an expert impact evaluator for blockchain and Web3 grant proposals. Analyze the following proposal for its potential ecosystem impact and community benefit.

**PROPOSAL DETAILS:**
Title: {proposal.get('title', 'N/A')}
Description: {proposal.get('description', 'N/A')}
Funding Requested: ${proposal.get('funding_amount', 0):,.2f}
Category: {proposal.get('category', 'General')}
Target Users: {proposal.get('target_users', 'N/A')}
Problem Statement: {proposal.get('problem_statement', 'N/A')}
Solution Overview: {proposal.get('solution', 'N/A')}
Expected Outcomes: {proposal.get('expected_outcomes', 'N/A')}
Success Metrics: {proposal.get('success_metrics', 'N/A')}
Maintenance Plan: {proposal.get('maintenance_plan', 'N/A')}

**EVALUATION CRITERIA:**

1. **DAO Mission Alignment** (Weight: 30%)
   - Does this align with decentralization and community governance principles?
   - Does it support the Web3/blockchain ecosystem's core values?
   - Will it advance the DAO's strategic objectives?
   - Is it consistent with community priorities?
   - Does it contribute to the broader crypto/Web3 movement?

2. **User/Community Benefits** (Weight: 25%)
   - What tangible benefits will users/community receive?
   - How many users/projects will this impact?
   - Is the value proposition clear and compelling?
   - Will it improve user experience or accessibility?
   - Does it address real user pain points?

3. **Ecosystem Gap Analysis** (Weight: 20%)
   - What gap in the ecosystem does this fill?
   - Is this solving a unique or underserved problem?
   - Will it reduce friction or barriers to entry?
   - Does it enable new use cases or opportunities?
   - Is there existing competition or is this innovative?

4. **Sustainability & Maintenance** (Weight: 15%)
   - Is there a clear plan for long-term maintenance?
   - Are funding sources sustainable beyond the grant?
   - Will the project continue after initial funding ends?
   - Is there a community or commercial model for sustainability?
   - Are there plans for documentation and knowledge transfer?

5. **Network Effects & Growth** (Weight: 10%)
   - Will this create positive network effects?
   - Can it attract more users/developers to the ecosystem?
   - Will it enable composability with other projects?
   - Does it have viral or exponential growth potential?
   - Will it strengthen the overall ecosystem?

**SCORING SCALE:**
- +2: Exceptional - Transformative impact, aligns perfectly with mission
- +1.5: Very Good - Strong positive impact with minor alignment issues
- +1: Good - Strong positive impact, clear benefits, well-aligned
- +0.5: Above Average - Good impact with some alignment concerns
-  0: Neutral - Some benefits, average alignment, moderate impact
- -0.5: Below Average - Limited benefits with alignment concerns
- -1: Poor - Questionable benefits, weak alignment, limited impact
- -1.5: Very Poor - Misaligned with some negative impact potential
- -2: Critical - Misaligned with mission, no clear benefit, potentially harmful

**OUTPUT FORMAT (JSON):**
Provide your analysis as a JSON object with the following structure:
{{
    "overall_score": <number between -2 and +2 in 0.5 increments>,
    "alignment_score": <number between -2 and +2 in 0.5 increments>,
    "user_benefit_score": <number between -2 and +2 in 0.5 increments>,
    "ecosystem_gap_score": <number between -2 and +2 in 0.5 increments>,
    "sustainability_score": <number between -2 and +2 in 0.5 increments>,
    "network_effects_score": <number between -2 and +2 in 0.5 increments>,
    "confidence": <number between 0 and 1>,
    "strengths": [<list of key strengths>],
    "weaknesses": [<list of key weaknesses>],
    "risks": [<list of impact-related risks>],
    "recommendations": [<list of recommendations to improve impact>],
    "target_beneficiaries": "<description of who benefits>",
    "ecosystem_contribution": "<how this contributes to ecosystem>",
    "long_term_vision": "<assessment of long-term sustainability>",
    "summary": "<brief 2-3 sentence summary>",
    "reasoning": "<detailed explanation of scores>"
}}

Analyze the proposal thoroughly and provide your evaluation."""
        
        return prompt
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse AI response and extract structured data
        
        Args:
            response_text: Raw AI response text
        
        Returns:
            Parsed evaluation data
        """
        try:
            # Try to find JSON in response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx + 1]
                data = json.loads(json_str)
                
                # Validate and normalize scores
                data['overall_score'] = max(-2, min(2, float(data.get('overall_score', 0))))
                data['alignment_score'] = max(-2, min(2, float(data.get('alignment_score', 0))))
                data['user_benefit_score'] = max(-2, min(2, float(data.get('user_benefit_score', 0))))
                data['ecosystem_gap_score'] = max(-2, min(2, float(data.get('ecosystem_gap_score', 0))))
                data['sustainability_score'] = max(-2, min(2, float(data.get('sustainability_score', 0))))
                data['network_effects_score'] = max(-2, min(2, float(data.get('network_effects_score', 0))))
                data['confidence'] = max(0, min(1, float(data.get('confidence', 0.5))))
                
                # Ensure required fields exist
                data.setdefault('strengths', [])
                data.setdefault('weaknesses', [])
                data.setdefault('risks', [])
                data.setdefault('recommendations', [])
                data.setdefault('target_beneficiaries', '')
                data.setdefault('ecosystem_contribution', '')
                data.setdefault('long_term_vision', '')
                data.setdefault('summary', '')
                data.setdefault('reasoning', '')
                
                return data
            else:
                raise ValueError("No JSON found in response")
                
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"Failed to parse AI response: {e}")
            logger.debug(f"Response text: {response_text}")
            
            # Return default structure
            return {
                'overall_score': 0,
                'alignment_score': 0,
                'user_benefit_score': 0,
                'ecosystem_gap_score': 0,
                'sustainability_score': 0,
                'network_effects_score': 0,
                'confidence': 0.3,
                'strengths': [],
                'weaknesses': ['Unable to parse AI response'],
                'risks': ['Analysis incomplete'],
                'recommendations': ['Resubmit for analysis'],
                'target_beneficiaries': 'Unknown',
                'ecosystem_contribution': 'Unable to assess',
                'long_term_vision': 'Unable to assess',
                'summary': 'Impact analysis could not be completed',
                'reasoning': f'Error parsing response: {str(e)}'
            }
    
    def _call_groq_api(self, prompt: str, retry_count: int = 0) -> Optional[str]:
        """
        Call Groq API with retry logic
        
        Args:
            prompt: The prompt to send
            retry_count: Current retry attempt
        
        Returns:
            AI response text or None if failed
        """
        try:
            logger.debug(f"Calling Groq API (attempt {retry_count + 1}/{self.max_retries})")
            
            response: ChatCompletion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert impact evaluator for blockchain, Web3, and decentralized technology grant proposals. Provide thorough, objective analysis of ecosystem impact and community benefit."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            if response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content
                logger.debug(f"Groq API call successful, response length: {len(content) if content else 0}")
                return content
            else:
                logger.error("Groq API returned empty response")
                return None
                
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            
            # Retry with exponential backoff
            if retry_count < self.max_retries - 1:
                delay = self.retry_delay * (2 ** retry_count)
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
                return self._call_groq_api(prompt, retry_count + 1)
            else:
                logger.error("Max retries reached, giving up")
                return None
    
    def assess_mission_alignment(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess alignment with DAO mission and Web3 values
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Alignment assessment results
        """
        description = proposal.get('description', '').lower()
        problem = proposal.get('problem_statement', '').lower()
        solution = proposal.get('solution', '').lower()
        
        text_to_analyze = f"{description} {problem} {solution}"
        
        # Key mission-aligned concepts
        alignment_keywords = {
            'decentralization': ['decentralized', 'decentralization', 'distributed', 'peer-to-peer', 'p2p'],
            'transparency': ['transparent', 'transparency', 'open', 'public', 'verifiable'],
            'community': ['community', 'dao', 'governance', 'voting', 'collective'],
            'accessibility': ['accessible', 'accessibility', 'inclusive', 'permissionless', 'open-source'],
            'innovation': ['innovative', 'novel', 'new', 'breakthrough', 'cutting-edge']
        }
        
        alignment_scores = {}
        found_concepts = []
        
        for concept, keywords in alignment_keywords.items():
            count = sum(1 for keyword in keywords if keyword in text_to_analyze)
            if count > 0:
                alignment_scores[concept] = min(count, 3)  # Cap at 3
                found_concepts.append(concept)
        
        # Calculate overall alignment
        total_score = sum(alignment_scores.values())
        max_possible = len(alignment_keywords) * 3
        alignment_percentage = (total_score / max_possible) * 100 if max_possible > 0 else 0
        
        return {
            'alignment_percentage': alignment_percentage,
            'found_concepts': found_concepts,
            'concept_scores': alignment_scores,
            'is_well_aligned': alignment_percentage >= 40
        }
    
    def analyze_user_benefits(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze user and community benefits
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            User benefit analysis results
        """
        target_users = proposal.get('target_users', '').lower()
        expected_outcomes = proposal.get('expected_outcomes', '').lower()
        
        # Benefit indicators
        benefit_keywords = ['reduce', 'improve', 'increase', 'enable', 'simplify', 'faster', 
                           'cheaper', 'easier', 'better', 'enhance', 'optimize', 'automate']
        
        pain_point_keywords = ['problem', 'challenge', 'difficulty', 'friction', 'barrier', 
                              'limitation', 'bottleneck', 'inefficiency']
        
        benefit_count = sum(1 for keyword in benefit_keywords if keyword in expected_outcomes)
        pain_point_count = sum(1 for keyword in pain_point_keywords if keyword in proposal.get('problem_statement', '').lower())
        
        # Estimate reach
        reach_indicators = {
            'developers': 'developer' in target_users or 'builder' in target_users,
            'end_users': 'user' in target_users or 'consumer' in target_users,
            'projects': 'project' in target_users or 'protocol' in target_users or 'dapp' in target_users,
            'community': 'community' in target_users or 'dao' in target_users
        }
        
        return {
            'benefit_count': benefit_count,
            'addresses_pain_points': pain_point_count > 0,
            'target_segments': [k for k, v in reach_indicators.items() if v],
            'has_clear_value_prop': benefit_count >= 2 and pain_point_count >= 1,
            'reach_score': sum(1 for v in reach_indicators.values() if v)
        }
    
    def identify_ecosystem_gaps(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Identify ecosystem gaps the proposal addresses
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Ecosystem gap analysis results
        """
        category = proposal.get('category', '').lower()
        description = proposal.get('description', '').lower()
        
        # Gap categories
        gap_types = {
            'infrastructure': ['infrastructure', 'tooling', 'framework', 'library', 'sdk'],
            'developer_tools': ['developer', 'devex', 'debugging', 'testing', 'deployment'],
            'user_experience': ['ux', 'ui', 'user experience', 'interface', 'wallet'],
            'interoperability': ['bridge', 'cross-chain', 'interoperability', 'integration'],
            'education': ['education', 'tutorial', 'documentation', 'learning', 'guide'],
            'analytics': ['analytics', 'monitoring', 'dashboard', 'metrics', 'data']
        }
        
        identified_gaps = []
        for gap_type, keywords in gap_types.items():
            if any(keyword in description or keyword in category for keyword in keywords):
                identified_gaps.append(gap_type)
        
        # Innovation indicators
        innovation_keywords = ['first', 'unique', 'novel', 'innovative', 'new approach', 'breakthrough']
        is_innovative = any(keyword in description for keyword in innovation_keywords)
        
        return {
            'identified_gaps': identified_gaps,
            'gap_count': len(identified_gaps),
            'is_innovative': is_innovative,
            'fills_underserved_need': len(identified_gaps) > 0
        }
    
    def evaluate_sustainability(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate long-term sustainability plans
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Sustainability evaluation results
        """
        maintenance_plan = proposal.get('maintenance_plan', '').lower()
        
        # Sustainability indicators
        sustainability_factors = {
            'has_maintenance_plan': any(word in maintenance_plan for word in 
                                       ['maintain', 'support', 'update', 'continue']),
            'has_revenue_model': any(word in maintenance_plan for word in 
                                    ['revenue', 'monetization', 'fee', 'subscription', 'income']),
            'has_community_support': any(word in maintenance_plan for word in 
                                        ['community', 'contributor', 'volunteer', 'open-source']),
            'has_documentation': any(word in maintenance_plan for word in 
                                    ['documentation', 'docs', 'guide', 'manual']),
            'has_training_plan': any(word in maintenance_plan for word in 
                                    ['training', 'education', 'onboarding', 'knowledge transfer'])
        }
        
        sustainability_score = sum(1 for v in sustainability_factors.values() if v)
        
        return {
            'sustainability_factors': sustainability_factors,
            'sustainability_score': sustainability_score,
            'is_sustainable': sustainability_score >= 3,
            'needs_improvement': sustainability_score < 2
        }
    
    def assess_network_effects(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess potential for network effects and ecosystem growth
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Network effects assessment results
        """
        description = proposal.get('description', '').lower()
        expected_outcomes = proposal.get('expected_outcomes', '').lower()
        
        # Network effect indicators
        network_indicators = {
            'composable': any(word in description for word in 
                            ['composable', 'modular', 'pluggable', 'integrate', 'compatible']),
            'open_standard': any(word in description for word in 
                               ['standard', 'protocol', 'specification', 'interoperable']),
            'developer_attraction': any(word in expected_outcomes for word in 
                                       ['attract developer', 'grow community', 'increase adoption']),
            'viral_potential': any(word in description for word in 
                                  ['share', 'spread', 'network', 'viral', 'exponential']),
            'ecosystem_enabler': any(word in description for word in 
                                    ['enable', 'unlock', 'catalyst', 'foundation', 'platform'])
        }
        
        network_score = sum(1 for v in network_indicators.values() if v)
        
        return {
            'network_indicators': network_indicators,
            'network_score': network_score,
            'has_strong_network_effects': network_score >= 3,
            'growth_potential': 'high' if network_score >= 4 else 'medium' if network_score >= 2 else 'low'
        }
    
    def calculate_weighted_score(self, scores: Dict[str, float]) -> float:
        """
        Calculate weighted overall score from component scores
        
        Args:
            scores: Dictionary of component scores
        
        Returns:
            Weighted overall score (-2 to +2)
        """
        weights = {
            'alignment_score': 0.30,
            'user_benefit_score': 0.25,
            'ecosystem_gap_score': 0.20,
            'sustainability_score': 0.15,
            'network_effects_score': 0.10
        }
        
        total_score = 0.0
        for key, weight in weights.items():
            total_score += scores.get(key, 0) * weight
        
        # Clamp to -2 to +2 range
        return max(-2.0, min(2.0, total_score))
    
    def analyze_ecosystem_impact(
        self,
        grant_id: str,
        proposal_data: Dict[str, Any]
    ) -> 'ImpactEvaluationResult':
        """
        Perform comprehensive ecosystem impact analysis
        
        Args:
            grant_id: Grant proposal ID
            proposal_data: Complete proposal data
        
        Returns:
            TechnicalEvaluationResult with impact analysis (reusing model structure)
        """
        start_time = time.time()
        
        logger.info(f"Starting impact analysis for grant {grant_id}")
        
        try:
            # Run pre-analysis checks
            alignment_analysis = self.assess_mission_alignment(proposal_data)
            user_benefit_analysis = self.analyze_user_benefits(proposal_data)
            gap_analysis = self.identify_ecosystem_gaps(proposal_data)
            sustainability_analysis = self.evaluate_sustainability(proposal_data)
            network_analysis = self.assess_network_effects(proposal_data)
            
            logger.debug(f"Pre-analysis complete")
            
            # Create prompt and call AI
            prompt = self._create_impact_prompt(proposal_data)
            response_text = self._call_groq_api(prompt)
            
            if response_text:
                # Parse AI response
                ai_analysis = self._parse_ai_response(response_text)
                
                # Enhance with pre-analysis results
                if alignment_analysis['is_well_aligned']:
                    ai_analysis['strengths'].append(f"Strong alignment with DAO mission ({alignment_analysis['alignment_percentage']:.0f}%)")
                
                if user_benefit_analysis['has_clear_value_prop']:
                    ai_analysis['strengths'].append(f"Clear value proposition for {', '.join(user_benefit_analysis['target_segments'])}")
                
                if gap_analysis['is_innovative']:
                    ai_analysis['strengths'].append("Innovative approach to addressing ecosystem gaps")
                
                if sustainability_analysis['is_sustainable']:
                    ai_analysis['strengths'].append("Strong long-term sustainability plan")
                
                if network_analysis['has_strong_network_effects']:
                    ai_analysis['strengths'].append(f"High growth potential with strong network effects")
                
                # Add weaknesses
                if not alignment_analysis['is_well_aligned']:
                    ai_analysis['weaknesses'].append("Limited alignment with core DAO mission and values")
                
                if not user_benefit_analysis['has_clear_value_prop']:
                    ai_analysis['weaknesses'].append("Value proposition could be clearer")
                
                if gap_analysis['gap_count'] == 0:
                    ai_analysis['weaknesses'].append("Does not clearly address specific ecosystem gaps")
                
                if sustainability_analysis['needs_improvement']:
                    ai_analysis['weaknesses'].append("Long-term sustainability plan needs strengthening")
                
            else:
                # Fallback if AI call fails - use heuristic scoring
                logger.warning("AI analysis failed, using fallback heuristic scoring")
                
                alignment_score = 1.0 if alignment_analysis['is_well_aligned'] else 0.0
                user_benefit_score = 1.0 if user_benefit_analysis['has_clear_value_prop'] else 0.0
                gap_score = min(gap_analysis['gap_count'] * 0.5, 2.0) - 1.0  # Scale to -1 to +2
                sustainability_score = (sustainability_analysis['sustainability_score'] / 5.0) * 2 - 1  # Scale to -1 to +1
                network_score = (network_analysis['network_score'] / 5.0) * 2 - 1  # Scale to -1 to +1
                
                overall_score = self.calculate_weighted_score({
                    'alignment_score': alignment_score,
                    'user_benefit_score': user_benefit_score,
                    'ecosystem_gap_score': gap_score,
                    'sustainability_score': sustainability_score,
                    'network_effects_score': network_score
                })
                
                ai_analysis = {
                    'overall_score': overall_score,
                    'alignment_score': alignment_score,
                    'user_benefit_score': user_benefit_score,
                    'ecosystem_gap_score': gap_score,
                    'sustainability_score': sustainability_score,
                    'network_effects_score': network_score,
                    'confidence': 0.4,
                    'strengths': [],
                    'weaknesses': [],
                    'risks': ['Analysis based on heuristics due to AI unavailability'],
                    'recommendations': ['Recommend manual impact review'],
                    'target_beneficiaries': ', '.join(user_benefit_analysis.get('target_segments', [])),
                    'ecosystem_contribution': f"Addresses {gap_analysis['gap_count']} ecosystem gap(s)",
                    'long_term_vision': 'Sustainability assessment based on maintenance plan',
                    'summary': 'Impact analysis completed using heuristic methods.',
                    'reasoning': 'AI analysis unavailable, scores based on automated checks.'
                }
                
                # Add pre-analysis findings to strengths/weaknesses
                if alignment_analysis['is_well_aligned']:
                    ai_analysis['strengths'].append(f"Aligned with mission: {', '.join(alignment_analysis['found_concepts'])}")
                if user_benefit_analysis['has_clear_value_prop']:
                    ai_analysis['strengths'].append(f"Clear benefits for {user_benefit_analysis['reach_score']} user segments")
                if gap_analysis['fills_underserved_need']:
                    ai_analysis['strengths'].append(f"Addresses {len(gap_analysis['identified_gaps'])} gap types")
                
                if not alignment_analysis['is_well_aligned']:
                    ai_analysis['weaknesses'].append("Limited mission alignment detected")
                if sustainability_analysis['needs_improvement']:
                    ai_analysis['weaknesses'].append("Weak sustainability planning")
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Create result
            result = ImpactEvaluationResult(
                grant_id=grant_id,
                agent_type="impact",
                score=ai_analysis['overall_score'],
                confidence=ai_analysis['confidence'],
                alignment_score=ai_analysis.get('alignment_score', 0),
                user_benefit_score=ai_analysis.get('user_benefit_score', 0),
                ecosystem_gap_score=ai_analysis.get('ecosystem_gap_score', 0),
                sustainability_score=ai_analysis.get('sustainability_score', 0),
                network_effects_score=ai_analysis.get('network_effects_score', 0),
                reasoning=ai_analysis['reasoning'],
                strengths=ai_analysis['strengths'][:10],
                weaknesses=ai_analysis['weaknesses'][:10],
                risks=ai_analysis['risks'][:10],
                recommendations=ai_analysis['recommendations'][:10],
                impact_details={
                    'target_beneficiaries': ai_analysis.get('target_beneficiaries', ''),
                    'ecosystem_contribution': ai_analysis.get('ecosystem_contribution', ''),
                    'long_term_vision': ai_analysis.get('long_term_vision', ''),
                    'alignment_percentage': alignment_analysis.get('alignment_percentage', 0),
                    'identified_gaps': gap_analysis.get('identified_gaps', []),
                    'sustainability_factors': list(k for k, v in sustainability_analysis.get('sustainability_factors', {}).items() if v),
                    'growth_potential': network_analysis.get('growth_potential', 'unknown')
                },
                metadata={
                    'summary': ai_analysis.get('summary', ''),
                    'execution_time_seconds': round(execution_time, 2),
                    'model_used': self.model
                },
                evaluated_at=get_utc_now()
            )
            
            logger.info(f"Impact analysis complete for grant {grant_id}: score={result.score}, confidence={result.confidence}")
            
            return result
            
        except Exception as e:
            logger.error(f"Impact analysis failed for grant {grant_id}: {e}", exc_info=True)
            
            # Return error result
            return ImpactEvaluationResult(
                grant_id=grant_id,
                agent_type="impact",
                score=0.0,
                confidence=0.0,
                alignment_score=0.0,
                user_benefit_score=0.0,
                ecosystem_gap_score=0.0,
                sustainability_score=0.0,
                network_effects_score=0.0,
                reasoning=f"Impact analysis failed: {str(e)}",
                strengths=[],
                weaknesses=['Analysis failed due to error'],
                risks=['Unable to complete impact evaluation'],
                recommendations=['Retry analysis or perform manual review'],
                impact_details=None,
                metadata={
                    'error': str(e),
                    'error_type': type(e).__name__
                },
                evaluated_at=get_utc_now()
            )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test impact analyzer with sample data"""
    
    from logging_config import setup_logging
    setup_logging(log_level="DEBUG")
    
    # Sample grant proposal
    sample_proposal = {
        'title': 'Decentralized Identity Infrastructure for Web3',
        'description': 'Building a decentralized, privacy-preserving identity solution that enables seamless authentication across Web3 applications without compromising user sovereignty or data ownership',
        'funding_amount': 75000,
        'category': 'Infrastructure',
        'target_users': 'Web3 developers, dApp users, and projects requiring identity solutions',
        'problem_statement': 'Current Web3 identity solutions are fragmented, lack interoperability, and often compromise user privacy. Users struggle with multiple wallets and identities across different chains and applications.',
        'solution': 'A composable identity protocol with cross-chain support, zero-knowledge proofs for privacy, and standardized interfaces that any dApp can integrate',
        'expected_outcomes': 'Reduce onboarding friction by 80%, enable single sign-on across 100+ dApps, improve user privacy, and increase Web3 adoption',
        'success_metrics': 'Integration by 50+ projects, 10,000+ active users in first 6 months, 95%+ user satisfaction',
        'maintenance_plan': 'Open-source development with community governance, protocol fees for sustainability, comprehensive documentation, and dedicated support team funded by treasury'
    }
    
    # Create analyzer
    analyzer = ImpactAnalyzer()
    
    # Perform analysis
    print("\n" + "="*80)
    print("ECOSYSTEM IMPACT ANALYSIS TEST")
    print("="*80)
    
    result = analyzer.analyze_ecosystem_impact(
        grant_id="grant-impact-test-001",
        proposal_data=sample_proposal
    )
    
    print(f"\n📊 OVERALL SCORE: {result.score:.2f} (Confidence: {result.confidence:.0%})")
    print(f"\n✅ STRENGTHS ({len(result.strengths)}):")
    for strength in result.strengths:
        print(f"  • {strength}")
    
    print(f"\n⚠️  WEAKNESSES ({len(result.weaknesses)}):")
    for weakness in result.weaknesses:
        print(f"  • {weakness}")
    
    print(f"\n🚨 RISKS ({len(result.risks)}):")
    for risk in result.risks:
        print(f"  • {risk}")
    
    print(f"\n💡 RECOMMENDATIONS ({len(result.recommendations)}):")
    for rec in result.recommendations:
        print(f"  • {rec}")
    
    print(f"\n📝 REASONING:\n{result.reasoning}")
    
    print(f"\n📈 COMPONENT SCORES:")
    metadata = result.metadata or {}
    print(f"  • Mission Alignment: {result.architecture_score:.2f}")
    print(f"  • User Benefits: {result.timeline_score:.2f}")
    print(f"  • Ecosystem Gap: {result.tech_stack_score:.2f}")
    print(f"  • Sustainability: {result.implementation_score:.2f}")
    print(f"  • Network Effects: {metadata.get('network_effects_score', 'N/A')}")
    
    print(f"\n🎯 IMPACT DETAILS:")
    print(f"  • Target Beneficiaries: {metadata.get('target_beneficiaries', 'N/A')}")
    print(f"  • Ecosystem Contribution: {metadata.get('ecosystem_contribution', 'N/A')}")
    print(f"  • Growth Potential: {metadata.get('growth_potential', 'N/A')}")
    
    print(f"\n⏱️  Execution Time: {metadata.get('execution_time_seconds', 'N/A')}s")
    print(f"🤖 Model Used: {metadata.get('model_used', 'N/A')}")
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETE")
    print("="*80)
