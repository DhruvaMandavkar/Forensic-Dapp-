require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main(){
  const rpc = process.env.RPC_URL;
  if(!rpc){
    console.error('RPC_URL not set in .env');
    process.exit(1);
  }
  const infoPath = path.join(__dirname, '../frontend/src/services/contractInfo.json');
  if(!fs.existsSync(infoPath)){
    console.error('contractInfo.json not found at', infoPath);
    process.exit(1);
  }
  const info = JSON.parse(fs.readFileSync(infoPath,'utf8'));
  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(info.contractAddress, info.abi, provider);
  try{
    const owner = await contract.owner();
    console.log('Contract owner:', owner);
  }catch(err){
    console.error('Error calling owner():', err.message || err);
    process.exit(1);
  }
}

main();
