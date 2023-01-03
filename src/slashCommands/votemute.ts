import {
	CommandInteraction,
	CacheType,
	SlashCommandBuilder,
	GuildMember,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { commonVoiceChannel } from '../functions';
import { SlashCommand } from '../types';
import VoteManager from '../voteManager';

const voteDuration = 5;

const command: SlashCommand = {
	command: new SlashCommandBuilder()
		.setName('votemute')
		.setDescription('Start vote to mute mentioned user')
		.addMentionableOption(options =>
			options.setName('user').setDescription('User to mute').setRequired(true)
		),
	execute: async function (interaction: CommandInteraction<CacheType>): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		const votedUser = interaction.options.data[0].member;
		const caller = interaction.member;
		if (!(votedUser instanceof GuildMember) || !(caller instanceof GuildMember)) return;

		const channel = await commonVoiceChannel(caller, votedUser);

		if (channel == undefined) {
			interaction.reply('You need to be in the same voice channel to mute this user');
			return;
		}

		const yesButton = new ButtonBuilder()
			.setCustomId('yesBtn')
			.setLabel('Yes!')
			.setStyle(ButtonStyle.Success);
		const noButton = new ButtonBuilder()
			.setCustomId('noBtn')
			.setLabel('No!')
			.setStyle(ButtonStyle.Danger);

		const endTime = Date.now() / 1000 + voteDuration;

		await interaction.reply({
			content: `Voteban ${votedUser}`,
			components: [new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton)]
		});

		const msg = await interaction.fetchReply();
		VoteManager.Instance.addVote(msg.id, {
			voteId: msg.id,
			currentVotes: 1,
			requiredVotes: 10,
			user: votedUser,
			expirationTime: endTime,
			eligibleToVote: new Set(
				channel.members.filter(user => user.id != votedUser.id && user.id != caller.id).values()
			),
			onVoteEnded: () => {
				interaction.editReply({ content: `Voteban ${votedUser}. Vote ended!`, components: [] });
			},
			parentInteraction: interaction
		});
	}
};

export default command;
