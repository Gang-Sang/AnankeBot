import Web3 from 'web3';
import { Platform } from './platforms';

export const swapDaiForTokens = async (web3: Web3, platform: Platform) => {
	const myContract = new web3.eth.Contract(platform.daiLPPoolContract as any, platform.daiLPPoolContract);
	const transaction = await (myContract as any).methods.balanceOf(config.publicKey).send();
}

export swapTokensForDai = (web3: Web3, platform: Platform) => {
	return null;
}
