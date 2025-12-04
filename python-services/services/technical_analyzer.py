"""
Technical Analyzer Service for AgentDAO
Evaluates grant proposals for technical feasibility using Groq AI
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
from models import TechnicalEvaluationResult


# Setup logger
logger = logging.getLogger(__name__)


class TechnicalAnalyzer:
    """
    Technical feasibility analyzer using Groq AI
    
    Evaluates grant proposals on:
    - Architecture quality and scalability
    - Timeline feasibility
    - Tech stack appropriateness
    - Implementation approach
    
    Scoring: -2 (strongly negative) to +2 (strongly positive)
    """
    
    def __init__(self):
        """Initialize Technical Analyzer with Groq API client"""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
        self.temperature = settings.GROQ_TEMPERATURE
        self.max_tokens = settings.GROQ_MAX_TOKENS
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        
        logger.info(f"TechnicalAnalyzer initialized with model: {self.model}")
    
    def _create_technical_prompt(self, proposal: Dict[str, Any]) -> str:
        """
        Create detailed prompt for technical evaluation
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Formatted prompt string
        """
        prompt = f"""You are an expert technical evaluator for blockchain grant proposals. Analyze the following proposal for technical feasibility.

**PROPOSAL DETAILS:**
Title: {proposal.get('title', 'N/A')}
Description: {proposal.get('description', 'N/A')}
Funding Requested: ${proposal.get('funding_amount', 0):,.2f}
Timeline: {proposal.get('timeline', 'N/A')}
Tech Stack: {proposal.get('tech_stack', 'N/A')}
Team Experience: {proposal.get('team_experience', 'N/A')}
Architecture: {proposal.get('architecture', 'N/A')}

**EVALUATION CRITERIA:**

1. **Architecture Assessment** (Weight: 40%)
   - Is the proposed architecture sound and scalable?
   - Are design patterns appropriate for the use case?
   - Is there proper separation of concerns?
   - Are security considerations addressed?
   - Is the architecture production-ready?

2. **Timeline Feasibility** (Weight: 25%)
   - Is the proposed timeline realistic given the scope?
   - Are milestones well-defined and achievable?
   - Is there buffer time for unforeseen issues?
   - Does timeline account for testing and deployment?

3. **Tech Stack Validation** (Weight: 25%)
   - Are technology choices appropriate and modern?
   - Is there good synergy between chosen technologies?
   - Is the team experienced with the proposed stack?
   - Are dependencies well-maintained and secure?
   - Is the stack suitable for blockchain integration?

4. **Implementation Approach** (Weight: 10%)
   - Is the development methodology clear?
   - Are testing strategies defined?
   - Is deployment strategy sound?
   - Are maintenance and support plans adequate?

**SCORING SCALE:**
- +2: Exceptional - Best practices, innovative, highly feasible
- +1.5: Very Good - Strong technical approach with minor issues
- +1: Good - Solid approach, minor concerns, feasible
- +0.5: Above Average - Good foundation with some improvements needed
-  0: Neutral - Average, some concerns, needs clarification
- -0.5: Below Average - Basic approach with significant concerns
- -1: Poor - Significant concerns, questionable feasibility
- -1.5: Very Poor - Major technical flaws with limited feasibility
- -2: Critical - Major flaws, not feasible, high risk

**OUTPUT FORMAT (JSON):**
Provide your analysis as a JSON object with the following structure:
{{
    "overall_score": <number between -2 and +2 in 0.5 increments>,
    "architecture_score": <number between -2 and +2 in 0.5 increments>,
    "timeline_score": <number between -2 and +2 in 0.5 increments>,
    "tech_stack_score": <number between -2 and +2 in 0.5 increments>,
    "implementation_score": <number between -2 and +2 in 0.5 increments>,
    "confidence": <number between 0 and 1>,
    "strengths": [<list of key strengths>],
    "weaknesses": [<list of key weaknesses>],
    "risks": [<list of technical risks>],
    "recommendations": [<list of recommendations>],
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
                data['architecture_score'] = max(-2, min(2, float(data.get('architecture_score', 0))))
                data['timeline_score'] = max(-2, min(2, float(data.get('timeline_score', 0))))
                data['tech_stack_score'] = max(-2, min(2, float(data.get('tech_stack_score', 0))))
                data['implementation_score'] = max(-2, min(2, float(data.get('implementation_score', 0))))
                data['confidence'] = max(0, min(1, float(data.get('confidence', 0.5))))
                
                # Ensure lists exist
                data.setdefault('strengths', [])
                data.setdefault('weaknesses', [])
                data.setdefault('risks', [])
                data.setdefault('recommendations', [])
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
                'architecture_score': 0,
                'timeline_score': 0,
                'tech_stack_score': 0,
                'implementation_score': 0,
                'confidence': 0.3,
                'strengths': [],
                'weaknesses': ['Unable to parse AI response'],
                'risks': ['Analysis incomplete'],
                'recommendations': ['Resubmit for analysis'],
                'summary': 'Technical analysis could not be completed',
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
                        "content": "You are an expert technical evaluator for blockchain and Web3 grant proposals. Provide detailed, objective technical analysis."
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
    
    def analyze_architecture(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze architecture quality and scalability
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Architecture analysis results
        """
        architecture = proposal.get('architecture', '')
        tech_stack = proposal.get('tech_stack', '')
        
        # Extract key architecture concerns
        concerns = []
        strengths = []
        
        # Check for scalability mentions
        if any(word in architecture.lower() for word in ['scale', 'scalable', 'scaling']):
            strengths.append("Scalability considerations mentioned")
        else:
            concerns.append("Scalability not explicitly addressed")
        
        # Check for security mentions
        if any(word in architecture.lower() for word in ['security', 'secure', 'authentication', 'encryption']):
            strengths.append("Security considerations included")
        else:
            concerns.append("Security measures not clearly defined")
        
        # Check for design patterns
        patterns = ['microservices', 'event-driven', 'layered', 'modular', 'api', 'rest']
        mentioned_patterns = [p for p in patterns if p in architecture.lower()]
        if mentioned_patterns:
            strengths.append(f"Design patterns mentioned: {', '.join(mentioned_patterns)}")
        
        return {
            'concerns': concerns,
            'strengths': strengths,
            'pattern_count': len(mentioned_patterns)
        }
    
    def check_timeline_feasibility(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check if proposed timeline is realistic
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Timeline feasibility analysis
        """
        timeline = proposal.get('timeline', '')
        funding_amount = proposal.get('funding_amount', 0)
        
        concerns = []
        notes = []
        
        # Extract duration (simple heuristic)
        duration_months = 0
        if 'month' in timeline.lower():
            # Try to extract number of months
            import re
            matches = re.findall(r'(\d+)\s*month', timeline.lower())
            if matches:
                duration_months = int(matches[0])
        
        # Check if timeline seems rushed
        if duration_months > 0:
            notes.append(f"Estimated duration: {duration_months} months")
            
            # Rule of thumb: $10k per month minimum
            expected_min_months = funding_amount / 10000 if funding_amount > 0 else 0
            
            if duration_months < expected_min_months * 0.5:
                concerns.append("Timeline may be too aggressive for funding amount")
            elif duration_months > expected_min_months * 3:
                concerns.append("Timeline may be unnecessarily long")
            else:
                notes.append("Timeline appears reasonable for funding amount")
        else:
            concerns.append("Timeline duration not clearly specified")
        
        # Check for milestones
        if any(word in timeline.lower() for word in ['milestone', 'phase', 'stage', 'deliverable']):
            notes.append("Milestones/phases defined")
        else:
            concerns.append("Milestones not clearly defined")
        
        return {
            'duration_months': duration_months,
            'concerns': concerns,
            'notes': notes,
            'is_realistic': len(concerns) <= 1
        }
    
    def validate_tech_stack(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate technology stack choices
        
        Args:
            proposal: Grant proposal data
        
        Returns:
            Tech stack validation results
        """
        tech_stack = proposal.get('tech_stack', '').lower()
        
        # Known good technologies
        blockchain_tech = ['ethereum', 'solidity', 'web3', 'hardhat', 'truffle', 'polygon', 'arbitrum']
        backend_tech = ['nodejs', 'python', 'fastapi', 'express', 'django', 'flask']
        frontend_tech = ['react', 'nextjs', 'vue', 'typescript', 'javascript']
        database_tech = ['postgresql', 'mongodb', 'redis', 'supabase', 'firebase']
        
        detected = {
            'blockchain': [t for t in blockchain_tech if t in tech_stack],
            'backend': [t for t in backend_tech if t in tech_stack],
            'frontend': [t for t in frontend_tech if t in tech_stack],
            'database': [t for t in database_tech if t in tech_stack]
        }
        
        strengths = []
        concerns = []
        
        # Check blockchain integration
        if detected['blockchain']:
            strengths.append(f"Blockchain tech: {', '.join(detected['blockchain'])}")
        else:
            concerns.append("No clear blockchain technology mentioned")
        
        # Check full stack coverage
        if detected['backend'] and detected['frontend']:
            strengths.append("Full stack coverage (backend + frontend)")
        elif not detected['backend']:
            concerns.append("Backend technology not specified")
        elif not detected['frontend']:
            concerns.append("Frontend technology not specified")
        
        # Check database
        if detected['database']:
            strengths.append(f"Database: {', '.join(detected['database'])}")
        else:
            concerns.append("Database solution not clearly specified")
        
        return {
            'detected_technologies': detected,
            'strengths': strengths,
            'concerns': concerns,
            'technology_count': sum(len(v) for v in detected.values()),
            'is_comprehensive': all(len(v) > 0 for v in detected.values())
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
            'architecture_score': 0.40,
            'timeline_score': 0.25,
            'tech_stack_score': 0.25,
            'implementation_score': 0.10
        }
        
        total_score = 0.0
        for key, weight in weights.items():
            total_score += scores.get(key, 0) * weight
        
        # Clamp to -2 to +2 range
        return max(-2.0, min(2.0, total_score))
    
    def analyze_technical_feasibility(
        self,
        grant_id: str,
        proposal_data: Dict[str, Any]
    ) -> TechnicalEvaluationResult:
        """
        Perform comprehensive technical feasibility analysis
        
        Args:
            grant_id: Grant proposal ID
            proposal_data: Complete proposal data
        
        Returns:
            EvaluationResult with technical analysis
        """
        start_time = time.time()
        
        logger.info(f"Starting technical analysis for grant {grant_id}")
        
        try:
            # Run pre-analysis checks
            arch_analysis = self.analyze_architecture(proposal_data)
            timeline_analysis = self.check_timeline_feasibility(proposal_data)
            tech_stack_analysis = self.validate_tech_stack(proposal_data)
            
            logger.debug(f"Pre-analysis complete: {arch_analysis}, {timeline_analysis}, {tech_stack_analysis}")
            
            # Create prompt and call AI
            prompt = self._create_technical_prompt(proposal_data)
            response_text = self._call_groq_api(prompt)
            
            if response_text:
                # Parse AI response
                ai_analysis = self._parse_ai_response(response_text)
                
                # Enhance with pre-analysis results
                ai_analysis['strengths'].extend(arch_analysis['strengths'])
                ai_analysis['strengths'].extend(tech_stack_analysis['strengths'])
                
                ai_analysis['weaknesses'].extend(arch_analysis['concerns'])
                ai_analysis['weaknesses'].extend(timeline_analysis['concerns'])
                ai_analysis['weaknesses'].extend(tech_stack_analysis['concerns'])
                
                # Add timeline notes to reasoning
                if timeline_analysis['notes']:
                    ai_analysis['reasoning'] += f"\n\nTimeline Analysis: {' '.join(timeline_analysis['notes'])}"
                
            else:
                # Fallback if AI call fails - use heuristic scoring
                logger.warning("AI analysis failed, using fallback heuristic scoring")
                
                arch_score = 1.0 if arch_analysis['pattern_count'] >= 2 else 0.0
                arch_score -= 0.5 * len(arch_analysis['concerns'])
                
                timeline_score = 1.0 if timeline_analysis['is_realistic'] else -0.5
                timeline_score -= 0.3 * len(timeline_analysis['concerns'])
                
                tech_score = 1.0 if tech_stack_analysis['is_comprehensive'] else 0.0
                tech_score -= 0.3 * len(tech_stack_analysis['concerns'])
                
                impl_score = 0.5  # Neutral default
                
                overall_score = self.calculate_weighted_score({
                    'architecture_score': arch_score,
                    'timeline_score': timeline_score,
                    'tech_stack_score': tech_score,
                    'implementation_score': impl_score
                })
                
                ai_analysis = {
                    'overall_score': overall_score,
                    'architecture_score': arch_score,
                    'timeline_score': timeline_score,
                    'tech_stack_score': tech_score,
                    'implementation_score': impl_score,
                    'confidence': 0.4,  # Lower confidence for heuristic scoring
                    'strengths': arch_analysis['strengths'] + tech_stack_analysis['strengths'],
                    'weaknesses': arch_analysis['concerns'] + timeline_analysis['concerns'] + tech_stack_analysis['concerns'],
                    'risks': ['Analysis based on heuristics due to AI unavailability'],
                    'recommendations': ['Recommend manual technical review'],
                    'summary': 'Technical analysis completed using heuristic methods.',
                    'reasoning': 'AI analysis unavailable, scores based on automated checks.'
                }
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Create TechnicalEvaluationResult
            result = TechnicalEvaluationResult(
                grant_id=grant_id,
                agent_type="technical",
                score=ai_analysis['overall_score'],
                confidence=ai_analysis['confidence'],
                architecture_score=ai_analysis['architecture_score'],
                timeline_score=ai_analysis['timeline_score'],
                tech_stack_score=ai_analysis['tech_stack_score'],
                implementation_score=ai_analysis['implementation_score'],
                reasoning=ai_analysis['reasoning'],
                strengths=ai_analysis['strengths'][:10],  # Limit to top 10
                weaknesses=ai_analysis['weaknesses'][:10],
                risks=ai_analysis['risks'][:10],
                recommendations=ai_analysis['recommendations'][:10],
                metadata={
                    'summary': ai_analysis['summary'],
                    'execution_time_seconds': round(execution_time, 2),
                    'model_used': self.model,
                    'detected_technologies': tech_stack_analysis.get('detected_technologies', {}),
                    'timeline_duration_months': timeline_analysis.get('duration_months', 0)
                },
                evaluated_at=get_utc_now()
            )
            
            logger.info(f"Technical analysis complete for grant {grant_id}: score={result.score}, confidence={result.confidence}")
            
            return result
            
        except Exception as e:
            logger.error(f"Technical analysis failed for grant {grant_id}: {e}", exc_info=True)
            
            # Return error result
            return TechnicalEvaluationResult(
                grant_id=grant_id,
                agent_type="technical",
                score=0.0,
                confidence=0.0,
                architecture_score=0.0,
                timeline_score=0.0,
                tech_stack_score=0.0,
                implementation_score=0.0,
                reasoning=f"Technical analysis failed: {str(e)}",
                strengths=[],
                weaknesses=['Analysis failed due to error'],
                risks=['Unable to complete technical evaluation'],
                recommendations=['Retry analysis or perform manual review'],
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
    """Test technical analyzer with sample data"""
    
    from logging_config import setup_logging
    setup_logging(log_level="DEBUG")
    
    # Sample grant proposal
    sample_proposal = {
        'title': 'Decentralized Grant Management Platform',
        'description': 'A blockchain-based platform for managing grants with multi-agent AI evaluation',
        'funding_amount': 50000,
        'timeline': '6 months with 3 major milestones: MVP (2 months), Beta (4 months), Production (6 months)',
        'tech_stack': 'Ethereum, Solidity, React, NextJS, FastAPI, PostgreSQL, Supabase, IPFS, Groq AI',
        'team_experience': '10+ years combined experience in blockchain and AI',
        'architecture': 'Microservices architecture with FastAPI backend, React frontend, Ethereum smart contracts for voting, IPFS for document storage, and Groq AI for evaluation'
    }
    
    # Create analyzer
    analyzer = TechnicalAnalyzer()
    
    # Perform analysis
    print("\n" + "="*80)
    print("TECHNICAL FEASIBILITY ANALYSIS TEST")
    print("="*80)
    
    result = analyzer.analyze_technical_feasibility(
        grant_id="test-grant-001",
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
    print(f"  • Architecture: {metadata.get('architecture_score', 'N/A')}")
    print(f"  • Timeline: {metadata.get('timeline_score', 'N/A')}")
    print(f"  • Tech Stack: {metadata.get('tech_stack_score', 'N/A')}")
    print(f"  • Implementation: {metadata.get('implementation_score', 'N/A')}")
    
    print(f"\n⏱️  Execution Time: {metadata.get('execution_time_seconds', 'N/A')}s")
    print(f"🤖 Model Used: {metadata.get('model_used', 'N/A')}")
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETE")
    print("="*80)
