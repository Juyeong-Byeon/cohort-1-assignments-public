# MiniAMM DApp

A Web3 DApp for interacting with the MiniAMM constant product market maker deployed on Coston2 testnet.

## Features

- **Token Minting**: Mint test tokens (MockToken1 and MockToken2) for testing
- **Add Liquidity**: Provide liquidity to the AMM pool (first time or subsequent)
- **Token Swapping**: Swap between tokens with automatic price calculation and 0.3% fee
- **Remove Liquidity**: Remove liquidity by burning LP tokens
- **Real-time Pool Information**: View current reserves, K value, and your balances
- **LP Token Management**: View and manage your LP token balance

## Contract Addresses (Coston2)

- **Factory**: `0x4a9bbD62A8827117eE3391e9D8055d3D46a1A2E0`
- **MockToken1 (MCT1)**: `0xFce9D7A78e11a22f465623f3295a8c52A0fb78b5`
- **MockToken2 (MCT2)**: `0x472fFfB3d09c29B29D25dC5600cb570cAb8A4206`
- **AMM Pair**: `0x01bfd0C9DA99536266a8df1CB1D039667A858b05`

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Connect your wallet (MetaMask, WalletConnect, or injected wallet)

5. Switch to Coston2 network in your wallet

## Usage

### Minting Tokens

1. Go to the "Mint Tokens" tab
2. Select which token to mint (MCT1 or MCT2)
3. Enter the amount to mint
4. Click "Mint Tokens"

### Adding Liquidity

1. Go to the "Add Liquidity" tab
2. Enter amounts for both tokens
3. If adding to an existing pool, the Y amount will be calculated automatically to maintain the current ratio
4. Click "Add Liquidity"

### Swapping Tokens

1. Go to the "Swap" tab
2. Select swap direction (MCT1 → MCT2 or MCT2 → MCT1)
3. Enter the amount to swap
4. The output amount will be calculated automatically (includes 0.3% fee)
5. Click "Swap Tokens"

### Removing Liquidity

1. Go to the "Remove Liquidity" tab
2. Enter the amount of LP tokens to burn
3. Click "Remove Liquidity"

## Technical Details

- Built with Next.js 15, React 19, and TypeScript
- Web3 integration using wagmi and viem
- Tailwind CSS for styling
- Deployed on Coston2 testnet (Flare Network)
- Constant product market maker (x \* y = k)
- 0.3% swap fee
- LP tokens represent liquidity provider shares

## Network Configuration

The app is configured for Coston2 testnet:

- Chain ID: 114
- RPC URL: https://coston2-api.flare.network/ext/C/rpc
- Currency: C2FLR
- Block Explorer: https://coston2-explorer.flare.network
