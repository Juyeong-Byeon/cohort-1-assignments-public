// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMMFactory} from "./IMiniAMMFactory.sol";
import {MiniAMM} from "./MiniAMM.sol";

// Add as many variables or functions as you would like
// for the implementation. The goal is to pass `forge test`.
contract MiniAMMFactory is IMiniAMMFactory {
    mapping(address => mapping(address => address)) private _getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairNumber);

    constructor() {}

    // implement
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function getPair(address tokenA, address tokenB) external view returns (address) {
        address tokenX = tokenA < tokenB ? tokenA : tokenB;
        address tokenY = tokenA < tokenB ? tokenB : tokenA;
        return _getPair[tokenX][tokenY];
    }

    // implement
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != address(0), "Zero address");
        require(tokenB != address(0), "Zero address");
        require(tokenA != tokenB, "Identical addresses");
        address tokenX = tokenA < tokenB ? tokenA : tokenB;
        address tokenY = tokenA < tokenB ? tokenB : tokenA;
        require(_getPair[tokenX][tokenY] == address(0), "Pair exists");

        MiniAMM miniAMM = new MiniAMM(tokenX, tokenY);
        _getPair[tokenX][tokenY] = address(miniAMM);
        allPairs.push(address(miniAMM));
        emit PairCreated(tokenX, tokenY, address(miniAMM), allPairs.length);
        return address(miniAMM);
    }
}
