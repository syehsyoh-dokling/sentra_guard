import { expect } from "chai";
import { ethers } from "hardhat";

describe("UnifiedCommsToken", function () {
  async function deployFixture() {
    const [admin, user] = await ethers.getSigners();

    const initialSupply = ethers.parseUnits("1000000", 18);
    const maxSupply = ethers.parseUnits("100000000", 18);

    const Token = await ethers.getContractFactory("UnifiedCommsToken");
    const token = await Token.deploy(admin.address, initialSupply, maxSupply);

    await token.waitForDeployment();

    return { token, admin, user, maxSupply };
  }

  it("should deploy with correct name and symbol", async function () {
    const { token } = await deployFixture();

    expect(await token.name()).to.equal("Unified Comms Token");
    expect(await token.symbol()).to.equal("UCT");
  });

  it("should mint reward to user", async function () {
    const { token, user } = await deployFixture();

    const rewardAmount = ethers.parseUnits("50", 18);

    await token.mintReward(user.address, rewardAmount, "wallet_connect");

    expect(await token.balanceOf(user.address)).to.equal(rewardAmount);
  });

  it("should allow user to redeem by burning token", async function () {
    const { token, user } = await deployFixture();

    const rewardAmount = ethers.parseUnits("500", 18);
    const redeemAmount = ethers.parseUnits("200", 18);

    await token.mintReward(user.address, rewardAmount, "demo_reward");

    await token.connect(user).redeem(redeemAmount, "extra_storage");

    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("300", 18));
  });

  it("should reject minting above max supply", async function () {
    const { token, user, maxSupply } = await deployFixture();

    await expect(
      token.mintReward(user.address, maxSupply, "overflow_test")
    ).to.be.revertedWith("Max supply exceeded");
  });
});