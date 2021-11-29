import Web3 from 'web3';
import erc20Abi from '../abi/erc20.json';
import config from '../appConfig.json';
import { sendContractCall } from './transactionHelper';

export const getBalace = async (web3: Web3, contractAddress: string) => {
	const myContract = new web3.eth.Contract(erc20Abi as any, contractAddress);
	const balance = await (myContract as any).methods.balanceOf(config.publicKey).call();
	return parseInt(balance);
};

export const getAllowance = async (web3: Web3, contractAddress: string, spender: string) => {
	const myContract = new web3.eth.Contract(erc20Abi as any, contractAddress);
	const balance = await (myContract as any).methods.allowance(config.publicKey, spender).call();
	return parseInt(balance);
};

export const approve = async (web3: Web3, contractAddress: string, spender: string, amount: number) => {
	const myContract = new web3.eth.Contract(erc20Abi as any, contractAddress);
	const methodSig = await myContract.methods.approve(spender, amount.toString());

	return await sendContractCall(web3, methodSig, contractAddress);
}