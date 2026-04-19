/*
 * scripts/compile.js
 * Compile smart-contract/ForensicEvidenceRegistry.sol using solc-js
 * Writes compiled output to scripts/compiled.json with fields: abi, bytecode
 * Run: node scripts/compile.js
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.join(__dirname, '../smart-contract/ForensicEvidenceRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'ForensicEvidenceRegistry.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

function compile() {
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    console.error('Compilation errors:');
    output.errors.forEach(e => console.error(e.formattedMessage));
    if (fatal.length > 0) process.exit(1);
  }

  const contractNames = Object.keys(output.contracts['ForensicEvidenceRegistry.sol']);
  const name = contractNames[0];
  const abi = output.contracts['ForensicEvidenceRegistry.sol'][name].abi;
  const bytecode = output.contracts['ForensicEvidenceRegistry.sol'][name].evm.bytecode.object;

  const out = { abi, bytecode };
  fs.writeFileSync(path.join(__dirname, 'compiled.json'), JSON.stringify(out, null, 2));
  console.log('✅ Compiled. Output written to scripts/compiled.json');
}

compile();
