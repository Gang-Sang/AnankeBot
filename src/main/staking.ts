import Web3 from 'web3';
import config from '../appConfig.json';
import { Platform } from './platforms';
import { sendContractCall } from '../common/transactionHelper';
import stakingAbi from '../abi/staking.json';
import stakingHelperAbi from '../abi/stakingHelper.json';
import stakingHelperHecAbi from '../abi/stakingHelperHEC.json';

export const stakeTokens = async (web3: Web3, platform: Platform, tokenBalance: bigint) => {
	const methodSig = await getStakingMethodSig(web3, platform, tokenBalance);
	return await sendContractCall(web3, methodSig, platform.stakingHelperContract);
}

export const unstakeTokens = async (web3: Web3, platform: Platform, tokenBalance: bigint) => {
	const stakingContract = new web3.eth.Contract(stakingAbi as any, platform.stakingContract);
	const methodSig = await stakingContract.methods.unstake(tokenBalance.toString(), true);

	return await sendContractCall(web3, methodSig, platform.stakingContract);
}

const getStakingMethodSig = async (web3: Web3, platform: Platform, tokenBalance: bigint) => {
	switch (platform.id) {
	case 2: 
	case 5: {
		const stakingHelperHec = new web3.eth.Contract(stakingHelperHecAbi as any, platform.stakingHelperContract);
		return await stakingHelperHec.methods.stake(tokenBalance.toString(), config.publicKey);
	}
	default: {
		const stakingHelperContract = new web3.eth.Contract(stakingHelperAbi as any, platform.stakingHelperContract);
		return await stakingHelperContract.methods.stake(tokenBalance.toString());
	}
	}
}
