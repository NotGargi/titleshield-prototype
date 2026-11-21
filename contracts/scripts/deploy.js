const hre = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log(" Deploying LandRecordAnchor Smart Contract");
  console.log(" Network:", hre.network.name);
  console.log("==================================================");

  const LandRecordAnchor = await hre.ethers.getContractFactory("LandRecordAnchor");
  const contract = await LandRecordAnchor.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(" LandRecordAnchor deployed to:", contractAddress);
  console.log(" Save this address to CONTRACT_ADDRESS in server/.env");
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
