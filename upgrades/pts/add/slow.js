const { UpgradeTypes } = require('../../../helpers/upgradeEnums.js');
const { getEmoji } = require('../../../helpers/emojis.js');

module.exports = {
    getPrice(currentLevel) {
        return Math.round(100 * (1.5**(currentLevel)))
    },
    getDetails() {
        return {
            description: "mu li pana e mani __+1__",
            name: "linluwi li tawa lili",
            emoji: getEmoji('upgrade_slow', "🕓"),
        }
    },
    getEffectString(level) {
        return `mani +${level}`
    },
    getEffect(level, context) {
        return {
            add: level
        }
    },
    isBuyable(context) {
        return true;
    },
    sortOrder() { return 1 },
    type() { return UpgradeTypes.ADD_BONUS }
}