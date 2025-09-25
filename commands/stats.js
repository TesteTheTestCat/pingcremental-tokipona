const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionContextType, MessageFlags, EmbedBuilder } = require('discord.js');
const database = require('./../helpers/database.js');
const formatNumber = require('./../helpers/formatNumber.js');
const ping = require('../helpers/pingCalc.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sona')
        .setDescription('nanpa mute a')
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ale')
                .setDescription('nanpa ale')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('jan')
                .setDescription('nanpa jan')
                .addUserOption(option =>
                    option.setName('jan')
                        .setDescription('sina wile e sona jan seme?')
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'ale') {
            await interaction.reply(await getGlobalMessage());
            return;
        } else if (interaction.options.getSubcommand() === 'jan') {
            const user = interaction.options.getUser('jan') || interaction.user;
            await interaction.reply(await getUserMessage(user.id, interaction));
            return;
        }
    },
    buttons: {
        refresh: (async (interaction, userId) => {
            if (userId === 'global') {
                await interaction.update(await getGlobalMessage());
                return;
            } else {
                await interaction.update(await getUserMessage(userId || interaction.user.id, interaction));
            }
        })
    },
}

async function getGlobalMessage() {
    const globalPings = await Promise.all([
        database.Player.count(),
        database.Player.sum('totalScore'),
        database.Player.sum('score'),
        database.Player.sum('totalClicks'),
        database.Player.sum('bluePings'),
        database.Player.sum('bluePingsMissed'),
        database.Player.sum('luckyPings'),
    ]);
    const [count, totalScore, ownedScore, totalClicks, blueClicked, blueMissed, luckyFound] = globalPings;

    const embed = new EmbedBuilder()
        .setTitle(`sona ale`)
        .setColor('#bd6fb8')
        .setDescription(
                `jan ${formatNumber(count)} li mu\n` +
                `mu ${formatNumber(totalScore)} li lon\n` +
                `ale li jo e mu ${formatNumber(ownedScore)}\n` +
                `mu ${formatNumber(totalClicks)} li pini\n` +
                `jan ale li luka e mu laso ${formatNumber(blueClicked)}\n` +
                `jan ale li weka e mu laso ${formatNumber(blueMissed)}\n` +
                `mu namako ${formatNumber(luckyFound)} li len ala`
        )
        .setTimestamp();
    
    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sona:refresh-global`)
                        .setLabel('lukin sin')
                        .setStyle(ButtonStyle.Secondary)
                )
        ],
    };
}

async function getUserMessage(userId, interaction) {
    const player = await database.Player.findByPk(userId);
    if (!player) return { content: `<@${userId}> li mu ala.`, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral };
    
    const upgrades = player.upgrades;

    const missRate = player.bluePings + player.bluePingsMissed > 0
        ? Math.round(player.bluePingsMissed / (player.bluePings + player.bluePingsMissed) * 100)
        : 0;

    const simulatedPing = await ping(interaction, false, { forceNoRNG: true, userId: userId });
    const bluePingChance = simulatedPing.currentEffects.blue;
    const blueMult = simulatedPing.currentEffects.blueStrength || 1;

    const embed = new EmbedBuilder()
        .setTitle(`sona jan`)
        .setColor('#6fa7bd')
        .setDescription(
                `sina lukin e sona **${await player.getUserDisplay(interaction.client, database)}**\n\n` +
                
                `${formatNumber(player.totalClicks)} total ping${player.totalClicks === 1 ? '' : 's'}\n` +
                // show eternity pings if not the same as total
                `${player.totalClicks !== player.clicks ? `${formatNumber(player.clicks)} ping${player.clicks === 1 ? '' : 's'} this eternity\n` : ''}` +
                `mu ale ona li ${formatNumber(player.totalScore)}\n` +
                `ona li pali e mani ${formatNumber(player.highestScore)} kepeken mu wan\n` +
                `ona li luka e mu laso ${formatNumber(player.bluePings)}\n` +
                `ona li weka e mu laso${formatNumber(player.bluePingsMissed)} (li weka e ${missRate}%)\n` +
                `ona li lukin e mu namako ${formatNumber(player.luckyPings)}\n` +
                `linluwi pi mu laso ona li ${formatNumber(player.highestBlueStreak)}\n` +
                `\n` +
                `${upgrades.bluePingChance < 0 ? `0%` : `${(bluePingChance).toFixed(1)}%`} blue ping chance\n` + 
                `${blueMult.toFixed(2)}x blue ping strength = ${(blueMult*15).toFixed(2)}x pts on a blue ping`
        )
        .setTimestamp();
    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sona:refresh-${userId}`)
                        .setLabel('lukin sin')
                        .setStyle(ButtonStyle.Secondary)
                )
        ],
    };
}