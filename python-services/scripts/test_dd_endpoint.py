"""
Test script for Due Diligence Analysis API endpoint
"""

import requests
import json
from datetime import datetime


BASE_URL = "http://localhost:8000/api/v1"

# Sample due diligence request
SAMPLE_DD_REQUEST = {
    "grant_id": "test-grant-dd-001",
    "team_size": 3,
    "team_experience": "10+ years blockchain development, founded multiple successful Web3 projects",
    "github_profiles": [
        "vitalik",  # Ethereum founder - well-established
        "gakonst",  # Well-known Rust/Solidity developer
    ],
    "wallet_addresses": [
        "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",  # Vitalik's known address
    ],
    "previous_projects": [
        "https://ethereum.org",
        "https://github.com/ethereum/go-ethereum"
    ]
}

# Sample request with red flags
SUSPICIOUS_REQUEST = {
    "grant_id": "test-grant-suspicious-001",
    "team_size": 10,  # Claims large team
    "team_experience": "Expert senior architects with 20 years experience",
    "github_profiles": [
        "fake-user-nonexistent-123456"  # Fake profile
    ],
    "wallet_addresses": [
        "0x0000000000000000000000000000000000000000"  # Burn address
    ],
    "previous_projects": []
}


def test_dd_health_check():
    """Test the health check endpoint"""
    print("\n" + "="*80)
    print("TESTING DUE DILIGENCE HEALTH CHECK")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/analyze/due-diligence/health")
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Health Check Results:")
            print(f"  Status: {result.get('status')}")
            print(f"  GitHub API: {'Configured' if result.get('github_api_configured') else 'Not configured'}")
            print(f"  Etherscan API: {'Configured' if result.get('etherscan_api_configured') else 'Not configured'}")
            print(f"\n  Features:")
            features = result.get('features', {})
            for feature, enabled in features.items():
                status_icon = "✅" if enabled else "❌"
                print(f"    {status_icon} {feature}")
            
            print("\n✅ HEALTH CHECK PASSED")
        else:
            print(f"\n❌ Health check failed: {response.text}")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")


def test_legitimate_team():
    """Test with legitimate team profiles"""
    print("\n" + "="*80)
    print("TESTING LEGITIMATE TEAM ANALYSIS")
    print("="*80)
    
    try:
        print(f"\n📤 Sending due diligence request...")
        print(f"Grant: {SAMPLE_DD_REQUEST['grant_id']}")
        print(f"Team Size: {SAMPLE_DD_REQUEST['team_size']}")
        print(f"GitHub Profiles: {', '.join(SAMPLE_DD_REQUEST['github_profiles'])}")
        
        response = requests.post(
            f"{BASE_URL}/analyze/due-diligence",
            json=SAMPLE_DD_REQUEST,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                result = data['result']
                
                print(f"\n🎯 DUE DILIGENCE RESULTS")
                print(f"  Risk Score: {result['risk_score']}/100")
                print(f"  Risk Level: {result['risk_level'].upper()}")
                print(f"  Confidence: {result['confidence']:.0%}")
                
                print(f"\n📊 ANALYSIS COVERAGE:")
                print(f"  GitHub Profiles Analyzed: {result['github_profiles_analyzed']}")
                print(f"  Wallet Addresses Analyzed: {result['wallet_addresses_analyzed']}")
                
                print(f"\n✅ STRENGTHS ({len(result['strengths'])}):")
                for strength in result['strengths'][:10]:
                    print(f"  • {strength}")
                
                print(f"\n🚨 RED FLAGS ({len(result['red_flags'])}):")
                if result['red_flags']:
                    for flag in result['red_flags'][:10]:
                        severity = flag.get('severity', 'unknown').upper()
                        print(f"  [{severity}] {flag.get('flag', 'N/A')}")
                else:
                    print(f"  • None detected")
                
                print(f"\n💡 RECOMMENDATIONS ({len(result['recommendations'])}):")
                for rec in result['recommendations']:
                    print(f"  • {rec}")
                
                print("\n✅ LEGITIMATE TEAM TEST PASSED")
            else:
                print(f"\n❌ Analysis failed: {data.get('error')}")
        else:
            print(f"\n❌ Request failed: {response.text}")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()


def test_suspicious_team():
    """Test with suspicious team profiles"""
    print("\n" + "="*80)
    print("TESTING SUSPICIOUS TEAM ANALYSIS")
    print("="*80)
    
    try:
        print(f"\n📤 Sending due diligence request (suspicious)...")
        print(f"Grant: {SUSPICIOUS_REQUEST['grant_id']}")
        print(f"Team Size: {SUSPICIOUS_REQUEST['team_size']}")
        print(f"GitHub Profiles: {', '.join(SUSPICIOUS_REQUEST['github_profiles'])}")
        
        response = requests.post(
            f"{BASE_URL}/analyze/due-diligence",
            json=SUSPICIOUS_REQUEST,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                result = data['result']
                
                print(f"\n🎯 DUE DILIGENCE RESULTS")
                print(f"  Risk Score: {result['risk_score']}/100")
                print(f"  Risk Level: {result['risk_level'].upper()}")
                print(f"  Confidence: {result['confidence']:.0%}")
                
                print(f"\n🚨 RED FLAGS ({len(result['red_flags'])}):")
                for flag in result['red_flags']:
                    severity = flag.get('severity', 'unknown').upper()
                    print(f"  [{severity}] {flag.get('flag', 'N/A')}")
                
                print(f"\n💡 RECOMMENDATIONS ({len(result['recommendations'])}):")
                for rec in result['recommendations']:
                    print(f"  • {rec}")
                
                # Validate that red flags were detected
                if len(result['red_flags']) > 0 and result['risk_level'] in ['medium', 'high']:
                    print("\n✅ SUSPICIOUS TEAM CORRECTLY FLAGGED")
                else:
                    print("\n⚠️  Warning: Expected more red flags for suspicious profile")
            else:
                print(f"\n❌ Analysis failed: {data.get('error')}")
        else:
            print(f"\n❌ Request failed: {response.text}")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")


def test_single_github_profile():
    """Test single GitHub profile analysis endpoint"""
    print("\n" + "="*80)
    print("TESTING SINGLE GITHUB PROFILE ANALYSIS")
    print("="*80)
    
    try:
        username = "vitalik"
        print(f"\n📤 Analyzing GitHub profile: {username}")
        
        response = requests.post(
            f"{BASE_URL}/analyze/github-profile",
            params={"username": username},
            timeout=30
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            analysis = data.get('analysis', {})
            
            print(f"\n📊 GITHUB PROFILE ANALYSIS:")
            print(f"  Username: {analysis.get('username')}")
            print(f"  Account Age: {analysis.get('account_age_days')} days")
            print(f"  Public Repos: {analysis.get('public_repos')}")
            print(f"  Followers: {analysis.get('followers')}")
            print(f"  Total Stars: {analysis.get('total_stars')}")
            print(f"  Contribution Score: {analysis.get('contribution_score')}/100")
            print(f"  Active: {'Yes' if analysis.get('is_active') else 'No'}")
            print(f"  Languages: {', '.join(analysis.get('languages', []))}")
            
            print("\n✅ GITHUB PROFILE TEST PASSED")
        else:
            print(f"\n❌ Request failed: {response.text}")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("🔍 DUE DILIGENCE API ENDPOINT TESTS")
    print(f"   Base URL: {BASE_URL}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Run all tests
    test_dd_health_check()
    test_legitimate_team()
    test_suspicious_team()
    test_single_github_profile()
    
    print("\n" + "="*80)
    print("✅ ALL DUE DILIGENCE TESTS COMPLETE")
    print("="*80 + "\n")
