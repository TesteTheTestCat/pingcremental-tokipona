const { UpgradeTypes } = require('../../../helpers/upgradeEnums.js');
const { getEmoji } = require('../../../helpers/emojis.js');

module.exports = {
    getPrice(currentLevel) {
        return Math.round(1000*(1.75**currentLevel))
    },
    getDetails() {
        return {
            description: "sina luka sin __350__ la sina kama jo e mani __+0.6__",
            name: "mu ale a",
            emoji: getEmoji('upgrade_inpingity', "♾️"),
        }
    },
    getEffectString(level) {
        return `${maxClicks(level)} la +${(level*0.6).toFixed(1)}`
    },
    getEffect(level, context) {
        return {
            add: Math.round(level * (context.clicks/(maxClicks(level))) * 0.6,2),
        }
    },
    isBuyable(context) {
        return context.totalClicks >= 1000;
    },
    sortOrder() { return 8 },
    type() { return UpgradeTypes.ADD_BONUS }
}

function maxClicks(level) {
    return Math.max(100,350-level+1);
}