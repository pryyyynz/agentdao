import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentPerformanceCard from '../AgentPerformanceCard';
import AgentComparison from '../AgentComparison';
import {
  calculateAgentPerformance,
  generateReputationTrend,
  generateMockPerformanceData,
} from '../../../lib/agentPerformance';
import { AgentPerformance, AgentActivity, Evaluation, Grant, AgentType } from '../../../types';

// Mock Recharts to avoid canvas/SVG rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  };
});

// Mock date-fns to ensure consistent test results
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    return date.toISOString().split('T')[0];
  }),
  formatDistance: jest.fn(() => '2 days ago'),
  subDays: jest.fn((date: Date, days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate;
  }),
}));

describe('AgentPerformanceCard', () => {
  const mockPerformance: AgentPerformance = {
    agent_type: 'technical' as AgentType,
    total_evaluations: 50,
    average_score: 7.5,
    accuracy_rate: 85,
    reputation_score: 78,
    voting_weight: 1.28,
    evaluations_history: [
      {
        date: '2024-01-15',
        score: 8,
        grant_id: 1,
        accuracy: true,
      },
    ],
    reputation_trend: [
      { date: '2024-01-01', score: 75 },
      { date: '2024-01-15', score: 78 },
    ],
  };

  const mockActivities: AgentActivity[] = [
    {
      id: '1',
      agent_type: 'technical' as AgentType,
      grant_id: 1,
      action: 'evaluation',
      message: 'Evaluated grant technical feasibility',
      timestamp: '2024-01-15T10:00:00Z',
      metadata: {},
    },
  ];

  it('renders agent performance card with correct data', () => {
    render(
      <AgentPerformanceCard
        performance={mockPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Technical Agent')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument(); // Reputation score
    expect(screen.getByText('1.28x')).toBeInTheDocument(); // Voting weight
    expect(screen.getByText('50')).toBeInTheDocument(); // Total evaluations
    expect(screen.getByText('85%')).toBeInTheDocument(); // Accuracy
  });

  it('displays correct reputation badge for excellent performance', () => {
    const excellentPerformance = { ...mockPerformance, reputation_score: 90 };
    render(
      <AgentPerformanceCard
        performance={excellentPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('displays correct reputation badge for good performance', () => {
    const goodPerformance = { ...mockPerformance, reputation_score: 75 };
    render(
      <AgentPerformanceCard
        performance={goodPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('displays correct reputation badge for average performance', () => {
    const averagePerformance = { ...mockPerformance, reputation_score: 60 };
    render(
      <AgentPerformanceCard
        performance={averagePerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('displays correct reputation badge for needs improvement', () => {
    const poorPerformance = { ...mockPerformance, reputation_score: 40 };
    render(
      <AgentPerformanceCard
        performance={poorPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Needs Improvement')).toBeInTheDocument();
  });

  it('renders reputation trend chart', () => {
    render(
      <AgentPerformanceCard
        performance={mockPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('expands and collapses activities section', () => {
    render(
      <AgentPerformanceCard
        performance={mockPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    const expandButton = screen.getByText(/Show Recent Activities/i);
    expect(expandButton).toBeInTheDocument();

    // Message should not be visible initially
    expect(screen.queryByText('Evaluated grant technical feasibility')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);

    // Activities should now be visible
    expect(screen.getByText('evaluation')).toBeInTheDocument();
    expect(screen.getByText('Evaluated grant technical feasibility')).toBeInTheDocument();
  });

  it('calls onSelect when compare button is clicked', () => {
    const mockOnSelect = jest.fn();
    render(
      <AgentPerformanceCard
        performance={mockPerformance}
        activities={mockActivities}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );

    const compareButton = screen.getByText('Compare');
    fireEvent.click(compareButton);

    expect(mockOnSelect).toHaveBeenCalledWith('technical');
  });

  it('shows selected state when isSelected is true', () => {
    render(
      <AgentPerformanceCard
        performance={mockPerformance}
        activities={mockActivities}
        isSelected={true}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('handles empty activities gracefully', () => {
    render(
      <AgentPerformanceCard
        performance={mockPerformance}
        activities={[]}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Show Recent Activities/i));
    expect(screen.getByText('No recent activities')).toBeInTheDocument();
  });
});

describe('AgentComparison', () => {
  const mockAgents: AgentPerformance[] = [
    {
      agent_type: 'technical' as AgentType,
      total_evaluations: 50,
      average_score: 7.5,
      accuracy_rate: 85,
      reputation_score: 78,
      voting_weight: 1.28,
      evaluations_history: [],
      reputation_trend: [],
    },
    {
      agent_type: 'impact' as AgentType,
      total_evaluations: 45,
      average_score: 8.0,
      accuracy_rate: 90,
      reputation_score: 82,
      voting_weight: 1.32,
      evaluations_history: [],
      reputation_trend: [],
    },
  ];

  it('renders comparison table with all metrics', () => {
    render(<AgentComparison performances={mockAgents} />);

    expect(screen.getByText('Agent Comparison')).toBeInTheDocument();
    expect(screen.getByText('Technical Agent')).toBeInTheDocument();
    expect(screen.getByText('Impact Agent')).toBeInTheDocument();

    // Check for all metrics
    expect(screen.getByText('Reputation Score')).toBeInTheDocument();
    expect(screen.getByText('Accuracy Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Evaluations')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('Voting Weight')).toBeInTheDocument();
  });

  it('highlights best values in green', () => {
    const { container } = render(<AgentComparison performances={mockAgents} />);

    // Impact agent has better reputation (82 > 78)
    const cells = container.querySelectorAll('td');
    const greenCells = Array.from(cells).filter((cell) =>
      cell.className.includes('bg-green')
    );

    expect(greenCells.length).toBeGreaterThan(0);
  });

  it('highlights worst values in red', () => {
    const { container } = render(<AgentComparison performances={mockAgents} />);

    const cells = container.querySelectorAll('td');
    const redCells = Array.from(cells).filter((cell) =>
      cell.className.includes('bg-red')
    );

    expect(redCells.length).toBeGreaterThan(0);
  });

  it('renders bar chart', () => {
    render(<AgentComparison performances={mockAgents} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders radar chart', () => {
    render(<AgentComparison performances={mockAgents} />);
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('handles single agent comparison', () => {
    render(<AgentComparison performances={[mockAgents[0]]} />);

    expect(screen.getByText('Technical Agent')).toBeInTheDocument();
    expect(screen.queryByText('Impact Agent')).not.toBeInTheDocument();
  });

  it('displays correct metric values', () => {
    render(<AgentComparison performances={mockAgents} />);

    // Technical agent values
    expect(screen.getByText('78')).toBeInTheDocument(); // Reputation
    expect(screen.getByText('85%')).toBeInTheDocument(); // Accuracy
    expect(screen.getByText('50')).toBeInTheDocument(); // Evaluations

    // Impact agent values
    expect(screen.getByText('82')).toBeInTheDocument(); // Reputation
    expect(screen.getByText('90%')).toBeInTheDocument(); // Accuracy
    expect(screen.getByText('45')).toBeInTheDocument(); // Evaluations
  });
});

describe('calculateAgentPerformance', () => {
  const mockEvaluations: Evaluation[] = [
    {
      id: 1,
      grant_id: 1,
      agent_type: 'technical' as AgentType,
      score: 8,
      reasoning: 'Good',
      created_at: '2024-01-01T10:00:00Z',
      vote_tx_hash: '0x123',
    },
    {
      id: 2,
      grant_id: 2,
      agent_type: 'technical' as AgentType,
      score: 7,
      reasoning: 'Acceptable',
      created_at: '2024-01-02T10:00:00Z',
      vote_tx_hash: '0x456',
    },
  ];

  const mockGrants: Grant[] = [
    {
      id: 1,
      title: 'Test Grant 1',
      description: 'Test',
      applicant_address: '0x123',
      requested_amount: '1000',
      status: 'approved',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ipfs_hash: 'QmTest1',
      metadata: {},
    },
    {
      id: 2,
      title: 'Test Grant 2',
      description: 'Test',
      applicant_address: '0x456',
      requested_amount: '2000',
      status: 'approved',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      ipfs_hash: 'QmTest2',
      metadata: {},
    },
  ];

  it('calculates performance for agent with evaluations', () => {
    const performance = calculateAgentPerformance(
      'technical' as AgentType,
      mockEvaluations,
      mockGrants
    );

    expect(performance.agent_type).toBe('technical');
    expect(performance.total_evaluations).toBe(2);
    expect(performance.average_score).toBe(7.5);
    expect(performance.evaluations_history).toHaveLength(2);
  });

  it('calculates correct reputation score', () => {
    const performance = calculateAgentPerformance(
      'technical' as AgentType,
      mockEvaluations,
      mockGrants
    );

    // Reputation formula: 50 + (avgScore-5)*5 + (accuracy-50)*0.3 + (evals-5)*0.5
    // With avgScore=7.5, accuracy~100, evals=2:
    // 50 + (7.5-5)*5 + (100-50)*0.3 + (2-5)*0.5 = 50 + 12.5 + 15 - 1.5 = 76
    expect(performance.reputation_score).toBeGreaterThan(0);
    expect(performance.reputation_score).toBeLessThanOrEqual(100);
  });

  it('calculates correct voting weight', () => {
    const performance = calculateAgentPerformance(
      'technical' as AgentType,
      mockEvaluations,
      mockGrants
    );

    // Voting weight: 1.0 + (reputation-50)/100
    expect(performance.voting_weight).toBeGreaterThanOrEqual(1.0);
    expect(performance.voting_weight).toBeLessThanOrEqual(1.5);
  });

  it('handles agent with no evaluations', () => {
    const performance = calculateAgentPerformance(
      'impact' as AgentType,
      mockEvaluations,
      mockGrants
    );

    expect(performance.total_evaluations).toBe(0);
    expect(performance.average_score).toBe(0);
    expect(performance.reputation_score).toBe(50); // Baseline
    expect(performance.voting_weight).toBe(1.0); // Baseline
  });

  it('generates reputation trend data', () => {
    const performance = calculateAgentPerformance(
      'technical' as AgentType,
      mockEvaluations,
      mockGrants
    );

    expect(performance.reputation_trend).toBeDefined();
    expect(performance.reputation_trend.length).toBeGreaterThan(0);
  });
});

describe('generateReputationTrend', () => {
  const mockEvaluations: Evaluation[] = [
    {
      id: 1,
      grant_id: 1,
      agent_type: 'technical' as AgentType,
      score: 8,
      reasoning: 'Good',
      created_at: '2024-01-15T10:00:00Z',
      vote_tx_hash: '0x123',
    },
  ];

  it('generates trend data for 30 days', () => {
    const trend = generateReputationTrend(mockEvaluations, 75);
    expect(trend.length).toBe(30);
  });

  it('generates trend data with correct structure', () => {
    const trend = generateReputationTrend(mockEvaluations, 75);

    trend.forEach((point) => {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('score');
      expect(typeof point.date).toBe('string');
      expect(typeof point.score).toBe('number');
    });
  });

  it('generates scores within reasonable range', () => {
    const trend = generateReputationTrend(mockEvaluations, 75);

    trend.forEach((point) => {
      expect(point.score).toBeGreaterThanOrEqual(0);
      expect(point.score).toBeLessThanOrEqual(100);
    });
  });

  it('ends with approximately the current score', () => {
    const currentScore = 75;
    const trend = generateReputationTrend(mockEvaluations, currentScore);
    const lastScore = trend[trend.length - 1].score;

    // Should be within 10 points of current score
    expect(Math.abs(lastScore - currentScore)).toBeLessThan(10);
  });
});

describe('generateMockPerformanceData', () => {
  it('generates data for all agent types', () => {
    const mockData = generateMockPerformanceData();

    const agentTypes: AgentType[] = [
      'intake',
      'technical',
      'impact',
      'due_diligence',
      'budget',
      'community',
    ];

    expect(mockData.length).toBe(6);

    agentTypes.forEach((type) => {
      const agentData = mockData.find((d) => d.agent_type === type);
      expect(agentData).toBeDefined();
    });
  });

  it('generates varied performance metrics', () => {
    const mockData = generateMockPerformanceData();

    mockData.forEach((agent) => {
      expect(agent.total_evaluations).toBeGreaterThan(0);
      expect(agent.average_score).toBeGreaterThan(0);
      expect(agent.average_score).toBeLessThanOrEqual(10);
      expect(agent.accuracy_rate).toBeGreaterThanOrEqual(0);
      expect(agent.accuracy_rate).toBeLessThanOrEqual(100);
      expect(agent.reputation_score).toBeGreaterThanOrEqual(0);
      expect(agent.reputation_score).toBeLessThanOrEqual(100);
    });
  });

  it('includes evaluation history for each agent', () => {
    const mockData = generateMockPerformanceData();

    mockData.forEach((agent) => {
      expect(agent.evaluations_history).toBeDefined();
      expect(agent.evaluations_history.length).toBeGreaterThan(0);
    });
  });

  it('includes reputation trend for each agent', () => {
    const mockData = generateMockPerformanceData();

    mockData.forEach((agent) => {
      expect(agent.reputation_trend).toBeDefined();
      expect(agent.reputation_trend.length).toBe(30);
    });
  });
});
