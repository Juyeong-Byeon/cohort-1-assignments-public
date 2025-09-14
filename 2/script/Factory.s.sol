// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MiniAMMFactory} from "../src/MiniAMMFactory.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract FactoryScript is Script {
    MiniAMMFactory public miniAMMFactory;
    MockERC20 public token0;
    MockERC20 public token1;
    address public pair;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Step 1: Deploy MiniAMMFactory
        miniAMMFactory = new MiniAMMFactory();
        // Step 2: Deploy two MockERC20 tokens
        token0 = new MockERC20("MockToken1", "MCT1");
        token1 = new MockERC20("MockToken2", "MCT2");

        // Step 3: Create a MiniAMM pair using the factory
        address pairAddress = miniAMMFactory.createPair(address(token0), address(token1));
        console.log("pair created", pairAddress);
        address pairAddressCheck = miniAMMFactory.getPair(address(token0), address(token1));
        console.log("get pair", pairAddressCheck);
        require(pairAddress == pairAddressCheck, "should be same contract");

        vm.stopBroadcast();
    }
}
