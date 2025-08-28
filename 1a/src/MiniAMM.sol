// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMM, IMiniAMMEvents} from "./IMiniAMM.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Add as many variables or functions as you would like
// for the implementation. The goal is to pass `forge test`.
contract MiniAMM is IMiniAMM, IMiniAMMEvents {
    using SafeERC20 for IERC20;

    uint256 public k = 0;
    uint256 public xReserve = 0;
    uint256 public yReserve = 0;

    address public tokenX;
    address public tokenY;

    // implement constructor
    constructor(address _tokenX, address _tokenY) {
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

    function _addLiquidityFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
        IERC20(address(tokenX)).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(address(tokenY)).transferFrom(msg.sender, address(this), yAmountIn);

        xReserve = xAmountIn;
        yReserve = yAmountIn;
        k = xAmountIn * yAmountIn;

        emit AddLiquidity(xAmountIn, yAmountIn);
    }

    function _addLiquidityNotFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
        // To maintain the reserve ratio when adding liquidity, we require:
        // xDelta / yDelta = X / Y
        // Solving for yDelta gives:
        // yDelta = (xDelta * Y) / X
        uint256 yRequired = (xAmountIn * yReserve) / xReserve;
        require(yRequired == yAmountIn, "invalid yAmountIn");

        IERC20(address(tokenX)).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(address(tokenY)).transferFrom(msg.sender, address(this), yRequired);

        xReserve += xAmountIn;
        yReserve += yRequired;
        k = xReserve * yReserve;
        emit AddLiquidity(xAmountIn, yRequired);
    }

    // complete the function
    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external {
        require(xAmountIn > 0 && yAmountIn > 0, "Amounts must be greater than 0");
        if (k == 0) {
            // add params
            _addLiquidityFirstTime(xAmountIn, yAmountIn);
        } else {
            // add params
            _addLiquidityNotFirstTime(xAmountIn, yAmountIn);
        }
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

        if (xAmountIn == 0) {
            // (xR - xAmountOut) * (yR + yAmountIn) = k
            // (xR - xAmountOut) = k / (yR + yAmountIn) 
            //  - xAmountOut = k / (yR + yAmountIn) - xR
            //  xAmountOut = xR - k / (yR + yAmountIn)
        
            uint256 xAmountOut = xReserve - (k / (yReserve + yAmountIn));
            IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
            IERC20(tokenX).transfer(msg.sender, xAmountOut);

            xReserve -= xAmountOut;
            yReserve += yAmountIn;

            emit Swap(xAmountOut, yAmountIn);
        } else if (yAmountIn == 0) {
            // (xR + xAmountIn) * (yR - yAmountOut) = k
            // (yR - yAmountOut) * (xR + xAmountIn) = k
            // (yR - yAmountOut) = k / (xR + xAmountIn)
            //  yR - yAmountOut = k / (xR + xAmountIn)
            //  - yAmountOut = k / (xR + xAmountIn) - yR;
            // yAmountOut = (k / (xR + xAmountIn) - yR) * -1
            // yAmountOut = yR - k / (xR + xAmountIn)

            uint256 yAmountOut = yReserve - (k / (xReserve + xAmountIn));
            IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
            IERC20(tokenY).transfer(msg.sender, yAmountOut);

            xReserve += xAmountIn;
            yReserve -= yAmountOut;

            emit Swap(xAmountIn, yAmountOut);
        }
    }
}
