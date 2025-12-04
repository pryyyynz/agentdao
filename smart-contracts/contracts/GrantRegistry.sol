// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GrantRegistry
 * @dev Manages grant applications, reviews, and funding for AgentDAO
 */
contract GrantRegistry is Ownable {
    // Enum for grant status
    enum GrantStatus {
        Pending,
        UnderReview,
        Approved,
        Rejected,
        Funded,
        Completed
    }

    // Grant structure
    struct Grant {
        uint256 id;
        address applicant;
        string ipfsHash;
        uint256 amount;
        GrantStatus status;
        uint256 score;
        uint256 timestamp;
    }

    // State variables
    uint256 private grantCounter;
    mapping(uint256 => Grant) private grants;
    mapping(address => bool) public agents;
    
    // Events
    event GrantSubmitted(
        uint256 indexed grantId,
        address indexed applicant,
        string ipfsHash,
        uint256 amount,
        uint256 timestamp
    );
    
    event GrantStatusChanged(
        uint256 indexed grantId,
        GrantStatus oldStatus,
        GrantStatus newStatus,
        uint256 score
    );
    
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    // Modifiers
    modifier onlyAgents() {
        require(agents[msg.sender] || msg.sender == owner(), "Only agents can call this function");
        _;
    }

    modifier grantExists(uint256 _grantId) {
        require(_grantId > 0 && _grantId <= grantCounter, "Grant does not exist");
        _;
    }

    /**
     * @dev Constructor sets the contract deployer as the owner
     */
    constructor() Ownable(msg.sender) {
        grantCounter = 0;
    }

    /**
     * @dev Add an agent address (only owner)
     * @param _agent Address of the agent to add
     */
    function addAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        require(!agents[_agent], "Agent already exists");
        
        agents[_agent] = true;
        emit AgentAdded(_agent);
    }

    /**
     * @dev Remove an agent address (only owner)
     * @param _agent Address of the agent to remove
     */
    function removeAgent(address _agent) external onlyOwner {
        require(agents[_agent], "Agent does not exist");
        
        agents[_agent] = false;
        emit AgentRemoved(_agent);
    }

    /**
     * @dev Submit a new grant application
     * @param _ipfsHash IPFS hash of the grant proposal
     * @param _amount Requested grant amount in wei
     * @return grantId The ID of the newly created grant
     */
    function submitGrant(
        string memory _ipfsHash,
        uint256 _amount
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_amount > 0, "Grant amount must be greater than zero");

        grantCounter++;
        
        grants[grantCounter] = Grant({
            id: grantCounter,
            applicant: msg.sender,
            ipfsHash: _ipfsHash,
            amount: _amount,
            status: GrantStatus.Pending,
            score: 0,
            timestamp: block.timestamp
        });

        emit GrantSubmitted(
            grantCounter,
            msg.sender,
            _ipfsHash,
            _amount,
            block.timestamp
        );

        return grantCounter;
    }

    /**
     * @dev Update the status of a grant (only agents and owner)
     * @param _grantId ID of the grant to update
     * @param _newStatus New status for the grant
     * @param _score Score assigned to the grant (0-100)
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

    /**
     * @dev Get grant details by ID
     * @param _grantId ID of the grant
     * @return Grant struct containing all grant details
     */
    function getGrant(uint256 _grantId) 
        external 
        view 
        grantExists(_grantId) 
        returns (Grant memory) 
    {
        return grants[_grantId];
    }

    /**
     * @dev Get all grants
     * @return Array of all Grant structs
     */
    function getAllGrants() external view returns (Grant[] memory) {
        Grant[] memory allGrants = new Grant[](grantCounter);
        
        for (uint256 i = 1; i <= grantCounter; i++) {
            allGrants[i - 1] = grants[i];
        }
        
        return allGrants;
    }

    /**
     * @dev Get grants by applicant address
     * @param _applicant Address of the applicant
     * @return Array of Grant structs for the specified applicant
     */
    function getGrantsByApplicant(address _applicant) 
        external 
        view 
        returns (Grant[] memory) 
    {
        // First, count how many grants the applicant has
        uint256 count = 0;
        for (uint256 i = 1; i <= grantCounter; i++) {
            if (grants[i].applicant == _applicant) {
                count++;
            }
        }

        // Create array and populate it
        Grant[] memory applicantGrants = new Grant[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= grantCounter; i++) {
            if (grants[i].applicant == _applicant) {
                applicantGrants[index] = grants[i];
                index++;
            }
        }
        
        return applicantGrants;
    }

    /**
     * @dev Get grants by status
     * @param _status Status to filter by
     * @return Array of Grant structs with the specified status
     */
    function getGrantsByStatus(GrantStatus _status) 
        external 
        view 
        returns (Grant[] memory) 
    {
        // First, count how many grants have this status
        uint256 count = 0;
        for (uint256 i = 1; i <= grantCounter; i++) {
            if (grants[i].status == _status) {
                count++;
            }
        }

        // Create array and populate it
        Grant[] memory statusGrants = new Grant[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= grantCounter; i++) {
            if (grants[i].status == _status) {
                statusGrants[index] = grants[i];
                index++;
            }
        }
        
        return statusGrants;
    }

    /**
     * @dev Get the total number of grants
     * @return Total count of grants
     */
    function getGrantCount() external view returns (uint256) {
        return grantCounter;
    }

    /**
     * @dev Check if an address is an authorized agent
     * @param _address Address to check
     * @return Boolean indicating if the address is an agent
     */
    function isAgent(address _address) external view returns (bool) {
        return agents[_address];
    }
}
