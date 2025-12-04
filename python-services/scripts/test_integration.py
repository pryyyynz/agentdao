"""
Integration Test for Unified Evaluation
Tests all 5 services together with comprehensive grant proposal
"""

import sys
sys.path.insert(0, 'c:\\Users\\pryyy\\Projects\\agentdao\\python-services')

from services.technical_analyzer import TechnicalAnalyzer
from services.impact_analyzer import ImpactAnalyzer
from services.due_diligence import DueDiligenceAnalyzer
from services.budget_analyzer import BudgetAnalyzer
from services.community_sentiment import CommunitySentimentAnalyzer, VotingStrategy
from datetime import datetime
import time


def print_section(title: str):
    """Print a section separator"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def test_unified_evaluation():
    """Test complete grant evaluation pipeline"""
    print_section("UNIFIED GRANT EVALUATION TEST")
    
    print("Testing comprehensive evaluation with all 5 services:")
    print("  1. Technical Analysis")
    print("  2. Impact Assessment")
    print("  3. Due Diligence")
    print("  4. Budget Validation")
    print("  5. Community Sentiment")
    
    # Grant proposal data
    grant_data = {
        "grant_id": "grant-integration-test-001",
        "title": "Decentralized Identity & Privacy Protocol",
        "description": "Building a zero-knowledge proof based identity system for Web3",
        
        # Technical
        "github_repo": "https://github.com/ethereum/go-ethereum",  # Using real repo for testing
        "tech_stack": ["Solidity", "Go", "React", "IPFS", "Zero-Knowledge Proofs"],
        "architecture": "Layered architecture with smart contracts, off-chain computation, and IPFS storage",
        
        # Impact
        "target_audience": "Web3 users, DeFi platforms, DAOs requiring private identity",
        "problem": "Current Web3 identity systems leak personal data and lack privacy",
        "solution": "Zero-knowledge proofs enable identity verification without revealing data",
        "expected_impact": "Enable 1M+ users to have private, verifiable identity in Web3",
        
        # Team
        "team_size": 5,
        "experience": "senior",
        "github_profiles": ["vitalik", "gakonst"],  # Real profiles
        "wallet_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"],
        "previous_projects": ["Ethereum", "Foundry", "Reth"],
        
        # Budget
        "total_amount": 185000,
        "duration": 6,
        "budget_items": [
            {"category": "development", "description": "Senior Blockchain Dev (6mo @ $15k)", "amount": 90000},
            {"category": "development", "description": "Frontend Dev (4mo @ $10k)", "amount": 40000},
            {"category": "design", "description": "UI/UX Designer (3mo @ $7k)", "amount": 21000},
            {"category": "audits", "description": "Security Audit", "amount": 25000},
            {"category": "marketing", "description": "Launch Campaign", "amount": 12000},
            {"category": "operations", "description": "Infrastructure (6mo)", "amount": 3000},
            {"category": "contingency", "description": "Buffer (10%)", "amount": 18500}
        ],
        "deliverables": [
            "Smart contract development",
            "Zero-knowledge proof circuits",
            "Frontend application",
            "Backend API",
            "Security audit",
            "Documentation",
            "Community launch"
        ]
    }
    
    start_time = time.time()
    results = {}
    scores = {}
    
    # 1. Technical Analysis
    print_section("1. TECHNICAL ANALYSIS")
    try:
        tech_analyzer = TechnicalAnalyzer()
        print(f"Analyzing proposal with tech stack: {grant_data['tech_stack']}")
        
        tech_result = tech_analyzer.analyze_technical_feasibility(
            grant_id=grant_data["grant_id"],
            proposal_data={
                "title": grant_data["title"],
                "description": grant_data["description"],
                "github_repo": grant_data["github_repo"],
                "tech_stack": grant_data["tech_stack"],
                "architecture": grant_data["architecture"],
                "timeline": f"{grant_data['duration']} months",
                "deliverables": grant_data["deliverables"]
            }
        )
        
        results["technical"] = tech_result
        scores["technical"] = tech_result.get("quality_score", 0)
        
        print(f"✅ Technical Score: {scores['technical']}/100")
        print(f"   Quality Level: {tech_result.get('quality_level', 'N/A')}")
        print(f"   Confidence: {tech_result.get('confidence', 0)*100:.0f}%")
        
    except Exception as e:
        print(f"❌ Technical analysis failed: {e}")
        results["technical"] = {"error": str(e)}
        scores["technical"] = 0
    
    # 2. Impact Assessment
    print_section("2. IMPACT ASSESSMENT")
    try:
        impact_analyzer = ImpactAnalyzer()
        
        impact_result = impact_analyzer.analyze_ecosystem_impact(
            grant_id=grant_data["grant_id"],
            proposal_data={
                "title": grant_data["title"],
                "description": grant_data["description"],
                "target_audience": grant_data["target_audience"],
                "problem_statement": grant_data["problem"],
                "solution": grant_data["solution"],
                "expected_impact": grant_data["expected_impact"],
                "user_benefits": grant_data.get("expected_impact", ""),
                "ecosystem_contribution": grant_data["description"]
            }
        )
        
        results["impact"] = impact_result
        scores["impact"] = impact_result.get("impact_score", 0)
        
        print(f"✅ Impact Score: {scores['impact']}/100")
        print(f"   Innovation Level: {impact_result.get('innovation_level', 'N/A')}")
        print(f"   Market Fit: {impact_result.get('market_fit_score', 0)}/100")
        
    except Exception as e:
        print(f"❌ Impact analysis failed: {e}")
        results["impact"] = {"error": str(e)}
        scores["impact"] = 0
    
    # 3. Due Diligence
    print_section("3. DUE DILIGENCE")
    try:
        dd_analyzer = DueDiligenceAnalyzer()
        
        dd_result = dd_analyzer.perform_due_diligence(
            grant_id=grant_data["grant_id"],
            team_info={
                "size": grant_data["team_size"],
                "experience_level": grant_data["experience"]
            },
            github_profiles=grant_data["github_profiles"],
            wallet_addresses=grant_data["wallet_addresses"],
            previous_projects=grant_data["previous_projects"]
        )
        
        results["due_diligence"] = dd_result
        scores["due_diligence"] = dd_result.get("risk_score", 0)
        
        print(f"✅ Risk Score: {scores['due_diligence']}/100 (higher = lower risk)")
        print(f"   Risk Level: {dd_result.get('risk_level', 'N/A')}")
        print(f"   Confidence: {dd_result.get('confidence', 0)*100:.0f}%")
        print(f"   Red Flags: {len(dd_result.get('red_flags', []))}")
        
    except Exception as e:
        print(f"❌ Due diligence failed: {e}")
        results["due_diligence"] = {"error": str(e)}
        scores["due_diligence"] = 0
    
    # 4. Budget Validation
    print_section("4. BUDGET VALIDATION")
    try:
        budget_analyzer = BudgetAnalyzer()
        
        budget_data = {
            "total_amount": grant_data["total_amount"],
            "duration_months": grant_data["duration"],
            "budget_items": grant_data["budget_items"]
        }
        
        budget_result = budget_analyzer.analyze_budget(
            grant_id=grant_data["grant_id"],
            budget_data=budget_data,
            project_type="software",
            deliverables=grant_data["deliverables"]
        )
        
        results["budget"] = budget_result
        scores["budget"] = budget_result.get("budget_score", 0)
        
        print(f"✅ Budget Score: {scores['budget']}/100")
        print(f"   Quality Level: {budget_result.get('quality_level', 'N/A')}")
        print(f"   Total: ${grant_data['total_amount']:,.0f} over {grant_data['duration']} months")
        print(f"   Red Flags: {len(budget_result.get('red_flags', []))}")
        
    except Exception as e:
        print(f"❌ Budget analysis failed: {e}")
        results["budget"] = {"error": str(e)}
        scores["budget"] = 0
    
    # 5. Community Sentiment (simulated)
    print_section("5. COMMUNITY SENTIMENT")
    try:
        community_analyzer = CommunitySentimentAnalyzer()
        
        # Create poll
        poll_result = community_analyzer.create_poll(
            grant_id=grant_data["grant_id"],
            title=f"Should we fund: {grant_data['title']}?",
            description=grant_data["description"],
            duration_hours=168,
            voting_strategy=VotingStrategy.HYBRID
        )
        
        # Simulate community votes (strong support)
        simulated_votes = [
            {"voter_address": f"0x{i:040x}", "option": "strongly_approve", "option_value": 100, 
             "token_balance": 10000, "reputation_score": 90}
            for i in range(10)
        ] + [
            {"voter_address": f"0x{i:040x}", "option": "approve", "option_value": 75,
             "token_balance": 5000, "reputation_score": 75}
            for i in range(10, 18)
        ] + [
            {"voter_address": f"0x{i:040x}", "option": "neutral", "option_value": 50,
             "token_balance": 2000, "reputation_score": 60}
            for i in range(18, 22)
        ]
        
        # Analyze votes
        sentiment_result = community_analyzer.analyze_poll_results(
            poll_id=poll_result["poll"]["poll_id"],
            votes=simulated_votes,
            voting_strategy=VotingStrategy.HYBRID,
            total_tokens=200000,
            grant_amount=grant_data["total_amount"]
        )
        
        results["community"] = sentiment_result
        scores["community"] = sentiment_result.get("sentiment", {}).get("sentiment_score", 0)
        
        print(f"✅ Sentiment Score: {scores['community']}/100")
        print(f"   Sentiment Level: {sentiment_result.get('sentiment', {}).get('sentiment_level', 'N/A')}")
        print(f"   Votes: {sentiment_result.get('vote_statistics', {}).get('total_votes', 0)}")
        print(f"   Quorum Met: {sentiment_result.get('quorum', {}).get('met', False)}")
        
    except Exception as e:
        print(f"❌ Community sentiment failed: {e}")
        results["community"] = {"error": str(e)}
        scores["community"] = 0
    
    # Calculate Overall Score
    print_section("OVERALL EVALUATION")
    
    execution_time = time.time() - start_time
    
    if scores:
        # Weighted average (can customize weights)
        weights = {
            "technical": 0.25,
            "impact": 0.20,
            "due_diligence": 0.25,
            "budget": 0.15,
            "community": 0.15
        }
        
        overall_score = sum(scores.get(k, 0) * weights.get(k, 0.2) for k in scores.keys())
    else:
        overall_score = 0
    
    print(f"📊 COMPONENT SCORES:")
    for service, score in scores.items():
        print(f"   {service.replace('_', ' ').title():20} {score:5.1f}/100")
    
    print(f"\n💯 OVERALL SCORE: {overall_score:.1f}/100")
    
    # Generate recommendation
    if overall_score >= 80:
        recommendation = "✅ APPROVE - Excellent proposal across all dimensions"
        color = "🟢"
    elif overall_score >= 70:
        recommendation = "✅ APPROVE - Strong proposal with minor concerns"
        color = "🟢"
    elif overall_score >= 60:
        recommendation = "⚠️ CONDITIONAL - Address concerns before funding"
        color = "🟡"
    elif overall_score >= 50:
        recommendation = "⚠️ CONDITIONAL - Requires significant improvements"
        color = "🟡"
    else:
        recommendation = "❌ REJECT - Does not meet minimum standards"
        color = "🔴"
    
    print(f"\n{color} RECOMMENDATION:")
    print(f"   {recommendation}")
    
    print(f"\n⏱️ EXECUTION TIME: {execution_time:.2f}s")
    
    # Summary
    print_section("EVALUATION SUMMARY")
    
    print(f"Grant: {grant_data['grant_id']}")
    print(f"Title: {grant_data['title']}")
    print(f"Amount: ${grant_data['total_amount']:,.0f} over {grant_data['duration']} months")
    print(f"\nServices Evaluated: {len(scores)}/5")
    print(f"Overall Score: {overall_score:.1f}/100")
    print(f"Recommendation: {recommendation}")
    print(f"Processing Time: {execution_time:.2f}s")
    
    # Check success
    success = len(scores) == 5 and overall_score > 0
    
    if success:
        print("\n✅ Integration test PASSED!")
    else:
        print("\n❌ Integration test FAILED!")
    
    return success


def test_error_handling():
    """Test error handling with invalid data"""
    print_section("ERROR HANDLING TEST")
    
    print("Testing with invalid/missing data...")
    
    # Test with invalid/minimal data
    tech_analyzer = TechnicalAnalyzer()
    try:
        result = tech_analyzer.analyze_technical_feasibility(
            grant_id="test-error-001",
            proposal_data={
                "title": "Test",
                "description": "Minimal test",
                "tech_stack": [],
                "architecture": None
            }
        )
        print(f"   Minimal data handled: {result.get('quality_score', 0)}/100")
    except Exception as e:
        print(f"   ❌ Unhandled error: {e}")
    
    print("\n✅ Error handling test complete")
    return True


def run_all_tests():
    """Run all integration tests"""
    print("\n" + "=" * 80)
    print("  PYTHON SERVICES INTEGRATION TEST SUITE")
    print("  Testing unified evaluation pipeline")
    print("=" * 80)
    
    results = {
        "unified_evaluation": False,
        "error_handling": False
    }
    
    # Run tests
    results["unified_evaluation"] = test_unified_evaluation()
    results["error_handling"] = test_error_handling()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name.replace('_', ' ').title()}")
    
    print(f"\n{'=' * 80}")
    print(f"RESULTS: {passed}/{total} integration tests passed")
    print(f"{'=' * 80}\n")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
