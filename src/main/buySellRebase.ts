import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core';
import config from '../appConfig.json';
import stakingAbi from '../abi/staking.json';
import { getBalace, getAllowance , approve } from '../common/erc20';
import { log } from '../common/logger';
import { Platform } from './platforms';
import { swapDaiForTokens, swapTokensForDai } from './spookySwap';
import { stakeAllTokens, unstakeAllTokens } from './staking';

const waitLoopLimit = 60;

export const executeBuySell = async (web3: Web3, platform: Platform, reserves: number[]) => {
	log(`Starting buy/sell cycle for ${platform.name}`);

	//buy token
	const buyReceipt = await buyToken(web3, platform, 100 * Math.pow(10, 18), reserves);
	if(buyReceipt) {
		log('Token buy transaction sucessful');
		log(JSON.stringify(buyReceipt));
	} else {
		log('Token buy transaction failed, exiting buy/sell process');
		return;
	}

	//stake token
	if(await stakePlatform(web3, platform)) {
		log(`Staking ${platform.name} sucessful`);
	} else {
		log('Staking unsucessful, bad state, exiting process');
		throw 'Staking unsucessful, bad state, exiting process';
	}
                                                                                               
	//watch for rebase
	const newRebaseBlock = watchForRebase(web3, platform);
	if(config.verbose) {
		log(`Rebase of ${platform.name} complete. Next rebase on ${newRebaseBlock}`);
	}
	await sleep(10 * 1000);

	//unstake token
	if(await unstakePlatform(web3, platform)) {
		log(`Unstaking ${platform.name} sucessful`);
	} else {
		log('Unstaking unsucessful, bad state, exiting process');
		throw 'Unstaking unsucessful, bad state, exiting process';
	}

	//convert back to dai
	const sellReceipt = await sellAllTokensForDai(web3, platform, reserves);
	if(sellReceipt) {
		log(`Sell token ${platform.name} sucessful`);
		log(JSON.stringify(sellReceipt));
	} else {
		log('Sell token unsucessful, bad state, exiting process');
		throw 'Sell token unsucessful, bad state, exiting process';
	}

	log(`Ending buy/sell cycle for ${platform.name}`);
}

const buyToken = async (web3: Web3, platform: Platform, daiAmount: number, reserves: number[]) => {
	log('buy token');
	await checkAllowanceAndApprove(web3, config.daiTokenAddress, config.spookRouterAddress, daiAmount);
	const receipt = await swapDaiForTokens(web3, platform, daiAmount, reserves);
	return await waitForTransaction(web3, receipt)
}

const sellAllTokensForDai = async (web3: Web3, platform: Platform, reserves: number[]) => {
	log('sell all token');
	const platformBalance = await getBalace(web3, platform.tokenContract);
	await checkAllowanceAndApprove(web3, platform.tokenContract, config.spookRouterAddress, platformBalance);
	const receipt = await swapTokensForDai(web3, platform, platformBalance, reserves);
	return await waitForTransaction(web3, receipt)
}

const stakePlatform = async (web3: Web3, platform: Platform) => {
	log('stake token');
	await checkAllowanceAndApprove(web3, platform.tokenContract, platform.stakingHelperContract, 3 * Math.pow(10, platform.numberOfDecimals));
	const receipt = await stakeAllTokens(web3, platform);
	return await waitForTransaction(web3, receipt)
}

const unstakePlatform = async (web3: Web3, platform: Platform) => {
	log('unstake token');
	await checkAllowanceAndApprove(web3, platform.stakingTokenContract, platform.stakingContract, 3 * Math.pow(10, platform.numberOfDecimals));
	const receipt = await unstakeAllTokens(web3, platform);
	return await waitForTransaction(web3, receipt)
}

const checkAllowanceAndApprove = async (web3: Web3, contract: string, spender: string, amount: number) => {
	const allowance = await getAllowance(web3, contract, spender);

	if(amount > allowance) {
		log('Not enough approved funds, sending approve now')
		const approveReceipt = await approve(web3, contract, spender, amount * 4);
		if(!(await waitForTransaction(web3, approveReceipt))) {
			throw `Approve failed, manually check status of tx ${approveReceipt?.transactionHash}`;
		}
	}
}

const watchForRebase = async (web3: Web3, platform: Platform) => {
	let endBlock;

	while(true) {
		const myContract = new web3.eth.Contract(stakingAbi as any, platform.stakingContract);
		const epochResult = await (myContract as any).methods?.epoch().call();
		endBlock = parseInt(epochResult.endBlock);

		if(endBlock > platform.endBlock) {
			break;
		}

		await sleep(10 * 1000);
	}

	return endBlock;
}

const waitForTransaction = async (web3: Web3, receipt: TransactionReceipt) => {
	let loops = 0;
	let retrieveReciept: TransactionReceipt;

	while (loops < waitLoopLimit) {
		retrieveReciept = await web3.eth.getTransactionReceipt(receipt.transactionHash);

		if(retrieveReciept?.blockNumber) {
			if(retrieveReciept.status == true) {
				return retrieveReciept;
			} else {
				return null;
			}
		}

		loops++;
		await sleep(10 * 1000);
	}

	throw `Failed to confirm transaction, manually check status of tx ${receipt?.transactionHash}`;
}

async function sleep(msec: number) {
	return new Promise(resolve => setTimeout(resolve, msec));
}
