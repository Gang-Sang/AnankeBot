import Web3 from 'web3';
import { Platform } from './platforms';
import { sendContractCall } from '../common/transactionHelper';
import stakingHelperAbi from '../abi/stakingHelper.json';
import stakingAbi from '../abi/staking.json';

export const stakeTokens = async (web3: Web3, platform: Platform, tokenBalance: bigint) => {
	const stakingHelperContract = new web3.eth.Contract(stakingHelperAbi as any, platform.stakingHelperContract);
	const methodSig = await stakingHelperContract.methods.stake(tokenBalance.toString());

	return await sendContractCall(web3, methodSig, platform.stakingHelperContract);
}

export const unstakeTokens = async (web3: Web3, platform: Platform, tokenBalance: bigint) => {
	const stakingContract = new web3.eth.Contract(stakingAbi as any, platform.stakingContract);
	const methodSig = await stakingContract.methods.unstake(tokenBalance.toString(), false);

	return await sendContractCall(web3, methodSig, platform.stakingContract);
}