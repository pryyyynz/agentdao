import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GrantOverview from "../GrantOverview";
import EvaluationResults from "../EvaluationResults";
import VotingBreakdown from "../VotingBreakdown";
import MilestoneTracker from "../MilestoneTracker";
import EventTimeline from "../EventTimeline";
import ExportActions from "../ExportActions";
import { Grant, Evaluation, Milestone, AgentActivity } from "@/types";

// Mock data
const mockGrant: Grant = {
  id: 1,
  title: "Test Grant",
  description: "Test grant description",
  applicant_address: "0x1234567890123456789012345678901234567890",
  requested_amount: "10.5",
  status: "evaluating",
  ipfs_hash: "QmTest123",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  metadata: {
    category: "DeFi",
    duration_months: 6,
    team_size: 3,
    github_repo: "https://github.com/test/repo",
    website: "https://test.com",
    twitter: "testproject",
  },
};

const mockEvaluations: Evaluation[] = [
  {
    id: 1,
    grant_id: 1,
    agent_type: "technical",
    score: 8,
    reasoning: "Strong technical proposal",
    created_at: "2024-01-02T00:00:00Z",
    vote_tx_hash: "0xabc123",
  },
  {
    id: 2,
    grant_id: 1,
    agent_type: "impact",
    score: 7,
    reasoning: "Good potential impact",
    created_at: "2024-01-03T00:00:00Z",
  },
  {
    id: 3,
    grant_id: 1,
    agent_type: "budget",
    score: 5,
    reasoning: "Budget concerns",
    created_at: "2024-01-04T00:00:00Z",
  },
];

const mockMilestones: Milestone[] = [
  {
    id: 1,
    grant_id: 1,
    title: "Phase 1 Completion",
    description: "Complete initial development",
    amount: "3.5",
    deadline: "2024-03-01T00:00:00Z",
    status: "released",
    completed_at: "2024-02-15T00:00:00Z",
    release_tx_hash: "0xdef456",
  },
  {
    id: 2,
    grant_id: 1,
    title: "Phase 2 Completion",
    description: "Deploy to testnet",
    amount: "3.5",
    deadline: "2024-06-01T00:00:00Z",
    status: "completed",
    completed_at: "2024-05-20T00:00:00Z",
  },
  {
    id: 3,
    grant_id: 1,
    title: "Phase 3 Completion",
    description: "Launch on mainnet",
    amount: "3.5",
    deadline: "2024-09-01T00:00:00Z",
    status: "pending",
  },
];

const mockActivities: AgentActivity[] = [
  {
    id: "1",
    agent_type: "intake",
    grant_id: 1,
    action: "Grant Received",
    message: "Application received and queued for evaluation",
    timestamp: "2024-01-01T01:00:00Z",
  },
  {
    id: "2",
    agent_type: "technical",
    grant_id: 1,
    action: "Evaluation Started",
    message: "Technical evaluation in progress",
    timestamp: "2024-01-02T00:00:00Z",
  },
];

describe("GrantOverview", () => {
  it("renders grant title and description", () => {
    render(<GrantOverview grant={mockGrant} />);
    expect(screen.getByText("Test Grant")).toBeInTheDocument();
    expect(screen.getByText("Test grant description")).toBeInTheDocument();
  });

  it("displays grant status badge", () => {
    render(<GrantOverview grant={mockGrant} />);
    expect(screen.getByText("Evaluating")).toBeInTheDocument();
  });

  it("shows key metrics", () => {
    render(<GrantOverview grant={mockGrant} />);
    expect(screen.getByText("10.5 ETH")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("displays project metadata", () => {
    render(<GrantOverview grant={mockGrant} />);
    expect(screen.getByText("DeFi")).toBeInTheDocument();
    expect(screen.getByText("6 months")).toBeInTheDocument();
    expect(screen.getByText("3 members")).toBeInTheDocument();
  });

  it("renders external links", () => {
    render(<GrantOverview grant={mockGrant} />);
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Twitter")).toBeInTheDocument();
  });

  it("shows IPFS link when hash provided", () => {
    render(<GrantOverview grant={mockGrant} />);
    expect(screen.getByText("View on IPFS")).toBeInTheDocument();
  });

  it("hides IPFS section when no hash", () => {
    const grantNoIpfs = { ...mockGrant, ipfs_hash: undefined };
    render(<GrantOverview grant={grantNoIpfs} />);
    expect(screen.queryByText("View on IPFS")).not.toBeInTheDocument();
  });
});

describe("EvaluationResults", () => {
  it("calculates and displays average score", () => {
    render(<EvaluationResults evaluations={mockEvaluations} />);
    // Average of 8, 7, 5 = 6.7
    expect(screen.getByText(/6\.7/)).toBeInTheDocument();
  });

  it("shows evaluation counts", () => {
    render(<EvaluationResults evaluations={mockEvaluations} />);
    expect(screen.getByText("3")).toBeInTheDocument(); // Total
    expect(screen.getByText("2")).toBeInTheDocument(); // Passed (≥6)
    expect(screen.getByText("1")).toBeInTheDocument(); // Failed (<6)
  });

  it("renders individual evaluation cards", () => {
    render(<EvaluationResults evaluations={mockEvaluations} />);
    expect(screen.getByText("Technical Agent")).toBeInTheDocument();
    expect(screen.getByText("Impact Agent")).toBeInTheDocument();
    expect(screen.getByText("Budget Agent")).toBeInTheDocument();
  });

  it("displays evaluation reasoning", () => {
    render(<EvaluationResults evaluations={mockEvaluations} />);
    expect(screen.getByText("Strong technical proposal")).toBeInTheDocument();
    expect(screen.getByText("Good potential impact")).toBeInTheDocument();
  });

  it("shows transaction links for on-chain votes", () => {
    render(<EvaluationResults evaluations={mockEvaluations} />);
    expect(screen.getByText("Vote recorded on-chain")).toBeInTheDocument();
  });

  it("shows empty state when no evaluations", () => {
    render(<EvaluationResults evaluations={[]} />);
    expect(screen.getByText(/No evaluations yet/)).toBeInTheDocument();
  });

  it("applies correct score colors", () => {
    const { container } = render(<EvaluationResults evaluations={mockEvaluations} />);
    // Should have green (≥8), yellow (≥6<8), and red (<6) colors
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    expect(container.querySelector('.text-yellow-600')).toBeInTheDocument();
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });
});

describe("VotingBreakdown", () => {
  it("calculates approval rate correctly", () => {
    render(<VotingBreakdown evaluations={mockEvaluations} />);
    // 2 passed out of 3 = 66.7%
    expect(screen.getByText(/66\.7%/)).toBeInTheDocument();
  });

  it("shows voting statistics", () => {
    render(<VotingBreakdown evaluations={mockEvaluations} />);
    expect(screen.getByText("3")).toBeInTheDocument(); // Total votes
    expect(screen.getByText("1")).toBeInTheDocument(); // On-chain
    expect(screen.getByText("2")).toBeInTheDocument(); // Approved
  });

  it("displays weighted average", () => {
    render(<VotingBreakdown evaluations={mockEvaluations} />);
    // Weighted: (8*2 + 7*1 + 5*1) / (2+1+1) = 6.75
    expect(screen.getByText(/6\.75/)).toBeInTheDocument();
  });

  it("shows quorum status", () => {
    render(<VotingBreakdown evaluations={mockEvaluations} />);
    expect(screen.getByText(/3\/5 Votes/)).toBeInTheDocument();
  });

  it("renders vote distribution list", () => {
    render(<VotingBreakdown evaluations={mockEvaluations} />);
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("On-Chain")).toBeInTheDocument();
  });

  it("displays approval progress bar", () => {
    const { container } = render(<VotingBreakdown evaluations={mockEvaluations} />);
    const progressBar = container.querySelector('.bg-gradient-to-r');
    expect(progressBar).toHaveStyle({ width: '66.7%' });
  });
});

describe("MilestoneTracker", () => {
  it("calculates progress correctly", () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    // 3.5 released out of 10.5 total = 33.3%
    expect(screen.getByText(/33\.3% complete/)).toBeInTheDocument();
  });

  it("shows milestone counts by status", () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getByText("1")).toBeInTheDocument(); // Pending
    expect(screen.getByText("1")).toBeInTheDocument(); // Completed
    expect(screen.getByText("1")).toBeInTheDocument(); // Released
  });

  it("renders milestone titles and descriptions", () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getByText("Phase 1 Completion")).toBeInTheDocument();
    expect(screen.getByText("Complete initial development")).toBeInTheDocument();
  });

  it("shows release transaction links", () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getByText("View Release Transaction")).toBeInTheDocument();
  });

  it("displays empty state when no milestones", () => {
    render(<MilestoneTracker milestones={[]} />);
    expect(screen.getByText(/No milestones defined yet/)).toBeInTheDocument();
  });

  it("shows completion timestamps", () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0);
  });

  it("applies correct status colors", () => {
    const { container } = render(<MilestoneTracker milestones={mockMilestones} />);
    expect(container.querySelector('.text-green-600')).toBeInTheDocument(); // Completed
    expect(container.querySelector('.text-blue-600')).toBeInTheDocument(); // Released
    expect(container.querySelector('.text-gray-400')).toBeInTheDocument(); // Pending
  });
});

describe("EventTimeline", () => {
  it("combines activities and evaluations", () => {
    render(
      <EventTimeline
        activities={mockActivities}
        evaluations={mockEvaluations}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    // Should show grant created + 2 activities + 3 evaluations = 6 events
    expect(screen.getByText(/6 events/)).toBeInTheDocument();
  });

  it("shows grant creation event", () => {
    render(
      <EventTimeline
        activities={mockActivities}
        evaluations={mockEvaluations}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    expect(screen.getByText("Grant Submitted")).toBeInTheDocument();
  });

  it("renders activity events", () => {
    render(
      <EventTimeline
        activities={mockActivities}
        evaluations={mockEvaluations}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    expect(screen.getByText("Grant Received")).toBeInTheDocument();
    expect(screen.getByText("Evaluation Started")).toBeInTheDocument();
  });

  it("renders evaluation events", () => {
    render(
      <EventTimeline
        activities={mockActivities}
        evaluations={mockEvaluations}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    expect(screen.getByText("Technical Evaluation")).toBeInTheDocument();
  });

  it("sorts events chronologically (newest first)", () => {
    const { container } = render(
      <EventTimeline
        activities={mockActivities}
        evaluations={mockEvaluations}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    const events = container.querySelectorAll('.relative.flex');
    // Most recent event should be first
    expect(events[0]).toHaveTextContent("Budget Agent Evaluation");
  });

  it("shows relative timestamps", () => {
    render(
      <EventTimeline
        activities={mockActivities}
        evaluations={mockEvaluations}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0);
  });

  it("displays empty state when no events", () => {
    render(
      <EventTimeline
        activities={[]}
        evaluations={[]}
        grantCreatedAt={mockGrant.created_at}
      />
    );
    expect(screen.getByText(/No events yet/)).toBeInTheDocument();
  });
});

describe("ExportActions", () => {
  beforeEach(() => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement
    const mockAnchor = {
      click: vi.fn(),
      href: "",
      download: "",
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockAnchor as any);
  });

  it("renders export buttons", () => {
    render(
      <ExportActions
        grant={mockGrant}
        evaluations={mockEvaluations}
        activities={mockActivities}
      />
    );
    expect(screen.getByText("Download JSON")).toBeInTheDocument();
    expect(screen.getByText("Download Report")).toBeInTheDocument();
  });

  it("downloads JSON when clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExportActions
        grant={mockGrant}
        evaluations={mockEvaluations}
        activities={mockActivities}
      />
    );
    
    const jsonButton = screen.getByText("Download JSON").closest("button");
    await user.click(jsonButton!);
    
    expect(document.createElement).toHaveBeenCalledWith("a");
  });

  it("downloads report when clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExportActions
        grant={mockGrant}
        evaluations={mockEvaluations}
        activities={mockActivities}
      />
    );
    
    const reportButton = screen.getByText("Download Report").closest("button");
    await user.click(reportButton!);
    
    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalled();
    });
  });

  it("shows IPFS link when hash provided", () => {
    render(
      <ExportActions
        grant={mockGrant}
        evaluations={mockEvaluations}
        activities={mockActivities}
      />
    );
    expect(screen.getByText("View on IPFS")).toBeInTheDocument();
  });

  it("copies link to clipboard", async () => {
    const user = userEvent.setup();
    const mockClipboard = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockClipboard,
      },
    });
    
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000/grant/1" },
      writable: true,
    });

    // Mock alert
    global.alert = vi.fn();
    
    render(
      <ExportActions
        grant={mockGrant}
        evaluations={mockEvaluations}
        activities={mockActivities}
      />
    );
    
    const copyButton = screen.getByText("Copy Link").closest("button");
    await user.click(copyButton!);
    
    expect(mockClipboard).toHaveBeenCalledWith("http://localhost:3000/grant/1");
    expect(global.alert).toHaveBeenCalledWith("Link copied to clipboard!");
  });
});
