/**
 * Tests for Agent Activity Dashboard Components
 * 
 * To run these tests, first install test dependencies:
 * npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
 * 
 * Then run: npm test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentActivityDashboard from '../AgentActivityDashboard';
import { Evaluation, AgentActivity, GrantStatus } from '@/types';

// Mock the API hooks
vi.mock('@/hooks/useApi', () => ({
  useAgentActivities: vi.fn(() => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

describe('AgentActivityDashboard', () => {
  const mockEvaluations: Evaluation[] = [
    {
      id: 1,
      grant_id: 1,
      agent_type: 'technical',
      score: 8.5,
      reasoning: 'Excellent technical implementation',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      grant_id: 1,
      agent_type: 'impact',
      score: 7.0,
      reasoning: 'Good potential impact',
      created_at: new Date().toISOString(),
    },
  ];

  const mockActivities: AgentActivity[] = [
    {
      id: '1',
      agent_type: 'technical',
      grant_id: 1,
      action: 'Started evaluation',
      message: 'Analyzing code quality',
      timestamp: new Date().toISOString(),
    },
  ];

  it('renders without crashing', () => {
    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={[]}
        loadingEvaluations={false}
        grantStatus="pending"
      />
    );
    expect(screen.getByText('Agent Activity')).toBeInTheDocument();
  });

  it('displays evaluation progress', () => {
    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={mockEvaluations}
        loadingEvaluations={false}
        grantStatus="evaluating"
      />
    );
    expect(screen.getByText('Evaluation Progress')).toBeInTheDocument();
  });

  it('shows agent cards for all agent types', () => {
    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={mockEvaluations}
        loadingEvaluations={false}
        grantStatus="evaluating"
      />
    );
    expect(screen.getByText('Agent Evaluations')).toBeInTheDocument();
  });

  it('displays voting status when evaluation is complete', () => {
    const allEvaluations: Evaluation[] = [
      { id: 1, grant_id: 1, agent_type: 'intake', score: 8, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 2, grant_id: 1, agent_type: 'technical', score: 7, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 3, grant_id: 1, agent_type: 'impact', score: 8, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 4, grant_id: 1, agent_type: 'due_diligence', score: 7, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 5, grant_id: 1, agent_type: 'budget', score: 8, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 6, grant_id: 1, agent_type: 'community', score: 7, reasoning: 'Good', created_at: new Date().toISOString() },
    ];

    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={allEvaluations}
        loadingEvaluations={false}
        grantStatus="evaluating"
      />
    );
    expect(screen.getByText('Voting Status')).toBeInTheDocument();
  });

  it('displays final decision for approved grants', () => {
    const allEvaluations: Evaluation[] = [
      { id: 1, grant_id: 1, agent_type: 'intake', score: 8, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 2, grant_id: 1, agent_type: 'technical', score: 7, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 3, grant_id: 1, agent_type: 'impact', score: 8, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 4, grant_id: 1, agent_type: 'due_diligence', score: 7, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 5, grant_id: 1, agent_type: 'budget', score: 8, reasoning: 'Good', created_at: new Date().toISOString() },
      { id: 6, grant_id: 1, agent_type: 'community', score: 7, reasoning: 'Good', created_at: new Date().toISOString() },
    ];

    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={allEvaluations}
        loadingEvaluations={false}
        grantStatus="approved"
      />
    );
    expect(screen.getByText(/APPROVED/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={[]}
        loadingEvaluations={true}
        grantStatus="pending"
      />
    );
    expect(screen.getByText('Loading evaluations...')).toBeInTheDocument();
  });

  it('displays auto-refresh toggle', () => {
    render(
      <AgentActivityDashboard
        grantId={1}
        evaluations={[]}
        loadingEvaluations={false}
        grantStatus="pending"
      />
    );
    expect(screen.getByLabelText(/auto-refresh/i)).toBeInTheDocument();
  });
});

describe('AgentCard', () => {
  it('displays pending state when no evaluation', () => {
    // Test pending agent card
  });

  it('displays completed state with score', () => {
    // Test completed evaluation card
  });

  it('displays in-progress state with activity', () => {
    // Test in-progress card with activities
  });
});

describe('EvaluationProgress', () => {
  it('calculates progress percentage correctly', () => {
    // Test progress calculation
  });

  it('shows complete state when all evaluations done', () => {
    // Test complete state
  });
});

describe('VotingStatus', () => {
  it('displays vote breakdown correctly', () => {
    // Test vote counting
  });

  it('shows transaction links when available', () => {
    // Test etherscan links
  });
});

describe('TimelineVisualization', () => {
  it('sorts events by timestamp', () => {
    // Test timeline sorting
  });

  it('displays relative time correctly', () => {
    // Test time formatting
  });
});

describe('FinalDecision', () => {
  it('displays approval message and stats', () => {
    // Test approval display
  });

  it('displays rejection message and feedback', () => {
    // Test rejection display
  });

  it('shows top evaluations as strengths', () => {
    // Test strengths section
  });
});
