// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MilestoneGrantRegistry
 * @dev Manages grants with milestone-based payments for AgentDAO
 * @notice Supports both traditional one-time payments and milestone-based payments
 */
contract MilestoneGrantRegistry is Ownable, ReentrancyGuard {
    
    // Enums
    enum GrantStatus {
        Pending,
        UnderReview,
        Approved,
        Rejected,
        Active,
        Completed,
        Cancelled
    }

    enum MilestoneStatus {
        Pending,
        Active,
        Submitted,
        UnderReview,
        Approved,
        Rejected,
        Paid
    }

    // Structs
    struct Grant {
        uint256 id;
        address applicant;
        string ipfsHash;
        uint256 totalAmount;
        GrantStatus status;
        uint256 score;
        uint256 timestamp;
        bool hasMilestones;
        uint256 milestoneCount;
        uint256 paidAmount;
    }

    struct Milestone {
        uint256 grantId;
        uint256 milestoneNumber;
        string title;
        uint256 amount;
        MilestoneStatus status;
        string proofOfWorkHash; // IPFS hash of proof of work
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 paidAt;
        bytes32 paymentTxHash;
    }

    // State variables
    uint256 private grantCounter;
    mapping(uint256 => Grant) private grants;
    mapping(uint256 => mapping(uint256 => Milestone)) private milestones; // grantId => milestoneNumber => Milestone
    mapping(address => bool) public agents;
    mapping(address => bool) public admins;
    
    // Treasury
    uint256 public totalDeposited;
    uint256 public totalPaid;

    // Events
    event GrantSubmitted(
        uint256 indexed grantId,
        address indexed applicant,
        string ipfsHash,
        uint256 amount,
        bool hasMilestones,
        uint256 timestamp
    );
    
    event GrantStatusChanged(
        uint256 indexed grantId,
        GrantStatus oldStatus,
        GrantStatus newStatus,
        uint256 score
    );

    event MilestoneCreated(
        uint256 indexed grantId,
        uint256 indexed milestoneNumber,
        string title,
        uint256 amount
    );

    event MilestoneSubmitted(
        uint256 indexed grantId,
        uint256 indexed milestoneNumber,
        string proofOfWorkHash,
        uint256 timestamp
    );

    event MilestoneApproved(
        uint256 indexed grantId,
        uint256 indexed milestoneNumber,
        uint256 timestamp
    );

    event MilestoneRejected(
        uint256 indexed grantId,
        uint256 indexed milestoneNumber,
        uint256 timestamp
    );

    event MilestonePaid(
        uint256 indexed grantId,
        uint256 indexed milestoneNumber,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event FundsDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 timestamp
    );

    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    // Modifiers
    modifier onlyAgents() {
        require(agents[msg.sender] || msg.sender == owner(), "Only agents or owner");
        _;
    }

    modifier onlyAdmins() {
        require(admins[msg.sender] || msg.sender == owner(), "Only admins or owner");
        _;
    }

    modifier grantExists(uint256 _grantId) {
        require(_grantId > 0 && _grantId <= grantCounter, "Grant does not exist");
        _;
    }

    modifier milestoneExists(uint256 _grantId, uint256 _milestoneNumber) {
        require(milestones[_grantId][_milestoneNumber].grantId != 0, "Milestone does not exist");
        _;
    }

    /**
     * @dev Constructor sets the contract deployer as the owner and admin
     */
    constructor() Ownable(msg.sender) {
        grantCounter = 0;
        admins[msg.sender] = true;
    }

    /**
     * @dev Receive function to accept ETH deposits
     */
    receive() external payable {
        totalDeposited += msg.value;
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Deposit funds to the contract treasury
     */
    function depositFunds() external payable {
        require(msg.value > 0, "Must send ETH");
        totalDeposited += msg.value;
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    // ============================================================================
    // AGENT & ADMIN MANAGEMENT
    // ============================================================================

    function addAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        require(!agents[_agent], "Agent already exists");
        agents[_agent] = true;
        emit AgentAdded(_agent);
    }

    function removeAgent(address _agent) external onlyOwner {
        require(agents[_agent], "Agent does not exist");
        agents[_agent] = false;
        emit AgentRemoved(_agent);
    }

    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        require(!admins[_admin], "Admin already exists");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(admins[_admin], "Admin does not exist");
        require(_admin != owner(), "Cannot remove owner");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    // ============================================================================
    // GRANT MANAGEMENT
    // ============================================================================

    /**
     * @dev Submit a new grant application
     * @param _ipfsHash IPFS hash of the grant proposal
     * @param _amount Requested grant amount in wei
     * @param _hasMilestones Whether this grant uses milestone-based payments
     * @return grantId The ID of the newly created grant
     */
    function submitGrant(
        string memory _ipfsHash,
        uint256 _amount,
        bool _hasMilestones
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_amount > 0, "Grant amount must be greater than zero");

        grantCounter++;
        
        grants[grantCounter] = Grant({
            id: grantCounter,
            applicant: msg.sender,
            ipfsHash: _ipfsHash,
            totalAmount: _amount,
            status: GrantStatus.Pending,
            score: 0,
            timestamp: block.timestamp,
            hasMilestones: _hasMilestones,
            milestoneCount: 0,
            paidAmount: 0
        });

        emit GrantSubmitted(
            grantCounter,
            msg.sender,
            _ipfsHash,
            _amount,
            _hasMilestones,
            block.timestamp
        );

        return grantCounter;
    }

    /**
     * @dev Update the status of a grant (only agents and owner)
     */
    function updateGrantStatus(
        uint256 _grantId,
        GrantStatus _newStatus,
        uint256 _score
    ) external onlyAgents grantExists(_grantId) {
        require(_score <= 100, "Score must be between 0 and 100");
        
        Grant storage grant = grants[_grantId];
        GrantStatus oldStatus = grant.status;
        
        grant.status = _newStatus;
        grant.score = _score;

        emit GrantStatusChanged(_grantId, oldStatus, _newStatus, _score);
    }

    // ============================================================================
    // MILESTONE MANAGEMENT
    // ============================================================================

    /**
     * @dev Create milestones for a grant (only grant applicant or admin)
     * @param _grantId Grant ID
     * @param _titles Array of milestone titles
     * @param _amounts Array of milestone amounts (must sum to grant total)
     */
    function createMilestones(
        uint256 _grantId,
        string[] memory _titles,
        uint256[] memory _amounts
    ) external grantExists(_grantId) {
        Grant storage grant = grants[_grantId];
        
        require(
            msg.sender == grant.applicant || admins[msg.sender] || msg.sender == owner(),
            "Only applicant or admin"
        );
        require(grant.hasMilestones, "Grant does not support milestones");
        require(grant.milestoneCount == 0, "Milestones already created");
        require(_titles.length > 0, "Must have at least one milestone");
        require(_titles.length == _amounts.length, "Arrays length mismatch");

        // Verify amounts sum to total
        uint256 sum = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Milestone amount must be > 0");
            sum += _amounts[i];
        }
        require(sum == grant.totalAmount, "Milestone amounts must sum to grant total");

        // Create milestones
        for (uint256 i = 0; i < _titles.length; i++) {
            uint256 milestoneNum = i + 1;
            
            milestones[_grantId][milestoneNum] = Milestone({
                grantId: _grantId,
                milestoneNumber: milestoneNum,
                title: _titles[i],
                amount: _amounts[i],
                status: milestoneNum == 1 ? MilestoneStatus.Active : MilestoneStatus.Pending,
                proofOfWorkHash: "",
                submittedAt: 0,
                approvedAt: 0,
                paidAt: 0,
                paymentTxHash: bytes32(0)
            });

            emit MilestoneCreated(_grantId, milestoneNum, _titles[i], _amounts[i]);
        }

        grant.milestoneCount = _titles.length;
    }

    /**
     * @dev Submit proof of work for a milestone
     * @param _grantId Grant ID
     * @param _milestoneNumber Milestone number
     * @param _proofOfWorkHash IPFS hash of proof of work
     */
    function submitMilestone(
        uint256 _grantId,
        uint256 _milestoneNumber,
        string memory _proofOfWorkHash
    ) external grantExists(_grantId) milestoneExists(_grantId, _milestoneNumber) {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = milestones[_grantId][_milestoneNumber];

        require(msg.sender == grant.applicant, "Only grant applicant");
        require(milestone.status == MilestoneStatus.Active, "Milestone not active");
        require(bytes(_proofOfWorkHash).length > 0, "Proof of work hash required");

        milestone.proofOfWorkHash = _proofOfWorkHash;
        milestone.status = MilestoneStatus.Submitted;
        milestone.submittedAt = block.timestamp;

        emit MilestoneSubmitted(_grantId, _milestoneNumber, _proofOfWorkHash, block.timestamp);
    }

    /**
     * @dev Approve a milestone (only admins)
     * @param _grantId Grant ID
     * @param _milestoneNumber Milestone number
     */
    function approveMilestone(
        uint256 _grantId,
        uint256 _milestoneNumber
    ) external onlyAdmins grantExists(_grantId) milestoneExists(_grantId, _milestoneNumber) {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = milestones[_grantId][_milestoneNumber];

        require(
            milestone.status == MilestoneStatus.Submitted || 
            milestone.status == MilestoneStatus.UnderReview,
            "Milestone not submitted"
        );

        milestone.status = MilestoneStatus.Approved;
        milestone.approvedAt = block.timestamp;

        emit MilestoneApproved(_grantId, _milestoneNumber, block.timestamp);

        // Activate next milestone if exists
        if (_milestoneNumber < grant.milestoneCount) {
            Milestone storage nextMilestone = milestones[_grantId][_milestoneNumber + 1];
            if (nextMilestone.status == MilestoneStatus.Pending) {
                nextMilestone.status = MilestoneStatus.Active;
            }
        }
    }

    /**
     * @dev Reject a milestone (only admins)
     * @param _grantId Grant ID
     * @param _milestoneNumber Milestone number
     */
    function rejectMilestone(
        uint256 _grantId,
        uint256 _milestoneNumber
    ) external onlyAdmins grantExists(_grantId) milestoneExists(_grantId, _milestoneNumber) {
        Milestone storage milestone = milestones[_grantId][_milestoneNumber];

        require(
            milestone.status == MilestoneStatus.Submitted || 
            milestone.status == MilestoneStatus.UnderReview,
            "Milestone not submitted"
        );

        milestone.status = MilestoneStatus.Rejected;

        emit MilestoneRejected(_grantId, _milestoneNumber, block.timestamp);
    }

    /**
     * @dev Release payment for an approved milestone (only admins)
     * @param _grantId Grant ID
     * @param _milestoneNumber Milestone number
     */
    function releaseMilestonePayment(
        uint256 _grantId,
        uint256 _milestoneNumber
    ) external onlyAdmins nonReentrant grantExists(_grantId) milestoneExists(_grantId, _milestoneNumber) {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = milestones[_grantId][_milestoneNumber];

        require(milestone.status == MilestoneStatus.Approved, "Milestone not approved");
        require(milestone.paidAt == 0, "Milestone already paid");
        require(address(this).balance >= milestone.amount, "Insufficient contract balance");

        // Update state before transfer (reentrancy protection)
        milestone.status = MilestoneStatus.Paid;
        milestone.paidAt = block.timestamp;
        milestone.paymentTxHash = keccak256(abi.encodePacked(block.timestamp, _grantId, _milestoneNumber));
        
        grant.paidAmount += milestone.amount;
        totalPaid += milestone.amount;

        // Transfer funds
        (bool success, ) = grant.applicant.call{value: milestone.amount}("");
        require(success, "Payment transfer failed");

        emit MilestonePaid(_grantId, _milestoneNumber, grant.applicant, milestone.amount, block.timestamp);

        // Check if all milestones are paid
        if (grant.paidAmount == grant.totalAmount) {
            grant.status = GrantStatus.Completed;
        }
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getGrant(uint256 _grantId) 
        external 
        view 
        grantExists(_grantId) 
        returns (Grant memory) 
    {
        return grants[_grantId];
    }

    function getMilestone(uint256 _grantId, uint256 _milestoneNumber)
        external
        view
        grantExists(_grantId)
        milestoneExists(_grantId, _milestoneNumber)
        returns (Milestone memory)
    {
        return milestones[_grantId][_milestoneNumber];
    }

    function getAllMilestones(uint256 _grantId)
        external
        view
        grantExists(_grantId)
        returns (Milestone[] memory)
    {
        Grant memory grant = grants[_grantId];
        Milestone[] memory result = new Milestone[](grant.milestoneCount);
        
        for (uint256 i = 1; i <= grant.milestoneCount; i++) {
            result[i - 1] = milestones[_grantId][i];
        }
        
        return result;
    }

    function getGrantCount() external view returns (uint256) {
        return grantCounter;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTreasuryStats() external view returns (
        uint256 balance,
        uint256 deposited,
        uint256 paid,
        uint256 available
    ) {
        return (
            address(this).balance,
            totalDeposited,
            totalPaid,
            address(this).balance
        );
    }

    function isAgent(address _address) external view returns (bool) {
        return agents[_address];
    }

    function isAdmin(address _address) external view returns (bool) {
        return admins[_address];
    }
}
