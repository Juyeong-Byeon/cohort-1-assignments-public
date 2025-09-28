// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MiniAMM_LocalTest is Test {
    MiniAMM public miniAMM;
    MockERC20 public token0;
    MockERC20 public token1;
    
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    function setUp() public {
        // Deploy mock tokens
        token0 = new MockERC20("Token0", "T0");
        token1 = new MockERC20("Token1", "T1");
        
        // Deploy MiniAMM
        miniAMM = new MiniAMM(address(token0), address(token1));

        // Mint tokens to test addresses
        token0.freeMintTo(10000 * 10 ** 18, alice);
        token1.freeMintTo(10000 * 10 ** 18, alice);
        token0.freeMintTo(10000 * 10 ** 18, bob);
        token1.freeMintTo(10000 * 10 ** 18, bob);
        token0.freeMintTo(10000 * 10 ** 18, charlie);
        token1.freeMintTo(10000 * 10 ** 18, charlie);

        // Approve tokens for MiniAMM
        vm.startPrank(alice);
        token0.approve(address(miniAMM), type(uint256).max);
        token1.approve(address(miniAMM), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        token0.approve(address(miniAMM), type(uint256).max);
        token1.approve(address(miniAMM), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(charlie);
        token0.approve(address(miniAMM), type(uint256).max);
        token1.approve(address(miniAMM), type(uint256).max);
        vm.stopPrank();
    }

    function test_RemoveLiquidityAll() public {
        // Add liquidity
        uint256 xAmount = 1000 * 10 ** 18;
        uint256 yAmount = 2000 * 10 ** 18;

        vm.prank(alice);
        uint256 lpTokens = miniAMM.addLiquidity(xAmount, yAmount);

        // Check initial state
        assertTrue(miniAMM.k() > 0);
        assertTrue(miniAMM.xReserve() > 0);
        assertTrue(miniAMM.yReserve() > 0);

        console.log("Before removing liquidity:");
        console.log("k:", miniAMM.k());
        console.log("xReserve:", miniAMM.xReserve());
        console.log("yReserve:", miniAMM.yReserve());

        // Remove all liquidity
        vm.startPrank(alice);

        (uint256 xOut, uint256 yOut) = miniAMM.removeLiquidity(lpTokens);

        // Check that all LP tokens were burned
        assertEq(miniAMM.balanceOf(alice), 0);

        // Check that all tokens were returned (exact amounts since removing 100% of liquidity)
        assertEq(xOut, xAmount);
        assertEq(yOut, yAmount);

        // Check that k is reset to 0 when pool is empty
        console.log("After removing all liquidity:");
        console.log("k:", miniAMM.k());
        console.log("xReserve:", miniAMM.xReserve());
        console.log("yReserve:", miniAMM.yReserve());
        
        assertEq(miniAMM.k(), 0);
        assertEq(miniAMM.xReserve(), 0);
        assertEq(miniAMM.yReserve(), 0);

        vm.stopPrank();
    }
}
