// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ForensicEvidenceRegistry
 * @notice Blockchain-based digital forensic evidence management
 */
contract ForensicEvidenceRegistry {
    // ─── Roles ───────────────────────────────────────────────
    enum Role { None, ForensicOfficial, PoliceOfficial, Student, Public }

    // ─── Structs ─────────────────────────────────────────────
    struct Evidence {
        uint256 id;
        string  caseId;
        string  evidenceHash;   // IPFS / Supabase file hash
        string  description;
        address uploadedBy;
        uint256 timestamp;
        bool    verified;
        bool    isConfidential;
    }

    struct CustodyRecord {
        uint256 evidenceId;
        address handler;
        string  action;         // "collected", "transferred", "analyzed"
        uint256 timestamp;
        string  notes;
    }

    // ─── State ───────────────────────────────────────────────
    address public owner;

    mapping(address => Role) public roles;
    mapping(uint256 => Evidence) public evidences;
    mapping(uint256 => CustodyRecord[]) public custodyChain;

    uint256 public evidenceCount;

    // ─── Events ──────────────────────────────────────────────
    event RoleAssigned(address indexed user, Role role);
    event EvidenceAdded(uint256 indexed id, string caseId, address uploadedBy);
    event EvidenceVerified(uint256 indexed id, address verifiedBy);
    event CustodyTransferred(uint256 indexed evidenceId, address handler, string action);

    // ─── Modifiers ───────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyForensicOfficial() {
        require(roles[msg.sender] == Role.ForensicOfficial, "Not a forensic official");
        _;
    }

    modifier onlyAuthorized() {
        require(
            roles[msg.sender] == Role.ForensicOfficial ||
            roles[msg.sender] == Role.PoliceOfficial,
            "Not authorized"
        );
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.ForensicOfficial;
    }

    // ─── Role Management ─────────────────────────────────────
    function assignRole(address user, Role role) external onlyOwner {
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    function selfRegisterPublic() external {
        require(roles[msg.sender] == Role.None, "Already registered");
        roles[msg.sender] = Role.Public;
        emit RoleAssigned(msg.sender, Role.Public);
    }

    function getRole(address user) external view returns (Role) {
        return roles[user];
    }

    // ─── Evidence Management ─────────────────────────────────
    function addEvidence(
        string calldata caseId,
        string calldata evidenceHash,
        string calldata description,
        bool isConfidential
    ) external onlyForensicOfficial returns (uint256) {
        evidenceCount++;
        evidences[evidenceCount] = Evidence({
            id: evidenceCount,
            caseId: caseId,
            evidenceHash: evidenceHash,
            description: description,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            verified: false,
            isConfidential: isConfidential
        });

        // Initial custody record
        custodyChain[evidenceCount].push(CustodyRecord({
            evidenceId: evidenceCount,
            handler: msg.sender,
            action: "collected",
            timestamp: block.timestamp,
            notes: "Initial evidence collection"
        }));

        emit EvidenceAdded(evidenceCount, caseId, msg.sender);
        return evidenceCount;
    }

    function verifyEvidence(uint256 evidenceId) external onlyAuthorized {
        require(evidenceId > 0 && evidenceId <= evidenceCount, "Invalid evidence ID");
        evidences[evidenceId].verified = true;
        emit EvidenceVerified(evidenceId, msg.sender);
    }

    function transferCustody(
        uint256 evidenceId,
        string calldata action,
        string calldata notes
    ) external onlyForensicOfficial {
        require(evidenceId > 0 && evidenceId <= evidenceCount, "Invalid evidence ID");
        custodyChain[evidenceId].push(CustodyRecord({
            evidenceId: evidenceId,
            handler: msg.sender,
            action: action,
            timestamp: block.timestamp,
            notes: notes
        }));
        emit CustodyTransferred(evidenceId, msg.sender, action);
    }

    // ─── Read Functions ───────────────────────────────────────
    function getEvidence(uint256 evidenceId) external view returns (Evidence memory) {
        return evidences[evidenceId];
    }

    function getCustodyChain(uint256 evidenceId) external view returns (CustodyRecord[] memory) {
        return custodyChain[evidenceId];
    }

    function getCustodyLength(uint256 evidenceId) external view returns (uint256) {
        return custodyChain[evidenceId].length;
    }
}
