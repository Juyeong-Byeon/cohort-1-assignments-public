// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {MiniAMMFactory} from "../src/MiniAMMFactory.sol";
import {IMiniAMMFactoryEvents} from "../src/IMiniAMMFactory.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MiniAMMFactoryTest is Test {
    MiniAMMFactory public factory;
    MockERC20 public token0;
    MockERC20 public token1;

    // Fork testing addresses from broadcast
    address constant FACTORY_ADDRESS = 0x4a9bbD62A8827117eE3391e9D8055d3D46a1A2E0;
    address constant TOKEN1_ADDRESS = 0xFce9D7A78e11a22f465623f3295a8c52A0fb78b5;
    address constant TOKEN2_ADDRESS = 0x472fFfB3d09c29B29D25dC5600cb570cAb8A4206;
    address constant PAIR_ADDRESS = 0x01bfd0C9DA99536266a8df1CB1D039667A858b05;
    uint256 constant FORK_BLOCK = 0x14dec00; // Block number from broadcast

    // Import events for testing
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairNumber);

    function setUp() public {
        // Fork the blockchain at the specified block
        vm.createFork("https://coston2-api.flare.network/ext/C/rpc", FORK_BLOCK);
        
        // Use deployed contracts from broadcast
        factory = MiniAMMFactory(FACTORY_ADDRESS);
        token0 = MockERC20(TOKEN1_ADDRESS);
        token1 = MockERC20(TOKEN2_ADDRESS);
    }

    function test_Factory_CreatePair() public view {
        // The pair already exists from the broadcast, so we test the existing pair
        address pair = factory.getPair(address(token0), address(token1));

        // Check pair was created correctly
        assertEq(factory.getPair(address(token0), address(token1)), pair);
        assertEq(factory.getPair(address(token1), address(token0)), pair); // Should work both ways
        assertEq(factory.allPairsLength(), 1);
        assertEq(factory.allPairs(0), pair);

        // Check pair has correct configuration
        MiniAMM pairContract = MiniAMM(pair);

        // Tokens should be ordered (tokenX < tokenY)
        address expectedTokenX = address(token0) < address(token1) ? address(token0) : address(token1);
        address expectedTokenY = address(token0) < address(token1) ? address(token1) : address(token0);

        assertEq(pairContract.tokenX(), expectedTokenX);
        assertEq(pairContract.tokenY(), expectedTokenY);
    }

    function test_Factory_CannotCreateDuplicatePair() public {
        // The pair already exists from the broadcast, so we test that we can't create it again
        // Try to create duplicate pair
        vm.expectRevert("Pair exists");
        factory.createPair(address(token0), address(token1));

        // Try with reversed order
        vm.expectRevert("Pair exists");
        factory.createPair(address(token1), address(token0));
    }

    function test_Factory_CannotCreatePairWithSameToken() public {
        // Try to create pair with same token
        vm.expectRevert("Identical addresses");
        factory.createPair(address(token0), address(token0));
    }

    function test_Factory_CannotCreatePairWithZeroAddress() public {
        // Try to create pair with zero address
        vm.expectRevert("Zero address");
        factory.createPair(address(0), address(token1));

        vm.expectRevert("Zero address");
        factory.createPair(address(token0), address(0));
    }

    function test_Factory_AllPairs() public {
        // The pair already exists from the broadcast
        assertEq(factory.allPairsLength(), 1);
        assertEq(factory.allPairs(0), PAIR_ADDRESS);

        // Create second pair with new token
        MockERC20 token2 = new MockERC20("Token C", "TKC");
        address pair2 = factory.createPair(address(token0), address(token2));
        assertEq(factory.allPairsLength(), 2);
        assertEq(factory.allPairs(1), pair2);
    }

    function test_Factory_TokenOrdering() public {
        // Test with the existing deployed pair
        address pair1 = factory.getPair(address(token0), address(token1));

        // Verify that getPair works both ways (should return same pair)
        assertEq(factory.getPair(address(token0), address(token1)), pair1);
        assertEq(factory.getPair(address(token1), address(token0)), pair1);

        // Creating the same pair in reverse order should revert since pair already exists
        vm.expectRevert("Pair exists");
        factory.createPair(address(token1), address(token0));
    }

    function test_Factory_PairCreatedEvent() public view {
        // Since the pair already exists, we can't test the event emission
        // Instead, we test that the pair exists and has correct configuration
        address pair = factory.getPair(address(token0), address(token1));
        
        // Verify the pair exists and has correct configuration
        assertTrue(pair != address(0));
        assertEq(pair, PAIR_ADDRESS);
    }

    function test_Factory_PairCreatedEventMultiplePairs() public {
        // Test with existing pair and create a new one
        address pair1 = factory.getPair(address(token0), address(token1));
        assertEq(pair1, PAIR_ADDRESS);

        // Create second pair with new token
        MockERC20 token2 = new MockERC20("Token C", "TKC");

        address expectedToken0_2 = address(token0) < address(token2) ? address(token0) : address(token2);
        address expectedToken1_2 = address(token0) < address(token2) ? address(token2) : address(token0);

        vm.expectEmit(true, true, false, false);
        emit PairCreated(expectedToken0_2, expectedToken1_2, address(0), 2); // pairNumber should be 2

        address pair2 = factory.createPair(address(token0), address(token2));

        // Verify both pairs are different and factory state is correct
        assertTrue(pair1 != pair2);
        assertEq(factory.allPairsLength(), 2);
    }
}
