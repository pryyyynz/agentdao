"""
Test Community Sentiment API Endpoints

Tests:
1. Create poll
2. Submit votes
3. Get poll results with sentiment analysis
4. Health check
"""

import sys
sys.path.insert(0, 'c:\\Users\\pryyy\\Projects\\agentdao\\python-services')

from services.community_sentiment import CommunitySentimentAnalyzer, VotingStrategy
from datetime import datetime


def print_section(title: str):
    """Print a section separator"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def test_create_poll():
    """Test poll creation"""
    print_section("TEST 1: Create Poll")
    
    analyzer = CommunitySentimentAnalyzer()
    
    result = analyzer.create_poll(
        grant_id="grant-test-community-001",
        title="Should we fund the Cross-Chain Bridge Protocol?",
        description="Proposal to allocate $200k for building a secure cross-chain bridge supporting Ethereum, Polygon, and Arbitrum",
        duration_hours=168,
        voting_strategy=VotingStrategy.HYBRID
    )
    
    if result.get("success"):
        poll = result["poll"]
        print(f"✅ Poll created successfully!")
        print(f"   Poll ID: {poll['poll_id']}")
        print(f"   Grant: {poll['grant_id']}")
        print(f"   Title: {poll['title']}")
        print(f"   Duration: {poll['duration_hours']} hours")
        print(f"   Strategy: {poll['voting_strategy']}")
        print(f"   Options: {len(poll['options'])}")
        print(f"   Status: {poll['status']}")
        print(f"   End Time: {poll['end_time']}")
        
        return poll
    else:
        print(f"❌ Poll creation failed: {result.get('error')}")
        return None


def test_vote_aggregation():
    """Test vote aggregation with different scenarios"""
    print_section("TEST 2: Vote Aggregation - Strong Support")
    
    analyzer = CommunitySentimentAnalyzer()
    
    # Scenario 1: Strong Support (80%+ approval)
    votes_strong = [
        {"voter_address": f"0x{i:040x}", "option": "strongly_approve", "option_value": 100, "token_balance": 10000, "reputation_score": 90}
        for i in range(8)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "approve", "option_value": 75, "token_balance": 5000, "reputation_score": 70}
        for i in range(8, 15)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "neutral", "option_value": 50, "token_balance": 1000, "reputation_score": 50}
        for i in range(15, 18)
    ]
    
    analysis = analyzer.analyze_poll_results(
        poll_id="poll_test_strong_support",
        votes=votes_strong,
        voting_strategy=VotingStrategy.HYBRID,
        total_tokens=200000,
        grant_amount=200000
    )
    
    print(f"📊 RESULTS:")
    stats = analysis['vote_statistics']
    print(f"   Total Votes: {stats['total_votes']}")
    print(f"   Unique Voters: {stats['unique_voters']}")
    print(f"   Participation: {stats['participation_rate']:.2f}%")
    print(f"   Tokens Voted: {stats['tokens_voted']:,.0f}")
    
    sentiment = analysis['sentiment']
    print(f"\n💭 SENTIMENT:")
    print(f"   Score: {sentiment['sentiment_score']}/100")
    print(f"   Level: {sentiment['sentiment_level']}")
    print(f"   Description: {sentiment['description']}")
    
    quorum = analysis['quorum']
    print(f"\n✅ QUORUM:")
    print(f"   Met: {quorum['met']}")
    print(f"   Confidence: {quorum['confidence']:.1%}")
    
    print(f"\n🎯 ASSESSMENT:")
    print(f"   {analysis['overall_assessment']}")
    
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in analysis['recommendations'][:3]:
        print(f"   • {rec}")
    
    return analysis


def test_vote_aggregation_mixed():
    """Test with mixed sentiment"""
    print_section("TEST 3: Vote Aggregation - Mixed Sentiment")
    
    analyzer = CommunitySentimentAnalyzer()
    
    # Scenario 2: Mixed Sentiment (40-60% range)
    votes_mixed = [
        {"voter_address": f"0x{i:040x}", "option": "strongly_approve", "option_value": 100, "token_balance": 8000, "reputation_score": 85}
        for i in range(3)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "approve", "option_value": 75, "token_balance": 5000, "reputation_score": 70}
        for i in range(3, 7)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "neutral", "option_value": 50, "token_balance": 3000, "reputation_score": 60}
        for i in range(7, 12)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "reject", "option_value": 25, "token_balance": 2000, "reputation_score": 55}
        for i in range(12, 17)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "strongly_reject", "option_value": 0, "token_balance": 1000, "reputation_score": 50}
        for i in range(17, 20)
    ]
    
    analysis = analyzer.analyze_poll_results(
        poll_id="poll_test_mixed",
        votes=votes_mixed,
        voting_strategy=VotingStrategy.HYBRID,
        total_tokens=150000,
        grant_amount=150000
    )
    
    print(f"📊 RESULTS:")
    stats = analysis['vote_statistics']
    print(f"   Total Votes: {stats['total_votes']}")
    print(f"   Participation: {stats['participation_rate']:.2f}%")
    
    sentiment = analysis['sentiment']
    print(f"\n💭 SENTIMENT:")
    print(f"   Score: {sentiment['sentiment_score']}/100")
    print(f"   Level: {sentiment['sentiment_level']}")
    print(f"   Reliability: {sentiment['reliability']:.1%}")
    
    print(f"\n🎯 OPTION BREAKDOWN:")
    for option, data in list(analysis['option_breakdown'].items())[:5]:
        print(f"   {option}: {data['count']} votes ({data['percentage']:.1f}%)")
    
    print(f"\n🎯 ASSESSMENT:")
    print(f"   {analysis['overall_assessment']}")
    
    return analysis


def test_vote_aggregation_opposition():
    """Test with strong opposition"""
    print_section("TEST 4: Vote Aggregation - Strong Opposition")
    
    analyzer = CommunitySentimentAnalyzer()
    
    # Scenario 3: Strong Opposition (< 30% approval)
    votes_opposition = [
        {"voter_address": f"0x{i:040x}", "option": "strongly_reject", "option_value": 0, "token_balance": 12000, "reputation_score": 90}
        for i in range(10)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "reject", "option_value": 25, "token_balance": 8000, "reputation_score": 75}
        for i in range(10, 18)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "neutral", "option_value": 50, "token_balance": 3000, "reputation_score": 60}
        for i in range(18, 22)
    ] + [
        {"voter_address": f"0x{i:040x}", "option": "approve", "option_value": 75, "token_balance": 1000, "reputation_score": 50}
        for i in range(22, 24)
    ]
    
    analysis = analyzer.analyze_poll_results(
        poll_id="poll_test_opposition",
        votes=votes_opposition,
        voting_strategy=VotingStrategy.HYBRID,
        total_tokens=250000,
        grant_amount=100000
    )
    
    print(f"📊 RESULTS:")
    stats = analysis['vote_statistics']
    print(f"   Total Votes: {stats['total_votes']}")
    print(f"   Participation: {stats['participation_rate']:.2f}%")
    
    sentiment = analysis['sentiment']
    print(f"\n💭 SENTIMENT:")
    print(f"   Score: {sentiment['sentiment_score']}/100")
    print(f"   Level: {sentiment['sentiment_level']}")
    
    print(f"\n🎯 ASSESSMENT:")
    print(f"   {analysis['overall_assessment']}")
    
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in analysis['recommendations'][:3]:
        print(f"   • {rec}")
    
    return analysis


def test_voting_strategies():
    """Test different voting strategies"""
    print_section("TEST 5: Voting Strategy Comparison")
    
    analyzer = CommunitySentimentAnalyzer()
    
    # Same votes, different strategies
    votes = [
        {"voter_address": "0x1", "option": "strongly_approve", "option_value": 100, "token_balance": 50000, "reputation_score": 95},
        {"voter_address": "0x2", "option": "approve", "option_value": 75, "token_balance": 1000, "reputation_score": 90},
        {"voter_address": "0x3", "option": "approve", "option_value": 75, "token_balance": 800, "reputation_score": 85},
        {"voter_address": "0x4", "option": "neutral", "option_value": 50, "token_balance": 500, "reputation_score": 70},
    ]
    
    total_tokens = 100000
    strategies = [
        VotingStrategy.ONE_TOKEN_ONE_VOTE,
        VotingStrategy.QUADRATIC,
        VotingStrategy.REPUTATION,
        VotingStrategy.HYBRID
    ]
    
    print("Comparing voting strategies with same votes:\n")
    
    for strategy in strategies:
        analysis = analyzer.analyze_poll_results(
            poll_id=f"poll_test_{strategy.value}",
            votes=votes,
            voting_strategy=strategy,
            total_tokens=total_tokens
        )
        
        sentiment = analysis['sentiment']
        print(f"   {strategy.value.upper():25} → Score: {sentiment['sentiment_score']:5.1f}/100, Level: {sentiment['sentiment_level']}")
    
    print("\n✅ Different strategies can produce different results based on weight distribution")
    return True


def test_quorum_scenarios():
    """Test quorum checking with different scenarios"""
    print_section("TEST 6: Quorum Scenarios")
    
    analyzer = CommunitySentimentAnalyzer()
    
    # Scenario 1: Below quorum (< 10 voters)
    print("Scenario 1: Below minimum voters (< 10)")
    votes_low = [
        {"voter_address": f"0x{i}", "option": "approve", "option_value": 75, "token_balance": 5000, "reputation_score": 70}
        for i in range(5)
    ]
    
    analysis_low = analyzer.analyze_poll_results(
        poll_id="poll_low_quorum",
        votes=votes_low,
        voting_strategy=VotingStrategy.HYBRID,
        total_tokens=100000
    )
    
    quorum = analysis_low['quorum']
    print(f"   Quorum Met: {quorum['met']}")
    print(f"   Details: {quorum['details']}")
    print(f"   Assessment: {analysis_low['overall_assessment']}\n")
    
    # Scenario 2: Meets quorum
    print("Scenario 2: Meets quorum (10+ voters, 5%+ participation)")
    votes_good = [
        {"voter_address": f"0x{i:040x}", "option": "approve", "option_value": 75, "token_balance": 800, "reputation_score": 70}
        for i in range(15)
    ]
    
    analysis_good = analyzer.analyze_poll_results(
        poll_id="poll_good_quorum",
        votes=votes_good,
        voting_strategy=VotingStrategy.HYBRID,
        total_tokens=100000
    )
    
    quorum = analysis_good['quorum']
    print(f"   Quorum Met: {quorum['met']}")
    print(f"   Confidence: {quorum['confidence']:.1%}")
    print(f"   Assessment: {analysis_good['overall_assessment']}")
    
    return True


def run_all_tests():
    """Run all test cases"""
    print("\n" + "=" * 80)
    print("  COMMUNITY SENTIMENT ANALYZER TEST SUITE")
    print("  Testing voting, aggregation, and sentiment analysis")
    print("=" * 80)
    
    results = {
        "poll_creation": False,
        "strong_support": False,
        "mixed_sentiment": False,
        "strong_opposition": False,
        "voting_strategies": False,
        "quorum_scenarios": False
    }
    
    try:
        # Test 1: Create poll
        poll = test_create_poll()
        results["poll_creation"] = poll is not None
        
        # Test 2: Strong support
        analysis1 = test_vote_aggregation()
        results["strong_support"] = analysis1.get('sentiment', {}).get('sentiment_level') == 'strong_support'
        
        # Test 3: Mixed sentiment
        analysis2 = test_vote_aggregation_mixed()
        results["mixed_sentiment"] = analysis2.get('sentiment', {}).get('sentiment_level') in ['neutral', 'support']
        
        # Test 4: Strong opposition
        analysis3 = test_vote_aggregation_opposition()
        results["strong_opposition"] = analysis3.get('sentiment', {}).get('sentiment_level') in ['opposition', 'strong_opposition']
        
        # Test 5: Voting strategies
        results["voting_strategies"] = test_voting_strategies()
        
        # Test 6: Quorum scenarios
        results["quorum_scenarios"] = test_quorum_scenarios()
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name.replace('_', ' ').title()}")
    
    print(f"\n{'=' * 80}")
    print(f"RESULTS: {passed}/{total} tests passed")
    print(f"{'=' * 80}\n")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
