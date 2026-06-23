import chalk from 'chalk';
import logUpdate from 'log-update';
import { ActiveQuest, UserInfo } from '../types/quest.types';
import { formatTime } from '../utils/helpers';

const BOX_WIDTH = 68;

function padLine(text: string, visibleLength: number): string {
    const spacesNeeded = Math.max(0, BOX_WIDTH - visibleLength);
    return text + ' '.repeat(spacesNeeded);
}

export function renderScreen(user: UserInfo, activeQuests: ActiveQuest[]) {
	let output = '\n';

	output += chalk.bold.white(' [👤] USER PROFILE\n');
	output += chalk.gray(' ╭' + '─'.repeat(BOX_WIDTH) + '╮\n');

    const accPrefix = ' 👤 Account: ';
    const accLine = chalk.white(accPrefix) + chalk.greenBright(user.username);
    const accLen = 13 + user.username.length;
    output += chalk.gray(' │') + padLine(accLine, accLen) + chalk.gray('│\n');

    const idPrefix = ' 🆔 User ID: ';
    const idLine = chalk.white(idPrefix) + chalk.cyanBright(user.id);
    const idLen = 13 + user.id.length;
	output += chalk.gray(' │') + padLine(idLine, idLen) + chalk.gray('│\n');

    const statusPrefix = ' 🟢 Status:  ';
    const statusVal = 'Active & Connected';
    const statusLine = chalk.white(statusPrefix) + chalk.green(statusVal);
    const statusLen = 13 + statusVal.length;
	output += chalk.gray(' │') + padLine(statusLine, statusLen) + chalk.gray('│\n');

    output += chalk.gray(' ╰' + '─'.repeat(BOX_WIDTH) + '╯\n\n');

	output += chalk.bold.white(' [📋] LIVE PROGRESS\n');
	output += chalk.gray(' ╭' + '─'.repeat(BOX_WIDTH) + '╮\n');

	if (activeQuests.length === 0) {
        const emptyLine = chalk.italic.gray(' No active quests found.');
		output += chalk.gray(' │') + padLine(emptyLine, 24) + chalk.gray('│\n');
	} else {
		activeQuests.forEach((quest, index) => {
			const isLast = index === activeQuests.length - 1;

            const titleLine = chalk.cyanBright(` 🔹 ${index + 1}. ${quest.name}`);
            const titleLen = 4 + String(index + 1).length + 2 + quest.name.length;
			output += chalk.gray(' │') + padLine(titleLine, titleLen) + chalk.gray('│\n');

			const rewardText = quest.reward.length > 20 ? quest.reward.substring(0, 17) + '...' : quest.reward;
			const rewardPad = rewardText.padEnd(20);
			const rewardDisplay = chalk.magentaBright(`🎁 ${rewardPad}`);

			const timeText = quest.remaining <= 0 ? '✔ DONE' : formatTime(quest.remaining);
			const timePad = timeText.padEnd(8);
			const timeDisplay = quest.remaining <= 0
				? chalk.green(timePad)
				: (quest.remaining <= 60
					? chalk.redBright(timePad)
					: chalk.yellowBright(timePad));

			const statusText = quest.status === 'Running' ? '▶ Running' : (quest.status === 'Error' ? '❌ Error' : '✔ Done');
			const statusPad = statusText.padEnd(9);
			const statusDisplay = quest.status === 'Running'
				? chalk.blueBright(statusPad)
				: (quest.status === 'Error' ? chalk.redBright(statusPad) : chalk.greenBright(statusPad));

            const detailLine = chalk.gray('    ↳ ')
				+ rewardDisplay + chalk.gray(' │ ')
				+ chalk.white(`⏳ `) + timeDisplay + chalk.gray(' │ ')
				+ statusDisplay;

			output += chalk.gray(' │') + padLine(detailLine, 55) + chalk.gray('│\n');

			if (!isLast) output += chalk.gray(' │') + padLine('', 0) + chalk.gray('│\n');
		});
	}

	output += chalk.gray(' ╰' + '─'.repeat(BOX_WIDTH) + '╯\n');

	logUpdate(output);
}
