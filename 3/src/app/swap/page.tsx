"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther, formatEther, formatUnits } from "viem";
import {
  CONTRACT_ADDRESSES,
  MOCK_ERC20_ABI,
  MINI_AMM_ABI,
  TOKEN_INFO,
} from "../../lib/contracts";
import { WalletConnect } from "../../components/WalletConnect";

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  const queryClient = useQueryClient();

  // State for different operations
  const [activeTab, setActiveTab] = useState<
    "mint" | "addLiquidity" | "swap" | "removeLiquidity"
  >("mint");

  // Mint state
  const [mintAmount, setMintAmount] = useState("");
  const [mintToken, setMintToken] = useState<"token1" | "token2">("token1");

  // Add liquidity state
  const [xAmount, setXAmount] = useState("");
  const [yAmount, setYAmount] = useState("");

  // Swap state
  const [swapFromAmount, setSwapFromAmount] = useState("");
  const [swapToAmount, setSwapToAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<"xToY" | "yToX">("xToY");

  // Remove liquidity state
  const [removeAmount, setRemoveAmount] = useState("");

  // Read contract data
  const { data: tokenX } = useReadContract({
    address: CONTRACT_ADDRESSES.PAIR,
    abi: MINI_AMM_ABI,
    functionName: "tokenX",
  });

  // const { data: tokenY } = useReadContract({
  //   address: CONTRACT_ADDRESSES.PAIR,
  //   abi: MINI_AMM_ABI,
  //   functionName: 'tokenY',
  // });

  const { data: xReserve } = useReadContract({
    address: CONTRACT_ADDRESSES.PAIR,
    abi: MINI_AMM_ABI,
    functionName: "xReserve",
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: yReserve } = useReadContract({
    address: CONTRACT_ADDRESSES.PAIR,
    abi: MINI_AMM_ABI,
    functionName: "yReserve",
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: k } = useReadContract({
    address: CONTRACT_ADDRESSES.PAIR,
    abi: MINI_AMM_ABI,
    functionName: "k",
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: lpBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.PAIR,
    abi: MINI_AMM_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: token1Balance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN1,
    abi: MOCK_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: token2Balance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN2,
    abi: MOCK_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Determine which token is which
  const isToken1X = tokenX === CONTRACT_ADDRESSES.TOKEN1;
  // const tokenXAddress = isToken1X ? CONTRACT_ADDRESSES.TOKEN1 : CONTRACT_ADDRESSES.TOKEN2;
  // const tokenYAddress = isToken1X ? CONTRACT_ADDRESSES.TOKEN2 : CONTRACT_ADDRESSES.TOKEN1;
  const tokenXInfo = isToken1X
    ? TOKEN_INFO[CONTRACT_ADDRESSES.TOKEN1]
    : TOKEN_INFO[CONTRACT_ADDRESSES.TOKEN2];
  const tokenYInfo = isToken1X
    ? TOKEN_INFO[CONTRACT_ADDRESSES.TOKEN2]
    : TOKEN_INFO[CONTRACT_ADDRESSES.TOKEN1];

  const formatBalance = (
    balance: bigint | undefined,
    decimals: number = 18
  ) => {
    if (!balance) return "0";
    return formatUnits(balance, decimals);
  };

  // Handle add liquidity with auto-approve
  const handleAddLiquidity = () => {
    console.log("=== handleAddLiquidity START ===");
    console.log("Input xAmount:", xAmount);
    console.log("Input yAmount:", yAmount);

    if (!xAmount || !yAmount) {
      console.log("❌ Missing amounts - returning early");
      return;
    }

    // Calculate the correct amounts based on current pool state
    const finalXAmount = xAmount;
    let finalYAmount = yAmount;

    console.log("Pool state check:");
    console.log("k:", k?.toString());
    console.log("xReserve:", xReserve?.toString());
    console.log("yReserve:", yReserve?.toString());
    console.log("isToken1X:", isToken1X);

    // Check for data inconsistency
    if (
      k &&
      k > 0n &&
      (!xReserve || xReserve === 0n || !yReserve || yReserve === 0n)
    ) {
      console.log("⚠️ Data inconsistency detected in handleAddLiquidity!");
      console.log(
        "k > 0 but reserves are 0. This indicates the pool is actually empty."
      );
      console.log("Treating as first liquidity addition...");

      // Treat this as first liquidity addition since reserves are 0
      // Use user input for both amounts
      finalYAmount = yAmount;

      console.log("Treating as first liquidity addition");
      console.log("X amount:", xAmount);
      console.log("Y amount:", yAmount);

      // Show info to user
      alert(
        "ℹ️ Pool appears to be empty despite k > 0. Treating as first liquidity addition."
      );
    }

    if (k && k > 0n && xReserve && yReserve && xReserve > 0n) {
      console.log("✅ Pool has liquidity - calculating exact ratio");

      // Pool already has liquidity, calculate required amounts to maintain the exact ratio
      // Use BigInt for precise calculation
      const xAmountBigInt = BigInt(xAmount);
      const requiredY = (xAmountBigInt * yReserve) / xReserve;
      finalYAmount = requiredY.toString();

      console.log("Calculation details:");
      console.log("xAmountBigInt:", xAmountBigInt.toString());
      console.log("yReserve:", yReserve.toString());
      console.log("xReserve:", xReserve.toString());
      console.log(
        "requiredY calculation:",
        (xAmountBigInt * yReserve).toString(),
        "/",
        xReserve.toString()
      );
      console.log("requiredY result:", requiredY.toString());
      console.log("finalYAmount:", finalYAmount);
    } else if (!k || k === 0n) {
      console.log("✅ First time adding liquidity (k = 0) - using user input");
      console.log("X amount:", xAmount);
      console.log("Y amount:", yAmount);
      // Use user input for both amounts when k = 0
      finalYAmount = yAmount;
    } else {
      console.log("❌ Unknown state - cannot proceed");
      console.log("k:", k?.toString());
      console.log("xReserve:", xReserve?.toString());
      console.log("yReserve:", yReserve?.toString());
      alert("Unknown pool state. Please refresh the page and try again.");
      return;
    }

    console.log("Final amounts for contract:");
    console.log("finalXAmount:", finalXAmount);
    console.log("finalYAmount:", finalYAmount);

    // Determine token addresses
    const tokenXAddress = isToken1X
      ? CONTRACT_ADDRESSES.TOKEN1
      : CONTRACT_ADDRESSES.TOKEN2;
    const tokenYAddress = isToken1X
      ? CONTRACT_ADDRESSES.TOKEN2
      : CONTRACT_ADDRESSES.TOKEN1;

    console.log("Token addresses:");
    console.log("tokenXAddress:", tokenXAddress);
    console.log("tokenYAddress:", tokenYAddress);
    console.log("CONTRACT_ADDRESSES.TOKEN1:", CONTRACT_ADDRESSES.TOKEN1);
    console.log("CONTRACT_ADDRESSES.TOKEN2:", CONTRACT_ADDRESSES.TOKEN2);

    console.log("Starting approve transactions...");

    // First approve both tokens
    console.log("Approving tokenX:", tokenXAddress, "amount:", finalXAmount);
    writeContract({
      address: tokenXAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.PAIR, parseEther(finalXAmount)],
    });

    console.log("Approving tokenY:", tokenYAddress, "amount:", finalYAmount);
    writeContract({
      address: tokenYAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.PAIR, parseEther(finalYAmount)],
    });

    console.log("Calling addLiquidity with:");
    console.log("xAmount (parsed):", parseEther(finalXAmount).toString());
    console.log("yAmount (parsed):", parseEther(finalYAmount).toString());

    // Then add liquidity
    writeContract({
      address: CONTRACT_ADDRESSES.PAIR,
      abi: MINI_AMM_ABI,
      functionName: "addLiquidity",
      args: [parseEther(finalXAmount), parseEther(finalYAmount)],
    });

    console.log("=== handleAddLiquidity END ===");
  };

  // Handle swap with auto-approve
  const handleSwap = () => {
    if (!swapFromAmount) return;

    const tokenAddress =
      swapDirection === "xToY"
        ? isToken1X
          ? CONTRACT_ADDRESSES.TOKEN1
          : CONTRACT_ADDRESSES.TOKEN2
        : isToken1X
        ? CONTRACT_ADDRESSES.TOKEN2
        : CONTRACT_ADDRESSES.TOKEN1;

    // First approve token
    writeContract({
      address: tokenAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.PAIR, parseEther(swapFromAmount)],
    });

    // Then swap
    const fromAmount = parseEther(swapFromAmount);
    writeContract({
      address: CONTRACT_ADDRESSES.PAIR,
      abi: MINI_AMM_ABI,
      functionName: "swap",
      args: swapDirection === "xToY" ? [fromAmount, 0n] : [0n, fromAmount],
    });
  };

  // Calculate required Y amount for adding liquidity
  useEffect(() => {
    console.log("=== useEffect for Y calculation ===");
    console.log("xAmount:", xAmount);
    console.log("k:", k?.toString());
    console.log("xReserve:", xReserve?.toString());
    console.log("yReserve:", yReserve?.toString());

    // Check if we have inconsistent data (k > 0 but reserves are 0)
    if (
      k &&
      k > 0n &&
      (!xReserve || xReserve === 0n || !yReserve || yReserve === 0n)
    ) {
      console.log("⚠️ Data inconsistency detected - k > 0 but reserves are 0");
      console.log("This might be a data loading issue. Refreshing data...");

      // Force refresh the data
      queryClient.invalidateQueries({
        queryKey: [{ address: CONTRACT_ADDRESSES.PAIR }],
      });

      // Since reserves are 0, treat this as first liquidity addition
      // Don't auto-calculate Y amount, let user set it manually
      if (xAmount) {
        console.log(
          "🔄 Pool appears empty despite k > 0. Treating as first liquidity addition."
        );
        console.log("User can set any ratio for first liquidity addition.");
        // Don't auto-set Y amount, let user decide
      }
      return;
    }

    if (xAmount && k && k > 0n && xReserve && yReserve && xReserve > 0n) {
      console.log("✅ Pool has liquidity - auto-calculating Y amount");

      // Pool already has liquidity, calculate required Y to maintain exact ratio
      // Use BigInt for precise calculation
      const xAmountBigInt = BigInt(xAmount);
      const requiredY = (xAmountBigInt * yReserve) / xReserve;
      const requiredYString = requiredY.toString();

      console.log("Calculation details:");
      console.log("xAmountBigInt:", xAmountBigInt.toString());
      console.log("yReserve:", yReserve.toString());
      console.log("xReserve:", xReserve.toString());
      console.log(
        "requiredY calculation:",
        (xAmountBigInt * yReserve).toString(),
        "/",
        xReserve.toString()
      );
      console.log("requiredY result:", requiredY.toString());
      console.log("Setting Y amount to:", requiredYString);

      setYAmount(requiredYString);
    } else if (xAmount && (!k || k === 0n)) {
      console.log("✅ First time adding liquidity - user can set any ratio");
      console.log("Not changing Y amount, letting user set manually");
    } else {
      console.log("❌ Conditions not met for auto-calculation");
      console.log("xAmount exists:", !!xAmount);
      console.log("k > 0:", k && k > 0n);
      console.log("xReserve exists and > 0:", xReserve && xReserve > 0n);
      console.log("yReserve exists:", !!yReserve);
    }
  }, [xAmount, k, xReserve, yReserve, queryClient]);

  // Refresh data when transaction is confirmed
  useEffect(() => {
    console.log("=== Transaction status effect ===");
    console.log("isConfirming:", isConfirming);
    console.log("isConfirmed:", isConfirmed);
    console.log("hash:", hash);
    console.log("error:", error);

    if (isConfirmed) {
      console.log("✅ Transaction confirmed - refreshing data");

      // Invalidate all contract-related queries to ensure complete refresh
      queryClient.invalidateQueries({
        queryKey: [{ address: CONTRACT_ADDRESSES.PAIR }],
      });
      queryClient.invalidateQueries({
        queryKey: [{ address: CONTRACT_ADDRESSES.TOKEN1 }],
      });
      queryClient.invalidateQueries({
        queryKey: [{ address: CONTRACT_ADDRESSES.TOKEN2 }],
      });

      // Invalidate all wagmi queries to ensure complete refresh
      queryClient.invalidateQueries({
        type: "all",
      });

      // Force refetch all queries
      queryClient.refetchQueries({
        type: "all",
      });

      // Clear input fields after successful transaction
      setMintAmount("");
      setXAmount("");
      setYAmount("");
      setSwapFromAmount("");
      setSwapToAmount("");
      setRemoveAmount("");

      console.log("✅ Data refreshed and inputs cleared");
    }
  }, [isConfirmed, queryClient, isConfirming, hash, error]);

  // Calculate swap output
  useEffect(() => {
    if (swapFromAmount && xReserve && yReserve && k && k > 0n) {
      try {
        const fromAmount = parseEther(swapFromAmount);
        const fee = (fromAmount * 3n) / 1000n; // 0.3% fee
        const fromAmountAfterFee = fromAmount - fee;

        let output: bigint;
        if (swapDirection === "xToY") {
          // Y = (Y_reserve * (X_reserve + X_in) - k) / (X_reserve + X_in)
          output =
            (yReserve * (xReserve + fromAmountAfterFee) - k) /
            (xReserve + fromAmountAfterFee);
        } else {
          // X = (X_reserve * (Y_reserve + Y_in) - k) / (Y_reserve + Y_in)
          output =
            (xReserve * (yReserve + fromAmountAfterFee) - k) /
            (yReserve + fromAmountAfterFee);
        }

        setSwapToAmount(formatEther(output));
      } catch {
        setSwapToAmount("");
      }
    } else {
      setSwapToAmount("");
    }
  }, [swapFromAmount, swapDirection, xReserve, yReserve, k]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="text-center relative z-10">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
              MiniAMM DApp
            </h1>
            <p className="text-white/80 mb-6 text-lg">
              Connect your wallet to start trading
            </p>
            <div className="mb-4">
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            MiniAMM DApp
          </h1>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
            <WalletConnect />
          </div>
        </div>

        {/* Pool Information */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8 border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10"></div>
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent relative z-10">
            Pool Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm p-6 rounded-2xl border border-cyan-400/30 shadow-lg">
              <p className="text-sm text-cyan-300 font-medium mb-2">
                Token X ({tokenXInfo.symbol})
              </p>
              <p className="text-2xl font-bold text-white">
                {formatBalance(xReserve)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm p-6 rounded-2xl border border-purple-400/30 shadow-lg">
              <p className="text-sm text-purple-300 font-medium mb-2">
                Token Y ({tokenYInfo.symbol})
              </p>
              <p className="text-2xl font-bold text-white">
                {formatBalance(yReserve)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm p-6 rounded-2xl border border-pink-400/30 shadow-lg">
              <p className="text-sm text-pink-300 font-medium mb-2">
                K (Constant Product)
              </p>
              <p className="text-2xl font-bold text-white">
                {formatBalance(k)}
              </p>
            </div>
          </div>
        </div>

        {/* User Balances */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8 border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent relative z-10">
            Your Balances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm p-6 rounded-2xl border border-blue-400/30 shadow-lg">
              <p className="text-sm text-blue-300 font-medium mb-2">
                {tokenXInfo.symbol}
              </p>
              <p className="text-2xl font-bold text-white">
                {formatBalance(token1Balance)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm p-6 rounded-2xl border border-green-400/30 shadow-lg">
              <p className="text-sm text-green-300 font-medium mb-2">
                {tokenYInfo.symbol}
              </p>
              <p className="text-2xl font-bold text-white">
                {formatBalance(token2Balance)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm p-6 rounded-2xl border border-purple-400/30 shadow-lg">
              <p className="text-sm text-purple-300 font-medium mb-2">
                LP Tokens
              </p>
              <p className="text-2xl font-bold text-white">
                {formatBalance(lpBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl mb-8 border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5"></div>
          <div className="border-b border-white/20 relative z-10">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "mint", label: "Mint Tokens" },
                { id: "addLiquidity", label: "Add Liquidity" },
                { id: "swap", label: "Swap" },
                { id: "removeLiquidity", label: "Remove Liquidity" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | "mint"
                        | "addLiquidity"
                        | "swap"
                        | "removeLiquidity"
                    )
                  }
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? "border-cyan-400 text-cyan-300 bg-gradient-to-r from-cyan-500/10 to-purple-500/10"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8 relative z-10">
            {/* Mint Tokens Tab */}
            {activeTab === "mint" && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6">
                  Mint Test Tokens
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Select Token
                    </label>
                    <select
                      value={mintToken}
                      onChange={(e) =>
                        setMintToken(e.target.value as "token1" | "token2")
                      }
                      className="w-full p-4 border-2 border-white/20 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white/10 backdrop-blur-sm text-white"
                    >
                      <option value="token1">
                        {tokenXInfo.symbol} ({tokenXInfo.name})
                      </option>
                      <option value="token2">
                        {tokenYInfo.symbol} ({tokenYInfo.name})
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Amount to Mint
                    </label>
                    <input
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full p-3 border-2 border-white/20 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!mintAmount) return;
                      const tokenAddress =
                        mintToken === "token1"
                          ? CONTRACT_ADDRESSES.TOKEN1
                          : CONTRACT_ADDRESSES.TOKEN2;
                      writeContract({
                        address: tokenAddress,
                        abi: MOCK_ERC20_ABI,
                        functionName: "freeMintToSender",
                        args: [parseEther(mintAmount)],
                      });
                    }}
                    disabled={!mintAmount || isPending || isConfirming}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 px-6 rounded-2xl hover:from-cyan-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending || isConfirming ? "Minting..." : "Mint Tokens"}
                  </button>
                </div>
              </div>
            )}

            {/* Add Liquidity Tab */}
            {activeTab === "addLiquidity" && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-6">
                  Add Liquidity
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {tokenXInfo.symbol} Amount
                    </label>
                    <input
                      type="number"
                      value={xAmount}
                      onChange={(e) => setXAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full p-3 border-2 border-white/20 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {tokenYInfo.symbol} Amount
                      {k && k > 0n && xReserve && yReserve && (
                        <span className="text-xs text-red-500 ml-2 font-semibold">
                          (READ-ONLY - Auto-calculated)
                        </span>
                      )}
                      {(!k || k === 0n) && (
                        <span className="text-xs text-green-600 ml-2 font-semibold">
                          (Set any amount for initial ratio)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={yAmount}
                      onChange={(e) => setYAmount(e.target.value)}
                      placeholder="Enter amount"
                      className={`w-full p-4 border-2 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 ${
                        k && k > 0n && xReserve && yReserve
                          ? "border-white/10 bg-white/5 text-white/60 cursor-not-allowed backdrop-blur-sm"
                          : "border-white/20 bg-white/10 text-white placeholder-white/50 backdrop-blur-sm"
                      }`}
                      readOnly={
                        k && k > 0n && xReserve && yReserve ? true : false
                      }
                    />
                    {k && k > 0n && xReserve && yReserve && (
                      <div className="mt-2 p-3 bg-cyan-500/10 backdrop-blur-sm rounded-2xl border border-cyan-400/30">
                        <p className="text-sm text-white/80 font-medium mb-1">
                          Current Pool Ratio: {formatBalance(xReserve)}{" "}
                          {tokenXInfo.symbol} : {formatBalance(yReserve)}{" "}
                          {tokenYInfo.symbol}
                        </p>
                        {xAmount && (
                          <p className="text-sm text-gray-600">
                            Required Y amount for {xAmount} {tokenXInfo.symbol}:{" "}
                            <span className="font-semibold text-blue-600">
                              {formatBalance(
                                (BigInt(xAmount) * yReserve) / xReserve
                              )}{" "}
                              {tokenYInfo.symbol}
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-blue-600 mt-1">
                          ⚠️ Y amount will be automatically calculated to
                          maintain the exact ratio
                        </p>
                      </div>
                    )}
                    {(!k || k === 0n) && (
                      <div className="mt-2 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-white/80 font-medium mb-1">
                          🎉 First Liquidity Addition
                        </p>
                        <p className="text-sm text-gray-600">
                          You can set any ratio for the initial liquidity. This
                          will establish the initial price.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddLiquidity}
                    disabled={!xAmount || !yAmount || isPending || isConfirming}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-6 rounded-2xl hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending || isConfirming
                      ? "Adding Liquidity..."
                      : "Add Liquidity"}
                  </button>
                </div>
              </div>
            )}

            {/* Swap Tab */}
            {activeTab === "swap" && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
                  Swap Tokens
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Swap Direction
                    </label>
                    <select
                      value={swapDirection}
                      onChange={(e) =>
                        setSwapDirection(e.target.value as "xToY" | "yToX")
                      }
                      className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    >
                      <option value="xToY">
                        {tokenXInfo.symbol} → {tokenYInfo.symbol}
                      </option>
                      <option value="yToX">
                        {tokenYInfo.symbol} → {tokenXInfo.symbol}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      From Amount (
                      {swapDirection === "xToY"
                        ? tokenXInfo.symbol
                        : tokenYInfo.symbol}
                      )
                    </label>
                    <input
                      type="number"
                      value={swapFromAmount}
                      onChange={(e) => setSwapFromAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full p-3 border-2 border-white/20 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      To Amount (
                      {swapDirection === "xToY"
                        ? tokenYInfo.symbol
                        : tokenXInfo.symbol}
                      )
                    </label>
                    <input
                      type="number"
                      value={swapToAmount}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                    />
                    <p className="text-sm text-white/60 mt-1">
                      Estimated output (includes 0.3% fee)
                    </p>
                  </div>
                  <button
                    onClick={handleSwap}
                    disabled={!swapFromAmount || isPending || isConfirming}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-2xl hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending || isConfirming ? "Swapping..." : "Swap Tokens"}
                  </button>
                </div>
              </div>
            )}

            {/* Remove Liquidity Tab */}
            {activeTab === "removeLiquidity" && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-6">
                  Remove Liquidity
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      LP Token Amount to Remove
                    </label>
                    <input
                      type="number"
                      value={removeAmount}
                      onChange={(e) => setRemoveAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full p-3 border-2 border-white/20 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                    />
                    <p className="text-sm text-white/60 mt-1">
                      Your LP Balance: {formatBalance(lpBalance)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!removeAmount) return;
                      writeContract({
                        address: CONTRACT_ADDRESSES.PAIR,
                        abi: MINI_AMM_ABI,
                        functionName: "removeLiquidity",
                        args: [parseEther(removeAmount)],
                      });
                    }}
                    disabled={!removeAmount || isPending || isConfirming}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 px-6 rounded-2xl hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending || isConfirming
                      ? "Removing Liquidity..."
                      : "Remove Liquidity"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Status */}
        {hash && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">Transaction Status</h3>
            <p className="text-sm text-gray-600 mb-2">
              Transaction Hash: {hash}
            </p>
            {isConfirming && (
              <p className="text-blue-600">Confirming transaction...</p>
            )}
            {isConfirmed && (
              <p className="text-green-600">Transaction confirmed!</p>
            )}
            {error && <p className="text-red-600">Error: {String(error)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
