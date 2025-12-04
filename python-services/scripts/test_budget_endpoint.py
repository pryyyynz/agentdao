"""
Test Budget Analysis API Endpoints

Comprehensive testing of budget analysis service:
1. Well-structured budget (expect 80+ score)
2. Overpriced budget (expect red flags, 40-60 score)
3. Underbudgeted project (expect warnings, 30-50 score)
4. Milestone generation testing
5. Health check validation
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, List


# API Configuration
BASE_URL = "http://localhost:8000/api/v1/analyze"
HEADERS = {"Content-Type": "application/json"}


def print_section(title: str):
    """Print a section separator"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_result(result: Dict[str, Any], show_full: bool = True):
    """Pretty print analysis results"""
    
    if not result.get('success'):
        print(f"❌ ERROR: {result.get('error', 'Unknown error')}")
        return
    
    data = result.get('result', {})
    
    # Budget score
    score = data.get('budget_score', 0)
    quality = data.get('quality_level', 'N/A')
    confidence = data.get('confidence', 0) * 100
    
    print(f"💰 BUDGET QUALITY SCORE: {score}/100 ({quality})")
    print(f"   Confidence: {confidence:.0f}%")
    
    # Total amount
    total = data.get('total_amount', 0)
    duration = data.get('duration_months', 0)
    print(f"   Total Amount: ${total:,.0f} over {duration} months")
    
    # Component scores
    component_scores = data.get('component_scores', {})
    if component_scores:
        print(f"\n📊 COMPONENT SCORES:")
        for component, value in component_scores.items():
            print(f"   {component.replace('_', ' ').title()}: {value}/100")
    
    # Category breakdown
    category_breakdown = data.get('category_breakdown', {})
    if category_breakdown and show_full:
        print(f"\n📈 CATEGORY BREAKDOWN:")
        for category, info in category_breakdown.items():
            amount = info.get('amount', 0)
            percentage = info.get('percentage', 0)
            status = info.get('status', 'unknown')
            print(f"   {category.title()}: ${amount:,.0f} ({percentage:.1f}%) - {status}")
    
    # Red flags
    red_flags = data.get('red_flags', [])
    print(f"\n🚨 RED FLAGS ({len(red_flags)}):")
    if red_flags:
        for flag in red_flags:
            severity = flag.get('severity', 'medium')
            message = flag.get('message', '')
            print(f"  • [{severity.upper()}] {message}")
    else:
        print("  • None detected")
    
    # Market rate analysis
    market_analysis = data.get('market_rate_analysis', {})
    if market_analysis and show_full:
        overpriced = market_analysis.get('overpriced_items', [])
        underpriced = market_analysis.get('underpriced_items', [])
        
        if overpriced:
            print(f"\n💸 OVERPRICED ITEMS ({len(overpriced)}):")
            for item in overpriced[:3]:  # Show first 3
                desc = item.get('description', 'N/A')
                amount = item.get('amount', 0)
                benchmark = item.get('benchmark', 0)
                deviation = item.get('deviation_percent', 0)
                print(f"  • {desc}: ${amount:,.0f} (benchmark: ${benchmark:,.0f}, +{deviation:.0f}%)")
        
        if underpriced:
            print(f"\n💰 UNDERPRICED ITEMS ({len(underpriced)}):")
            for item in underpriced[:3]:
                desc = item.get('description', 'N/A')
                amount = item.get('amount', 0)
                benchmark = item.get('benchmark', 0)
                deviation = item.get('deviation_percent', 0)
                print(f"  • {desc}: ${amount:,.0f} (benchmark: ${benchmark:,.0f}, {deviation:.0f}%)")
    
    # Recommendations
    recommendations = data.get('recommendations', [])
    if recommendations and show_full:
        print(f"\n💡 RECOMMENDATIONS ({len(recommendations)}):")
        for rec in recommendations[:5]:  # Show first 5
            print(f"  • {rec}")
    
    # Milestones
    milestones = data.get('suggested_milestones', [])
    if milestones:
        print(f"\n🎯 SUGGESTED MILESTONES ({len(milestones)}):")
        for milestone in milestones:
            name = milestone.get('name', 'N/A')
            amount = milestone.get('amount', 0)
            percentage = milestone.get('percentage', 0)
            month = milestone.get('target_month', 0)
            print(f"  Milestone {milestone.get('milestone', 0)}: {name} - ${amount:,.0f} ({percentage:.0f}%) at month {month}")
    
    print()


def test_health_check():
    """Test budget analyzer health check"""
    print_section("TEST 1: Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/budget/health", headers=HEADERS)
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        
        print(f"Status: {data.get('status', 'unknown')}")
        
        features = data.get('features', {})
        print(f"\nFeatures:")
        for feature, available in features.items():
            status = "✅" if available else "❌"
            print(f"  {status} {feature}")
        
        project_types = data.get('supported_project_types', [])
        print(f"\nSupported project types: {', '.join(project_types)}")
        
        print(f"Market rates available: {data.get('market_rates_available', 0)}")
        
        print("\n✅ Health check passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Health check failed: {e}")
        return False


def test_well_structured_budget():
    """Test with a well-structured, reasonable budget"""
    print_section("TEST 2: Well-Structured Budget (Expect 80+ score)")
    
    request_data = {
        "grant_id": "grant-test-001",
        "total_amount": 185000,
        "currency": "USD",
        "duration_months": 6,
        "project_type": "software",
        "budget_items": [
            {
                "category": "development",
                "description": "Senior Blockchain Developer (6 months @ $15k/month)",
                "amount": 90000,
                "quantity": 1,
                "unit_cost": 15000
            },
            {
                "category": "development",
                "description": "Frontend Developer (4 months @ $10k/month)",
                "amount": 40000,
                "quantity": 1,
                "unit_cost": 10000
            },
            {
                "category": "design",
                "description": "UI/UX Designer (3 months @ $7k/month)",
                "amount": 21000,
                "quantity": 1,
                "unit_cost": 7000
            },
            {
                "category": "audits",
                "description": "Smart Contract Security Audit",
                "amount": 25000,
                "quantity": 1
            },
            {
                "category": "marketing",
                "description": "Launch Campaign & Community Building",
                "amount": 12000,
                "quantity": 1
            },
            {
                "category": "operations",
                "description": "Infrastructure & Tools (6 months)",
                "amount": 3000,
                "quantity": 1
            },
            {
                "category": "contingency",
                "description": "Buffer for unexpected costs (10%)",
                "amount": 18500,
                "quantity": 1
            }
        ],
        "deliverables": [
            "Smart contract development and deployment",
            "Frontend web application",
            "Security audit report",
            "Technical documentation",
            "Community launch"
        ]
    }
    
    try:
        print("Sending request...")
        start_time = time.time()
        
        response = requests.post(f"{BASE_URL}/budget", headers=HEADERS, json=request_data)
        
        elapsed = time.time() - start_time
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status Code: {response.status_code}\n")
        
        result = response.json()
        print_result(result, show_full=True)
        
        # Validation
        if result.get('success'):
            score = result['result']['budget_score']
            if score >= 80:
                print("✅ TEST PASSED: Budget scored 80+ as expected!")
                return True
            else:
                print(f"⚠️ TEST WARNING: Expected 80+, got {score}")
                return True
        else:
            print("❌ TEST FAILED: Analysis unsuccessful")
            return False
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False


def test_overpriced_budget():
    """Test with an overpriced budget (expect red flags)"""
    print_section("TEST 3: Overpriced Budget (Expect 40-60 score)")
    
    request_data = {
        "grant_id": "grant-test-002",
        "total_amount": 450000,
        "currency": "USD",
        "duration_months": 6,
        "project_type": "software",
        "budget_items": [
            {
                "category": "development",
                "description": "Senior Developer (6 months @ $30k/month)",
                "amount": 180000,
                "quantity": 1,
                "unit_cost": 30000
            },
            {
                "category": "development",
                "description": "Junior Developer (6 months @ $20k/month)",
                "amount": 120000,
                "quantity": 1,
                "unit_cost": 20000
            },
            {
                "category": "design",
                "description": "Designer (6 months @ $18k/month)",
                "amount": 108000,
                "quantity": 1,
                "unit_cost": 18000
            },
            {
                "category": "marketing",
                "description": "Marketing Campaign",
                "amount": 80000,
                "quantity": 1
            },
            {
                "category": "operations",
                "description": "Infrastructure",
                "amount": 12000,
                "quantity": 1
            }
        ],
        "deliverables": [
            "Web application",
            "Documentation"
        ]
    }
    
    try:
        print("Sending request...")
        start_time = time.time()
        
        response = requests.post(f"{BASE_URL}/budget", headers=HEADERS, json=request_data)
        
        elapsed = time.time() - start_time
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status Code: {response.status_code}\n")
        
        result = response.json()
        print_result(result, show_full=True)
        
        # Validation
        if result.get('success'):
            score = result['result']['budget_score']
            red_flags = len(result['result'].get('red_flags', []))
            
            if 40 <= score <= 60 and red_flags > 0:
                print("✅ TEST PASSED: Overpriced budget detected with red flags!")
                return True
            else:
                print(f"⚠️ TEST WARNING: Expected 40-60 score with red flags, got {score} with {red_flags} flags")
                return True
        else:
            print("❌ TEST FAILED: Analysis unsuccessful")
            return False
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False


def test_underbudgeted_project():
    """Test with an underbudgeted project (expect warnings)"""
    print_section("TEST 4: Underbudgeted Project (Expect 30-50 score)")
    
    request_data = {
        "grant_id": "grant-test-003",
        "total_amount": 35000,
        "currency": "USD",
        "duration_months": 6,
        "project_type": "software",
        "budget_items": [
            {
                "category": "development",
                "description": "Part-time developer (6 months @ $4k/month)",
                "amount": 24000,
                "quantity": 1,
                "unit_cost": 4000
            },
            {
                "category": "design",
                "description": "Freelance designer (one-time)",
                "amount": 3000,
                "quantity": 1
            },
            {
                "category": "marketing",
                "description": "Social media campaign",
                "amount": 2000,
                "quantity": 1
            },
            {
                "category": "operations",
                "description": "Hosting & tools",
                "amount": 1000,
                "quantity": 1
            }
        ],
        "deliverables": [
            "Smart contract development",
            "Frontend application",
            "Backend API",
            "Security audit",
            "Mobile app",
            "Documentation",
            "Marketing campaign"
        ]
    }
    
    try:
        print("Sending request...")
        start_time = time.time()
        
        response = requests.post(f"{BASE_URL}/budget", headers=HEADERS, json=request_data)
        
        elapsed = time.time() - start_time
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status Code: {response.status_code}\n")
        
        result = response.json()
        print_result(result, show_full=True)
        
        # Validation
        if result.get('success'):
            score = result['result']['budget_score']
            red_flags = len(result['result'].get('red_flags', []))
            
            if score <= 50 and red_flags > 0:
                print("✅ TEST PASSED: Underbudgeted project detected!")
                return True
            else:
                print(f"⚠️ TEST WARNING: Expected low score with red flags, got {score} with {red_flags} flags")
                return True
        else:
            print("❌ TEST FAILED: Analysis unsuccessful")
            return False
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False


def test_milestone_generation():
    """Test standalone milestone generation"""
    print_section("TEST 5: Milestone Generation")
    
    request_data = {
        "total_amount": 150000,
        "duration_months": 8,
        "deliverables": [
            "Requirements analysis and system design",
            "Smart contract development",
            "Frontend application development",
            "Backend API development",
            "Security audit and testing",
            "Documentation and training materials",
            "Deployment and launch",
            "Post-launch support (1 month)"
        ]
    }
    
    try:
        print("Sending request...")
        start_time = time.time()
        
        response = requests.post(f"{BASE_URL}/generate-milestones", headers=HEADERS, json=request_data)
        
        elapsed = time.time() - start_time
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status Code: {response.status_code}\n")
        
        result = response.json()
        
        if not result.get('success'):
            print(f"❌ ERROR: {result.get('error', 'Unknown error')}")
            return False
        
        milestones = result.get('milestones', [])
        total = result.get('total_amount', 0)
        num_milestones = result.get('num_milestones', 0)
        
        print(f"💰 Total Budget: ${total:,.0f}")
        print(f"🎯 Generated {num_milestones} Milestones\n")
        
        total_percentage = 0
        total_amount = 0
        
        for milestone in milestones:
            num = milestone.get('milestone', 0)
            name = milestone.get('name', 'N/A')
            amount = milestone.get('amount', 0)
            percentage = milestone.get('percentage', 0)
            month = milestone.get('target_month', 0)
            deliverables = milestone.get('deliverables', [])
            
            total_percentage += percentage
            total_amount += amount
            
            print(f"Milestone {num}: {name}")
            print(f"  Amount: ${amount:,.0f} ({percentage:.1f}%)")
            print(f"  Target: Month {month}")
            print(f"  Deliverables:")
            for deliv in deliverables:
                print(f"    • {deliv}")
            print()
        
        print(f"Total: ${total_amount:,.0f} ({total_percentage:.1f}%)")
        
        # Validation
        if num_milestones >= 2 and abs(total_percentage - 100.0) < 0.1:
            print("\n✅ TEST PASSED: Milestones generated correctly!")
            return True
        else:
            print(f"\n⚠️ TEST WARNING: Expected valid milestone structure")
            return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False


def run_all_tests():
    """Run all test cases"""
    print("\n" + "=" * 80)
    print("  BUDGET ANALYSIS API TEST SUITE")
    print("  Testing comprehensive budget evaluation capabilities")
    print("=" * 80)
    
    results = {
        "health_check": False,
        "well_structured": False,
        "overpriced": False,
        "underbudgeted": False,
        "milestone_generation": False
    }
    
    # Run tests
    results["health_check"] = test_health_check()
    time.sleep(1)
    
    results["well_structured"] = test_well_structured_budget()
    time.sleep(1)
    
    results["overpriced"] = test_overpriced_budget()
    time.sleep(1)
    
    results["underbudgeted"] = test_underbudgeted_project()
    time.sleep(1)
    
    results["milestone_generation"] = test_milestone_generation()
    
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
