"""
Test script for both Technical and Impact Analysis endpoints
"""

import requests
import json
from datetime import datetime


BASE_URL = "http://localhost:8000/api/v1"

# Sample grant proposal data
SAMPLE_PROPOSAL = {
    "grant_id": "test-grant-001",
    "title": "Decentralized Grant Management Platform",
    "description": "A comprehensive platform for managing grant proposals, evaluations, and disbursements using blockchain technology and AI agents for automated assessment",
    "funding_amount": 50000,
    "timeline": "6 months",
    "tech_stack": "Solidity, Hardhat, FastAPI, PostgreSQL, React, TypeScript, Groq AI",
    "team_experience": "3 years blockchain development, 5 years full-stack",
    "architecture": "Microservices with smart contracts for treasury management, Python backend for AI evaluation, React frontend"
}

SAMPLE_IMPACT_PROPOSAL = {
    "grant_id": "test-grant-002",
    "title": "Decentralized Identity Infrastructure for Web3",
    "description": "Building a decentralized, privacy-preserving identity solution that enables seamless authentication across Web3 applications without compromising user sovereignty or data ownership",
    "objectives": "Build privacy-preserving identity layer for Web3, Enable cross-chain identity verification, Reduce user onboarding friction by 80%, Create composable identity standard",
    "target_users": "Web3 developers, dApp users, projects requiring identity solutions, blockchain protocols needing authentication",
    "expected_outcomes": "Identity protocol SDK with zero-knowledge proofs, Reference implementation for major chains, Integration by 50+ dApps, 10,000+ active users in 6 months, 95%+ user satisfaction",
    "sustainability_plan": "Open-source development with community governance, Protocol fees (0.1% per verification) for ongoing funding, Comprehensive documentation and developer support, Community contributor program with bounties, Treasury allocation for maintenance team",
    "ecosystem_fit": "Fills critical identity gap in Web3 ecosystem, Enables seamless single sign-on across dApps, Composable with existing DeFi and NFT protocols, Reduces barriers to Web3 adoption, Strengthens overall decentralization through privacy-preserving authentication"
}


def test_technical_endpoint():
    """Test the technical analysis endpoint"""
    print("\n" + "="*80)
    print("TESTING TECHNICAL ANALYSIS ENDPOINT")
    print("="*80)
    
    try:
        # Test health check first
        health_response = requests.get(f"{BASE_URL}/analyze/technical/health")
        print(f"\n✅ Health Check: {health_response.json()}")
        
        # Test analysis
        print(f"\n📤 Sending technical analysis request...")
        print(f"Grant: {SAMPLE_PROPOSAL['title']}")
        print(f"Funding: ${SAMPLE_PROPOSAL['funding_amount']:,}")
        
        response = requests.post(
            f"{BASE_URL}/analyze/technical",
            json=SAMPLE_PROPOSAL,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                evaluation = result['evaluation']
                
                print(f"\n📊 TECHNICAL EVALUATION RESULTS")
                print(f"  Overall Score: {evaluation['score']:.2f}/2.0")
                print(f"  Confidence: {evaluation['confidence']:.0%}")
                
                print(f"\n  Component Scores:")
                print(f"    • Architecture: {evaluation['architecture_score']:.2f}")
                print(f"    • Timeline: {evaluation['timeline_score']:.2f}")
                print(f"    • Tech Stack: {evaluation['tech_stack_score']:.2f}")
                print(f"    • Implementation: {evaluation['implementation_score']:.2f}")
                
                print(f"\n  ✅ Strengths ({len(evaluation['strengths'])}):")
                for strength in evaluation['strengths'][:5]:
                    print(f"    • {strength}")
                
                print(f"\n  ⚠️  Weaknesses ({len(evaluation['weaknesses'])}):")
                for weakness in evaluation['weaknesses'][:5]:
                    print(f"    • {weakness}")
                
                print(f"\n  🚨 Risks ({len(evaluation['risks'])}):")
                for risk in evaluation['risks'][:3]:
                    print(f"    • {risk}")
                
                print(f"\n  💡 Recommendations ({len(evaluation['recommendations'])}):")
                for rec in evaluation['recommendations'][:3]:
                    print(f"    • {rec}")
                
                print("\n✅ TECHNICAL ENDPOINT TEST PASSED")
            else:
                print(f"\n❌ Analysis failed: {result.get('error')}")
        else:
            print(f"\n❌ Request failed: {response.text}")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()


def test_impact_endpoint():
    """Test the impact analysis endpoint"""
    print("\n" + "="*80)
    print("TESTING IMPACT ANALYSIS ENDPOINT")
    print("="*80)
    
    try:
        # Test health check first
        health_response = requests.get(f"{BASE_URL}/analyze/impact/health")
        print(f"\n✅ Health Check: {health_response.json()}")
        
        # Test analysis
        print(f"\n📤 Sending impact analysis request...")
        print(f"Grant: {SAMPLE_IMPACT_PROPOSAL['title']}")
        
        response = requests.post(
            f"{BASE_URL}/analyze/impact",
            json=SAMPLE_IMPACT_PROPOSAL,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                evaluation = result['evaluation']
                metadata = evaluation.get('metadata', {})
                
                print(f"\n📊 IMPACT EVALUATION RESULTS")
                print(f"  Overall Score: {evaluation['score']:.2f}/2.0")
                print(f"  Confidence: {evaluation['confidence']:.0%}")
                
                print(f"\n  Component Scores:")
                print(f"    • Mission Alignment: {evaluation['alignment_score']:.2f}")
                print(f"    • User Benefits: {evaluation['user_benefit_score']:.2f}")
                print(f"    • Ecosystem Gap: {evaluation['ecosystem_gap_score']:.2f}")
                print(f"    • Sustainability: {evaluation['sustainability_score']:.2f}")
                print(f"    • Network Effects: {evaluation['network_effects_score']:.2f}")
                
                print(f"\n  ✅ Strengths ({len(evaluation['strengths'])}):")
                for strength in evaluation['strengths'][:5]:
                    print(f"    • {strength}")
                
                print(f"\n  ⚠️  Weaknesses ({len(evaluation['weaknesses'])}):")
                for weakness in evaluation['weaknesses'][:5]:
                    print(f"    • {weakness}")
                
                print(f"\n  🚨 Risks ({len(evaluation['risks'])}):")
                for risk in evaluation['risks'][:3]:
                    print(f"    • {risk}")
                
                print(f"\n  🎯 Impact Details:")
                impact_details = evaluation.get('impact_details', {})
                if impact_details:
                    print(f"    • Target: {impact_details.get('target_beneficiaries', 'N/A')}")
                    print(f"    • Contribution: {impact_details.get('ecosystem_contribution', 'N/A')}")
                    print(f"    • Growth: {impact_details.get('growth_potential', 'N/A')}")
                else:
                    print(f"    • No impact details available")
                
                print("\n✅ IMPACT ENDPOINT TEST PASSED")
            else:
                print(f"\n❌ Analysis failed: {result.get('error')}")
        else:
            print(f"\n❌ Request failed: {response.text}")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("\n" + "="*80)
    print("🚀 AGENTDAO API ENDPOINT TESTS")
    print(f"   Base URL: {BASE_URL}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Test both endpoints
    test_technical_endpoint()
    test_impact_endpoint()
    
    print("\n" + "="*80)
    print("✅ ALL TESTS COMPLETE")
    print("="*80 + "\n")
