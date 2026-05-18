import { createAuditJob } from "../backend/api/auditApi";
import { processNextAuditJob } from "../backend/workers/auditWorker";

async function main() {
  const sampleContract = `
pragma solidity ^0.8.20;

contract UnsafeExample {
    address public owner;

    function withdraw() public {
        require(tx.origin == owner, "not owner");
        payable(msg.sender).call{value: 1 ether}("");
    }
}
`;

  const job = await createAuditJob({
    chain: "ethereum",
    contractName: "UnsafeExample",
    sourceCode: sampleContract,
  });

  console.log("Created audit job:", job);

  const result = await processNextAuditJob();

  console.log("Audit result:", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
