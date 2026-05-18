import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying UnifiedCommsToken with account:", deployer.address);

  const initialSupply = ethers.parseUnits("1000000", 18);
  const maxSupply = ethers.parseUnits("100000000", 18);

  const Token = await ethers.getContractFactory("UnifiedCommsToken");
  const token = await Token.deploy(deployer.address, initialSupply, maxSupply);

  await token.waitForDeployment();

  const contractAddress = await token.getAddress();

  console.log("UnifiedCommsToken deployed to:", contractAddress);

  const artifact = await hre.artifacts.readArtifact("UnifiedCommsToken");

  const abiDir = path.join(process.cwd(), "src", "abi");

  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(abiDir, "UnifiedCommsToken.json"),
    JSON.stringify(
      {
        address: contractAddress,
        abi: artifact.abi,
      },
      null,
      2
    )
  );

  console.log("ABI exported to src/abi/UnifiedCommsToken.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});