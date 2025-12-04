"""
Pydantic Models for AgentDAO API
Defines request/response schemas for FastAPI endpoints
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class GrantStatus(str, Enum):
    """Grant status enum"""
    PENDING = "pending"
    UNDER_EVALUATION = "under_evaluation"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VoteType(str, Enum):
    """Agent vote enum"""
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"
    CONDITIONAL = "conditional"


class AgentType(str, Enum):
    """Agent type enum"""
    TECHNICAL = "technical"
    IMPACT = "impact"
    DUE_DILIGENCE = "due_diligence"
    BUDGET = "budget"
    COMMUNITY = "community"
    COORDINATOR = "coordinator"
    EXECUTOR = "executor"


class MilestoneStatus(str, Enum):
    """Milestone status enum"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class AgentRecommendation(str, Enum):
    """Agent review recommendation enum"""
    APPROVE = "approve"
    REJECT = "reject"
    REVISE = "revise"


class AdminDecision(str, Enum):
    """Admin milestone decision enum"""
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class MilestonePaymentModel(str, Enum):
    """Payment model for milestones"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"


# ============================================================================
# REQUEST MODELS
# ============================================================================

class GrantProposalCreate(BaseModel):
    """Model for creating a new grant proposal"""
    
    title: str = Field(..., min_length=10, max_length=255, description="Grant title")
    description: str = Field(..., min_length=50, description="Detailed grant description")
    requested_amount: Decimal = Field(..., gt=0, description="Amount requested in ETH")
    currency: str = Field(default="ETH", description="Currency type")
    
    # Applicant information
    applicant_address: str = Field(..., pattern=r'^0x[a-fA-F0-9]{40}$', description="Ethereum address")
    applicant_email: Optional[str] = Field(None, description="Contact email")
    team_size: int = Field(default=1, ge=1, le=100, description="Team size")
    
    # Additional details
    github_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    
    # Technical details
    tech_stack: Optional[List[str]] = Field(default=None, description="Technologies used")
    deliverables: Optional[List[str]] = Field(default=None, description="Expected deliverables")
    timeline_months: Optional[int] = Field(default=None, ge=1, le=24, description="Timeline in months")
    
    # Supporting documents
    document_urls: Optional[List[str]] = Field(default=None, description="Additional document URLs")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "Build DeFi Analytics Dashboard",
            "description": "A comprehensive analytics platform for tracking DeFi protocols...",
            "requested_amount": 25.5,
            "currency": "ETH",
            "applicant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "applicant_email": "team@example.com",
            "team_size": 3,
            "tech_stack": ["React", "Node.js", "Python", "PostgreSQL"],
            "deliverables": ["MVP Dashboard", "API Documentation", "User Guide"],
            "timeline_months": 6
        }
    })


class EvaluationRequest(BaseModel):
    """Model for requesting an evaluation"""
    
    grant_id: str = Field(..., description="Grant UUID to evaluate")
    agent_type: AgentType = Field(..., description="Type of agent evaluation")
    force_reevaluation: bool = Field(default=False, description="Force re-evaluation if already exists")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "grant_id": "550e8400-e29b-41d4-a716-446655440000",
            "agent_type": "technical",
            "force_reevaluation": False
        }
    })


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class GrantProposal(BaseModel):
    """Model for grant proposal response"""
    
    grant_id: str
    title: str
    description: str
    requested_amount: Decimal
    currency: str
    
    applicant_address: str
    applicant_email: Optional[str] = None
    team_size: int
    
    ipfs_hash: Optional[str] = None
    document_urls: Optional[List[str]] = None
    
    on_chain_id: Optional[int] = None
    transaction_hash: Optional[str] = None
    
    status: GrantStatus
    overall_score: Optional[Decimal] = None
    consensus_reached: bool = False
    
    evaluation_started_at: Optional[datetime] = None
    evaluation_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)


class EvaluationResult(BaseModel):
    """Model for evaluation result response"""
    
    evaluation_id: str
    grant_id: str
    agent_name: str
    agent_address: Optional[str] = None
    
    score: Decimal = Field(..., ge=0, le=100, description="Score out of 100")
    vote: VoteType
    confidence: Decimal = Field(..., ge=0, le=100, description="Confidence percentage")
    
    summary: Optional[str] = None
    detailed_analysis: Optional[Dict[str, Any]] = None
    
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    red_flags: Optional[List[str]] = None
    
    on_chain_vote_tx: Optional[str] = None
    
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)


class AgentResponse(BaseModel):
    """Model for agent evaluation response"""
    
    agent_name: str
    grant_id: str
    
    # Evaluation results
    score: Decimal = Field(..., ge=0, le=100)
    vote: VoteType
    confidence: Decimal = Field(..., ge=0, le=100)


class TechnicalEvaluationResult(BaseModel):
    """Model for technical evaluation results (-2 to +2 scale)"""
    
    grant_id: str
    agent_type: str = "technical"
    
    # Overall score (-2 to +2)
    score: float = Field(..., ge=-2, le=2, description="Overall technical score")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level")
    
    # Component scores
    architecture_score: float = Field(..., ge=-2, le=2)
    timeline_score: float = Field(..., ge=-2, le=2)
    tech_stack_score: float = Field(..., ge=-2, le=2)
    implementation_score: float = Field(..., ge=-2, le=2)
    
    # Analysis details
    reasoning: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = None
    evaluated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ImpactEvaluationResult(BaseModel):
    """Model for impact evaluation results (-2 to +2 scale)"""
    
    grant_id: str
    agent_type: str = "impact"
    
    # Overall score (-2 to +2)
    score: float = Field(..., ge=-2, le=2, description="Overall impact score")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level")
    
    # Component scores
    alignment_score: float = Field(..., ge=-2, le=2, description="Mission alignment score")
    user_benefit_score: float = Field(..., ge=-2, le=2, description="User benefits score")
    ecosystem_gap_score: float = Field(..., ge=-2, le=2, description="Ecosystem gap score")
    sustainability_score: float = Field(..., ge=-2, le=2, description="Sustainability score")
    network_effects_score: float = Field(..., ge=-2, le=2, description="Network effects score")
    
    # Analysis details
    reasoning: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Impact-specific metadata
    impact_details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional impact metrics (target_beneficiaries, ecosystem_contribution, etc.)"
    )
    metadata: Optional[Dict[str, Any]] = None
    evaluated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class HealthCheck(BaseModel):
    """Model for health check response"""
    
    status: str = Field(..., description="Overall service status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(..., description="Current server time")
    
    services: Dict[str, str] = Field(..., description="Status of dependent services")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": "2025-01-12T10:00:00Z",
            "services": {
                "database": "connected",
                "ipfs": "connected",
                "groq_api": "available"
            }
        }
    })


class ErrorResponse(BaseModel):
    """Model for error responses"""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "error": "ValidationError",
            "message": "Invalid grant proposal format",
            "detail": {"field": "applicant_address", "issue": "Invalid Ethereum address"},
            "timestamp": "2025-01-12T10:00:00Z"
        }
    })


class GrantList(BaseModel):
    """Model for paginated grant list"""
    
    grants: List[GrantProposal]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class EvaluationList(BaseModel):
    """Model for evaluation list"""
    
    evaluations: List[EvaluationResult]
    grant_id: str
    total_evaluations: int
    completed_evaluations: int
    average_score: Optional[Decimal] = None


# ============================================================================
# UTILITY MODELS
# ============================================================================

class PaginationParams(BaseModel):
    """Model for pagination parameters"""
    
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    
    def get_offset(self) -> int:
        return (self.page - 1) * self.page_size
    
    def get_limit(self) -> int:
        return self.page_size


# ============================================================================
# MILESTONE MODELS
# ============================================================================

class MilestoneCreate(BaseModel):
    """Model for creating a milestone"""
    
    milestone_number: int = Field(..., ge=1, description="Sequential milestone number")
    title: str = Field(..., min_length=5, max_length=255, description="Milestone title")
    description: str = Field(..., min_length=20, description="Detailed milestone description")
    deliverables: List[str] = Field(..., min_items=1, description="List of deliverables")
    amount: Decimal = Field(..., gt=0, description="Payment amount for this milestone")
    currency: str = Field(default="ETH", description="Currency type")
    estimated_completion_date: Optional[datetime] = Field(None, description="Estimated completion date")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "milestone_number": 1,
            "title": "MVP Development",
            "description": "Complete core features and basic UI",
            "deliverables": ["User authentication", "Dashboard UI", "Core API endpoints"],
            "amount": 10.0,
            "currency": "ETH",
            "estimated_completion_date": "2025-03-01"
        }
    })


class MilestoneUpdate(BaseModel):
    """Model for updating a milestone"""
    
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=20)
    deliverables: Optional[List[str]] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    estimated_completion_date: Optional[datetime] = None


class MilestoneSubmission(BaseModel):
    """Model for submitting milestone proof of work"""
    
    proof_of_work_url: str = Field(..., description="URL to proof of work")
    submission_notes: str = Field(..., min_length=50, description="Notes about completion")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "proof_of_work_url": "https://github.com/user/repo/pull/123",
            "submission_notes": "Completed all deliverables. MVP is live at demo.example.com with full test coverage."
        }
    })


class MilestoneReview(BaseModel):
    """Model for reviewing a milestone submission"""
    
    approved: bool = Field(..., description="Whether milestone is approved")
    reviewer_feedback: str = Field(..., min_length=20, description="Detailed feedback")
    review_score: Optional[Decimal] = Field(None, ge=0, le=100, description="Score out of 100")
    request_revision: bool = Field(default=False, description="Request revisions instead of reject")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "approved": True,
            "reviewer_feedback": "All deliverables met. Code quality is excellent with good test coverage.",
            "review_score": 95.0,
            "request_revision": False
        }
    })


class Milestone(BaseModel):
    """Model for milestone response"""
    
    id: int
    milestone_id: str
    grant_id: str
    milestone_number: int
    title: str
    description: str
    deliverables: List[str]
    amount: Decimal
    currency: str
    status: MilestoneStatus
    
    # Timeline
    estimated_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    
    # Submission
    proof_of_work_url: Optional[str] = None
    proof_of_work_ipfs: Optional[str] = None
    submission_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    
    # Review
    reviewer_feedback: Optional[str] = None
    review_score: Optional[Decimal] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    
    # Payment
    payment_tx_hash: Optional[str] = None
    payment_released_at: Optional[datetime] = None
    on_chain_milestone_id: Optional[int] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MilestoneList(BaseModel):
    """Model for milestone list response"""
    
    milestones: List[Milestone]
    grant_id: str
    total_milestones: int
    completed_milestones: int
    total_amount: Decimal
    paid_amount: Decimal
    completion_percentage: Decimal


class MilestoneProgressSummary(BaseModel):
    """Model for milestone progress summary"""
    
    grant_id: str
    grant_title: str
    has_milestones: bool
    total_milestones: int
    current_milestone: int
    milestones_count: int
    completed_milestones: int
    active_milestones: int
    submitted_milestones: int
    pending_milestones: int
    total_milestone_amount: Decimal
    paid_amount: Decimal
    completion_percentage: Decimal
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# AGENT REVIEW MODELS
# ============================================================================

class AgentMilestoneReviewCreate(BaseModel):
    """Model for creating an agent review of a milestone"""
    
    agent_id: str = Field(..., description="Agent identifier")
    agent_name: str = Field(..., description="Agent display name")
    recommendation: AgentRecommendation = Field(..., description="Agent's recommendation")
    confidence_score: Optional[Decimal] = Field(None, ge=0, le=100, description="Confidence in recommendation (0-100)")
    review_score: Optional[Decimal] = Field(None, ge=0, le=100, description="Quality score (0-100)")
    
    feedback: str = Field(..., min_length=50, description="Detailed review feedback")
    strengths: Optional[List[str]] = Field(default=[], description="Identified strengths")
    weaknesses: Optional[List[str]] = Field(default=[], description="Identified weaknesses")
    suggestions: Optional[List[str]] = Field(default=[], description="Suggestions for improvement")
    
    # Evaluation criteria
    deliverables_met: Optional[bool] = Field(None, description="Whether deliverables were met")
    quality_rating: Optional[Decimal] = Field(None, ge=0, le=100, description="Overall quality (0-100)")
    documentation_rating: Optional[Decimal] = Field(None, ge=0, le=100, description="Documentation quality (0-100)")
    code_quality_rating: Optional[Decimal] = Field(None, ge=0, le=100, description="Code quality (0-100)")
    
    review_duration_seconds: Optional[int] = Field(None, description="Time spent reviewing")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "agent_id": "agent_technical_001",
            "agent_name": "Technical Reviewer AI",
            "recommendation": "approve",
            "confidence_score": 92.5,
            "review_score": 88.0,
            "feedback": "The milestone deliverables have been thoroughly completed with high-quality implementation. The code follows best practices and includes comprehensive tests.",
            "strengths": ["Clean code architecture", "Excellent test coverage", "Well-documented APIs"],
            "weaknesses": ["Minor performance optimization opportunities"],
            "suggestions": ["Consider adding caching layer", "Implement rate limiting"],
            "deliverables_met": True,
            "quality_rating": 88.0,
            "documentation_rating": 90.0,
            "code_quality_rating": 85.0,
            "review_duration_seconds": 450
        }
    })


class AgentMilestoneReview(BaseModel):
    """Model for agent review response"""
    
    review_id: str
    milestone_id: str
    agent_id: str
    agent_name: str
    recommendation: AgentRecommendation
    confidence_score: Optional[Decimal]
    review_score: Optional[Decimal]
    feedback: str
    strengths: Optional[List[str]]
    weaknesses: Optional[List[str]]
    suggestions: Optional[List[str]]
    deliverables_met: Optional[bool]
    quality_rating: Optional[Decimal]
    documentation_rating: Optional[Decimal]
    code_quality_rating: Optional[Decimal]
    review_duration_seconds: Optional[int]
    reviewed_at: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ADMIN DECISION MODELS
# ============================================================================

class AdminMilestoneDecisionCreate(BaseModel):
    """Model for admin final decision on milestone"""
    
    decision: AdminDecision = Field(..., description="Admin's final decision")
    admin_feedback: str = Field(..., min_length=20, description="Admin's feedback to grantee")
    override_agents: bool = Field(default=False, description="Whether decision overrides agent recommendations")
    decision_notes: Optional[str] = Field(None, description="Internal notes about decision")
    
    # If approved, payment info
    approved_amount: Optional[Decimal] = Field(None, description="Approved payment amount (if different from milestone amount)")
    payment_authorized: bool = Field(default=False, description="Whether payment is authorized")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "decision": "approved",
            "admin_feedback": "After reviewing agent evaluations and the submitted work, this milestone meets all requirements and is approved for payment.",
            "override_agents": False,
            "decision_notes": "All 3 agents recommended approval. Work quality is excellent.",
            "approved_amount": None,
            "payment_authorized": True
        }
    })


class AdminMilestoneDecision(BaseModel):
    """Model for admin decision response"""
    
    decision_id: str
    milestone_id: str
    admin_wallet_address: str
    admin_email: Optional[str]
    decision: AdminDecision
    admin_feedback: str
    override_agents: bool
    approved_amount: Optional[Decimal]
    payment_authorized: bool
    payment_tx_hash: Optional[str]
    payment_released_at: Optional[datetime]
    
    # Agent review aggregates
    total_agent_reviews: int
    agent_approvals: int
    agent_rejections: int
    agent_revisions: int
    avg_agent_score: Optional[Decimal]
    
    decision_notes: Optional[str]
    decided_at: datetime
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PendingAdminReview(BaseModel):
    """Model for pending milestone review (from view)"""
    
    milestone_id: str
    grant_id: str
    milestone_number: int
    milestone_title: str
    status: MilestoneStatus
    amount: Decimal
    proof_of_work_url: Optional[str]
    submission_notes: Optional[str]
    submitted_at: Optional[datetime]
    
    # Agent review summary
    agent_review_count: int
    agent_approvals: int
    agent_rejections: int
    agent_revisions: int
    avg_review_score: Optional[Decimal]
    
    # Grant info
    grant_title: str
    grantee_id: str
    total_grant_amount: Decimal
    hours_waiting: Decimal
    
    model_config = ConfigDict(from_attributes=True)


class MilestoneReviewStatus(BaseModel):
    """Model for complete milestone review status"""
    
    milestone_id: str
    grant_id: str
    milestone_number: int
    title: str
    status: MilestoneStatus
    amount: Decimal
    submitted_at: Optional[datetime]
    
    # Agent reviews
    agent_reviews_count: int
    agent_reviews_complete: bool
    actual_agent_reviews: int
    agent_approvals: int
    agent_rejections: int
    agent_revisions: int
    avg_agent_review_score: Optional[Decimal]
    avg_agent_confidence: Optional[Decimal]
    
    # Admin decision
    admin_reviewed: bool
    admin_decision: Optional[AdminDecision]
    admin_feedback: Optional[str]
    admin_decided_at: Optional[datetime]
    payment_authorized: Optional[bool]
    
    # Grant info
    grant_title: str
    grantee_id: str
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ADMIN ACTION MODELS
# ============================================================================

class AgentStatusUpdate(BaseModel):
    """Model for updating agent status"""
    
    is_active: bool = Field(..., description="Whether agent is active")
    is_suspended: Optional[bool] = Field(None, description="Whether agent is suspended")
    suspension_reason: Optional[str] = Field(None, description="Reason for suspension")
    updated_by: str = Field(..., description="Admin username who made the change")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "is_active": False,
            "is_suspended": True,
            "suspension_reason": "Maintenance required - performance degradation detected",
            "updated_by": "admin"
        }
    })


class AgentWeightUpdate(BaseModel):
    """Model for updating agent voting weight"""
    
    weight: Decimal = Field(..., ge=0, le=10, description="Voting weight (0.0 to 10.0)")
    updated_by: str = Field(..., description="Admin username who made the change")
    reason: Optional[str] = Field(None, description="Reason for weight change")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "weight": 1.5,
            "updated_by": "admin",
            "reason": "Increased weight due to consistently high accuracy"
        }
    })


class AgentRegistration(BaseModel):
    """Model for registering a new agent"""
    
    agent_name: str = Field(..., min_length=3, max_length=100, description="Unique agent name")
    agent_address: Optional[str] = Field(None, pattern=r'^0x[a-fA-F0-9]{40}$', description="Agent wallet address")
    weight: Decimal = Field(default=1.0, ge=0, le=10, description="Initial voting weight")
    description: Optional[str] = Field(None, description="Agent description")
    registered_by: str = Field(..., description="Admin username who registered the agent")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "agent_name": "security_audit",
            "agent_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "weight": 1.0,
            "description": "Security audit specialist agent",
            "registered_by": "admin"
        }
    })


class GrantActionRequest(BaseModel):
    """Model for approving/rejecting grant actions"""
    
    admin_user: str = Field(..., description="Admin username")
    decision_notes: Optional[str] = Field(None, description="Notes about the decision")
    send_notification: bool = Field(default=True, description="Whether to send email notification")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "admin_user": "admin",
            "decision_notes": "All agent evaluations positive. Technical implementation is sound.",
            "send_notification": True
        }
    })


class SystemPauseRequest(BaseModel):
    """Model for pausing/resuming the system"""
    
    paused: bool = Field(..., description="Whether to pause (true) or resume (false)")
    reason: str = Field(..., min_length=10, description="Reason for pause/resume")
    admin_user: str = Field(..., description="Admin username")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "paused": True,
            "reason": "Scheduled maintenance - database upgrade",
            "admin_user": "admin"
        }
    })


class EmergencyStopRequest(BaseModel):
    """Model for emergency stop"""
    
    stop_reason: str = Field(..., min_length=10, description="Reason for emergency stop")
    admin_user: str = Field(..., description="Admin username")
    notify_all: bool = Field(default=True, description="Whether to notify all stakeholders")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "stop_reason": "Critical security vulnerability detected in smart contract",
            "admin_user": "admin",
            "notify_all": True
        }
    })


class EmergencyWithdrawalRequest(BaseModel):
    """Model for emergency withdrawal from treasury"""
    
    recipient_address: str = Field(..., description="Ethereum address to receive funds")
    amount_eth: str = Field(..., description="Amount in ETH to withdraw")
    reason: str = Field(..., min_length=10, description="Reason for emergency withdrawal")
    admin_user: str = Field(..., description="Admin username initiating request")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "recipient_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "amount_eth": "1.5",
            "reason": "Emergency withdrawal to secure funds from compromised contract",
            "admin_user": "admin"
        }
    })


class EmergencyWithdrawalApproval(BaseModel):
    """Model for approving emergency withdrawal"""
    
    withdrawal_id: int = Field(..., description="ID of the withdrawal request")
    admin_user: str = Field(..., description="Admin username approving request")
    approved: bool = Field(..., description="Whether approved or rejected")
    comment: Optional[str] = Field(None, description="Optional comment on approval/rejection")


class AgentStatusResponse(BaseModel):
    """Model for agent status response"""
    
    agent_name: str
    is_active: bool
    is_suspended: bool
    suspension_reason: Optional[str]
    weight: Decimal
    total_evaluations: int
    accuracy_score: Decimal
    last_active_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SystemStatusResponse(BaseModel):
    """Model for system status response"""
    
    system_paused: bool
    pause_reason: str
    emergency_stop: bool
    emergency_stop_reason: str
    emergency_stop_timestamp: Optional[str]
    last_updated: datetime
    updated_by: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Enums
    'GrantStatus',
    'VoteType',
    'AgentType',
    'MilestoneStatus',
    'MilestonePaymentModel',
    'AgentRecommendation',
    'AdminDecision',
    
    # Request models
    'GrantProposalCreate',
    'EvaluationRequest',
    
    # Response models
    'GrantProposal',
    'EvaluationResult',
    'AgentResponse',
    'HealthCheck',
    'ErrorResponse',
    'GrantList',
    'EvaluationList',
    
    # Milestone models
    'MilestoneCreate',
    'MilestoneUpdate',
    'MilestoneSubmission',
    'MilestoneReview',
    'Milestone',
    'MilestoneList',
    'MilestoneProgressSummary',
    
    # Review system models
    'AgentMilestoneReviewCreate',
    'AgentMilestoneReview',
    'AdminMilestoneDecisionCreate',
    'AdminMilestoneDecision',
    'PendingAdminReview',
    'MilestoneReviewStatus',
    
    # Admin action models
    'AgentStatusUpdate',
    'AgentWeightUpdate',
    'AgentRegistration',
    'GrantActionRequest',
    'SystemPauseRequest',
    'EmergencyStopRequest',
    'AgentStatusResponse',
    'SystemStatusResponse',
    
    # Utility models
    'PaginationParams',
]
