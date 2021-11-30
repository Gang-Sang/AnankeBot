import Web3 from 'web3';
import config from '../appConfig.json';
import stakingAbi from '../abi/staking.json';
import { log } from '../common/logger';
import { getLiquidityReserves } from './spookySwap';

export interface Platform {
	id: number;
	name: string;
	stakingContract: string;
    stakingHelperContract: string;
	tokenContract: string;
    stakingTokenContract: string;
    daiLPPoolContract: string;
    daiReservePosition: number,
    tokenReservePosition: number,
	endBlock: number;
	blocksToRebase: number;
    numberOfDecimals: number;
    priceFloor: number;
    enabled: boolean;
    lpReserves: number[];
    readyToRun?: boolean;
}

export const getSoonestValidPlatform = async (web3: Web3, currentBlock: number): Promise<Platform | null> => {
	const platforms = await getValidPlatforms(web3, currentBlock);

	if(!platforms?.length) { 
		return null; 
	}

	platforms.sort((a,b) => (a.blocksToRebase - b.blocksToRebase));

	for(let i = 0; i < platforms.length; i++) {
		const eligiblePlatform = await runPlatformChecks(web3, platforms[i]);
		/*
		if(eligiblePlatform)
			eligiblePlatform.readyToRun = true;
		return eligiblePlatform;*/
		
		if (eligiblePlatform) {
			if (eligiblePlatform.blocksToRebase <= config.numOfBlockPreBuy && eligiblePlatform.blocksToRebase >= config.numOfBlocksMin) {
				eligiblePlatform.readyToRun = true;
			} else {
				eligiblePlatform.readyToRun = false;
			}

			return eligiblePlatform;
		}
	}

	return null;
}

const getValidPlatforms = async (web3: Web3, currentBlock: number) => {
	const platforms : Platform[] = [];

	//TODO: add conditions to check reward %
	//TODO: cache results to save api calls when we know we're not playing this block
	for(let i = 0; i < config.platforms.length; i++) {
		const platform = config.platforms[i];
		if(!platform.enabled) { continue; }

		const myContract = new web3.eth.Contract(stakingAbi as any, platform.stakingContract);
		if((await (myContract as any).methods?.warmupPeriod().call()) != 0 ) {
			continue;
		}

		const epochResult = await (myContract as any).methods?.epoch().call();
		if(epochResult.distribute <= 0) {
			continue;
		}
		
		if(epochResult.endBlock > currentBlock)
		{
			platforms.push({
				...platform,
				endBlock: epochResult.endBlock,
				blocksToRebase: epochResult.endBlock - currentBlock,
				lpReserves: []
			})
		}
	}

	return platforms;
}

//check rugpull metrics
const runPlatformChecks = async (web3: Web3, platform: Platform) : Promise<Platform | null> => {
	const reserves = await getLiquidityReserves(web3, platform);
    
	if(reserves[platform.daiReservePosition] < (500000 * Math.pow(10, 18)))
	{
		log(`Dai in LP balance too low, might be a rugpull. Check liquidity on ${platform.name}`);
		return null;
	}

	const price = (reserves[platform.daiReservePosition] / Math.pow(10, 18)) / (reserves[platform.tokenReservePosition] / Math.pow(10, platform.numberOfDecimals));

	if(price < platform.priceFloor)
	{
		log(`Price under price floor setting, might be a rugpull. Check price on ${platform.name}`);
		return null;
	}

	return {
		...platform,
		lpReserves: [reserves[0] as number, reserves[1] as number]
	};
}