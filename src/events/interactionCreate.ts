import { GuildMember, Interaction } from 'discord.js';
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
			console.log(caller.id);
			console.log(vote.eligibleToVote);
			console.log(vote.eligibleToVote.has(caller.id));
			if (!vote.eligibleToVote.has(caller.id)) {
				interaction.reply({ content: 'You are not eligible to vote', ephemeral: true });
				return;
			}

			vote.onVoteAdded(caller, interaction.customId == 'yesBtn');
		}
	}
};

export default event;
