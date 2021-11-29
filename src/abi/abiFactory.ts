import stakingAbi from './staking.json';

export const getStakingAbi = (id: number) => {
	switch (id) {
	case 1:
		return stakingAbi;
	default:
		return null;
	}
}
