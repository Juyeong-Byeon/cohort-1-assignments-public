// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MiniAMMLPTest is Test {
    MiniAMM public miniAMM;
    MockERC20 public token0;
    MockERC20 public token1;

    address public alice = address(0x1);

    // Fork testing addresses from broadcast
    address constant FACTORY_ADDRESS = 0x4a9bbD62A8827117eE3391e9D8055d3D46a1A2E0;
    address constant TOKEN1_ADDRESS = 0xFce9D7A78e11a22f465623f3295a8c52A0fb78b5;
    address constant TOKEN2_ADDRESS = 0x472fFfB3d09c29B29D25dC5600cb570cAb8A4206;
    address constant PAIR_ADDRESS = 0x01bfd0C9DA99536266a8df1CB1D039667A858b05;
    uint256 constant FORK_BLOCK = 0x14dec00; // Block number from broadcast

    function setUp() public {
        // Fork the blockchain at the specified block
        vm.createFork("https://coston2-api.flare.network/ext/C/rpc", FORK_BLOCK);
        
        // Use deployed contracts from broadcast
        miniAMM = MiniAMM(PAIR_ADDRESS);
        token0 = MockERC20(TOKEN1_ADDRESS);
        token1 = MockERC20(TOKEN2_ADDRESS);

        // Setup tokens for alice
        token0.freeMintTo(10000 * 10 ** 18, alice);
        token1.freeMintTo(10000 * 10 ** 18, alice);

        vm.startPrank(alice);
        token0.approve(address(miniAMM), type(uint256).max);
        token1.approve(address(miniAMM), type(uint256).max);
        vm.stopPrank();
    }

    function test_LP_Mint() public {
        uint256 xAmount = 1000 * 10 ** 18;
        uint256 yAmount = 2000 * 10 ** 18;

        vm.prank(alice);
        uint256 lpMinted = miniAMM.addLiquidity(xAmount, yAmount);

        // Check minting worked
        assertGt(lpMinted, 0, "Should mint LP tokens");
        assertEq(miniAMM.balanceOf(alice), lpMinted, "Alice should receive minted LP tokens");
        assertGt(miniAMM.totalSupply(), 0, "Total supply should increase");
    }

    function test_LP_Burn() public {
        // First mint
        vm.prank(alice);
        uint256 lpMinted = miniAMM.addLiquidity(1000 * 10 ** 18, 2000 * 10 ** 18);

        uint256 supplyBefore = miniAMM.totalSupply();

        // Then burn
        vm.prank(alice);
        miniAMM.removeLiquidity(lpMinted);

        // Check burning worked
        assertEq(miniAMM.balanceOf(alice), 0, "Alice's LP tokens should be burned");
        assertLt(miniAMM.totalSupply(), supplyBefore, "Total supply should decrease");
    }
}
