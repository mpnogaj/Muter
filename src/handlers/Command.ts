import { Client, Routes, SlashCommandBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { readdirSync } from 'fs';
import { join } from 'path';
import { color } from '../functions';
import { Command, SlashCommand } from '../types';

module.exports = (client: Client) => {
	const slashCommands: SlashCommandBuilder[] = [];
	const commands: Command[] = [];

	const slashCommandsDir = join(__dirname, '../slashCommands');
	const commandsDir = join(__dirname, '../commands');

	readdirSync(slashCommandsDir).forEach(file => {
		if (!file.endsWith('.js')) return;
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const command: SlashCommand = require(`${slashCommandsDir}/${file}`).default;
		slashCommands.push(command.command);
		client.slashCommands.set(command.command.name, command);
	});

	readdirSync(commandsDir).forEach(file => {
		if (!file.endsWith('.js')) return;
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const command: Command = require(`${commandsDir}/${file}`).default;
		commands.push(command);
		client.commands.set(command.name, command);
	});

	const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

	rest
		.put(Routes.applicationCommands(process.env.CLIENT_ID), {
			body: slashCommands.map(command => command.toJSON())
		})
		.then((data: any) => {
			console.log(
				color('text', `Successfully loaded ${color('variable', data.length)} slash command(s)`)
			);
			console.log(
				color('text', `Successfully loaded ${color('variable', commands.length)} command(s)`)
			);
		})
		.catch(e => {
			console.log(e);
		});
};
