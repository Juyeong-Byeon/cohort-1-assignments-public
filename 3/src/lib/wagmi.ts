import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

// Coston2 chain configuration
export const coston2Chain = defineChain({
  id: 114,
  name: "Coston2",
  nativeCurrency: {
    decimals: 18,
    name: "Coston2",
    symbol: "C2FLR",
  },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
    public: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

// Create wagmi config
export const config = createConfig({
  chains: [coston2Chain],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "your-project-id",
    }),
  ],
  transports: {
    [coston2Chain.id]: http(),
  },
});

// Export types
export type Chain = typeof coston2Chain;
