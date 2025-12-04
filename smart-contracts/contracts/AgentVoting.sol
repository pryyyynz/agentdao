// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentVoting
 * @dev Multi-agent voting system with weighted reputation-based scoring
 */
contract AgentVoting is Ownable {
    // Agent type enum
    enum AgentType {
        Technical,
        Impact,
        DueDiligence,
        Budget,
        Community
    }

    // Agent structure
    struct Agent {
        address agentAddress;
        AgentType agentType;
        uint256 votingWeight;
        uint256 reputationScore;
        bool isActive;
        uint256 totalVotes;
        uint256 registeredAt;
    }

    // Vote structure
    struct Vote {
        address agent;
        int8 score; // -2 to +2
        string rationale;
        uint256 timestamp;
    }

    // Voting session structure
    struct VotingSession {
        uint256 grantId;
        bool isActive;
        bool isFinalized;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVotes;
        int256 weightedScore;
        uint256 totalWeight;
        address[] voters;
    }

    // State variables
    mapping(address => Agent) public agents;
    mapping(uint256 => VotingSession) public votingSessions;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    address[] public registeredAgents;
    uint256 public constant MIN_VOTING_WEIGHT = 1;
    uint256 public constant MAX_VOTING_WEIGHT = 10;
    uint256 public constant MIN_REPUTATION = 0;
    uint256 public constant MAX_REPUTATION = 100;
    uint256 public constant INITIAL_REPUTATION = 50;

    // Events
    event AgentRegistered(
        address indexed agent,
        AgentType agentType,
        uint256 votingWeight,
        uint256 reputationScore
    );
    
    event AgentDeactivated(address indexed agent);
    event AgentReactivated(address indexed agent);
    
    event VotingSessionCreated(
        uint256 indexed grantId,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed grantId,
        address indexed agent,
        int8 score,
        string rationale,
        uint256 timestamp
    );
    
    event VotingFinalized(
        uint256 indexed grantId,
        int256 weightedScore,
        uint256 totalWeight,
        uint256 totalVotes
    );
    
    event ReputationUpdated(
        address indexed agent,
        uint256 oldReputation,
        uint256 newReputation
    );
    
    event VotingWeightUpdated(
        address indexed agent,
        uint256 oldWeight,
        uint256 newWeight
    );

    // Modifiers
    modifier onlyRegisteredAgent() {
        require(agents[msg.sender].isActive, "Agent not registered or inactive");
        _;
    }

    modifier votingSessionExists(uint256 _grantId) {
        require(votingSessions[_grantId].grantId != 0, "Voting session does not exist");
        _;
    }

    modifier votingSessionActive(uint256 _grantId) {
        require(votingSessions[_grantId].isActive, "Voting session is not active");
        require(!votingSessions[_grantId].isFinalized, "Voting session is finalized");
        require(block.timestamp <= votingSessions[_grantId].endTime, "Voting period has ended");
        _;
    }

    /**
     * @dev Constructor sets the contract deployer as the owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a new agent
     * @param _agent Address of the agent
     * @param _agentType Type of the agent
     * @param _votingWeight Initial voting weight (1-10)
     */
    function registerAgent(
        address _agent,
        AgentType _agentType,
        uint256 _votingWeight
    ) external onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        require(!agents[_agent].isActive, "Agent already registered and active");
        require(
            _votingWeight >= MIN_VOTING_WEIGHT && _votingWeight <= MAX_VOTING_WEIGHT,
            "Invalid voting weight"
        );

        agents[_agent] = Agent({
            agentAddress: _agent,
            agentType: _agentType,
            votingWeight: _votingWeight,
            reputationScore: INITIAL_REPUTATION,
            isActive: true,
            totalVotes: 0,
            registeredAt: block.timestamp
        });

        registeredAgents.push(_agent);

        emit AgentRegistered(_agent, _agentType, _votingWeight, INITIAL_REPUTATION);
    }

    /**
     * @dev Deactivate an agent
     * @param _agent Address of the agent to deactivate
     */
    function deactivateAgent(address _agent) external onlyOwner {
        require(agents[_agent].isActive, "Agent is not active");
        
        agents[_agent].isActive = false;
        emit AgentDeactivated(_agent);
    }

    /**
     * @dev Reactivate an agent
     * @param _agent Address of the agent to reactivate
     */
    function reactivateAgent(address _agent) external onlyOwner {
        require(agents[_agent].agentAddress != address(0), "Agent not registered");
        require(!agents[_agent].isActive, "Agent is already active");
        
        agents[_agent].isActive = true;
        emit AgentReactivated(_agent);
    }

    /**
     * @dev Create a voting session for a grant
     * @param _grantId ID of the grant
     * @param _duration Duration of voting period in seconds
     */
    function createVotingSession(uint256 _grantId, uint256 _duration) 
        external 
        onlyOwner 
    {
        require(votingSessions[_grantId].grantId == 0, "Voting session already exists");
        require(_duration > 0, "Duration must be greater than zero");

        uint256 endTime = block.timestamp + _duration;

        votingSessions[_grantId] = VotingSession({
            grantId: _grantId,
            isActive: true,
            isFinalized: false,
            startTime: block.timestamp,
            endTime: endTime,
            totalVotes: 0,
            weightedScore: 0,
            totalWeight: 0,
            voters: new address[](0)
        });

        emit VotingSessionCreated(_grantId, block.timestamp, endTime);
    }

    /**
     * @dev Cast a vote on a grant
     * @param _grantId ID of the grant
     * @param _score Vote score (-2 to +2)
     * @param _rationale Reasoning for the vote
     */
    function castVote(
        uint256 _grantId,
        int8 _score,
        string memory _rationale
    ) external onlyRegisteredAgent votingSessionExists(_grantId) votingSessionActive(_grantId) {
        require(_score >= -2 && _score <= 2, "Score must be between -2 and +2");
        require(!hasVoted[_grantId][msg.sender], "Agent has already voted");
        require(bytes(_rationale).length > 0, "Rationale cannot be empty");

        Agent storage agent = agents[msg.sender];
        VotingSession storage session = votingSessions[_grantId];

        // Record the vote
        votes[_grantId][msg.sender] = Vote({
            agent: msg.sender,
            score: _score,
            rationale: _rationale,
            timestamp: block.timestamp
        });

        hasVoted[_grantId][msg.sender] = true;
        session.voters.push(msg.sender);
        session.totalVotes++;
        agent.totalVotes++;

        emit VoteCast(_grantId, msg.sender, _score, _rationale, block.timestamp);
    }

    /**
     * @dev Finalize voting and calculate weighted average
     * @param _grantId ID of the grant
     */
    function finalizeVote(uint256 _grantId) 
        external 
        onlyOwner 
        votingSessionExists(_grantId) 
    {
        VotingSession storage session = votingSessions[_grantId];
        require(session.isActive, "Voting session is not active");
        require(!session.isFinalized, "Voting already finalized");
        require(block.timestamp > session.endTime, "Voting period has not ended");
        require(session.totalVotes > 0, "No votes cast");

        int256 totalWeightedScore = 0;
        uint256 totalWeight = 0;

        // Calculate weighted score
        for (uint256 i = 0; i < session.voters.length; i++) {
            address voter = session.voters[i];
            Vote memory vote = votes[_grantId][voter];
            Agent memory agent = agents[voter];

            // Weighted score = vote_score * voting_weight * (reputation / 100)
            int256 weightedVote = int256(vote.score) * 
                                  int256(agent.votingWeight) * 
                                  int256(agent.reputationScore) / 100;
            
            totalWeightedScore += weightedVote;
            totalWeight += agent.votingWeight * agent.reputationScore / 100;
        }

        session.weightedScore = totalWeightedScore;
        session.totalWeight = totalWeight;
        session.isFinalized = true;
        session.isActive = false;

        emit VotingFinalized(_grantId, totalWeightedScore, totalWeight, session.totalVotes);
    }

    /**
     * @dev Update agent reputation score
     * @param _agent Address of the agent
     * @param _newReputation New reputation score (0-100)
     */
    function updateAgentReputation(address _agent, uint256 _newReputation) 
        external 
        onlyOwner 
    {
        require(agents[_agent].agentAddress != address(0), "Agent not registered");
        require(
            _newReputation >= MIN_REPUTATION && _newReputation <= MAX_REPUTATION,
            "Invalid reputation score"
        );

        uint256 oldReputation = agents[_agent].reputationScore;
        agents[_agent].reputationScore = _newReputation;

        emit ReputationUpdated(_agent, oldReputation, _newReputation);
    }

    /**
     * @dev Update agent voting weight
     * @param _agent Address of the agent
     * @param _newWeight New voting weight (1-10)
     */
    function updateVotingWeight(address _agent, uint256 _newWeight) 
        external 
        onlyOwner 
    {
        require(agents[_agent].agentAddress != address(0), "Agent not registered");
        require(
            _newWeight >= MIN_VOTING_WEIGHT && _newWeight <= MAX_VOTING_WEIGHT,
            "Invalid voting weight"
        );

        uint256 oldWeight = agents[_agent].votingWeight;
        agents[_agent].votingWeight = _newWeight;

        emit VotingWeightUpdated(_agent, oldWeight, _newWeight);
    }

    /**
     * @dev Get agent details
     * @param _agent Address of the agent
     * @return Agent struct
     */
    function getAgent(address _agent) external view returns (Agent memory) {
        require(agents[_agent].agentAddress != address(0), "Agent not registered");
        return agents[_agent];
    }

    /**
     * @dev Get voting session details
     * @param _grantId ID of the grant
     * @return VotingSession struct
     */
    function getVotingSession(uint256 _grantId) 
        external 
        view 
        votingSessionExists(_grantId)
        returns (VotingSession memory) 
    {
        return votingSessions[_grantId];
    }

    /**
     * @dev Get vote details
     * @param _grantId ID of the grant
     * @param _agent Address of the agent
     * @return Vote struct
     */
    function getVote(uint256 _grantId, address _agent) 
        external 
        view 
        returns (Vote memory) 
    {
        require(hasVoted[_grantId][_agent], "Agent has not voted");
        return votes[_grantId][_agent];
    }

    /**
     * @dev Get all voters for a grant
     * @param _grantId ID of the grant
     * @return Array of voter addresses
     */
    function getVoters(uint256 _grantId) 
        external 
        view 
        votingSessionExists(_grantId)
        returns (address[] memory) 
    {
        return votingSessions[_grantId].voters;
    }

    /**
     * @dev Get all registered agents
     * @return Array of agent addresses
     */
    function getAllAgents() external view returns (address[] memory) {
        return registeredAgents;
    }

    /**
     * @dev Get active agents only
     * @return Array of active agent addresses
     */
    function getActiveAgents() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active agents
        for (uint256 i = 0; i < registeredAgents.length; i++) {
            if (agents[registeredAgents[i]].isActive) {
                activeCount++;
            }
        }

        // Create array of active agents
        address[] memory activeAgents = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < registeredAgents.length; i++) {
            if (agents[registeredAgents[i]].isActive) {
                activeAgents[index] = registeredAgents[i];
                index++;
            }
        }

        return activeAgents;
    }

    /**
     * @dev Get final vote result (weighted average)
     * @param _grantId ID of the grant
     * @return Weighted average score
     */
    function getFinalScore(uint256 _grantId) 
        external 
        view 
        votingSessionExists(_grantId)
        returns (int256) 
    {
        VotingSession memory session = votingSessions[_grantId];
        require(session.isFinalized, "Voting not finalized");
        require(session.totalWeight > 0, "No weighted votes");

        return session.weightedScore * 100 / int256(session.totalWeight);
    }

    /**
     * @dev Check if agent has voted
     * @param _grantId ID of the grant
     * @param _agent Address of the agent
     * @return Boolean indicating if agent has voted
     */
    function hasAgentVoted(uint256 _grantId, address _agent) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[_grantId][_agent];
    }

    /**
     * @dev Check if agent is registered and active
     * @param _agent Address of the agent
     * @return Boolean indicating if agent is active
     */
    function isAgentActive(address _agent) external view returns (bool) {
        return agents[_agent].isActive;
    }

    /**
     * @dev Get total number of registered agents
     * @return Count of registered agents
     */
    function getAgentCount() external view returns (uint256) {
        return registeredAgents.length;
    }
}
