import Web3 from 'web3';
import { Platform } from './platforms';
import config from '../appConfig.json';
import { sendContractCall } from '../common/transactionHelper';
import uniswapPairAbi from '../abi/unswapV2Pair.json';
import spookyRouterAbi from '../abi/spookySwapRouter.json';

export const getLiquidityReserves = async (web3: Web3, platform: Platform) => {
	const myContract = new web3.eth.Contract(uniswapPairAbi as any, platform.daiLPPoolContract);
	const reserves = await (myContract as any).methods.getReserves().call();
	return [reserves._reserve0, reserves._reserve1];
}

export const swapDaiForTokens = async (web3: Web3, platform: Platform, daiAmount: bigint, reserves: bigint[]) => {
	const currentPrice = reserves[platform.daiReservePosition] / reserves[platform.tokenReservePosition];
	const minOut = (((daiAmount / currentPrice) * 99n) / 100n).toString();
	const path = [config.daiTokenAddress, platform.tokenContract];

	return await sendSwapTransaction(web3, platform, daiAmount.toString(), minOut, path);
}

export const swapTokensForDai = async (web3: Web3, platform: Platform, tokenAmount: bigint, reserves: bigint[]) => {
	const currentPrice = reserves[platform.tokenReservePosition] / reserves[platform.daiReservePosition];
	const minOut = (((tokenAmount / currentPrice) * 97n) / 100n).toString();
	const path = [platform.tokenContract, config.daiTokenAddress];

	return await sendSwapTransaction(web3, platform, tokenAmount.toString(), minOut, path);
}

const sendSwapTransaction = async (web3: Web3, platform: Platform, tokenAmount: string, minOut: string, path: string[]) => {
	const deadline = (Date.now() + (5 * 60 * 1000)).toString();//5 mins
	const routerContract = new web3.eth.Contract(spookyRouterAbi as any, config.spookRouterAddress);
	const methodSig = await routerContract.methods.swapExactTokensForTokens(tokenAmount, minOut, path, config.publicKey, deadline);

	return await sendContractCall(web3, methodSig, config.spookRouterAddress);
}
