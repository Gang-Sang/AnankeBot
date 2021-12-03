import Web3 from 'web3';
import { log } from './common/logger';
import { getBalace } from './common/erc20';
import config from './appConfig.json';
import { getSoonestValidPlatform, Platform } from './main/platforms';
import { setKey } from './common/transactionHelper';

import { executeBuySell } from './main/buySellRebase';
import prompt from 'prompt';

export const mainProgramLoop = async () => {
	prompt.start();
	const { pw } = await prompt.get(['pw']);
	setKey(pw as string);

	const web3 = new Web3(config.apiUrlBase);
	web3.eth.defaultAccount = config.publicKey;

	while (true) {
		const currentBlock = await web3.eth.getBlockNumber();
		const soonestPlatform = await mainFunction(web3, currentBlock);

		if (soonestPlatform && soonestPlatform.blocksToRebase > (config.numOfBlockPreBuy * 1.5)) {
			const minWakeupBlock = soonestPlatform.endBlock - (config.numOfBlockPreBuy * 1.5);
			const targetWakeupBlock = currentBlock + ((minWakeupBlock - currentBlock) / 2)//half the distance to min wake up
			const blockToSleepTill = Math.ceil(Math.min(minWakeupBlock, targetWakeupBlock));
			const sleepTime = blockToSleepTill - currentBlock; //each block ~ 1sec

			if (sleepTime < 30) {
				await sleep(30 * 1000);
			} else {
				log(`Next ${soonestPlatform.name} rebase on block ${soonestPlatform.endBlock}. current block-${currentBlock} wake up around block ${blockToSleepTill}. ~${sleepTime / 60} mins`);
				await sleep(sleepTime * 1000);
			}
		} else {
			await sleep(30 * 1000);
		}
	}
}

async function sleep(msec: number) {
	return await new Promise(resolve => setTimeout(resolve, msec));
}

async function mainFunction(web3: Web3, currentBlock: number): Promise<Platform | null> {
	const executePlatform = await getSoonestValidPlatform(web3, currentBlock);
	if (!executePlatform) { return null; }
	if (!executePlatform?.readyToRun) { return executePlatform; }

	const stableBalance = await getBalace(web3, config.stableTokenAddress);
	if (stableBalance <= 0) {
		log(`stable balance not enough to trade, exiting. Balance - ${stableBalance}`);
		return null;
	}

	const stableAmount = getAmountToStableCoinToTrade(executePlatform, stableBalance);
	if(stableAmount <= 0 || stableAmount > stableBalance) {
		log(`No enough stable balance to trade, exiting. Balance - ${stableBalance}, trade amount - ${stableAmount}`);
		return null;
	}

	await executeBuySell(web3, executePlatform, stableAmount);
	return null;
}

const getAmountToStableCoinToTrade = (platform: Platform, currentBlance: bigint) => {
	if(config.testMode) {
		return BigInt(100 * Math.pow(10, config.stableNumOfDecimals));
	}
	if (platform.positionSize.indexOf('%') != -1) {
		const percent = BigInt(platform.positionSize.substring(0, platform.positionSize.length -1));
		return (currentBlance * percent) / 100n;
	}

    const staticAmount = BigInt(platform.positionSize) * BigInt(Math.pow(10, config.stableNumOfDecimals));;
	if(currentBlance < staticAmount) {
        return currentBlance;
    } else {
        return staticAmount;
    }
}

