// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GrantTreasury
 * @dev Manages milestone-based fund disbursement for approved grants
 */
contract GrantTreasury is Ownable, Pausable, ReentrancyGuard {
    // Milestone structure
    struct Milestone {
        uint256 amount;
        string deliverable;
        bool completed;
        bool paid;
        uint256 deadline;
    }

    // Grant milestone schedule
    struct GrantSchedule {
        uint256 grantId;
        address recipient;
        uint256 totalAmount;
        uint256 paidAmount;
        Milestone[] milestones;
        bool exists;
    }

    // State variables
    mapping(uint256 => GrantSchedule) private grantSchedules;
    mapping(address => bool) public treasuryManagers;
    uint256 public totalDeposited;
    uint256 public totalDisbursed;

    // Events
    event FundsDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    
    event MilestoneScheduleCreated(
        uint256 indexed grantId,
        address indexed recipient,
        uint256 totalAmount,
        uint256 milestoneCount
    );
    
    event MilestoneCreated(
        uint256 indexed grantId,
        uint256 indexed milestoneIndex,
        uint256 amount,
        string deliverable,
        uint256 deadline
    );
    
    event MilestoneCompleted(
        uint256 indexed grantId,
        uint256 indexed milestoneIndex,
        uint256 timestamp
    );
    
    event FundsReleased(
        uint256 indexed grantId,
        uint256 indexed milestoneIndex,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event TreasuryManagerAdded(address indexed manager);
    event TreasuryManagerRemoved(address indexed manager);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);

    // Modifiers
    modifier onlyManagers() {
        require(
            treasuryManagers[msg.sender] || msg.sender == owner(),
            "Only treasury managers can call this function"
        );
        _;
    }

    modifier grantScheduleExists(uint256 _grantId) {
        require(grantSchedules[_grantId].exists, "Grant schedule does not exist");
        _;
    }

    modifier milestoneExists(uint256 _grantId, uint256 _milestoneIndex) {
        require(
            _milestoneIndex < grantSchedules[_grantId].milestones.length,
            "Milestone does not exist"
        );
        _;
    }

    /**
     * @dev Constructor sets the contract deployer as the owner
     */
    constructor() Ownable(msg.sender) {
        totalDeposited = 0;
        totalDisbursed = 0;
    }

    /**
     * @dev Receive function to accept ETH deposits
     */
    receive() external payable {
        depositFunds();
    }

    /**
     * @dev Fallback function to accept ETH deposits
     */
    fallback() external payable {
        depositFunds();
    }

    /**
     * @dev Add a treasury manager (only owner)
     * @param _manager Address of the manager to add
     */
    function addTreasuryManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid manager address");
        require(!treasuryManagers[_manager], "Manager already exists");
        
        treasuryManagers[_manager] = true;
        emit TreasuryManagerAdded(_manager);
    }

    /**
     * @dev Remove a treasury manager (only owner)
     * @param _manager Address of the manager to remove
     */
    function removeTreasuryManager(address _manager) external onlyOwner {
        require(treasuryManagers[_manager], "Manager does not exist");
        
        treasuryManagers[_manager] = false;
        emit TreasuryManagerRemoved(_manager);
    }

    /**
     * @dev Deposit funds into the treasury
     */
    function depositFunds() public payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        
        totalDeposited += msg.value;
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Create a milestone schedule for a grant
     * @param _grantId ID of the grant
     * @param _recipient Address of the grant recipient
     * @param _amounts Array of milestone amounts
     * @param _deliverables Array of milestone deliverables
     * @param _deadlines Array of milestone deadlines
     */
    function createMilestoneSchedule(
        uint256 _grantId,
        address _recipient,
        uint256[] memory _amounts,
        string[] memory _deliverables,
        uint256[] memory _deadlines
    ) external onlyManagers whenNotPaused {
        require(!grantSchedules[_grantId].exists, "Grant schedule already exists");
        require(_recipient != address(0), "Invalid recipient address");
        require(_amounts.length > 0, "Must have at least one milestone");
        require(
            _amounts.length == _deliverables.length && 
            _amounts.length == _deadlines.length,
            "Array lengths must match"
        );

        // Calculate total amount
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Milestone amount must be greater than zero");
            require(_deadlines[i] > block.timestamp, "Deadline must be in the future");
            totalAmount += _amounts[i];
        }

        // Create grant schedule
        GrantSchedule storage schedule = grantSchedules[_grantId];
        schedule.grantId = _grantId;
        schedule.recipient = _recipient;
        schedule.totalAmount = totalAmount;
        schedule.paidAmount = 0;
        schedule.exists = true;

        // Create milestones
        for (uint256 i = 0; i < _amounts.length; i++) {
            schedule.milestones.push(Milestone({
                amount: _amounts[i],
                deliverable: _deliverables[i],
                completed: false,
                paid: false,
                deadline: _deadlines[i]
            }));

            emit MilestoneCreated(
                _grantId,
                i,
                _amounts[i],
                _deliverables[i],
                _deadlines[i]
            );
        }

        emit MilestoneScheduleCreated(_grantId, _recipient, totalAmount, _amounts.length);
    }

    /**
     * @dev Mark a milestone as completed
     * @param _grantId ID of the grant
     * @param _milestoneIndex Index of the milestone
     */
    function markMilestoneComplete(
        uint256 _grantId,
        uint256 _milestoneIndex
    ) external onlyManagers whenNotPaused grantScheduleExists(_grantId) milestoneExists(_grantId, _milestoneIndex) {
        Milestone storage milestone = grantSchedules[_grantId].milestones[_milestoneIndex];
        
        require(!milestone.completed, "Milestone already completed");
        require(!milestone.paid, "Milestone already paid");
        
        milestone.completed = true;
        emit MilestoneCompleted(_grantId, _milestoneIndex, block.timestamp);
    }

    /**
     * @dev Release funds for a completed milestone
     * @param _grantId ID of the grant
     * @param _milestoneIndex Index of the milestone
     */
    function releaseMilestoneFund(
        uint256 _grantId,
        uint256 _milestoneIndex
    ) external onlyManagers whenNotPaused nonReentrant grantScheduleExists(_grantId) milestoneExists(_grantId, _milestoneIndex) {
        GrantSchedule storage schedule = grantSchedules[_grantId];
        Milestone storage milestone = schedule.milestones[_milestoneIndex];
        
        require(milestone.completed, "Milestone not completed");
        require(!milestone.paid, "Milestone already paid");
        require(address(this).balance >= milestone.amount, "Insufficient treasury balance");
        
        milestone.paid = true;
        schedule.paidAmount += milestone.amount;
        totalDisbursed += milestone.amount;

        // Transfer funds to recipient
        (bool success, ) = payable(schedule.recipient).call{value: milestone.amount}("");
        require(success, "Transfer failed");

        emit FundsReleased(
            _grantId,
            _milestoneIndex,
            schedule.recipient,
            milestone.amount,
            block.timestamp
        );
    }

    /**
     * @dev Get grant schedule details
     * @param _grantId ID of the grant
     * @return grantId Grant ID
     * @return recipient Recipient address
     * @return totalAmount Total grant amount
     * @return paidAmount Amount paid so far
     * @return milestoneCount Number of milestones
     */
    function getGrantSchedule(uint256 _grantId) 
        external 
        view 
        grantScheduleExists(_grantId) 
        returns (
            uint256 grantId,
            address recipient,
            uint256 totalAmount,
            uint256 paidAmount,
            uint256 milestoneCount
        ) 
    {
        GrantSchedule storage schedule = grantSchedules[_grantId];
        return (
            schedule.grantId,
            schedule.recipient,
            schedule.totalAmount,
            schedule.paidAmount,
            schedule.milestones.length
        );
    }

    /**
     * @dev Get milestone details
     * @param _grantId ID of the grant
     * @param _milestoneIndex Index of the milestone
     * @return amount Milestone amount
     * @return deliverable Milestone deliverable description
     * @return completed Whether milestone is completed
     * @return paid Whether milestone is paid
     * @return deadline Milestone deadline timestamp
     */
    function getMilestone(uint256 _grantId, uint256 _milestoneIndex)
        external
        view
        grantScheduleExists(_grantId)
        milestoneExists(_grantId, _milestoneIndex)
        returns (
            uint256 amount,
            string memory deliverable,
            bool completed,
            bool paid,
            uint256 deadline
        )
    {
        Milestone storage milestone = grantSchedules[_grantId].milestones[_milestoneIndex];
        return (
            milestone.amount,
            milestone.deliverable,
            milestone.completed,
            milestone.paid,
            milestone.deadline
        );
    }

    /**
     * @dev Get all milestones for a grant
     * @param _grantId ID of the grant
     * @return Array of all milestones
     */
    function getAllMilestones(uint256 _grantId)
        external
        view
        grantScheduleExists(_grantId)
        returns (Milestone[] memory)
    {
        return grantSchedules[_grantId].milestones;
    }

    /**
     * @dev Get treasury balance
     * @return Current balance of the treasury
     */
    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get treasury statistics
     * @return balance Current balance
     * @return deposited Total deposited
     * @return disbursed Total disbursed
     */
    function getTreasuryStats() 
        external 
        view 
        returns (
            uint256 balance,
            uint256 deposited,
            uint256 disbursed
        ) 
    {
        return (
            address(this).balance,
            totalDeposited,
            totalDisbursed
        );
    }

    /**
     * @dev Check if grant schedule exists
     * @param _grantId ID of the grant
     * @return Boolean indicating if schedule exists
     */
    function hasGrantSchedule(uint256 _grantId) external view returns (bool) {
        return grantSchedules[_grantId].exists;
    }

    /**
     * @dev Check if address is a treasury manager
     * @param _address Address to check
     * @return Boolean indicating if address is a manager
     */
    function isTreasuryManager(address _address) external view returns (bool) {
        return treasuryManagers[_address];
    }

    /**
     * @dev Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function (only owner, when paused)
     * @param _recipient Address to receive the funds
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address payable _recipient, uint256 _amount) 
        external 
        onlyOwner 
        whenPaused 
        nonReentrant 
    {
        require(_recipient != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than zero");
        require(address(this).balance >= _amount, "Insufficient balance");

        (bool success, ) = _recipient.call{value: _amount}("");
        require(success, "Transfer failed");

        emit EmergencyWithdrawal(_recipient, _amount);
    }
}
