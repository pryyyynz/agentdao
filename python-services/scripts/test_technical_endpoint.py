"""
Test script for technical analysis endpoint
"""

import requests
import json

# API endpoint
BASE_URL = "http://localhost:8000"
ENDPOINT = f"{BASE_URL}/api/v1/analyze/technical"

# Sample grant proposal
sample_request = {
    "grant_id": "grant-test-001",
    "title": "Decentralized Grant Management Platform",
    "description": "A blockchain-based platform for managing grants with multi-agent AI evaluation system using the NullShot framework. The platform enables transparent, efficient, and fair grant allocation through decentralized decision-making.",
    "funding_amount": 50000.0,
    "timeline": "6 months with 3 major milestones: MVP (2 months), Beta (4 months), Production (6 months). Each milestone includes testing, documentation, and user feedback integration.",
    "tech_stack": "Ethereum, Solidity, Hardhat, React, NextJS, TypeScript, FastAPI, Python, PostgreSQL, Supabase, IPFS/Pinata, Groq AI (Llama 3.3 70B), ThirdWeb SDK",
    "team_experience": "Team of 3 developers with 10+ years combined experience. Lead has 5 years in blockchain development (Ethereum, Solidity), 2 members have 3+ years in full-stack development with React and Python. Previous projects include DeFi protocols and NFT marketplaces.",
    "architecture": "Microservices architecture with: 1) FastAPI backend for business logic and AI orchestration, 2) React/NextJS frontend with Web3 integration, 3) Ethereum smart contracts for voting and fund management, 4) PostgreSQL database for application data, 5) IPFS for decentralized document storage, 6) Multi-agent AI system using Groq API for grant evaluation. All services communicate via REST APIs with JWT authentication."
}

print("="*80)
print("TESTING TECHNICAL ANALYSIS ENDPOINT")
print("="*80)
print(f"\nEndpoint: {ENDPOINT}")
print(f"Grant ID: {sample_request['grant_id']}")
print(f"Title: {sample_request['title']}")
print(f"Funding Amount: ${sample_request['funding_amount']:,.2f}")
print("\n" + "-"*80)
print("Sending request...")
print("-"*80)

try:
    # Send POST request
    response = requests.post(
        ENDPOINT,
        json=sample_request,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get('success'):
            print("\n✅ ANALYSIS SUCCESSFUL\n")
            
            eval_result = data.get('evaluation', {})
            
            print(f"📊 OVERALL SCORE: {eval_result.get('score', 'N/A'):.2f} (Confidence: {eval_result.get('confidence', 0)*100:.0f}%)")
            
            print(f"\n📈 COMPONENT SCORES:")
            print(f"  • Architecture: {eval_result.get('architecture_score', 'N/A'):.2f}")
            print(f"  • Timeline: {eval_result.get('timeline_score', 'N/A'):.2f}")
            print(f"  • Tech Stack: {eval_result.get('tech_stack_score', 'N/A'):.2f}")
            print(f"  • Implementation: {eval_result.get('implementation_score', 'N/A'):.2f}")
            
            strengths = eval_result.get('strengths', [])
            if strengths:
                print(f"\n✅ STRENGTHS ({len(strengths)}):")
                for i, strength in enumerate(strengths[:5], 1):
                    print(f"  {i}. {strength}")
            
            weaknesses = eval_result.get('weaknesses', [])
            if weaknesses:
                print(f"\n⚠️  WEAKNESSES ({len(weaknesses)}):")
                for i, weakness in enumerate(weaknesses[:5], 1):
                    print(f"  {i}. {weakness}")
            
            risks = eval_result.get('risks', [])
            if risks:
                print(f"\n🚨 RISKS ({len(risks)}):")
                for i, risk in enumerate(risks[:5], 1):
                    print(f"  {i}. {risk}")
            
            recommendations = eval_result.get('recommendations', [])
            if recommendations:
                print(f"\n💡 RECOMMENDATIONS ({len(recommendations)}):")
                for i, rec in enumerate(recommendations[:5], 1):
                    print(f"  {i}. {rec}")
            
            print(f"\n📝 REASONING:\n{eval_result.get('reasoning', 'N/A')[:500]}...")
            
            metadata = eval_result.get('metadata', {})
            print(f"\n⏱️  Execution Time: {metadata.get('execution_time_seconds', 'N/A')}s")
            print(f"🤖 Model Used: {metadata.get('model_used', 'N/A')}")
            
        else:
            print(f"\n❌ ANALYSIS FAILED")
            print(f"Error: {data.get('error', 'Unknown error')}")
    
    else:
        print(f"\n❌ REQUEST FAILED")
        print(f"Response: {response.text}")
    
    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)
    
except requests.exceptions.ConnectionError:
    print("\n❌ ERROR: Could not connect to server")
    print("Make sure the FastAPI server is running on http://localhost:8000")
    
except requests.exceptions.Timeout:
    print("\n❌ ERROR: Request timed out")
    print("The analysis is taking longer than expected")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
