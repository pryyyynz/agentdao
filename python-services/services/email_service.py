"""
Email Service for AgentDAO
Handles sending emails via Resend API
"""

import os
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails via Resend"""
    
    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM_EMAIL
        self.environment = settings.ENVIRONMENT
        
        # Log configuration status
        if self.api_key:
            logger.info(f"Resend API key found: {self.api_key[:10]}...")
            logger.info(f"Resend from email: {self.from_email}")
        else:
            logger.warning("RESEND_API_KEY not configured. Email sending will be disabled.")
        
        # Initialize Resend if API key is provided
        if self.api_key:
            try:
                import resend
                resend.api_key = self.api_key
                self.resend = resend
                logger.info("Resend email service initialized successfully")
            except ImportError:
                logger.warning("Resend package not installed. Install with: pip install resend")
                self.resend = None
        else:
            self.resend = None
    
    def send_otp(self, to_email: str, otp_code: str) -> bool:
        """
        Send OTP code to email
        
        Args:
            to_email: Recipient email address
            otp_code: 6-digit OTP code
            
        Returns:
            True if sent successfully, False otherwise
        """
        # If Resend is available, always try to send via email
        if self.resend:
            try:
                logger.info(f"Attempting to send OTP email to {to_email} via Resend...")
                params = {
                    "from": self.from_email,
                    "to": [to_email],
                    "subject": "Your Grantify Login Code",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">Your Login Code</h2>
                        <p style="color: #666; font-size: 16px;">Your verification code is:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; margin: 20px 0; border-radius: 8px;">
                            <strong style="color: #000;">{otp_code}</strong>
                        </div>
                        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                    """,
                }
                
                email = self.resend.Emails.send(params)
                email_id = email.get('id') if isinstance(email, dict) else email.id
                logger.info(f"OTP email sent successfully to {to_email} via Resend. Email ID: {email_id}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to send OTP email to {to_email} via Resend: {e}")
                import traceback
                logger.error(f"Resend error details: {traceback.format_exc()}")
                # Fall through to console logging if email fails
        
        # Fallback: Development mode - log to console if no Resend or email failed
        if self.environment == "development":
            logger.info(f"OTP Code for {to_email}: {otp_code}")
            print(f"\n{'='*50}")
            print(f"OTP Email (DEV MODE - Email sending failed or not configured)")
            print(f"To: {to_email}")
            print(f"Code: {otp_code}")
            print(f"{'='*50}\n")
            return True
        
        # Production mode but no Resend
        logger.error("Resend not initialized. Cannot send email.")
        return False
    
    def send_verification_email(self, to_email: str, verification_token: str) -> bool:
        """
        Send email verification link
        
        Args:
            to_email: Recipient email address
            verification_token: Verification token
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.resend:
            logger.error("Resend not initialized. Cannot send email.")
            return False
        
        try:
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
            
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": "Verify Your Grantify Email",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Verify Your Email</h2>
                    <p style="color: #666; font-size: 16px;">Click the button below to verify your email address:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
                    </div>
                    <p style="color: #999; font-size: 12px;">Or copy and paste this link: {verification_url}</p>
                </div>
                """,
            }
            
            email = self.resend.Emails.send(params)
            email_id = email.get('id') if isinstance(email, dict) else email.id
            logger.info(f"Verification email sent to {to_email} via Resend: {email_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {e}")
            return False
    
    def send_grant_approved_email(
        self,
        to_email: str,
        grant_title: str,
        grant_id: int,
        overall_score: float,
        requested_amount: str
    ) -> bool:
        """
        Send grant approval notification
        
        Args:
            to_email: Recipient email address
            grant_title: Grant project title
            grant_id: Grant ID number
            overall_score: Overall evaluation score
            requested_amount: Requested funding amount
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.resend:
            logger.error("Resend not initialized. Cannot send email.")
            if self.environment == "development":
                logger.info(f"[DEV] Grant Approved Email to {to_email}: {grant_title}")
                return True
            return False
        
        try:
            grant_url = f"{settings.FRONTEND_URL}/grant/{grant_id}"
            
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"🎉 Grant Approved: {grant_title}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #111827; margin-top: 0;">Your Grant Has Been Approved!</h2>
                        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                            We're excited to inform you that your grant proposal <strong>{grant_title}</strong> has been approved by our AI evaluation agents.
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                            <p style="margin: 0; color: #6b7280;"><strong style="color: #111827;">Grant ID:</strong> #{grant_id}</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Overall Score:</strong> {overall_score:.1f}/100</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Requested Amount:</strong> {requested_amount} ETH</p>
                        </div>
                        
                        <h3 style="color: #111827; margin-top: 30px;">Next Steps:</h3>
                        <ol style="color: #6b7280; font-size: 16px; line-height: 1.8;">
                            <li>Review your grant details and evaluation feedback</li>
                            <li>Prepare milestone deliverables as outlined in your proposal</li>
                            <li>Our team will contact you regarding funding disbursement</li>
                            <li>Stay engaged with the community and provide regular updates</li>
                        </ol>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{grant_url}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Grant Details</a>
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            Thank you for being part of Grantify. We look forward to seeing your project come to life!
                        </p>
                    </div>
                </div>
                """,
            }
            
            email = self.resend.Emails.send(params)
            email_id = email.get('id') if isinstance(email, dict) else email.id
            logger.info(f"Grant approved email sent to {to_email} for grant #{grant_id}. Email ID: {email_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send grant approved email to {to_email}: {e}")
            return False
    
    def send_grant_rejected_email(
        self,
        to_email: str,
        grant_title: str,
        grant_id: int,
        overall_score: float,
        feedback_summary: Optional[str] = None
    ) -> bool:
        """
        Send grant rejection notification with feedback
        
        Args:
            to_email: Recipient email address
            grant_title: Grant project title
            grant_id: Grant ID number
            overall_score: Overall evaluation score
            feedback_summary: Summary of evaluation feedback
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.resend:
            logger.error("Resend not initialized. Cannot send email.")
            if self.environment == "development":
                logger.info(f"[DEV] Grant Rejected Email to {to_email}: {grant_title}")
                return True
            return False
        
        try:
            grant_url = f"{settings.FRONTEND_URL}/grant/{grant_id}"
            resubmit_url = f"{settings.FRONTEND_URL}/submit"
            
            feedback_html = ""
            if feedback_summary:
                feedback_html = f"""
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #92400e; margin-top: 0;">Evaluation Feedback</h3>
                    <p style="color: #78350f; margin: 0; white-space: pre-line;">{feedback_summary}</p>
                </div>
                """
            
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Grant Decision: {grant_title}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">Grant Decision Update</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                            Thank you for submitting your grant proposal <strong>{grant_title}</strong> to Grantify.
                        </p>
                        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                            After careful evaluation by our AI agents, we regret to inform you that your proposal did not meet the approval threshold at this time.
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <p style="margin: 0; color: #6b7280;"><strong style="color: #111827;">Grant ID:</strong> #{grant_id}</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Overall Score:</strong> {overall_score:.1f}/100</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Decision:</strong> Not Approved</p>
                        </div>
                        
                        {feedback_html}
                        
                        <h3 style="color: #111827; margin-top: 30px;">What You Can Do:</h3>
                        <ul style="color: #6b7280; font-size: 16px; line-height: 1.8;">
                            <li>Review the detailed evaluation feedback for each category</li>
                            <li>Address the concerns raised by the evaluation agents</li>
                            <li>Strengthen your proposal based on the recommendations</li>
                            <li>Resubmit your improved proposal for re-evaluation</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{grant_url}" style="background: #6b7280; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-right: 10px;">View Feedback</a>
                            <a href="{resubmit_url}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Submit New Proposal</a>
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            We appreciate your interest in Grantify and encourage you to refine your proposal. Many successful grants started with an initial rejection and improvement cycle.
                        </p>
                    </div>
                </div>
                """,
            }
            
            email = self.resend.Emails.send(params)
            email_id = email.get('id') if isinstance(email, dict) else email.id
            logger.info(f"Grant rejected email sent to {to_email} for grant #{grant_id}. Email ID: {email_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send grant rejected email to {to_email}: {e}")
            return False
    
    def send_milestone_decision_email(
        self,
        to_email: str,
        grant_title: str,
        milestone_number: int,
        milestone_title: str,
        decision: str,
        admin_feedback: str,
        amount: float,
        grant_id: str
    ) -> bool:
        """
        Send milestone decision notification to grantee
        
        Args:
            to_email: Recipient email address
            grant_title: Grant project title
            milestone_number: Milestone number
            milestone_title: Milestone title
            decision: 'approved', 'rejected', or 'revision_requested'
            admin_feedback: Admin's feedback
            amount: Milestone amount
            grant_id: Grant ID
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.resend:
            logger.error("Resend not initialized. Cannot send email.")
            if self.environment == "development":
                logger.info(f"[DEV] Milestone Decision Email to {to_email}: {decision}")
                return True
            return False
        
        try:
            milestone_url = f"{settings.FRONTEND_URL}/grant/{grant_id}/milestones"
            
            # Customize email based on decision
            if decision == "approved":
                color = "#10b981"
                decision_text = "Approved"
                subject_prefix = "✓ Milestone Approved"
                header_bg = "#10b981"
                message = f"""
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Great news! Your milestone submission has been reviewed and <strong style="color: #059669;">approved</strong>.
                    </p>
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Payment of <strong>{amount} ETH</strong> will be released shortly.
                    </p>
                """
                action_button = f"""
                    <a href="{milestone_url}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Milestone Details</a>
                """
            elif decision == "revision_requested":
                color = "#f59e0b"
                decision_text = "Revision Requested"
                subject_prefix = "↻ Milestone Revision Needed"
                header_bg = "#f59e0b"
                message = f"""
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Your milestone submission has been reviewed. The admin has requested some <strong style="color: #d97706;">revisions</strong> before approval.
                    </p>
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Please review the feedback below and resubmit your proof of work.
                    </p>
                """
                action_button = f"""
                    <a href="{milestone_url}" style="background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Resubmit Milestone</a>
                """
            else:  # rejected
                color = "#ef4444"
                decision_text = "Rejected"
                subject_prefix = "✗ Milestone Rejected"
                header_bg = "#ef4444"
                message = f"""
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Your milestone submission has been reviewed and unfortunately was <strong style="color: #dc2626;">not approved</strong>.
                    </p>
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Please review the feedback below carefully before resubmitting.
                    </p>
                """
                action_button = f"""
                    <a href="{milestone_url}" style="background: #6b7280; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Feedback</a>
                """
            
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"{subject_prefix}: {grant_title} - Milestone {milestone_number}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: {header_bg}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">Milestone Decision</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        {message}
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {color};">
                            <p style="margin: 0; color: #6b7280;"><strong style="color: #111827;">Grant:</strong> {grant_title}</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Milestone:</strong> {milestone_number}. {milestone_title}</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Amount:</strong> {amount} ETH</p>
                            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong style="color: #111827;">Decision:</strong> <span style="color: {color}; font-weight: 600;">{decision_text}</span></p>
                        </div>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #111827; margin-top: 0;">Admin Feedback:</h3>
                            <p style="color: #374151; margin: 0; white-space: pre-line;">{admin_feedback}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            {action_button}
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            This decision was made after reviewing your submission and agent evaluations. If you have questions, please contact support.
                        </p>
                    </div>
                </div>
                """,
            }
            
            email = self.resend.Emails.send(params)
            email_id = email.get('id') if isinstance(email, dict) else email.id
            logger.info(f"Milestone decision email sent to {to_email} for milestone {milestone_number}. Email ID: {email_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send milestone decision email to {to_email}: {e}")
            return False

