import {
	CommandInteraction,
	CacheType,
	SlashCommandBuilder,
	GuildMember,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	APIEmbedField,
	bold,
	userMention
} from 'discord.js';
import {
	commonVoiceChannel,
	extractNamesFromMemberSet,
	formatDate,
	getDateFromUnixTimestamp
} from '../functions';
import { SlashCommand, VoteMute } from '../types';
import VoteManager from '../voteManager';

const voteDuration = 5 * 60;

const createEmbed = (vote: VoteMute, status: string, mute: boolean) => {
	const votedYesArr = extractNamesFromMemberSet(vote.votedYes);
	const votedNoArr = extractNamesFromMemberSet(vote.votedNo);
	const votedYesUsersContent = votedYesArr.length == 0 ? bold('No votes') : votedYesArr.join('\n');
	const votedNoUsersContent = votedNoArr.length == 0 ? bold('No votes') : votedNoArr.join('\n');
	const fields: APIEmbedField[] = [
		{ name: 'Vote status:', value: status, inline: true },
		{
			name: 'Voted yes',
			value: votedYesUsersContent,
			inline: false
		},
		{
			name: 'Voted no',
			value: votedNoUsersContent,
			inline: false
		}
	];

	const endDate = getDateFromUnixTimestamp(vote.expirationTime);

	const embed = new EmbedBuilder()
		.setTitle(
			`Vote ${!mute ? 'un' : ''}mute ${vote.user.displayName} - ${vote.user.user.username}#${
				vote.user.user.discriminator
			}`
		)
		.setDescription(`Vote count/required: ${vote.currentVotes}/${vote.requiredVotes}`)
		.addFields(fields)
		.setFooter({ text: `Vote ends at: ${formatDate(endDate)}` });
	return embed;
};

const command: SlashCommand = {
	command: new SlashCommandBuilder()
		.setName('votemute')
		.setDescription('Start vote to mute/unmute mentioned user')
		.addMentionableOption(options =>
			options.setName('user').setDescription('User to mute').setRequired(true)
		)
		.addBooleanOption(option =>
			option.setName('mute').setDescription('Mute or unmute user (default mute)').setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName('notify')
				.setDescription("Notify user about ongoing vote (default don't notify)")
				.setRequired(false)
		),
	execute: async function (interaction: CommandInteraction<CacheType>): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		const victim = interaction.options.getMentionable('user');

		const caller = interaction.member;
		if (!(victim instanceof GuildMember) || !(caller instanceof GuildMember)) {
			interaction.reply({ content: 'You need to mention server user!', ephemeral: true });
			return;
		}

		const channel = await commonVoiceChannel(caller, victim);
		if (channel == undefined) {
			interaction.reply({
				content: 'You need to be in the same voice channel to mute this user',
				ephemeral: true
			});
			return;
		}

		const mute = interaction.options.getBoolean('mute') ?? true;
		const notifyVictim = interaction.options.getBoolean('notify') ?? false;

		const yesButton = new ButtonBuilder()
			.setCustomId('yesBtn')
			.setLabel('Yes!')
			.setStyle(ButtonStyle.Success);
		const noButton = new ButtonBuilder()
			.setCustomId('noBtn')
			.setLabel('No!')
			.setStyle(ButtonStyle.Danger);

		const endTime = Date.now() / 1000 + voteDuration;
		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

		const eligibleIds = Array.from(channel.members.values()).map(x => x.id);

		const vote = {
			voteId: '',
			currentVotes: 0,
			//review this
			requiredVotes: Math.ceil((eligibleIds.length - 1) / 2.0) + 1,
			user: victim,
			expirationTime: endTime,
			eligibleToVote: new Set(eligibleIds),
			votedYes: new Set<GuildMember>(),
			votedNo: new Set<GuildMember>(),
			onVoteEnded: function (reason: string): void {
				interaction.editReply({
					embeds: [createEmbed(this, `Vote ended! ${reason}`, mute)],
					components: []
				});
			},
			onVoteAdded: function (user: GuildMember, votedYes: boolean): boolean {
				if (!this.eligibleToVote.has(user.id)) return false;
				this.eligibleToVote.delete(user.id);
				if (votedYes) {
					this.currentVotes++;
					this.votedYes.add(user);
				} else this.votedNo.add(user);

				if (this.requiredVotes == this.currentVotes) {
					this.user.voice.setMute(mute);
					VoteManager.Instance.removeVote(this.voteId, 'Vote successful');
					return true;
				}

				if (this.eligibleToVote.size < this.requiredVotes - this.currentVotes) {
					VoteManager.Instance.removeVote(this.voteId, 'Vote failed. Not enough votes');
					return true;
				}

				interaction.editReply({
					embeds: [createEmbed(vote, 'Vote active', mute)],
					components: [buttons]
				});

				return true;
			}
		};

		await interaction.reply({
			embeds: [createEmbed(vote, 'Vote active', mute)],
			components: [buttons],
			content: notifyVictim ? userMention(victim.id) : ''
		});

		const msg = await interaction.fetchReply();
		vote.voteId = msg.id;
		VoteManager.Instance.addVote(msg.id, vote);
	}
};

export default command;
