import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core';
import config from '../appConfig.json';
import stakingAbi from '../abi/staking.json';
import { getBalace, getAllowance , approve } from '../common/erc20';
import { log, logRebaseComplete } from '../common/logger';
import { Platform } from './platforms';
import { swapStableForTokens, swapTokensForStable } from './spookySwap';
import { stakeTokens, unstakeTokens } from './staking';

const waitLoopLimit = 60;

export const executeBuySell = async (web3: Web3, platform: Platform, stableAmount: bigint) => {
	log(`Starting buy/sell cycle for ${platform.name}`);
	
	//buy token
	const buyReceipt = await buyToken(web3, platform, stableAmount, platform.lpReserves);
	if(buyReceipt) {
		log('Token buy transaction sucessful');
	} else {
		log('Token buy transaction failed, exiting buy/sell process');
		return;
	}
	sleep(2 * 1000);//

	//stake token
	if(await stakePlatform(web3, platform)) {
		log(`Staking ${platform.name} sucessful`);
	} else {
		log('Staking unsucessful, bad state, exiting process');
		throw 'Staking unsucessful, bad state, exiting process';
	}
                                                                                         
	//watch for rebase
	if(!config.testMode) {
		const newRebaseBlock = await watchForRebase(web3, platform);
		if(config.verbose) {
			log(`Rebase of ${platform.name} complete. Next rebase on ${newRebaseBlock}`);
		}
	}
	await sleep(2 * 1000);

	//unstake token
	if(await unstakePlatform(web3, platform)) {
		log(`Unstaking ${platform.name} sucessful`);
	} else {
		log('Unstaking unsucessful, bad state, exiting process');
		throw 'Unstaking unsucessful, bad state, exiting process';
	}

	//convert back to stable
	const sellReceipt = await sellAllTokensForStable(web3, platform, platform.lpReserves);
	if(sellReceipt) {
		log('Token sell transaction sucessful');
	} else {
		log('Sell token unsucessful, bad state, exiting process');
		throw 'Sell token unsucessful, bad state, exiting process';
	}

	log(`Ending buy/sell cycle for ${platform.name}`);
	logRebase(platform, buyReceipt, sellReceipt);
}

const buyToken = async (web3: Web3, platform: Platform, stableAmount: bigint, reserves: bigint[]) => {
	log('buy token');
	return await transactionRetryBLock('buy token', async () => {
		await checkAllowanceAndApprove(web3, config.stableTokenAddress, config.spookRouterAddress, stableAmount);
		const receipt = await swapStableForTokens(web3, platform, stableAmount, reserves);
		return await waitForTransaction(web3, receipt);
	});
}

const sellAllTokensForStable = async (web3: Web3, platform: Platform, reserves: bigint[]) => {
	log('sell all token');
	const platformBalance = await getBalanceWithRetry(web3, platform.tokenContract);
	if(platformBalance == BigInt(0)) {
		log(`Cannot sell tokens balance-${platformBalance}`);
		return;
	}

	return await transactionRetryBLock('sell all token', async () => {
		await checkAllowanceAndApprove(web3, platform.tokenContract, config.spookRouterAddress, platformBalance);
		const receipt = await swapTokensForStable(web3, platform, platformBalance, reserves);
		return await waitForTransaction(web3, receipt);
	});
}

const stakePlatform = async (web3: Web3, platform: Platform) => {
	log('stake token');
	const platformBalance = await getBalanceWithRetry(web3, platform.tokenContract);
	if(platformBalance == BigInt(0)) {
		log(`Cannot sell tokens balance-${platformBalance}`);
		return;
	}

	return await transactionRetryBLock('stake token', async () => {
		await checkAllowanceAndApprove(web3, platform.tokenContract, platform.stakingHelperContract, platformBalance);
		const receipt = await stakeTokens(web3, platform, platformBalance);
		return await waitForTransaction(web3, receipt);
	});
}

const unstakePlatform = async (web3: Web3, platform: Platform) => {
	log('unstake token');
	const platformBalance = await getBalanceWithRetry(web3, platform.stakingTokenContract);
	if(platformBalance == BigInt(0)) {
		log(`Cannot sell tokens balance-${platformBalance}`);
		return;
	}

	return await transactionRetryBLock('unstake token', async () => {
		await checkAllowanceAndApprove(web3, platform.stakingTokenContract, platform.stakingContract, platformBalance);
		const receipt = await unstakeTokens(web3, platform, platformBalance);
		return await waitForTransaction(web3, receipt);
	});
}

const checkAllowanceAndApprove = async (web3: Web3, contract: string, spender: string, amount: bigint) => {
	const allowance = await getAllowance(web3, contract, spender);

	if(amount > allowance) {
		log('Not enough approved funds, sending approve now');
		return await transactionRetryBLock('approve', async () => {
			const approveReceipt = await approve(web3, contract, spender, amount * 4n);
			return await waitForTransaction(web3, approveReceipt);
		});
	}

	return;
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

const getBalanceWithRetry = async (web3: Web3, contract: string) => {
	const loopLimit = 10;

	for(let i = 0; i < loopLimit; i++) {
		const balance = await getBalace(web3, contract);
		if(balance > 0) {
			return balance;
		}

		sleep(1 * 1000);
	}

	return BigInt(0);
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

const transactionRetryBLock = async (processName: string, fn: () => Promise<TransactionReceipt | null>) => {
	for(let i = 0; i < 3; i++) {
		try {
			if(i > 0) {
				log(`retry ${i} for ${processName}`);
			}

			const receipt = await fn();
			if(receipt) {
				return receipt;
			}
		} catch (err) {
			if(i == 2) {
				throw err;
			}
		}
	}

	throw `${processName} failed, retry limit reached`;
}

async function sleep(msec: number) {
	return new Promise(resolve => setTimeout(resolve, msec));
}

const logRebase = (platform: Platform, buyReceipt: TransactionReceipt, sellReceipt: TransactionReceipt) => {
	let buyAmount: string, sellAmount: string;
	if(buyReceipt?.logs?.length > 1) {
		buyAmount = buyReceipt.logs[0].data;
	} else {
		log('Cannot read amount traded from the buyReceipt');
		return;
	}

	if(sellReceipt?.logs?.length > 3) {
		sellAmount = sellReceipt.logs[2].data;
	} else {
		log('Cannot read amount traded from the sellReceipt');
		return;
	}

	logRebaseComplete(platform.name, buyAmount, sellAmount, config.stableNumOfDecimals);
}

