"""
Milestone Evaluator Service
Automatically evaluates submitted milestones using the Due Diligence agent
"""

import logging
import asyncio
from typing import Dict, Any, Optional
from decimal import Decimal

from services.due_diligence import DueDiligenceAnalyzer
from repositories.reviews_repository import ReviewsRepository
from repositories.milestone_repository import MilestonesRepository

logger = logging.getLogger(__name__)


class MilestoneEvaluator:
    """Service for evaluating milestone submissions"""
    
    def __init__(self):
        self.due_diligence_agent = DueDiligenceAnalyzer()
        self.reviews_repo = ReviewsRepository()
        self.milestones_repo = MilestonesRepository()
    
    async def evaluate_milestone(self, milestone_id: str) -> Optional[Dict[str, Any]]:
        """
        Evaluate a submitted milestone using the Due Diligence agent
        
        Args:
            milestone_id: UUID of the milestone to evaluate
            
        Returns:
            Created agent review record or None if evaluation fails
        """
        try:
            # Get milestone details
            milestone = self.milestones_repo.get_by_id(milestone_id)
            if not milestone:
                logger.error(f"Milestone {milestone_id} not found")
                return None
            
            # Only evaluate submitted milestones
            if milestone['status'] != 'submitted':
                logger.warning(f"Milestone {milestone_id} is not in submitted status: {milestone['status']}")
                return None
            
            # Check if already reviewed by Due Diligence agent
            existing_reviews = self.reviews_repo.get_agent_reviews_by_milestone(milestone_id)
            if any(r.get('agent_id') == 'due_diligence_agent' for r in existing_reviews):
                logger.info(f"Milestone {milestone_id} already reviewed by Due Diligence agent")
                return None
            
            # Prepare milestone data for evaluation
            milestone_data = {
                'milestone_number': milestone['milestone_number'],
                'title': milestone['title'],
                'description': milestone['description'],
                'deliverables': milestone.get('deliverables', []),
                'amount': str(milestone['amount']),
                'proof_of_work_url': milestone.get('proof_of_work_url', ''),
                'submission_notes': milestone.get('submission_notes', ''),
            }
            
            logger.info(f"Starting Due Diligence evaluation for milestone {milestone_id}")
            
            # Evaluate the milestone
            evaluation = await self._evaluate_proof_of_work(milestone_data)
            
            # Create agent review record
            review_data = {
                'milestone_id': milestone_id,
                'agent_id': 'due_diligence_agent',
                'agent_name': 'due_diligence',
                'recommendation': evaluation['recommendation'],
                'confidence_score': evaluation['confidence_score'],
                'review_score': evaluation['review_score'],
                'feedback': evaluation['feedback'],
                'strengths': evaluation['strengths'],
                'weaknesses': evaluation['weaknesses'],
                'suggestions': evaluation['suggestions'],
                'deliverables_met': evaluation['deliverables_met'],
                'quality_rating': evaluation['quality_rating'],
                'documentation_rating': evaluation['documentation_rating'],
                'code_quality_rating': evaluation.get('code_quality_rating'),
                'review_duration_seconds': evaluation.get('review_duration_seconds', 0)
            }
            
            created_review = self.reviews_repo.create_agent_review(**review_data)
            
            logger.info(f"Due Diligence agent completed review for milestone {milestone_id}: {evaluation['recommendation']}")
            
            return created_review
            
        except Exception as e:
            logger.error(f"Error evaluating milestone {milestone_id}: {e}", exc_info=True)
            return None
    
    async def _evaluate_proof_of_work(self, milestone_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate proof of work by comparing submission to requirements
        
        Args:
            milestone_data: Milestone information including proof URL and deliverables
            
        Returns:
            Evaluation results with recommendation and detailed feedback
        """
        try:
            import time
            start_time = time.time()
            
            proof_url = milestone_data.get('proof_of_work_url', '')
            submission_notes = milestone_data.get('submission_notes', '')
            deliverables = milestone_data.get('deliverables', [])
            description = milestone_data.get('description', '')
            
            # Prepare prompt for due diligence agent
            prompt = f"""Review this milestone submission and compare the proof of work to the original requirements:

MILESTONE REQUIREMENTS:
Title: {milestone_data['title']}
Description: {description}

Expected Deliverables:
{chr(10).join(f'- {d}' for d in deliverables) if deliverables else 'No specific deliverables listed'}

SUBMITTED PROOF OF WORK:
URL: {proof_url}
Submission Notes:
{submission_notes}

EVALUATION INSTRUCTIONS:
1. Visit and analyze the proof of work URL if available
2. Compare what was submitted against the expected deliverables
3. Check if the submission notes adequately explain what was completed
4. Verify if the work meets the milestone requirements
5. Assess the quality and completeness of the submission

Provide your assessment in the following format:
- Whether deliverables are met (fully/partially/not met)
- Quality rating (0-100)
- Documentation quality (0-100)
- Key strengths found
- Key weaknesses or gaps
- Specific suggestions for improvement
- Overall recommendation (approve/revise/reject)
"""
            
            # Call due diligence agent
            # TODO: Integrate with LLM for sophisticated analysis
            # For now, use rule-based analysis
            analysis = self._analyze_submission_simple(
                proof_url=proof_url,
                submission_notes=submission_notes,
                deliverables=deliverables,
                description=description
            )
            
            recommendation = analysis['recommendation']
            strengths = analysis['strengths']
            weaknesses = analysis['weaknesses']
            suggestions = analysis['suggestions']
            
            # Assess deliverables completion
            deliverables_met = self._assess_deliverables(proof_url, submission_notes, deliverables)
            
            # Calculate ratings
            quality_rating = self._calculate_quality_rating(analysis, proof_url, submission_notes)
            documentation_rating = self._calculate_documentation_rating(submission_notes, deliverables)
            
            # Generate detailed feedback
            feedback = self._generate_feedback(
                milestone_data, 
                proof_url, 
                submission_notes, 
                deliverables,
                strengths,
                weaknesses,
                deliverables_met
            )
            
            duration = int(time.time() - start_time)
            
            return {
                'recommendation': recommendation,
                'confidence_score': Decimal(str(analysis.get('confidence', 75))),
                'review_score': Decimal(str(quality_rating)),
                'feedback': feedback,
                'strengths': strengths if strengths else ['Submission received and reviewed'],
                'weaknesses': weaknesses if weaknesses else [],
                'suggestions': suggestions if suggestions else ['Continue with similar quality work'],
                'deliverables_met': deliverables_met,
                'quality_rating': Decimal(str(quality_rating)),
                'documentation_rating': Decimal(str(documentation_rating)),
                'code_quality_rating': None,  # Not assessed for all milestones
                'review_duration_seconds': duration
            }
            
        except Exception as e:
            logger.error(f"Error in proof of work evaluation: {e}", exc_info=True)
            # Return minimal evaluation on error
            return {
                'recommendation': 'revise',
                'confidence_score': Decimal('50'),
                'review_score': Decimal('50'),
                'feedback': f'Automated evaluation encountered an error. Manual review recommended. Error: {str(e)}',
                'strengths': ['Submission received'],
                'weaknesses': ['Automated evaluation incomplete'],
                'suggestions': ['Admin should manually review the submission'],
                'deliverables_met': False,
                'quality_rating': Decimal('50'),
                'documentation_rating': Decimal('50'),
                'code_quality_rating': None,
                'review_duration_seconds': 0
            }
    
    def _analyze_submission_simple(
        self, 
        proof_url: str, 
        submission_notes: str,
        deliverables: list,
        description: str
    ) -> Dict[str, Any]:
        """Simple rule-based analysis of submission - STRICT EVALUATION"""
        strengths = []
        weaknesses = []
        suggestions = []
        
        # Check proof URL - BE STRICT
        if proof_url and len(proof_url) > 10:
            if 'github.com' in proof_url.lower() or 'gitlab.com' in proof_url.lower():
                strengths.append("Code repository linked for verification")
            elif any(domain in proof_url.lower() for domain in ['drive.google.com', 'docs.google.com', 'youtube.com', 'vimeo.com']):
                strengths.append("Documentation or demo link provided")
            else:
                weaknesses.append("Proof URL type unclear - prefer code repositories or documentation")
                suggestions.append("Provide GitHub/GitLab link or structured documentation")
        else:
            weaknesses.append("No valid proof of work URL provided - CRITICAL ISSUE")
            suggestions.append("Provide a direct link to the completed work (GitHub, docs, or demo)")
        
        # Check submission notes quality - REQUIRE HIGH QUALITY
        notes_length = len(submission_notes) if submission_notes else 0
        if notes_length >= 500:
            strengths.append("Comprehensive submission notes provided")
        elif notes_length >= 300:
            weaknesses.append("Submission notes should be more comprehensive")
            suggestions.append("Expand on implementation details, challenges faced, and outcomes")
        elif notes_length >= 100:
            weaknesses.append("Submission notes lack sufficient detail")
            suggestions.append("Provide detailed explanation of work completed, methodology, and results")
        else:
            weaknesses.append("Submission notes are insufficient - CRITICAL ISSUE")
            suggestions.append("Add comprehensive description of completed work with specific details")
        
        # Check if deliverables mentioned in notes - BE STRICT
        if deliverables and submission_notes:
            mentioned_count = sum(1 for d in deliverables if d.lower() in submission_notes.lower())
            coverage_ratio = mentioned_count / len(deliverables) if deliverables else 0
            
            if coverage_ratio >= 0.8:
                strengths.append(f"Submission addresses {mentioned_count}/{len(deliverables)} deliverables")
            elif coverage_ratio >= 0.5:
                weaknesses.append(f"Only {mentioned_count}/{len(deliverables)} deliverables clearly addressed")
                suggestions.append("Explicitly document completion of all expected deliverables")
            else:
                weaknesses.append(f"Submission notes fail to address most deliverables ({mentioned_count}/{len(deliverables)})")
                suggestions.append("Systematically address each deliverable with evidence of completion")
        elif deliverables:
            weaknesses.append("Deliverables not referenced in submission notes")
            suggestions.append("Explicitly mention and demonstrate completion of each deliverable")
        
        # Evaluate technical depth
        if submission_notes:
            technical_indicators = ['implemented', 'deployed', 'tested', 'code', 'function', 'feature', 'bug', 'issue', 'commit', 'pull request', 'branch']
            technical_mentions = sum(1 for indicator in technical_indicators if indicator in submission_notes.lower())
            
            if technical_mentions >= 5:
                strengths.append("Submission demonstrates technical depth")
            elif technical_mentions >= 2:
                weaknesses.append("Limited technical detail in submission")
                suggestions.append("Include more technical specifics about implementation")
            else:
                weaknesses.append("Lacks technical depth and implementation details")
                suggestions.append("Provide concrete technical details about the work completed")
        
        # Determine recommendation - STRICT CRITERIA
        critical_issues = sum(1 for w in weaknesses if 'CRITICAL' in w)
        
        if critical_issues > 0:
            recommendation = 'reject'
        elif len(weaknesses) == 0 and len(strengths) >= 3:
            recommendation = 'approve'
        elif len(weaknesses) <= 2 and len(strengths) >= 2:
            recommendation = 'revise'
        else:
            recommendation = 'reject'
        
        return {
            'recommendation': recommendation,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'suggestions': suggestions,
            'confidence': 70
        }
    
    def _determine_recommendation(
        self, 
        analysis: Dict[str, Any], 
        proof_url: str, 
        submission_notes: str,
        deliverables: list
    ) -> str:
        """Determine approve/revise/reject based on analysis"""
        
        # Must have proof of work URL
        if not proof_url or len(proof_url) < 10:
            return 'reject'
        
        # Must have adequate submission notes
        if not submission_notes or len(submission_notes) < 100:
            return 'revise'
        
        # Check analysis score
        score = analysis.get('overall_score', 50)
        
        if score >= 70:
            return 'approve'
        elif score >= 50:
            return 'revise'
        else:
            return 'reject'
    
    def _assess_deliverables(self, proof_url: str, submission_notes: str, deliverables: list) -> bool:
        """Assess if deliverables appear to be met based on submission - STRICT EVALUATION"""
        
        if not deliverables:
            # No specific deliverables defined - require BOTH URL and notes
            return bool(proof_url and submission_notes and len(submission_notes) >= 100)
        
        # STRICT: Must have proof URL
        if not proof_url or len(proof_url) < 10:
            return False
        
        # STRICT: Must have substantial notes
        if not submission_notes or len(submission_notes) < 150:
            return False
        
        # Check if submission notes mention deliverables - REQUIRE HIGH COVERAGE
        notes_lower = submission_notes.lower()
        mentions = 0
        
        for deliverable in deliverables:
            # Check for key words from deliverable in notes
            key_words = [word.lower() for word in deliverable.split() if len(word) > 4]
            if any(word in notes_lower for word in key_words):
                mentions += 1
        
        # STRICT: Consider deliverables met only if 80%+ are mentioned
        coverage_ratio = mentions / len(deliverables) if deliverables else 0
        return coverage_ratio >= 0.8
    
    def _calculate_quality_rating(
        self, 
        analysis: Dict[str, Any], 
        proof_url: str, 
        submission_notes: str
    ) -> float:
        """Calculate overall quality rating - STRICT SCORING"""
        
        # Start with LOW base score - must earn points
        base_score = 30
        
        # Proof URL evaluation - BE CRITICAL
        if proof_url and len(proof_url) > 10:
            if 'github.com' in proof_url.lower() or 'gitlab.com' in proof_url.lower():
                base_score += 15  # Code repository gets good points
            elif any(domain in proof_url.lower() for domain in ['drive.google.com', 'docs.google.com']):
                base_score += 10  # Documentation gets moderate points
            else:
                base_score += 5  # Other URLs get minimal points
        
        # Submission notes evaluation - REQUIRE QUALITY
        if submission_notes:
            notes_length = len(submission_notes)
            if notes_length >= 500:
                base_score += 20  # Comprehensive notes
            elif notes_length >= 300:
                base_score += 12  # Adequate notes
            elif notes_length >= 150:
                base_score += 7   # Minimal notes
            # Below 150 characters gets NO bonus
            
            # Technical depth bonus
            technical_indicators = ['implemented', 'deployed', 'tested', 'code', 'function', 'feature']
            technical_count = sum(1 for indicator in technical_indicators if indicator in submission_notes.lower())
            if technical_count >= 5:
                base_score += 15
            elif technical_count >= 3:
                base_score += 8
            elif technical_count >= 1:
                base_score += 3
        
        # Analysis penalty for weaknesses - BE HARSH
        weaknesses_count = len(analysis.get('weaknesses', []))
        if weaknesses_count >= 4:
            base_score -= 20
        elif weaknesses_count >= 3:
            base_score -= 15
        elif weaknesses_count >= 2:
            base_score -= 10
        elif weaknesses_count >= 1:
            base_score -= 5
        
        # Bonus for multiple strengths
        strengths_count = len(analysis.get('strengths', []))
        if strengths_count >= 4:
            base_score += 10
        elif strengths_count >= 3:
            base_score += 5
        
        return min(100, max(0, base_score))
    
    def _calculate_documentation_rating(self, submission_notes: str, deliverables: list) -> float:
        """Calculate documentation quality rating - STRICT STANDARDS"""
        
        if not submission_notes:
            return 0
        
        # Start with LOW base score
        score = 20
        
        # Length requirements - STRICT
        notes_length = len(submission_notes)
        if notes_length >= 500:
            score += 20
        elif notes_length >= 300:
            score += 12
        elif notes_length >= 150:
            score += 7
        elif notes_length >= 100:
            score += 3
        # Below 100 gets NO bonus
        
        # Structure requirements - MUST HAVE GOOD FORMATTING
        has_paragraphs = submission_notes.count('\n\n') >= 2
        has_lists = any(marker in submission_notes for marker in ['-', '*', '•', '1.', '2.', '3.'])
        
        if has_paragraphs and has_lists:
            score += 15  # Well structured
        elif has_paragraphs or has_lists:
            score += 8   # Some structure
        # No structure gets NO bonus
        
        # Deliverable coverage - STRICT REQUIREMENTS
        if deliverables:
            notes_lower = submission_notes.lower()
            covered_count = 0
            for deliverable in deliverables:
                key_words = [word.lower() for word in deliverable.split() if len(word) > 4]
                if any(word in notes_lower for word in key_words):
                    covered_count += 1
            
            coverage_ratio = covered_count / len(deliverables)
            if coverage_ratio >= 0.9:
                score += 20  # Nearly all covered
            elif coverage_ratio >= 0.7:
                score += 12  # Most covered
            elif coverage_ratio >= 0.5:
                score += 6   # Half covered
            # Below 50% coverage gets NO bonus
        
        # Technical detail bonus - REQUIRE DEPTH
        technical_terms = ['implemented', 'developed', 'deployed', 'tested', 'code', 'function', 
                          'feature', 'bug', 'issue', 'commit', 'pull request', 'branch', 'API',
                          'database', 'interface', 'algorithm', 'performance', 'optimization']
        technical_count = sum(1 for term in technical_terms if term.lower() in submission_notes.lower())
        
        if technical_count >= 8:
            score += 15
        elif technical_count >= 5:
            score += 10
        elif technical_count >= 3:
            score += 5
        
        return min(100, max(0, score))
    
    def _generate_feedback(
        self,
        milestone_data: Dict[str, Any],
        proof_url: str,
        submission_notes: str,
        deliverables: list,
        strengths: list,
        weaknesses: list,
        deliverables_met: bool
    ) -> str:
        """Generate comprehensive feedback for admin"""
        
        feedback_parts = []
        
        feedback_parts.append(f"**Milestone {milestone_data['milestone_number']}: {milestone_data['title']}**\n")
        
        # Proof of Work URL Assessment
        if proof_url:
            feedback_parts.append(f"✓ Proof of work URL provided: {proof_url}")
        else:
            feedback_parts.append("✗ No proof of work URL provided")
        
        # Submission Notes Assessment
        if submission_notes:
            word_count = len(submission_notes.split())
            feedback_parts.append(f"✓ Submission notes provided ({word_count} words)")
        else:
            feedback_parts.append("✗ No submission notes provided")
        
        # Deliverables Assessment
        if deliverables:
            status = "✓ Appear to be met" if deliverables_met else "⚠ May not be fully met"
            feedback_parts.append(f"\n**Deliverables ({len(deliverables)}): {status}**")
            for i, deliverable in enumerate(deliverables, 1):
                feedback_parts.append(f"  {i}. {deliverable}")
        
        # Strengths
        if strengths:
            feedback_parts.append(f"\n**Strengths Found:**")
            for strength in strengths[:5]:
                feedback_parts.append(f"  • {strength}")
        
        # Weaknesses
        if weaknesses:
            feedback_parts.append(f"\n**Issues/Concerns:**")
            for weakness in weaknesses[:5]:
                feedback_parts.append(f"  • {weakness}")
        
        feedback_parts.append("\n**Admin Review Needed:** Please verify the proof of work and confirm deliverables are met before final approval.")
        
        return "\n".join(feedback_parts)


# Singleton instance
_evaluator_instance = None

def get_milestone_evaluator() -> MilestoneEvaluator:
    """Get or create singleton milestone evaluator instance"""
    global _evaluator_instance
    if _evaluator_instance is None:
        _evaluator_instance = MilestoneEvaluator()
    return _evaluator_instance
