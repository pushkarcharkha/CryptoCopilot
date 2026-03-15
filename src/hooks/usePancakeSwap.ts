import { ethers } from 'ethers';

// PancakeSwap V2 Router contract on BNB Chain
export const PANCAKESWAP_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

export const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

export const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

export const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

export const BNB_TOKENS: Record<string, string> = {
  BNB: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
};

export const usePancakeSwap = () => {
  const getSwapQuote = async (fromToken: string, toToken: string, amountIn: string) => {
    if (!window.ethereum) throw new Error("Wallet not connected");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const router = new ethers.Contract(PANCAKESWAP_ROUTER, ROUTER_ABI, provider);
    
    const fromAddress = fromToken.toLowerCase() === BNB_TOKENS.BNB.toLowerCase() ? WBNB : fromToken;
    const toAddress = toToken.toLowerCase() === BNB_TOKENS.BNB.toLowerCase() ? WBNB : toToken;
    
    let path;
    if (fromToken.toLowerCase() === BNB_TOKENS.BNB.toLowerCase()) {
      path = [WBNB, toAddress];
    } else if (toToken.toLowerCase() === BNB_TOKENS.BNB.toLowerCase()) {
      path = [fromAddress, WBNB];
    } else {
      path = [fromAddress, WBNB, toAddress];
    }
    
    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1]; // estimated output amount
  };

  const approveToken = async (tokenAddress: string, amount: string) => {
    if (!window.ethereum) throw new Error("Wallet not connected");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    const walletAddress = await signer.getAddress();
    const allowance = await token.allowance(walletAddress, PANCAKESWAP_ROUTER);
    
    if (BigInt(allowance) < BigInt(amount)) {
      const tx = await token.approve(PANCAKESWAP_ROUTER, ethers.MaxUint256);
      await tx.wait();
    }
  };

  return { getSwapQuote, approveToken };
};
