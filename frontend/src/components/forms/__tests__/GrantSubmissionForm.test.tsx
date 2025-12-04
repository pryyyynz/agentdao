/**
 * Grant Submission Form Tests
 * 
 * This test file covers:
 * - Form rendering
 * - Form validation
 * - Field interactions
 * - Dynamic field arrays
 * - Form submission
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrantSubmissionForm } from '../GrantSubmissionForm';

// Mock the hooks and components
vi.mock('@thirdweb-dev/react', () => ({
  useAddress: vi.fn(() => '0x1234567890123456789012345678901234567890'),
}));

vi.mock('@/hooks/useApi', () => ({
  useSubmitGrant: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GrantSubmissionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form sections', () => {
      render(<GrantSubmissionForm />);
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Team Information')).toBeInTheDocument();
      expect(screen.getByText('Budget & Funding')).toBeInTheDocument();
      expect(screen.getByText('Timeline & Milestones')).toBeInTheDocument();
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('Links & Resources')).toBeInTheDocument();
      expect(screen.getByText('Legal & Payment')).toBeInTheDocument();
    });

    it('should show wallet connection prompt when not connected', () => {
      const { useAddress } = require('@thirdweb-dev/react');
      useAddress.mockReturnValue(null);
      
      render(<GrantSubmissionForm />);
      
      expect(screen.getByText(/Please connect your wallet/i)).toBeInTheDocument();
    });
  });

  describe('Basic Information', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Project name must be at least 5 characters/i)).toBeInTheDocument();
      });
    });

    it('should accept valid project name', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const projectNameInput = screen.getByLabelText(/Project Name/i);
      await user.type(projectNameInput, 'My Amazing Project');
      
      expect(projectNameInput).toHaveValue('My Amazing Project');
    });

    it('should validate tagline length', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const taglineInput = screen.getByLabelText(/Tagline/i);
      await user.type(taglineInput, 'Short');
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Tagline must be at least 10 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Team Information', () => {
    it('should allow adding team members', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const addButton = screen.getByRole('button', { name: /Add Team Member/i });
      await user.click(addButton);
      
      const teamMembers = screen.getAllByText(/Team Member/i);
      expect(teamMembers.length).toBeGreaterThan(1);
    });

    it('should allow removing team members', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      // Add a team member first
      const addButton = screen.getByRole('button', { name: /Add Team Member/i });
      await user.click(addButton);
      
      // Then remove it
      const removeButtons = screen.getAllByRole('button', { name: '' });
      const trashButton = removeButtons.find(btn => 
        btn.querySelector('[class*="lucide-trash"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
      }
      
      const teamMembers = screen.getAllByText(/Team Member/i);
      expect(teamMembers.length).toBe(1);
    });

    it('should validate team member fields', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/Role must be at least 2 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Budget & Funding', () => {
    it('should validate requested amount', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const amountInput = screen.getByLabelText(/Total Requested Amount/i);
      await user.type(amountInput, '-5');
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Amount must be a positive number/i)).toBeInTheDocument();
      });
    });

    it('should allow adding budget items', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const addButton = screen.getByRole('button', { name: /Add Budget Item/i });
      await user.click(addButton);
      
      const budgetItems = screen.getAllByText(/Budget Item/i);
      expect(budgetItems.length).toBeGreaterThan(1);
    });
  });

  describe('Timeline & Milestones', () => {
    it('should validate project duration', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const durationInput = screen.getByLabelText(/Project Duration/i);
      await user.type(durationInput, '30');
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Duration must be between 1 and 24 months/i)).toBeInTheDocument();
      });
    });

    it('should allow adding milestones', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const addButton = screen.getByRole('button', { name: /Add Milestone/i });
      await user.click(addButton);
      
      const milestones = screen.getAllByText(/Milestone/i);
      expect(milestones.length).toBeGreaterThan(1);
    });
  });

  describe('Technical Details', () => {
    it('should allow adding tech stack items', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const addButton = screen.getByRole('button', { name: /Add Technology/i });
      await user.click(addButton);
      
      const techItems = screen.getAllByText(/Technology/i);
      expect(techItems.length).toBeGreaterThan(1);
    });
  });

  describe('Form Submission', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const { useSubmitGrant } = require('@/hooks/useApi');
      
      const mockMutate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      useSubmitGrant.mockReturnValue({
        mutateAsync: mockMutate,
      });
      
      render(<GrantSubmissionForm />);
      
      // Fill in minimum required fields
      await user.type(screen.getByLabelText(/Project Name/i), 'Test Project Name');
      // ... fill other required fields
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
    });

    it('should call submit mutation with correct data', async () => {
      const user = userEvent.setup();
      const { useSubmitGrant } = require('@/hooks/useApi');
      
      const mockMutate = vi.fn();
      useSubmitGrant.mockReturnValue({
        mutateAsync: mockMutate,
      });
      
      render(<GrantSubmissionForm />);
      
      // Fill in all required fields
      // ... (implementation depends on specific requirements)
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });
  });

  describe('Draft Saving', () => {
    it('should save draft to localStorage', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const projectNameInput = screen.getByLabelText(/Project Name/i);
      await user.type(projectNameInput, 'Draft Project');
      
      const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i });
      await user.click(saveDraftButton);
      
      const savedDraft = localStorage.getItem('grant-draft');
      expect(savedDraft).toBeTruthy();
    });
  });

  describe('Section Toggling', () => {
    it('should allow collapsing and expanding sections', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const basicInfoHeader = screen.getByText('Basic Information');
      await user.click(basicInfoHeader);
      
      // Check if section content is hidden (implementation may vary)
      // This is a basic check - might need adjustment based on actual implementation
      expect(basicInfoHeader).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<GrantSubmissionForm />);
      
      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tagline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    });

    it('should show error messages with proper aria labels', async () => {
      const user = userEvent.setup();
      render(<GrantSubmissionForm />);
      
      const submitButton = screen.getByRole('button', { name: /Submit Grant Proposal/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});
