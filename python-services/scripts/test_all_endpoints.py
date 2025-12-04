"""
Test all API endpoints
Tests both technical and impact analysis endpoints with sample proposals
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def test_technical_health():
    """Test technical analyzer health check"""
    print_section("Testing Technical Analyzer Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/analyze/technical/health")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Technical Analyzer Status: {data.get('status', 'unknown')}")
            print(f"Model: {data.get('model', 'unknown')}")
            print(f"API Available: {data.get('groq_api_available', False)}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

def test_impact_health():
    """Test impact analyzer health check"""
    print_section("Testing Impact Analyzer Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/analyze/impact/health")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Impact Analyzer Status: {data.get('status', 'unknown')}")
            print(f"Model: {data.get('model', 'unknown')}")
            print(f"API Available: {data.get('groq_api_available', False)}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

def test_technical_analysis():
    """Test technical analysis endpoint"""
    print_section("Testing Technical Analysis Endpoint")
    
    # Sample proposal
    proposal = {
        "grant_id": "test_grant_001",
        "title": "Decentralized Grant Management Platform",
        "description": "A blockchain-based platform for managing grants with smart contracts, agent-based evaluation, and transparent voting mechanisms.",
        "funding_amount": 75000,
        "timeline": "6 months with defined milestones: Month 1-2 (Smart Contract Development), Month 3-4 (Agent Framework), Month 5-6 (Integration & Testing)",
        "tech_stack": "Solidity for smart contracts, Python with FastAPI for backend services, React with TypeScript for frontend, PostgreSQL database, IPFS for decentralized storage",
        "team_experience": "Team has 5+ years in blockchain development, previously built 3 DeFi protocols",
        "architecture": "Microservices architecture with: Smart contract layer (on-chain), Python services layer (off-chain AI agents), Frontend layer (React SPA), IPFS storage layer"
    }
    
    print("\n📝 Proposal:")
    print(f"  Title: {proposal['title']}")
    print(f"  Funding: ${proposal['funding_amount']:,}")
    print(f"  Timeline: {proposal['timeline']}")
    print(f"  Tech Stack: {proposal['tech_stack']}")
    
    try:
        print("\n⏳ Sending request...")
        start_time = datetime.now()
        
        response = requests.post(
            f"{BASE_URL}/analyze/technical",
            json=proposal,
            headers={"Content-Type": "application/json"}
        )
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n⏱️  Response time: {duration:.2f}s")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                result = data["evaluation"]
                
                print("\n✅ Technical Analysis Results:")
                print(f"  Overall Score: {result['score']:.2f} / 2.00")
                print(f"  Confidence: {result['confidence'] * 100:.0f}%")
                
                print(f"\n📊 Component Scores:")
                print(f"  Architecture: {result['architecture_score']:.2f}")
                print(f"  Timeline: {result['timeline_score']:.2f}")
                print(f"  Tech Stack: {result['tech_stack_score']:.2f}")
                print(f"  Implementation: {result['implementation_score']:.2f}")
                
                print(f"\n💪 Strengths ({len(result['strengths'])}):")
                for i, strength in enumerate(result['strengths'][:3], 1):
                    print(f"  {i}. {strength}")
                
                print(f"\n⚠️  Weaknesses ({len(result['weaknesses'])}):")
                for i, weakness in enumerate(result['weaknesses'][:3], 1):
                    print(f"  {i}. {weakness}")
                
                print(f"\n🚨 Risks ({len(result['risks'])}):")
                for i, risk in enumerate(result['risks'][:3], 1):
                    print(f"  {i}. {risk}")
                
                print(f"\n💡 Recommendations ({len(result['recommendations'])}):")
                for i, rec in enumerate(result['recommendations'][:3], 1):
                    print(f"  {i}. {rec}")
                
            else:
                print(f"❌ Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

def test_impact_analysis():
    """Test impact analysis endpoint"""
    print_section("Testing Impact Analysis Endpoint")
    
    # Sample proposal
    proposal = {
        "grant_id": "test_grant_002",
        "title": "Decentralized Identity Protocol",
        "description": "A privacy-preserving identity protocol enabling users to control their digital identity across Web3 applications.",
        "objectives": "Create a decentralized identity standard, Enable cross-platform identity verification, Provide privacy-preserving authentication, Build developer SDK and documentation",
        "target_users": "Web3 developers building dApps, End users needing digital identity, DeFi protocols requiring KYC, DAO members seeking reputation systems",
        "expected_outcomes": "Adoption by 50+ dApps in first year, 10,000+ active users, Reduced identity verification costs by 70%, Enhanced user privacy and data sovereignty",
        "sustainability_plan": "Protocol fees (0.1% per verification), Grant support for development, Community-governed treasury, Open-source with enterprise support options",
        "ecosystem_fit": "Fills gap in decentralized identity solutions, Complements existing DeFi and DAO infrastructure, Enables new use cases for Web3 applications, Strengthens ecosystem privacy and security"
    }
    
    print("\n📝 Proposal:")
    print(f"  Title: {proposal['title']}")
    print(f"  Objectives: {proposal['objectives'][:100]}...")
    print(f"  Target Users: {proposal['target_users'][:100]}...")
    
    try:
        print("\n⏳ Sending request...")
        start_time = datetime.now()
        
        response = requests.post(
            f"{BASE_URL}/analyze/impact",
            json=proposal,
            headers={"Content-Type": "application/json"}
        )
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n⏱️  Response time: {duration:.2f}s")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                result = data["evaluation"]
                
                print("\n✅ Impact Analysis Results:")
                print(f"  Overall Score: {result['score']:.2f} / 2.00")
                print(f"  Confidence: {result['confidence'] * 100:.0f}%")
                
                print(f"\n📊 Component Scores:")
                print(f"  Mission Alignment: {result['alignment_score']:.2f}")
                print(f"  User Benefits: {result['user_benefit_score']:.2f}")
                print(f"  Ecosystem Gap: {result['ecosystem_gap_score']:.2f}")
                print(f"  Sustainability: {result['sustainability_score']:.2f}")
                print(f"  Network Effects: {result['network_effects_score']:.2f}")
                
                print(f"\n💪 Strengths ({len(result['strengths'])}):")
                for i, strength in enumerate(result['strengths'][:3], 1):
                    print(f"  {i}. {strength}")
                
                print(f"\n⚠️  Weaknesses ({len(result['weaknesses'])}):")
                for i, weakness in enumerate(result['weaknesses'][:3], 1):
                    print(f"  {i}. {weakness}")
                
                print(f"\n🚨 Risks ({len(result['risks'])}):")
                for i, risk in enumerate(result['risks'][:3], 1):
                    print(f"  {i}. {risk}")
                
                print(f"\n💡 Recommendations ({len(result['recommendations'])}):")
                for i, rec in enumerate(result['recommendations'][:3], 1):
                    print(f"  {i}. {rec}")
                
                # Impact-specific details
                if result.get('impact_details'):
                    details = result['impact_details']
                    print(f"\n🎯 Impact Details:")
                    if 'target_beneficiaries' in details:
                        print(f"  Target Beneficiaries: {details['target_beneficiaries']}")
                    if 'ecosystem_contribution' in details:
                        print(f"  Ecosystem Contribution: {details['ecosystem_contribution']}")
                    if 'growth_potential' in details:
                        print(f"  Growth Potential: {details['growth_potential']}")
                
            else:
                print(f"❌ Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

def test_root_health():
    """Test root health check"""
    print_section("Testing Root Health Check")
    
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Service Status: {data.get('status', 'unknown')}")
            print(f"Version: {data.get('version', 'unknown')}")
            print(f"Timestamp: {data.get('timestamp', 'unknown')}")
            
            if 'services' in data:
                print(f"\n📊 Dependent Services:")
                for service, status in data['services'].items():
                    emoji = "✅" if status == "connected" else "❌"
                    print(f"  {emoji} {service}: {status}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

def main():
    """Run all endpoint tests"""
    print("\n" + "=" * 80)
    print("  🧪 AgentDAO API Endpoint Test Suite")
    print("  Testing Technical & Impact Analysis Services")
    print("=" * 80)
    
    # Test health checks first
    test_root_health()
    test_technical_health()
    test_impact_health()
    
    # Test analysis endpoints
    test_technical_analysis()
    test_impact_analysis()
    
    print_section("Test Suite Complete")
    print("\n✅ All tests executed. Check results above.\n")

if __name__ == "__main__":
    main()
