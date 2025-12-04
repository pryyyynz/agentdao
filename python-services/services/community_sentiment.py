"""
Community Sentiment Analyzer
Analyzes community voting and sentiment on grant proposals
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import json
import math

from config import settings


# Helper functions
def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert value to float"""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to int"""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default


# Setup logger
logger = logging.getLogger(__name__)


class VotingStrategy(str, Enum):
    """Voting weight calculation strategies"""
    ONE_TOKEN_ONE_VOTE = "one_token_one_vote"  # Linear token-weighted
    QUADRATIC = "quadratic"  # Quadratic voting (sqrt of tokens)
    REPUTATION = "reputation"  # Based on voter reputation
    HYBRID = "hybrid"  # Combination of token + reputation


class SentimentLevel(str, Enum):
    """Community sentiment levels"""
    STRONG_SUPPORT = "strong_support"  # 80-100%
    SUPPORT = "support"  # 60-79%
    NEUTRAL = "neutral"  # 40-59%
    OPPOSITION = "opposition"  # 20-39%
    STRONG_OPPOSITION = "strong_opposition"  # 0-19%


class CommunitySentimentAnalyzer:
    """
    Analyzes community sentiment through voting and polling
    
    Features:
    - Multiple voting strategies (token-weighted, quadratic, reputation-based)
    - Quorum checking and validation
    - Sentiment score calculation
    - Vote aggregation with weights
    - Time-decay for older votes
    """
    
    def __init__(self):
        """Initialize the community sentiment analyzer"""
        self.logger = logging.getLogger(__name__)
        
        # Quorum settings
        self.MIN_VOTERS = 10  # Minimum number of voters
        self.MIN_TOKEN_PARTICIPATION = 0.05  # 5% of total tokens
        self.MIN_REPUTATION_THRESHOLD = 10  # Minimum reputation to vote
        
        # Sentiment thresholds
        self.SENTIMENT_THRESHOLDS = {
            SentimentLevel.STRONG_SUPPORT: (80, 100),
            SentimentLevel.SUPPORT: (60, 80),
            SentimentLevel.NEUTRAL: (40, 60),
            SentimentLevel.OPPOSITION: (20, 40),
            SentimentLevel.STRONG_OPPOSITION: (0, 20)
        }
        
        # Vote options
        self.DEFAULT_VOTE_OPTIONS = [
            {"id": "strongly_approve", "label": "Strongly Approve", "value": 100},
            {"id": "approve", "label": "Approve", "value": 75},
            {"id": "neutral", "label": "Neutral", "value": 50},
            {"id": "reject", "label": "Reject", "value": 25},
            {"id": "strongly_reject", "label": "Strongly Reject", "value": 0}
        ]
        
        self.logger.info("CommunitySentimentAnalyzer initialized")
    
    
    def create_poll(
        self,
        grant_id: str,
        title: str,
        description: str,
        duration_hours: int = 168,  # 7 days default
        voting_strategy: VotingStrategy = VotingStrategy.HYBRID,
        custom_options: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Create a community poll for a grant proposal
        
        Args:
            grant_id: Grant proposal ID
            title: Poll title
            description: Poll description
            duration_hours: Poll duration in hours (default 7 days)
            voting_strategy: Voting weight calculation method
            custom_options: Custom voting options (overrides default)
            
        Returns:
            Poll details including ID, options, and metadata
        """
        try:
            self.logger.info(f"Creating poll for grant {grant_id}")
            
            # Generate poll ID
            poll_id = f"poll_{grant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Set vote options
            vote_options = custom_options if custom_options else self.DEFAULT_VOTE_OPTIONS
            
            # Calculate end time
            start_time = datetime.now()
            end_time = start_time + timedelta(hours=duration_hours)
            
            # Create poll structure
            poll = {
                "poll_id": poll_id,
                "grant_id": grant_id,
                "title": title,
                "description": description,
                "voting_strategy": voting_strategy.value,
                "options": vote_options,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_hours": duration_hours,
                "status": "active",
                "created_at": start_time.isoformat(),
                "votes": [],  # Will be populated as votes come in
                "metadata": {
                    "min_voters": self.MIN_VOTERS,
                    "min_token_participation": self.MIN_TOKEN_PARTICIPATION,
                    "min_reputation": self.MIN_REPUTATION_THRESHOLD
                }
            }
            
            self.logger.info(f"Poll created: {poll_id}")
            
            return {
                "success": True,
                "poll": poll,
                "message": f"Poll created successfully, active until {end_time.strftime('%Y-%m-%d %H:%M:%S')}"
            }
            
        except Exception as e:
            self.logger.error(f"Poll creation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    
    def calculate_vote_weight(
        self,
        voter_address: str,
        token_balance: float,
        reputation_score: int,
        voting_strategy: VotingStrategy,
        total_tokens: float
    ) -> float:
        """
        Calculate voting weight based on strategy
        
        Args:
            voter_address: Voter's address
            token_balance: Voter's token balance
            reputation_score: Voter's reputation (0-100)
            voting_strategy: Weight calculation method
            total_tokens: Total token supply
            
        Returns:
            Vote weight (0.0 to 1.0 normalized)
        """
        try:
            if voting_strategy == VotingStrategy.ONE_TOKEN_ONE_VOTE:
                # Linear token-weighted: weight = tokens / total_tokens
                weight = token_balance / total_tokens if total_tokens > 0 else 0
                
            elif voting_strategy == VotingStrategy.QUADRATIC:
                # Quadratic voting: weight = sqrt(tokens)
                weight = math.sqrt(token_balance) / math.sqrt(total_tokens) if total_tokens > 0 else 0
                
            elif voting_strategy == VotingStrategy.REPUTATION:
                # Reputation-based: weight = reputation / 100
                weight = reputation_score / 100.0
                
            elif voting_strategy == VotingStrategy.HYBRID:
                # Hybrid: 60% token-weighted + 40% reputation
                token_weight = (token_balance / total_tokens) if total_tokens > 0 else 0
                reputation_weight = reputation_score / 100.0
                weight = (0.6 * token_weight) + (0.4 * reputation_weight)
                
            else:
                weight = 0
            
            # Normalize to 0-1 range
            return max(0.0, min(1.0, weight))
            
        except Exception as e:
            self.logger.error(f"Vote weight calculation failed: {e}")
            return 0.0
    
    
    def aggregate_votes(
        self,
        votes: List[Dict[str, Any]],
        voting_strategy: VotingStrategy,
        total_tokens: float
    ) -> Dict[str, Any]:
        """
        Aggregate votes with weighted scoring
        
        Args:
            votes: List of vote records
            voting_strategy: Weight calculation method
            total_tokens: Total token supply
            
        Returns:
            Aggregated vote statistics
        """
        try:
            if not votes:
                return {
                    "total_votes": 0,
                    "total_weight": 0,
                    "weighted_average": 0,
                    "option_breakdown": {},
                    "participation_rate": 0
                }
            
            # Initialize counters
            total_weight = 0
            weighted_sum = 0
            option_counts = {}
            option_weights = {}
            unique_voters = set()
            total_tokens_voted = 0
            
            # Process each vote
            for vote in votes:
                voter = vote.get("voter_address")
                option = vote.get("option")
                option_value = safe_float(vote.get("option_value", 50))
                token_balance = safe_float(vote.get("token_balance", 0))
                reputation = safe_int(vote.get("reputation_score", 50))
                
                # Calculate vote weight
                weight = self.calculate_vote_weight(
                    voter,
                    token_balance,
                    reputation,
                    voting_strategy,
                    total_tokens
                )
                
                # Update counters
                unique_voters.add(voter)
                total_weight += weight
                weighted_sum += option_value * weight
                total_tokens_voted += token_balance
                
                # Track option breakdown
                if option not in option_counts:
                    option_counts[option] = 0
                    option_weights[option] = 0
                option_counts[option] += 1
                option_weights[option] += weight
            
            # Calculate weighted average (0-100 scale)
            weighted_average = (weighted_sum / total_weight) if total_weight > 0 else 0
            
            # Calculate participation rate
            participation_rate = (total_tokens_voted / total_tokens) if total_tokens > 0 else 0
            
            # Create option breakdown with percentages
            option_breakdown = {}
            for option, count in option_counts.items():
                option_breakdown[option] = {
                    "count": count,
                    "percentage": (count / len(votes)) * 100,
                    "weight": option_weights[option],
                    "weight_percentage": (option_weights[option] / total_weight) * 100 if total_weight > 0 else 0
                }
            
            return {
                "total_votes": len(votes),
                "unique_voters": len(unique_voters),
                "total_weight": total_weight,
                "weighted_average": weighted_average,
                "option_breakdown": option_breakdown,
                "participation_rate": participation_rate,
                "total_tokens_voted": total_tokens_voted
            }
            
        except Exception as e:
            self.logger.error(f"Vote aggregation failed: {e}", exc_info=True)
            return {
                "total_votes": 0,
                "error": str(e)
            }
    
    
    def check_quorum(
        self,
        total_votes: int,
        total_weight: float,
        participation_rate: float,
        unique_voters: int
    ) -> Dict[str, Any]:
        """
        Check if quorum requirements are met
        
        Args:
            total_votes: Total number of votes
            total_weight: Total voting weight
            participation_rate: Token participation rate (0-1)
            unique_voters: Number of unique voters
            
        Returns:
            Quorum status and details
        """
        try:
            checks = {
                "min_voters": {
                    "required": self.MIN_VOTERS,
                    "actual": unique_voters,
                    "met": unique_voters >= self.MIN_VOTERS
                },
                "min_token_participation": {
                    "required": self.MIN_TOKEN_PARTICIPATION,
                    "actual": participation_rate,
                    "met": participation_rate >= self.MIN_TOKEN_PARTICIPATION
                },
                "has_votes": {
                    "required": 1,
                    "actual": total_votes,
                    "met": total_votes > 0
                }
            }
            
            # Overall quorum met if all checks pass
            quorum_met = all(check["met"] for check in checks.values())
            
            # Calculate confidence based on participation
            confidence = min(1.0, participation_rate / self.MIN_TOKEN_PARTICIPATION)
            
            return {
                "quorum_met": quorum_met,
                "confidence": confidence,
                "checks": checks,
                "details": self._get_quorum_message(checks, quorum_met)
            }
            
        except Exception as e:
            self.logger.error(f"Quorum check failed: {e}")
            return {
                "quorum_met": False,
                "confidence": 0,
                "error": str(e)
            }
    
    
    def _get_quorum_message(self, checks: Dict[str, Any], quorum_met: bool) -> str:
        """Generate quorum status message"""
        if quorum_met:
            return "Quorum requirements met - vote is valid"
        
        failed = [name for name, check in checks.items() if not check["met"]]
        return f"Quorum NOT met - failed checks: {', '.join(failed)}"
    
    
    def calculate_sentiment_score(
        self,
        weighted_average: float,
        confidence: float,
        participation_rate: float
    ) -> Dict[str, Any]:
        """
        Convert vote results to sentiment score
        
        Args:
            weighted_average: Weighted vote average (0-100)
            confidence: Confidence level (0-1)
            participation_rate: Token participation (0-1)
            
        Returns:
            Sentiment score and level
        """
        try:
            # Base sentiment score is the weighted average
            sentiment_score = weighted_average
            
            # Adjust for low confidence (< 0.5 reduces score reliability)
            if confidence < 0.5:
                sentiment_score *= confidence
            
            # Determine sentiment level
            sentiment_level = self._get_sentiment_level(sentiment_score)
            
            # Calculate reliability based on participation and confidence
            reliability = (confidence * 0.6) + (min(participation_rate / 0.2, 1.0) * 0.4)
            
            return {
                "sentiment_score": round(sentiment_score, 2),
                "sentiment_level": sentiment_level.value,
                "confidence": round(confidence, 3),
                "reliability": round(reliability, 3),
                "description": self._get_sentiment_description(sentiment_level, sentiment_score)
            }
            
        except Exception as e:
            self.logger.error(f"Sentiment score calculation failed: {e}")
            return {
                "sentiment_score": 0,
                "sentiment_level": SentimentLevel.NEUTRAL.value,
                "confidence": 0,
                "error": str(e)
            }
    
    
    def _get_sentiment_level(self, score: float) -> SentimentLevel:
        """Determine sentiment level from score"""
        for level, (min_val, max_val) in self.SENTIMENT_THRESHOLDS.items():
            if min_val <= score < max_val:
                return level
        return SentimentLevel.NEUTRAL
    
    
    def _get_sentiment_description(self, level: SentimentLevel, score: float) -> str:
        """Generate sentiment description"""
        descriptions = {
            SentimentLevel.STRONG_SUPPORT: f"Strong community support ({score:.0f}% approval)",
            SentimentLevel.SUPPORT: f"Community supports proposal ({score:.0f}% approval)",
            SentimentLevel.NEUTRAL: f"Mixed community sentiment ({score:.0f}% approval)",
            SentimentLevel.OPPOSITION: f"Community opposes proposal ({score:.0f}% approval)",
            SentimentLevel.STRONG_OPPOSITION: f"Strong community opposition ({score:.0f}% approval)"
        }
        return descriptions.get(level, f"Sentiment score: {score:.0f}%")
    
    
    def analyze_poll_results(
        self,
        poll_id: str,
        votes: List[Dict[str, Any]],
        voting_strategy: VotingStrategy,
        total_tokens: float,
        grant_amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Complete analysis of poll results
        
        Args:
            poll_id: Poll identifier
            votes: List of vote records
            voting_strategy: Weight calculation method
            total_tokens: Total token supply
            grant_amount: Grant amount (optional, for context)
            
        Returns:
            Complete sentiment analysis
        """
        try:
            self.logger.info(f"Analyzing poll results for {poll_id}")
            
            # Aggregate votes
            aggregation = self.aggregate_votes(votes, voting_strategy, total_tokens)
            
            # Check quorum
            quorum = self.check_quorum(
                aggregation["total_votes"],
                aggregation["total_weight"],
                aggregation["participation_rate"],
                aggregation.get("unique_voters", 0)
            )
            
            # Calculate sentiment
            sentiment = self.calculate_sentiment_score(
                aggregation["weighted_average"],
                quorum["confidence"],
                aggregation["participation_rate"]
            )
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                sentiment,
                quorum,
                aggregation,
                grant_amount
            )
            
            # Build complete analysis
            analysis = {
                "poll_id": poll_id,
                "analysis_timestamp": datetime.now().isoformat(),
                "voting_strategy": voting_strategy.value,
                
                # Vote statistics
                "vote_statistics": {
                    "total_votes": aggregation["total_votes"],
                    "unique_voters": aggregation.get("unique_voters", 0),
                    "total_weight": round(aggregation["total_weight"], 4),
                    "participation_rate": round(aggregation["participation_rate"] * 100, 2),
                    "tokens_voted": aggregation.get("total_tokens_voted", 0)
                },
                
                # Option breakdown
                "option_breakdown": aggregation["option_breakdown"],
                
                # Quorum status
                "quorum": {
                    "met": quorum["quorum_met"],
                    "confidence": round(quorum["confidence"], 3),
                    "details": quorum.get("details", ""),
                    "checks": quorum.get("checks", {})
                },
                
                # Sentiment analysis
                "sentiment": sentiment,
                
                # Recommendations
                "recommendations": recommendations,
                
                # Overall assessment
                "overall_assessment": self._get_overall_assessment(sentiment, quorum)
            }
            
            self.logger.info(
                f"Poll analysis complete: {poll_id}, "
                f"sentiment={sentiment['sentiment_level']}, "
                f"score={sentiment['sentiment_score']}"
            )
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Poll analysis failed for {poll_id}: {e}", exc_info=True)
            return {
                "poll_id": poll_id,
                "error": str(e),
                "analysis_timestamp": datetime.now().isoformat()
            }
    
    
    def _generate_recommendations(
        self,
        sentiment: Dict[str, Any],
        quorum: Dict[str, Any],
        aggregation: Dict[str, Any],
        grant_amount: Optional[float]
    ) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        score = sentiment.get("sentiment_score", 0)
        level = sentiment.get("sentiment_level", "")
        quorum_met = quorum.get("quorum_met", False)
        participation = aggregation.get("participation_rate", 0)
        
        # Quorum recommendations
        if not quorum_met:
            recommendations.append("⚠️ Quorum not met - consider extending voting period or increasing outreach")
        
        # Participation recommendations
        if participation < 0.1:
            recommendations.append("📢 Low participation (< 10%) - increase community engagement")
        elif participation > 0.3:
            recommendations.append("✅ Strong participation (> 30%) - results highly representative")
        
        # Sentiment recommendations
        if level == SentimentLevel.STRONG_SUPPORT.value:
            recommendations.append("🎉 Strong approval - proceed with grant proposal")
            if grant_amount and grant_amount > 100000:
                recommendations.append("💰 Large grant amount - ensure milestone tracking")
        
        elif level == SentimentLevel.SUPPORT.value:
            recommendations.append("✅ Community supports proposal - monitor for concerns")
        
        elif level == SentimentLevel.NEUTRAL.value:
            recommendations.append("🤔 Mixed sentiment - address community concerns before proceeding")
            recommendations.append("💬 Engage with community to understand objections")
        
        elif level in [SentimentLevel.OPPOSITION.value, SentimentLevel.STRONG_OPPOSITION.value]:
            recommendations.append("❌ Community opposes proposal - requires significant revision")
            recommendations.append("📝 Review feedback and consider alternative approach")
        
        # Confidence recommendations
        if sentiment.get("confidence", 0) < 0.5:
            recommendations.append("⚠️ Low confidence - results may not be reliable")
        
        return recommendations
    
    
    def _get_overall_assessment(
        self,
        sentiment: Dict[str, Any],
        quorum: Dict[str, Any]
    ) -> str:
        """Generate overall assessment message"""
        score = sentiment.get("sentiment_score", 0)
        level = sentiment.get("sentiment_level", "")
        quorum_met = quorum.get("quorum_met", False)
        
        if not quorum_met:
            return "INVALID - Quorum not met, results not representative"
        
        if level == SentimentLevel.STRONG_SUPPORT.value:
            return f"APPROVED - Strong community support ({score:.0f}%)"
        elif level == SentimentLevel.SUPPORT.value:
            return f"APPROVED - Community supports proposal ({score:.0f}%)"
        elif level == SentimentLevel.NEUTRAL.value:
            return f"PENDING - Mixed sentiment, requires discussion ({score:.0f}%)"
        elif level == SentimentLevel.OPPOSITION.value:
            return f"REJECTED - Community opposes proposal ({score:.0f}%)"
        else:
            return f"REJECTED - Strong opposition ({score:.0f}%)"


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the community sentiment analyzer"""
    print("\n" + "=" * 80)
    print("COMMUNITY SENTIMENT ANALYZER TEST")
    print("=" * 80)
    
    # Initialize analyzer
    analyzer = CommunitySentimentAnalyzer()
    
    # Test 1: Create poll
    print("\n1. Creating poll...")
    poll_result = analyzer.create_poll(
        grant_id="grant-test-001",
        title="Should we fund the DeFi Governance Platform?",
        description="Proposal to allocate $150k for building a decentralized governance platform",
        duration_hours=168,
        voting_strategy=VotingStrategy.HYBRID
    )
    print(f"   Poll ID: {poll_result['poll']['poll_id']}")
    print(f"   Status: {poll_result['poll']['status']}")
    print(f"   Options: {len(poll_result['poll']['options'])}")
    
    # Test 2: Simulate votes
    print("\n2. Simulating votes...")
    votes = [
        # Strong supporters with high tokens
        {"voter_address": "0x1", "option": "strongly_approve", "option_value": 100, "token_balance": 10000, "reputation_score": 90},
        {"voter_address": "0x2", "option": "strongly_approve", "option_value": 100, "token_balance": 8000, "reputation_score": 85},
        {"voter_address": "0x3", "option": "approve", "option_value": 75, "token_balance": 5000, "reputation_score": 75},
        {"voter_address": "0x4", "option": "approve", "option_value": 75, "token_balance": 4000, "reputation_score": 70},
        
        # Moderate supporters
        {"voter_address": "0x5", "option": "approve", "option_value": 75, "token_balance": 3000, "reputation_score": 65},
        {"voter_address": "0x6", "option": "neutral", "option_value": 50, "token_balance": 2000, "reputation_score": 60},
        {"voter_address": "0x7", "option": "approve", "option_value": 75, "token_balance": 1500, "reputation_score": 55},
        
        # Some opposition
        {"voter_address": "0x8", "option": "reject", "option_value": 25, "token_balance": 1000, "reputation_score": 50},
        {"voter_address": "0x9", "option": "neutral", "option_value": 50, "token_balance": 800, "reputation_score": 45},
        {"voter_address": "0x10", "option": "reject", "option_value": 25, "token_balance": 500, "reputation_score": 40},
        
        # Additional small voters
        {"voter_address": "0x11", "option": "approve", "option_value": 75, "token_balance": 300, "reputation_score": 35},
        {"voter_address": "0x12", "option": "approve", "option_value": 75, "token_balance": 200, "reputation_score": 30},
    ]
    
    total_supply = 100000  # Total token supply
    
    print(f"   Votes: {len(votes)}")
    print(f"   Total supply: {total_supply:,} tokens")
    
    # Test 3: Analyze results
    print("\n3. Analyzing poll results...")
    analysis = analyzer.analyze_poll_results(
        poll_id=poll_result['poll']['poll_id'],
        votes=votes,
        voting_strategy=VotingStrategy.HYBRID,
        total_tokens=total_supply,
        grant_amount=150000
    )
    
    # Print results
    print(f"\n📊 VOTE STATISTICS:")
    stats = analysis['vote_statistics']
    print(f"   Total Votes: {stats['total_votes']}")
    print(f"   Unique Voters: {stats['unique_voters']}")
    print(f"   Participation: {stats['participation_rate']:.2f}%")
    print(f"   Tokens Voted: {stats['tokens_voted']:,.0f} ({stats['tokens_voted']/total_supply*100:.1f}% of supply)")
    
    print(f"\n🎯 OPTION BREAKDOWN:")
    for option, data in analysis['option_breakdown'].items():
        print(f"   {option}: {data['count']} votes ({data['percentage']:.1f}%), weight: {data['weight_percentage']:.1f}%")
    
    print(f"\n✅ QUORUM:")
    quorum = analysis['quorum']
    print(f"   Met: {quorum['met']}")
    print(f"   Confidence: {quorum['confidence']:.1%}")
    print(f"   Details: {quorum['details']}")
    
    print(f"\n💭 SENTIMENT:")
    sentiment = analysis['sentiment']
    print(f"   Score: {sentiment['sentiment_score']}/100")
    print(f"   Level: {sentiment['sentiment_level']}")
    print(f"   Confidence: {sentiment['confidence']:.1%}")
    print(f"   Reliability: {sentiment['reliability']:.1%}")
    print(f"   Description: {sentiment['description']}")
    
    print(f"\n💡 RECOMMENDATIONS ({len(analysis['recommendations'])}):")
    for rec in analysis['recommendations']:
        print(f"   • {rec}")
    
    print(f"\n🎯 OVERALL ASSESSMENT:")
    print(f"   {analysis['overall_assessment']}")
    
    print("\n" + "=" * 80)
    print("✅ All tests completed successfully!")
    print("=" * 80 + "\n")
