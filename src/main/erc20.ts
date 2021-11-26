import Web3 from 'web3';
import erc20Abi from '../abi/erc20.json';
import config from '../appConfig.json';

export const getBalace = async (web3: Web3, contractAddress: string) => {
	const myContract = new web3.eth.Contract(erc20Abi as any, contractAddress);
	const balance = await (myContract as any).methods.balanceOf(config.publicKey).call();
	return parseInt(balance);
};