import { bold, GuildMember, Interaction } from 'discord.js';
import { BotEvent } from '../types';
import VoteManager from '../voteManager';

const event: BotEvent = {
	name: 'interactionCreate',
	execute: (interaction: Interaction) => {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.slashCommands.get(interaction.commandName);
			const cooldown = interaction.client.cooldowns.get(
				`${interaction.commandName}-${interaction.user.username}`
			);
			if (!command) return;
			if (command.cooldown && cooldown) {
				if (Date.now() < cooldown) {
					interaction.reply(
						`You have to wait ${Math.floor(
							Math.abs(Date.now() - cooldown) / 1000
						)} second(s) to use this command again.`
					);
					setTimeout(() => interaction.deleteReply(), 5000);
					return;
				}
				interaction.client.cooldowns.set(
					`${interaction.commandName}-${interaction.user.username}`,
					Date.now() + command.cooldown * 1000
				);
				setTimeout(() => {
					interaction.client.cooldowns.delete(
						`${interaction.commandName}-${interaction.user.username}`
					);
				}, command.cooldown * 1000);
			} else if (command.cooldown && !cooldown) {
				interaction.client.cooldowns.set(
					`${interaction.commandName}-${interaction.user.username}`,
					Date.now() + command.cooldown * 1000
				);
			}
			command.execute(interaction);
		} else if (interaction.isAutocomplete()) {
			const command = interaction.client.slashCommands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				if (!command.autocomplete) return;
				command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
			}
		} else if (interaction.isButton()) {
			const id = interaction.message.id;
			const caller = interaction.member as GuildMember;
			const vote = VoteManager.Instance.getVote(id);

			if (vote == undefined) {
				interaction.reply({ content: "Vote ended or it doesn't exists", ephemeral: true });
				return;
			}
			if (!vote.eligibleToVote.has(caller)) {
				interaction.reply({ content: 'You are not eligible to vote', ephemeral: true });
				return;
			}

			vote.eligibleToVote.delete(caller);
			const votedYes = interaction.customId == 'yesBtn';
			if (votedYes) vote.currentVotes++;

			interaction.reply(
				`${bold(caller.displayName)} voted ${bold(votedYes ? 'Yes' : 'No')}. Votemute ${bold(
					vote.user.displayName
				)}: ${vote.currentVotes}/${vote.requiredVotes}`
			);

			if (vote.requiredVotes == vote.currentVotes) {
				VoteManager.Instance.removeVote(id, 'Vote successful');
				return;
			}

			if (vote.eligibleToVote.size < vote.requiredVotes - vote.currentVotes) {
				VoteManager.Instance.removeVote(id, 'Vote failed');
				return;
			}
		}
	}
};

export default event;
