// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMM, IMiniAMMEvents} from "./IMiniAMM.sol";
import {MiniAMMLP} from "./MiniAMMLP.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;
// IMiniAMMEvents

// Add as many variables or functions as you would like
// for the implementation. The goal is to pass `forge test`.
contract MiniAMM is IMiniAMM, IMiniAMMEvents, MiniAMMLP {
    uint256 public k = 0;
    uint256 public xReserve = 0;
    uint256 public yReserve = 0;

    address public tokenX;
    address public tokenY;
    uint256 private RAY = 10 ** 18;
    // implement constructor

    constructor(address _tokenX, address _tokenY) MiniAMMLP(_tokenX, _tokenY) {
        require(_tokenX != address(0), "tokenX cannot be zero address");
        require(_tokenY != address(0), "tokenY cannot be zero address");
        require(_tokenX != _tokenY, "Tokens must be different");

        if (_tokenX < _tokenY) {
            tokenX = _tokenX;
            tokenY = _tokenY;
        } else {
            tokenX = _tokenY;
            tokenY = _tokenX;
        }
    }

    // Helper function to calculate square root
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // add parameters and implement function.
    // this function will determine the 'k'.
    function _addLiquidityFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal returns (uint256 lpMinted) {
        IERC20(address(tokenX)).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(address(tokenY)).transferFrom(msg.sender, address(this), yAmountIn);

        xReserve = xAmountIn;
        yReserve = yAmountIn;
        k = xAmountIn * yAmountIn;

        lpMinted = sqrt(k);
        _mintLP(msg.sender, lpMinted);

        emit AddLiquidity(xAmountIn, yAmountIn);

        return lpMinted;
    }

    // add parameters and implement function.
    // this function will increase the 'k'
    // because it is transferring liquidity from users to this contract.
    function _addLiquidityNotFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal returns (uint256 lpMinted) {
        // To maintain the reserve ratio when adding liquidity, we require:
        // xDelta / yDelta = X / Y
        // Solving for yDelta gives:
        // yDelta = (xDelta * Y) / X
        uint256 yRequired = (xAmountIn * yReserve) / xReserve;
        require(yRequired == yAmountIn, "invalid yAmountIn");

        IERC20(address(tokenX)).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(address(tokenY)).transferFrom(msg.sender, address(this), yRequired);

        lpMinted = xAmountIn * totalSupply() / xReserve;
        _mintLP(msg.sender, lpMinted);

        xReserve += xAmountIn;
        yReserve += yRequired;
        k = xReserve * yReserve;

        emit AddLiquidity(xAmountIn, yRequired);

        return lpMinted;
    }

    // complete the function. Should transfer LP token to the user.
    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external returns (uint256 lpMinted) {
        require(xAmountIn > 0 && yAmountIn > 0, "Amounts must be greater than 0");
        if (k == 0) {
            // add params
            return _addLiquidityFirstTime(xAmountIn, yAmountIn);
        } else {
            // add params
            return _addLiquidityNotFirstTime(xAmountIn, yAmountIn);
        }
    }

    // Remove liquidity by burning LP tokens
    function removeLiquidity(uint256 lpAmount) external returns (uint256 xAmount, uint256 yAmount) {
        uint256 xBalance = IERC20(tokenX).balanceOf(address(this));
        uint256 yBalance = IERC20(tokenY).balanceOf(address(this));

        xAmount = lpAmount * xBalance / totalSupply();
        yAmount = lpAmount * yBalance / totalSupply();

        xReserve -= xAmount;
        yReserve -= yAmount;

        // Update k value after removing liquidity
        // If reserves are 0, k should also be 0
        if (xReserve == 0 || yReserve == 0) {
            k = 0;
        } else {
            k = xReserve * yReserve;
        }

        _burnLP(msg.sender, lpAmount);
        IERC20(tokenX).transfer(msg.sender, xAmount);
        IERC20(tokenY).transfer(msg.sender, yAmount);

        return (xAmount, yAmount);
    }

    // complete the function
    function swap(uint256 xAmountIn, uint256 yAmountIn) external {
        require(
            IERC20(tokenX).balanceOf(address(this)) != 0 || IERC20(tokenY).balanceOf(address(this)) != 0,
            "No liquidity in pool"
        );
        require(xAmountIn == 0 || yAmountIn == 0, "Can only swap one direction at a time");
        require(xAmountIn > 0 || yAmountIn > 0, "Must swap at least one token");
        require(
            IERC20(tokenX).balanceOf(address(this)) >= xAmountIn && IERC20(tokenY).balanceOf(address(this)) >= yAmountIn,
            "Insufficient liquidity"
        );

        uint256 SWAP_FEE = 3 * RAY / 1000; // 0.3%

        if (xAmountIn == 0) {
            uint256 yAmountRemove = yAmountIn - (yAmountIn * SWAP_FEE / RAY);
            uint256 xAmountOut = (xReserve * (yReserve + yAmountRemove) - k) / (yReserve + yAmountRemove);
            IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountRemove);
            IERC20(tokenX).transfer(msg.sender, xAmountOut);

            xReserve -= xAmountOut;
            yReserve += yAmountIn;

            k = xReserve * yReserve;

            emit Swap(xAmountIn, yAmountIn, xAmountOut, 0);
        } else if (yAmountIn == 0) {
            uint256 xAmountRemove = xAmountIn - (xAmountIn * SWAP_FEE / RAY);
            uint256 yAmountOut = (yReserve * (xReserve + xAmountRemove) - k) / (xReserve + xAmountRemove);
            IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountRemove);
            IERC20(tokenY).transfer(msg.sender, yAmountOut);

            xReserve += xAmountIn;
            yReserve -= yAmountOut;

            k = xReserve * yReserve;

            emit Swap(xAmountIn, yAmountIn, 0, yAmountOut);
        }
    }
}
