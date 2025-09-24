const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const pingMessages = require('./../helpers/pingMessage.js')
const ownerId = process.env.OWNER_ID
const formatNumber = require('./../helpers/formatNumber.js')
const ping = require('./../helpers/pingCalc.js');
const awardBadge = require('../helpers/awardBadge.js');
const database = require('../helpers/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mu!')
        .setDescription('mu!')
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel),
    async execute(interaction) {
        const again = new ButtonBuilder()
            .setCustomId('ping:again')
            .setLabel('mu sin!')
            .setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder()
            .addComponents(again);

        let pingmessage = pingMessages(interaction.client.ws.ping, { user: interaction.user })

        await interaction.reply({
            content: `${pingmessage}`,
            components: [row]
        });
    },
    buttons: {
        "again": (async (interaction) => {
            await pingResponse(interaction, false)
        }),
        "super": (async (interaction) => {
            await pingResponse(interaction, true)
        }),
        "delete": (async interaction => {
            await interaction.update({ content: `(bye!)`, components: [] });
            await interaction.deleteReply(interaction.message);
        }),
        "unknown": (async interaction => {
            await interaction.reply({ content: "unknown ping occurs when the bot just restarted. either something has gone horribly wrong, or something was changed! maybe some new stuff was added, maybe a bug was fixed. you can check the [github](<https://github.com/MonkeysWithPie/pingcremental/>) if you're curious. if you wait a few seconds, the ping will come back to normal.", flags: MessageFlags.Ephemeral })
        })
    }
};

async function pingResponse(interaction, isSuper = false) {
    // prevent pinging during dev mode
    const developmentMode = process.argv.includes('--dev') || process.argv.includes('-d');
    if (developmentMode && interaction.user.id !== ownerId) {
        return await interaction.update({
            content: "sina ken ala mu tan ni: jan lawa li pali e ilo ni, o awen a!",
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ping:again')
                    .setLabel('ken ala mu sin...')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('ping:delete')
                    .setLabel('ike...')
                    .setStyle(ButtonStyle.Secondary))
            ],
        })
    }

    let againId = 'ping:again';
    const again = new ButtonBuilder()
        .setCustomId(againId)
        .setLabel('mu sin!')
        .setStyle(ButtonStyle.Secondary);
    let row = new ActionRowBuilder();

    if (interaction.client.ws.ping === -1 && !developmentMode) { // bot just restarted
        row.addComponents(again, new ButtonBuilder()
            .setCustomId('ping:unknown')
            .setLabel('unknown ms?')
            .setStyle(ButtonStyle.Secondary));
        return await interaction.update({ // return early 
            content: `${pingMessages(interaction.client.ws.ping, { user: interaction.user })}`,
            components: [row]
        })
    }

    const {score, displays, currentEffects, context} = await ping(interaction, isSuper, { developmentMode});
    const playerProfile = await database.Player.findByPk(`${interaction.user.id}`);
    const pingFormat = playerProfile.settings.pingFormat || "expanded";

    // funky specials

    if (currentEffects.specials.slumber) {
        playerProfile.slumberClicks += currentEffects.specials.slumber;
    }
    if (currentEffects.specials.glimmer) {
        playerProfile.glimmerClicks += currentEffects.specials.glimmer;
    }

    const rowComponents = [];
    // blue ping handling
    if (!currentEffects.specials.budge) {
        rowComponents.push(again);
    }
    // check if blue ping should trigger
    if (currentEffects.spawnedSuper) {
        playerProfile.bluePings += 1;
        const superPing = new ButtonBuilder()
            .setCustomId('ping:super')
            .setLabel(`mu laso!${isSuper ? ` x${currentEffects.blueCombo + 1}` : ''}`)
            .setStyle(ButtonStyle.Primary);
        rowComponents.push(superPing);
    }
    if (currentEffects.specials.budge) {
        if (!currentEffects.specials.bully) rowComponents.push(again);
    }

    /* SAVE STATS */

    context.totalScore = playerProfile.score + score;
    const pingMessage = pingMessages(context.ping, context); // get the ping message

    // click saving
    playerProfile.clicks += 1;
    playerProfile.totalClicks += 1;
    if (playerProfile.clicks > playerProfile.totalClicks) playerProfile.totalClicks = playerProfile.clicks; // make sure total clicks is always higher than clicks
    if (currentEffects.rare) playerProfile.luckyPings += 1;
    if (currentEffects.blueCombo > playerProfile.highestBlueStreak) playerProfile.highestBlueStreak = currentEffects.blueCombo;
    if (!isSuper) {
        let missed = false;
        for (const messageButton of interaction.message.components[0].components) { // check every button in the first row
            if (messageButton.data.custom_id === 'ping:super') {
                missed = true;
                break;
            }
        }
        if (missed) playerProfile.bluePingsMissed += 1; // if the button is still there, it means they didn't click it
    }

    // score saving
    playerProfile.score += score;
    playerProfile.totalScore += score;
    if (playerProfile.highestScore < score) playerProfile.highestScore = score;

    // etc
    playerProfile.bp = Math.min(currentEffects.bp + playerProfile.bp, currentEffects.bpMax);
    playerProfile.lastPing = Date.now();


    // badges
    if (currentEffects.blueCombo >= 10) { 
        await awardBadge(interaction.user.id, 'blue stupor', interaction.client); 
    }
    if (currentEffects.rare) {
        await awardBadge(interaction.user.id, 'lucky', interaction.client);
    }
    if (playerProfile.totalClicks >= 10000) {
        await awardBadge(interaction.user.id, 'heavy hands', interaction.client);
    }

    await playerProfile.save();

    // show upgrade popup after 150 clicks
    if (playerProfile.totalClicks === 150) {
        const button = new ButtonBuilder()
            .setLabel('n...')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('ping:empty')
            .setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(button);

        return await interaction.update({
            content:
                `${pingMessage}
sina jo e mani mute... o kama lon </upgrade:1360377407109861648>...`, // TODO: change to dynamically use ID
            components: [disabledRow]
        })
    }

    if (currentEffects.rare) {
        row = new ActionRowBuilder()
            .addComponents(new ButtonBuilder()
                .setCustomId('ping:again')
                .setLabel('a!')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            );
    } else {
        row = new ActionRowBuilder()
            .addComponents(rowComponents);
    }

    let displayDisplay = ""
    for (const dispType of ['add', 'mult', 'exponents', 'extra']) {
        const display = displays[dispType];
        if (display.length === 0) continue; // skip empty displays
        if (pingFormat === "expanded") {
            displayDisplay += ", " + display.join(', ') 
        } else {
            displayDisplay += ", " + display.join(' ')
        }

    }
    displayDisplay = displayDisplay.substring(2); // remove first comma and space
    
    if (currentEffects.bp) {
        displayDisplay += `\n-# \`${formatNumber(Math.ceil(playerProfile.bp))}/${formatNumber(currentEffects.bpMax)} bp\`${playerProfile.bp >= currentEffects.bpMax ? " **(MAX)**" : ""} `
        displayDisplay += displays.bp.join(', ');
    }

    try {
        // update ping
        await interaction.update({
            content:
                `${pingMessage}
\`${formatNumber(playerProfile.score, true, 4)} mani\` (**\`+${formatNumber(score, true, 3)}\`**)\n-# ${displayDisplay}`,
            components: [row]
        });
    } catch (error) {
        // automod error, since it doesn't like some messages
        if (error.code == 200000) {
            await interaction.update({
                content:
                    `mu ni li jo e ike ala, e jaki ala tawa ilo AutoMod! (${ping}ms)
\`${formatNumber(playerProfile.score, true, 4)} mani\` (**\`+${formatNumber(score, true, 3)}\`**)\n-# ${displayDisplay}`,
                components: [row]
            });
        } else {
            throw error; // rethrow if not automod 
        }
    }

    if (currentEffects.rare) {
        await (new Promise(resolve => setTimeout(resolve, 2000))); // wait a bit
        await interaction.editReply({
            components: [new ActionRowBuilder().addComponents(rowComponents)], // refresh buttons
        })
    }
}
