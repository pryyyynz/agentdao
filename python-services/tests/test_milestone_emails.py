"""
Test script for milestone email notifications
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.email_service import EmailService
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def test_milestone_approval_email():
    """Test milestone approval email"""
    print("\n" + "="*80)
    print("TEST 1: Milestone Approval Email")
    print("="*80)
    
    email_service = EmailService()
    
    result = email_service.send_milestone_decision_email(
        to_email="dugboryeleprince@gmail.com",
        grant_title="AI-Powered Grant Evaluation System",
        milestone_number=1,
        milestone_title="System Architecture & Database Design",
        decision="approved",
        admin_feedback="Excellent work! The architecture is well-designed and the database schema is comprehensive. Payment will be released shortly.",
        amount=5.0,
        grant_id="550e8400-e29b-41d4-a716-446655440000"
    )
    
    print(f"\n✓ Email sent successfully: {result}")
    return result

def test_milestone_revision_email():
    """Test milestone revision request email"""
    print("\n" + "="*80)
    print("TEST 2: Milestone Revision Request Email")
    print("="*80)
    
    email_service = EmailService()
    
    result = email_service.send_milestone_decision_email(
        to_email="dugboryeleprince@gmail.com",
        grant_title="AI-Powered Grant Evaluation System",
        milestone_number=2,
        milestone_title="Backend API Implementation",
        decision="revision_requested",
        admin_feedback="Good progress, but please address the following:\n\n1. Add more comprehensive API documentation\n2. Implement rate limiting on endpoints\n3. Add additional unit tests for edge cases\n\nOnce these are addressed, resubmit for review.",
        amount=7.5,
        grant_id="550e8400-e29b-41d4-a716-446655440000"
    )
    
    print(f"\n✓ Email sent successfully: {result}")
    return result

def test_milestone_rejection_email():
    """Test milestone rejection email"""
    print("\n" + "="*80)
    print("TEST 3: Milestone Rejection Email")
    print("="*80)
    
    email_service = EmailService()
    
    result = email_service.send_milestone_decision_email(
        to_email="dugboryeleprince@gmail.com",
        grant_title="AI-Powered Grant Evaluation System",
        milestone_number=3,
        milestone_title="Frontend Dashboard Development",
        decision="rejected",
        admin_feedback="The submitted work does not meet the milestone requirements:\n\n- Dashboard is incomplete\n- Key features are missing\n- Code quality needs significant improvement\n\nPlease review the original milestone requirements and resubmit with a complete implementation.",
        amount=10.0,
        grant_id="550e8400-e29b-41d4-a716-446655440000"
    )
    
    print(f"\n✓ Email sent successfully: {result}")
    return result

def test_payment_confirmation_email():
    """Test payment confirmation email"""
    print("\n" + "="*80)
    print("TEST 4: Payment Confirmation Email")
    print("="*80)
    
    email_service = EmailService()
    
    result = email_service.send_milestone_decision_email(
        to_email="dugboryeleprince@gmail.com",
        grant_title="AI-Powered Grant Evaluation System",
        milestone_number=1,
        milestone_title="System Architecture & Database Design",
        decision="approved",
        admin_feedback="Payment has been released!\n\nTransaction Hash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\nAmount: 5.0 ETH\n\nFunds should arrive in your wallet shortly.",
        amount=5.0,
        grant_id="550e8400-e29b-41d4-a716-446655440000"
    )
    
    print(f"\n✓ Email sent successfully: {result}")
    return result

def main():
    """Run all email tests"""
    print("\n" + "="*80)
    print("MILESTONE EMAIL NOTIFICATION TESTS")
    print("="*80)
    
    # Check email service configuration
    email_service = EmailService()
    if not email_service.resend:
        print("\n⚠️  WARNING: Resend not configured. Running in development mode.")
        print("Emails will be logged to console only.")
    else:
        print(f"\n✓ Email service configured")
        print(f"  From: {email_service.from_email}")
        print(f"  Environment: {email_service.environment}")
    
    # Run tests
    results = []
    
    try:
        results.append(("Approval Email", test_milestone_approval_email()))
    except Exception as e:
        logger.error(f"Approval email test failed: {e}", exc_info=True)
        results.append(("Approval Email", False))
    
    try:
        results.append(("Revision Email", test_milestone_revision_email()))
    except Exception as e:
        logger.error(f"Revision email test failed: {e}", exc_info=True)
        results.append(("Revision Email", False))
    
    try:
        results.append(("Rejection Email", test_milestone_rejection_email()))
    except Exception as e:
        logger.error(f"Rejection email test failed: {e}", exc_info=True)
        results.append(("Rejection Email", False))
    
    try:
        results.append(("Payment Confirmation", test_payment_confirmation_email()))
    except Exception as e:
        logger.error(f"Payment confirmation test failed: {e}", exc_info=True)
        results.append(("Payment Confirmation", False))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print("="*80 + "\n")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
