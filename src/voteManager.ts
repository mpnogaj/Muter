import { Snowflake } from 'discord.js';
import { VoteMute } from './types';

export default class VoteManager {
	private static _instance: VoteManager | undefined = undefined;

	public votesInProgress: Map<Snowflake, VoteMute>;

	private constructor() {
		this.votesInProgress = new Map<Snowflake, VoteMute>();
		setInterval(() => {
			const currentTimestamp = Date.now() / 1000;
			const idsToDelete: Snowflake[] = [];
			this.votesInProgress.forEach(vote => {
				if (vote.expirationTime <= currentTimestamp) idsToDelete.push(vote.voteId);
			});
			idsToDelete.forEach(id => {
				this.removeVote(id, 'Timed out');
			});
		}, 100);
	}

	public addVote(voteId: Snowflake, vote: VoteMute) {
		this.votesInProgress.set(voteId, vote);
		console.log(vote);
	}

	public getVote(voteId: Snowflake) {
		return this.votesInProgress.get(voteId);
	}

	public removeVote(voteId: Snowflake, reason: string) {
		const vote = this.votesInProgress.get(voteId);
		if (vote == undefined) return;
		vote.onVoteEnded(reason);
		this.votesInProgress.delete(voteId);
	}

	public static get Instance() {
		if (this._instance == undefined) this._instance = new this();
		return this._instance;
	}
}
