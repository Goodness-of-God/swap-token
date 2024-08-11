
# Overview of Script

This script automates the process of swapping tokens, approving tokens, and staking liquidity provider (LP) tokens using various decentralized finance (DeFi) protocols. The script interacts with the following protocols:

## Protocols Involved

### 1. **Uniswap V3 (Swap and Pool Information)**
   - **Factory Contract**: Retrieves pool information, including token pairs and fees.
   - **Swap Router Contract**: Executes a token swap from USDC to LINK using the retrieved pool information.

### 2. **SushiSwap (MasterChef Contract for Staking)**
   - **MasterChef Contract**: Manages the staking of LP tokens for yield farming, where users can stake their LP tokens to earn rewards.

### 3. **Token Contracts**
   - **USDC and LINK Token Contracts**: Used for approving the transfer of tokens on behalf of the user to the respective protocols (Swap Router and MasterChef).

## Script Workflow

### 1. **Approve USDC for Swapping**
   - The script first approves the Uniswap V3 Swap Router to spend a specified amount of USDC tokens on behalf of the user.

### 2. **Swap USDC for LINK**
   - After approval, the script fetches the appropriate pool information (USDC-LINK pair) from the Uniswap V3 Factory contract.
   - It then prepares the necessary swap parameters and executes the token swap using the Swap Router contract.

### 3. **Approve LINK LP Tokens for Staking**
   - Once the swap is completed, the script approves the SushiSwap MasterChef contract to spend the resulting LINK LP tokens.

### 4. **Stake LINK LP Tokens**
   - Finally, the script stakes the approved LINK LP tokens into the specified pool in the MasterChef contract to earn rewards.

## Diagram Illustration

Below is a flowchart that visually represents the sequence of steps and interactions between the protocols:

# Workflow Diagram

Below is a reconstructed flowchart using Markdown to visually represent the sequence of steps and interactions between the protocols:

```
+---------------------------------------+
|                Start                  |
+---------------------------------------+
                |
                v
+---------------------------------------+
|       Approve USDC for Swapping       |
|    (Uniswap V3 Swap Router Contract)  |
+---------------------------------------+
                |
                v
+---------------------------------------+
|     Swap USDC for LINK using          |
|          Uniswap V3                   |
| (Factory Contract & Swap Router)      |
+---------------------------------------+
                |
                v
+---------------------------------------+
|    Approve LINK LP Tokens for Staking |
|  (SushiSwap MasterChef Contract)      |
+---------------------------------------+
                |
                v
+---------------------------------------+
| Stake LINK LP Tokens in SushiSwap     |
|        MasterChef                     |
+---------------------------------------+
                |
                v
+---------------------------------------+
|                 End                   |
+---------------------------------------+
```

This flowchart outlines the key steps in the script, showing the interactions with Uniswap V3 for token swapping and SushiSwap's MasterChef contract for staking LP tokens. Each step is connected sequentially to demonstrate the process flow, from approval to staking.

Here’s a detailed explanation of the code and its functionality, highlighting key functions, logic, and interactions with DeFi protocols:

### Code Breakdown

#### **1. Imports and Setup**

```javascript
import { ethers } from "ethers";
import FACTORY_ABI from "./abis/factory.json" assert { type: "json" };
import SWAP_ROUTER_ABI from "./abis/swaprouter.json" assert { type: "json" };
import POOL_ABI from "./abis/pool.json" assert { type: "json" };
import TOKEN_ABI from "./abis/token.json" assert { type: "json" };
import MASTERCHEF_ABI from "./abis/masterchef.json" assert { type: "json" };
import dotenv from "dotenv";
dotenv.config();
```

- **ethers**: The library used to interact with the Ethereum blockchain.
- **FACTORY_ABI, SWAP_ROUTER_ABI, POOL_ABI, TOKEN_ABI, MASTERCHEF_ABI**: ABI definitions for various smart contracts used in the code.
- **dotenv**: Used to load environment variables from a `.env` file.

#### **2. Contract Addresses and Provider Setup**

```javascript
const FACTORY_ADDRESS = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const ROUTER_ADDRESS = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
const MASTERCHEF_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
```

- **FACTORY_ADDRESS**: Address of the factory contract used for retrieving pool information.
- **ROUTER_ADDRESS**: Address of the swap router used for token swaps.
- **MASTERCHEF_ADDRESS**: Address of the MasterChef contract used for staking LP tokens.
- **provider**: Connects to the Ethereum network using the provided RPC URL.
- **factoryContract**: Instance of the factory contract for fetching pool details.
- **signer**: Wallet instance used to sign transactions.

#### **3. Token Configuration**

```javascript
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
```

- **USDC** and **LINK**: Configuration objects for the USDC and LINK tokens, including their addresses, decimals, symbols, and names.

#### **4. Approve Token Function**

```javascript
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
```

- **approveToken**: Approves the specified amount of a token for spending by the swap router. This is necessary to allow the router to spend the tokens on behalf of the user.

#### **5. Get Pool Info Function**

```javascript
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
```

- **fetchPoolInfo**: Retrieves the address of the pool for the given tokens from the factory contract, then fetches details like `token0`, `token1`, and `fee` from the pool contract.

#### **6. Prepare Swap Params Function**

```javascript
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
```

- **buildSwapParams**: Constructs parameters for the swap transaction, including token addresses, fee, recipient, and the amount to be swapped.

#### **7. Execute Swap Function**

```javascript
async function executeSwap(swapRouter, params, signer) {
  const tx = await swapRouter.exactInputSingle(params);
  const receipt = await tx.wait();
  console.log(`Swap Executed! Receipt: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
}
```

- **executeSwap**: Executes the swap transaction using the provided parameters and waits for the transaction to be confirmed.

#### **8. Approve LP Tokens for Staking**

```javascript
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
```

- **approveLPTokens**: Approves the specified amount of LP tokens for staking in the MasterChef contract.

#### **9. Stake LP Tokens in MasterChef**

```javascript
async function stakeLPTokens(amount, poolId, signer) {
  try {
    const masterChefContract = new ethers.Contract(MASTERCHEF_ADDRESS, MASTERCHEF_ABI, signer);
    const tx = await masterChefContract.deposit(poolId, ethers.parseUnits(amount.toString(), LINK.decimals));
    console.log(`Staking Transaction Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Staking Confirmed! https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
  } catch (error) {
    console.error("Staking failed:", error.message);
    throw new Error("Staking failed");
  }
}
```

- **stakeLPTokens**: Stakes the specified amount of LP tokens in the MasterChef contract.

#### **10. Main Function**

```javascript
async function main(swapAmount, stakeAmount, poolId) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    // Approve and swap USDC for LINK
    await approveToken(USDC.address, TOKEN_ABI, inputAmount, signer);
    const { poolContract } = await fetchPoolInfo(factoryContract, USDC, LINK);
    const params = await buildSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(ROUTER_ADDRESS, SWAP_ROUTER_ABI, signer);
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
```

- **main**: The entry point of the script. It performs the following tasks:
  1. **Approve**: Approves the USDC tokens for swapping.
  2. **Fetch Pool Info**: Gets pool details from the factory contract.
  3. **Build Swap Params**: Prepares parameters for the swap transaction.
  4. **Execute Swap**: Executes the swap from USDC to LINK.
  5. **Approve LP Tokens**: Approves LINK LP tokens for staking.
  6. **Stake LP Tokens**: Stakes the LINK LP tokens in the MasterChef contract.

### Summary

The code provides a comprehensive workflow to interact with decentralized finance protocols:

- **Approval**: For allowing tokens to be spent by another contract.
- **Swap**: Using a router contract to swap tokens.
- **Staking**: Approving and staking LP tokens in a yield farming contract.

The code manages the interaction between various contracts and protocols, including token approval, swapping through a router, and staking LP tokens, making it a useful tool for automating DeFi operations.
