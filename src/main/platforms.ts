import Web3 from 'web3';
import config from '../appConfig.json';
import stakingAbi from '../abi/staking.json';
import { log } from '../common/logger';

export interface Platform {
	id: number;
	name: string;
	stakingContract: string;
    stakingHelperContract: string;
	tokenContract: string;
    stakingTokenContract: string;
    daiLPPoolContract: string;
	endBlock: number;
	blocksToRebase: number;
    numberOfDecimals: number;
}

export const getPlatformToExecute = async (web3: Web3, currentBlock: number) => {
	const platforms = await getValidPlatforms(web3, currentBlock);

	if(!platforms || platforms.length == 0) { 
		return null; 
	}

	const withinBlockLimit = platforms.filter(p => p.blocksToRebase > config.numOfBlocksMin && p.blocksToRebase < config.numOfBlockPreBuy);

	if(withinBlockLimit.length > 0) {
		return withinBlockLimit[0];
	}
	if(config.verbose) {
		log(`No Platform in limits to buy. Closest is ${platforms[0].name} at block ${platforms[0].endBlock} - ${platforms[0].blocksToRebase} blocks to go`);
	}
	
	return null;
}

export const getValidPlatforms = async (web3: Web3, currentBlock: number) => {
	const platforms : Platform[] = [];

	for(let i = 0; i < config.platforms.length; i++) {
		const platform = config.platforms[i];
		const myContract = new web3.eth.Contract(stakingAbi as any, platform.stakingContract);
		const epochResult = await (myContract as any).methods?.epoch().call();

		const distribute = parseInt(epochResult.distribute);
		const endBlock = parseInt(epochResult.endBlock);

		//TODO: add conditions to check reward %
		//TODO: cache results to save api calls when we know we're not playing this block
		if(distribute > 0 && endBlock > currentBlock)
		{
			platforms.push({
				...platform,
				endBlock: epochResult.endBlock,
				blocksToRebase: epochResult.endBlock - currentBlock
			})
		}
	}

	platforms.sort((a,b) => (a.blocksToRebase - b.blocksToRebase));
	return platforms;
}