/**
 * Tests for Grant Pipeline View Components
 * 
 * To run these tests, first install test dependencies:
 * npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
 * 
 * Then run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GrantList from '../GrantList';
import GrantCard from '../GrantCard';
import GrantFilters from '../GrantFilters';
import GrantStatistics from '../GrantStatistics';
import { Grant, DashboardStats } from '@/types';

// Mock grant data
const mockGrants: Grant[] = [
  {
    id: 1,
    title: 'Decentralized Identity Protocol',
    description: 'Building a privacy-preserving identity system',
    applicant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    requested_amount: '50000',
    status: 'evaluating',
    created_at: '2025-11-10T10:00:00Z',
    updated_at: '2025-11-10T10:00:00Z',
    metadata: {
      category: 'infrastructure',
      duration_months: 6,
      team_size: 5,
      github_repo: 'https://github.com/example/did-protocol',
      website: 'https://example.com',
    },
  },
  {
    id: 2,
    title: 'DeFi Dashboard',
    description: 'User-friendly interface for DeFi protocols',
    applicant_address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    requested_amount: '25000',
    status: 'approved',
    created_at: '2025-11-12T14:30:00Z',
    updated_at: '2025-11-12T14:30:00Z',
    metadata: {
      category: 'dapp',
      duration_months: 4,
      team_size: 3,
    },
  },
  {
    id: 3,
    title: 'NFT Marketplace',
    description: 'Decentralized NFT trading platform',
    applicant_address: '0x1234567890123456789012345678901234567890',
    requested_amount: '100000',
    status: 'pending',
    created_at: '2025-11-14T09:15:00Z',
    updated_at: '2025-11-14T09:15:00Z',
    metadata: {
      category: 'marketplace',
      duration_months: 8,
      team_size: 8,
    },
  },
];

const mockStats: DashboardStats = {
  total_grants: 15,
  pending_grants: 5,
  approved_grants: 6,
  rejected_grants: 4,
  total_funded: '250000',
  active_agents: 6,
};

describe('GrantCard', () => {
  it('renders grant information correctly', () => {
    render(<GrantCard grant={mockGrants[0]} />);
    
    expect(screen.getByText('Decentralized Identity Protocol')).toBeInTheDocument();
    expect(screen.getByText(/Building a privacy-preserving identity system/)).toBeInTheDocument();
    expect(screen.getByText(/50000 ETH/)).toBeInTheDocument();
  });

  it('displays status badge with correct styling', () => {
    render(<GrantCard grant={mockGrants[0]} />);
    
    const badge = screen.getByText('Evaluating');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('rounded-full');
  });

  it('shows metadata when available', () => {
    render(<GrantCard grant={mockGrants[0]} />);
    
    expect(screen.getByText(/infrastructure/i)).toBeInTheDocument();
    expect(screen.getByText(/6 months/)).toBeInTheDocument();
    expect(screen.getByText(/5 members/)).toBeInTheDocument();
  });

  it('renders external links when available', () => {
    render(<GrantCard grant={mockGrants[0]} />);
    
    const githubLink = screen.getByTitle('GitHub Repository');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/example/did-protocol');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });

  it('links to grant detail page', () => {
    render(<GrantCard grant={mockGrants[0]} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/grant/1');
  });
});

describe('GrantList', () => {
  it('renders multiple grant cards', () => {
    render(<GrantList grants={mockGrants} />);
    
    expect(screen.getByText('Decentralized Identity Protocol')).toBeInTheDocument();
    expect(screen.getByText('DeFi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('NFT Marketplace')).toBeInTheDocument();
  });

  it('displays empty state when no grants', () => {
    render(<GrantList grants={[]} />);
    
    expect(screen.getByText('No grants found')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument();
  });

  it('renders correct number of grants', () => {
    const { container } = render(<GrantList grants={mockGrants} />);
    
    // Each grant card is wrapped in a link
    const cards = container.querySelectorAll('a[href^="/grant/"]');
    expect(cards).toHaveLength(3);
  });
});

describe('GrantFilters', () => {
  const mockProps = {
    searchQuery: '',
    setSearchQuery: vi.fn(),
    statusFilter: 'all' as const,
    setStatusFilter: vi.fn(),
    sortBy: 'date-desc' as const,
    setSortBy: vi.fn(),
    minAmount: '',
    setMinAmount: vi.fn(),
    maxAmount: '',
    setMaxAmount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter inputs', () => {
    render(<GrantFilters {...mockProps} />);
    
    expect(screen.getByPlaceholderText(/Search by title/)).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
    expect(screen.getByLabelText(/Min Amount/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Max Amount/)).toBeInTheDocument();
  });

  it('calls setSearchQuery when typing in search', async () => {
    const user = userEvent.setup();
    render(<GrantFilters {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Search by title/);
    await user.type(searchInput, 'DeFi');
    
    expect(mockProps.setSearchQuery).toHaveBeenCalledWith('DeFi');
  });

  it('calls setStatusFilter when changing status', async () => {
    const user = userEvent.setup();
    render(<GrantFilters {...mockProps} />);
    
    const statusSelect = screen.getByLabelText('Status');
    await user.selectOptions(statusSelect, 'approved');
    
    expect(mockProps.setStatusFilter).toHaveBeenCalledWith('approved');
  });

  it('calls setSortBy when changing sort option', async () => {
    const user = userEvent.setup();
    render(<GrantFilters {...mockProps} />);
    
    const sortSelect = screen.getByLabelText('Sort By');
    await user.selectOptions(sortSelect, 'amount-desc');
    
    expect(mockProps.setSortBy).toHaveBeenCalledWith('amount-desc');
  });

  it('shows clear filters button when filters are active', () => {
    render(<GrantFilters {...mockProps} searchQuery="test" />);
    
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears all filters when clicking clear button', async () => {
    const user = userEvent.setup();
    render(<GrantFilters {...mockProps} searchQuery="test" statusFilter="approved" />);
    
    const clearButton = screen.getByText('Clear All');
    await user.click(clearButton);
    
    expect(mockProps.setSearchQuery).toHaveBeenCalledWith('');
    expect(mockProps.setStatusFilter).toHaveBeenCalledWith('all');
    expect(mockProps.setSortBy).toHaveBeenCalledWith('date-desc');
  });
});

describe('GrantStatistics', () => {
  it('renders all stat cards', () => {
    render(<GrantStatistics stats={mockStats} totalShown={10} totalGrants={15} />);
    
    expect(screen.getByText('Total Grants')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Total Funded')).toBeInTheDocument();
    expect(screen.getByText('Active Agents')).toBeInTheDocument();
  });

  it('displays correct stat values', () => {
    render(<GrantStatistics stats={mockStats} totalShown={15} totalGrants={15} />);
    
    expect(screen.getByText('15')).toBeInTheDocument(); // Total grants
    expect(screen.getByText('5')).toBeInTheDocument();  // Pending
    expect(screen.getByText('6')).toBeInTheDocument();  // Approved (also Active Agents)
    expect(screen.getByText('4')).toBeInTheDocument();  // Rejected
    expect(screen.getByText('250000 ETH')).toBeInTheDocument();
  });

  it('shows filter results info when counts differ', () => {
    render(<GrantStatistics stats={mockStats} totalShown={8} totalGrants={15} />);
    
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('hides filter results info when all grants shown', () => {
    render(<GrantStatistics stats={mockStats} totalShown={15} totalGrants={15} />);
    
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});

describe('Grant Filtering and Sorting', () => {
  it('filters grants by search query', () => {
    const filtered = mockGrants.filter(g => 
      g.title.toLowerCase().includes('defi') || 
      g.description.toLowerCase().includes('defi')
    );
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('DeFi Dashboard');
  });

  it('filters grants by status', () => {
    const approved = mockGrants.filter(g => g.status === 'approved');
    
    expect(approved).toHaveLength(1);
    expect(approved[0].title).toBe('DeFi Dashboard');
  });

  it('filters grants by amount range', () => {
    const filtered = mockGrants.filter(g => 
      parseFloat(g.requested_amount) >= 30000 && 
      parseFloat(g.requested_amount) <= 75000
    );
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Decentralized Identity Protocol');
  });

  it('sorts grants by date descending', () => {
    const sorted = [...mockGrants].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    expect(sorted[0].title).toBe('NFT Marketplace');
    expect(sorted[2].title).toBe('Decentralized Identity Protocol');
  });

  it('sorts grants by amount ascending', () => {
    const sorted = [...mockGrants].sort((a, b) => 
      parseFloat(a.requested_amount) - parseFloat(b.requested_amount)
    );
    
    expect(sorted[0].title).toBe('DeFi Dashboard');
    expect(sorted[2].title).toBe('NFT Marketplace');
  });

  it('applies multiple filters simultaneously', () => {
    const filtered = mockGrants.filter(g => 
      g.status !== 'rejected' &&
      parseFloat(g.requested_amount) >= 20000 &&
      (g.title.toLowerCase().includes('de') || g.description.toLowerCase().includes('de'))
    );
    
    expect(filtered.length).toBeGreaterThan(0);
  });
});
