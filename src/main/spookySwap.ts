import Web3 from 'web3';
import { TransactionConfig } from 'web3-core';
import { Platform } from './platforms';
import config from '../appConfig.json';
import uniswapPairAbi from '../abi/unswapV2Pair.json';
import spookyRouterAbi from '../abi/spookySwapRouter.json';

export const getLiquidityReserves = async (web3: Web3, platform: Platform) => {
	const myContract = new web3.eth.Contract(uniswapPairAbi as any, platform.daiLPPoolContract);
	const reserves = await (myContract as any).methods.getReserves().call();
	return [reserves._reserve0 / Math.pow(10, 9), reserves._reserve1 / Math.pow(10, 18)];
}

export const swapDaiForTokens = async (web3: Web3, platform: Platform, currentBlock: number, daiAmount: number, reserves: number[]) => {
	const currentPrice = reserves[1] / reserves[0];
	const minOut = ((daiAmount / currentPrice) * .999) * Math.pow(10, platform.numberOfDecimals);
	const path = [config.daiTokenAddress, platform.tokenContract];
	const deadline = currentBlock + (config.numOfBlockPreBuy / 2);
	const routerContract = new web3.eth.Contract(spookyRouterAbi as any, config.spookRouterAddress);

	const callData = await routerContract.methods.swapExactTokensForTokens(daiAmount * Math.pow(10, 18), minOut, path, config.publicKey, deadline);
	const gasEstimate = 1.2 * (await routerContract.methods.swapExactTokensForTokens(daiAmount * Math.pow(10, 18), minOut, path, config.publicKey, deadline).estimateGas());
	const gasPrice = parseFloat(await web3.eth.getGasPrice()) * 1.2;
	const transaction: TransactionConfig = {
		from: config.publicKey,
		to: config.spookRouterAddress,
		data: callData,
		value: '0',
		gasPrice: gasPrice,
		gas: gasEstimate
	};
	const signTx = await web3.eth.accounts.signTransaction(transaction, config.privateKey);
	const rawTx: string = signTx.rawTransaction as string;

	return await web3.eth.sendSignedTransaction(rawTx);
}

export const swapTokensForDai = (web3: Web3, platform: Platform) => {
	return null;
}
