/**
 * blockchain.js
 * Simple ethers.js integration for the ForensicEvidenceRegistry contract.
 * Uses window.ethereum (MetaMask).
 */

import { ethers } from "ethers";
import contractInfo from "./contractInfo.json";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || contractInfo.contractAddress;
const CONTRACT_ABI = contractInfo.abi;

// ── Provider helpers ──────────────────────────────────────────────

export function isMetaMaskInstalled() {
  return typeof window.ethereum !== "undefined";
}

export async function getProvider() {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = await getProvider();
  return provider.getSigner();
}

export async function getContract(withSigner = false) {
  if (withSigner) {
    const signer = await getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }
  const provider = await getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

// ── MetaMask connection ───────────────────────────────────────────

export async function connectMetaMask() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install it from metamask.io");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return accounts[0];
}

export async function getConnectedAccount() {
  if (!isMetaMaskInstalled()) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts.length > 0 ? accounts[0] : null;
}

// ── Contract interactions ─────────────────────────────────────────

export async function addEvidenceOnChain({
  caseId,
  evidenceHash,
  description,
  isConfidential,
}) {
  const contract = await getContract(true);
  const tx = await contract.addEvidence(
    caseId,
    evidenceHash,
    description,
    isConfidential
  );
  const receipt = await tx.wait();

  // Parse the EvidenceAdded event to get the on-chain ID
  const event = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "EvidenceAdded");

  const onChainId = event ? Number(event.args.id) : null;
  return { txHash: receipt.hash, onChainId };
}

export async function verifyEvidenceOnChain(evidenceId) {
  const contract = await getContract(true);
  const tx = await contract.verifyEvidence(evidenceId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function transferCustodyOnChain(evidenceId, action, notes) {
  const contract = await getContract(true);
  const tx = await contract.transferCustody(evidenceId, action, notes);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getEvidenceFromChain(evidenceId) {
  const contract = await getContract();
  return contract.getEvidence(evidenceId);
}

export async function getCustodyChainFromChain(evidenceId) {
  const contract = await getContract();
  return contract.getCustodyChain(evidenceId);
}

export async function getUserRoleFromChain(address) {
  const contract = await getContract();
  const roleNum = await contract.getRole(address);
  const roleMap = {
    0: "none",
    1: "forensic_official",
    2: "police_official",
    3: "student",
    4: "public",
  };
  return roleMap[Number(roleNum)] || "none";
}
