/**
 * Simple deployment script using ethers.js
 * Run: node scripts/deploy.js
 * 
 * Prerequisites:
 *   npm install ethers dotenv
 *   Set PRIVATE_KEY and RPC_URL in .env
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ── Compile the contract ABI + bytecode manually using solc, OR paste pre-compiled
// For simplicity, we embed a pre-compiled version here.
// You can compile with: npx solc --abi --bin ForensicEvidenceRegistry.sol

// Try to read compiled output from scripts/compiled.json if present
let ABI = null;
let BYTECODE = process.env.CONTRACT_BYTECODE || "";
try {
  const compiledPath = path.join(__dirname, 'compiled.json');
  if (fs.existsSync(compiledPath)) {
    const compiled = JSON.parse(fs.readFileSync(compiledPath, 'utf8'));
    ABI = compiled.abi;
    if (!BYTECODE) BYTECODE = compiled.bytecode || compiled.evmBytecode || "";
    console.log('Using ABI/bytecode from scripts/compiled.json');
  }
} catch (e) {
  // ignore
}

// Fallback: use embedded ABI if compilation artifact not available
if (!ABI) {
  ABI = [
    "constructor()",
    "function owner() view returns (address)",
    "function roles(address) view returns (uint8)",
    "function evidenceCount() view returns (uint256)",
    "function assignRole(address user, uint8 role)",
    "function selfRegisterPublic()",
    "function getRole(address user) view returns (uint8)",
    "function addEvidence(string caseId, string evidenceHash, string description, bool isConfidential) returns (uint256)",
    "function verifyEvidence(uint256 evidenceId)",
    "function transferCustody(uint256 evidenceId, string action, string notes)",
    "function getEvidence(uint256 evidenceId) view returns (tuple(uint256 id, string caseId, string evidenceHash, string description, address uploadedBy, uint256 timestamp, bool verified, bool isConfidential))",
    "function getCustodyChain(uint256 evidenceId) view returns (tuple(uint256 evidenceId, address handler, string action, uint256 timestamp, string notes)[])",
    "function getCustodyLength(uint256 evidenceId) view returns (uint256)",
    "event RoleAssigned(address indexed user, uint8 role)",
    "event EvidenceAdded(uint256 indexed id, string caseId, address uploadedBy)",
    "event EvidenceVerified(uint256 indexed id, address verifiedBy)",
    "event CustodyTransferred(uint256 indexed evidenceId, address handler, string action)"
  ];
}

async function deploy() {
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not set in .env");
    process.exit(1);
  }
  if (!process.env.RPC_URL) {
    console.error("❌ RPC_URL not set in .env");
    process.exit(1);
  }
  if (!BYTECODE) {
    console.error("❌ CONTRACT_BYTECODE not set in .env");
    console.error("   Compile the contract first and paste the bytecode.");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("🚀 Deploying from:", wallet.address);

  const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ Contract deployed at:", address);

  // Save address for frontend
  const output = { contractAddress: address, abi: ABI };
  fs.writeFileSync(
    path.join(__dirname, "../frontend/src/services/contractInfo.json"),
    JSON.stringify(output, null, 2)
  );
  console.log("📄 contractInfo.json written to frontend/src/services/");
}

deploy().catch((err) => {
  console.error(err);
  process.exit(1);
});
