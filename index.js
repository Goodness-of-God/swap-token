import { ethers } from "ethers";
import FACTORY_ABI from "./abis/factory.json" assert { type: "json" };
import SWAP_ROUTER_ABI from "./abis/swaprouter.json" assert { type: "json" };
import POOL_ABI from "./abis/pool.json" assert { type: "json" };
import TOKEN_ABI from "./abis/token.json" assert { type: "json" };
import MASTERCHEF_ABI from "./abis/masterchef.json" assert { type: "json" };

import dotenv from "dotenv";
dotenv.config();

// Contract Addresses
const FACTORY_ADDRESS = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const ROUTER_ADDRESS = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
const MASTERCHEF_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Token Configuration
const USDC = {
  chainId: 11155111,
  address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  decimals: 6,
  symbol: "USDC",
  name: "USD//C",
};

const LINK = {
  chainId: 11155111,
  address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  decimals: 18,
  symbol: "LINK",
  name: "Chainlink",
};

// Approve Token Function
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const tx = await tokenContract.approve(ROUTER_ADDRESS, approveAmount);
    console.log(`Approval Transaction Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
  } catch (error) {
    console.error("Token approval failed:", error.message);
    throw new Error("Token approval failed");
  }
}

// Get Pool Info Function
async function fetchPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
  if (!poolAddress) {
    throw new Error("Pool address retrieval failed");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}

// Prepare Swap Params Function
async function buildSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}

// Execute Swap Function
async function executeSwap(swapRouter, params, signer) {
  const tx = await swapRouter.exactInputSingle(params);
  const receipt = await tx.wait();
  console.log(`Swap Executed! Receipt: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
}

// Approve LP Tokens for Staking
async function approveLPTokens(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), LINK.decimals);
    const tx = await tokenContract.approve(MASTERCHEF_ADDRESS, approveAmount);
    console.log(`Approval Transaction Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Approval Confirmed! https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
  } catch (error) {
    console.error("LP token approval failed:", error.message);
    throw new Error("LP token approval failed");
  }
}

// Stake LP Tokens in MasterChef
async function stakeLPTokens(amount, poolId, signer) {
  try {
    const masterChefContract = new ethers.Contract(
      MASTERCHEF_ADDRESS,
      MASTERCHEF_ABI,
      signer
    );
    const tx = await masterChefContract.deposit(poolId, ethers.parseUnits(amount.toString(), LINK.decimals));
    console.log(`Staking Transaction Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Staking Confirmed! https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
  } catch (error) {
    console.error("Staking failed:", error.message);
    throw new Error("Staking failed");
  }
}

// Main Function
async function main(swapAmount, stakeAmount, poolId) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    // Approve and swap USDC for LINK
    await approveToken(USDC.address, TOKEN_ABI, inputAmount, signer);
    const { poolContract } = await fetchPoolInfo(factoryContract, USDC, LINK);
    const params = await buildSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );
    await executeSwap(swapRouter, params, signer);

    // Approve and stake LINK LP tokens
    await approveLPTokens(LINK.address, TOKEN_ABI, stakeAmount, signer);
    await stakeLPTokens(stakeAmount, poolId, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

// Example: Swap 1 USDC, then stake 0.5 LINK LP tokens in pool 1
main(1, 0.5, 1);

