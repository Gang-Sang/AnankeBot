import Web3 from 'web3';
import { Platform } from './platforms';
import { getBalace } from '../common/erc20';
import { sendContractCall } from '../common/transactionHelper';
import stakingHelperAbi from '../abi/stakingHelper.json';
import stakingAbi from '../abi/staking.json';

export const stakeAllTokens = async (web3: Web3, platform: Platform) => {
	const tokenBalance = await getBalace(web3, platform.tokenContract);
	const stakingHelperContract = new web3.eth.Contract(stakingHelperAbi as any, platform.stakingHelperContract);
	const methodSig = await stakingHelperContract.methods.stake(tokenBalance);

	return await sendContractCall(web3, methodSig, platform.stakingHelperContract);
}

export const unstakeAllTokens = async (web3: Web3, platform: Platform) => {
	const tokenBalance = await getBalace(web3, platform.stakingTokenContract);
	const stakingContract = new web3.eth.Contract(stakingAbi as any, platform.stakingContract);
	const methodSig = await stakingContract.methods.unstake(tokenBalance, false);

	return await sendContractCall(web3, methodSig, platform.stakingContract);
}