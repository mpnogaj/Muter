import chalk from 'chalk';
import {
	GuildMember,
	PermissionFlagsBits,
	PermissionResolvable,
	TextChannel,
	VoiceBasedChannel
} from 'discord.js';

type colorType = 'text' | 'variable' | 'error';

const themeColors = {
	text: '#ff8e4d',
	variable: '#ff624d',
	error: '#f5426c'
};

export const getThemeColor = (color: colorType) => Number(`0x${themeColors[color].substring(1)}`);

export const color = (color: colorType, message: any) => {
	return chalk.hex(themeColors[color])(message);
};

export const checkPermissions = (member: GuildMember, permissions: Array<PermissionResolvable>) => {
	const neededPermissions: PermissionResolvable[] = [];
	permissions.forEach(permission => {
		if (!member.permissions.has(permission)) neededPermissions.push(permission);
	});
	if (neededPermissions.length === 0) return null;
	return neededPermissions.map(p => {
		if (typeof p === 'string') return p.split(/(?=[A-Z])/).join(' ');
		else
			return Object.keys(PermissionFlagsBits)
				.find(k => Object(PermissionFlagsBits)[k] === p)
				?.split(/(?=[A-Z])/)
				.join(' ');
	});
};

export const sendTimedMessage = (message: string, channel: TextChannel, duration: number) => {
	channel
		.send(message)
		.then(m => setTimeout(async () => (await channel.messages.fetch(m)).delete(), duration));
	return;
};

export const commonVoiceChannel = async (
	leftUser: GuildMember,
	rightUser: GuildMember
): Promise<VoiceBasedChannel | undefined> => {
	if (leftUser.guild.id != rightUser.guild.id) return undefined;
	const guild = leftUser.guild;
	const channels = (await guild.channels.fetch()).filter(
		channel =>
			channel.isVoiceBased() &&
			channel.members.has(leftUser.id) &&
			channel.members.has(rightUser.id)
	);
	if (channels.size != 1) return undefined;
	return channels.first() as VoiceBasedChannel;
};

export const getDateInUnixTimestamp = (): number => {
	return Math.floor(Date.now() / 1000);
};

export const getDateFromUnixTimestamp = (timestamp: number): Date => new Date(timestamp * 1000);

export const formatDate = (date: Date): string => {
	return `${date.getDate()}.${
		date.getMonth() + 1
	}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const extractNamesFromMemberSet = (set: Set<GuildMember>): string[] => {
	return Array.from(set).map(x => x.displayName);
};
