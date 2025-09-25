const { UpgradeTypes } = require('../../../helpers/upgradeEnums.js');
const { getEmoji } = require('../../../helpers/emojis.js');

module.exports = {
    getPrice(currentLevel) {
        let price = 150;
        for (let i = 0; i < currentLevel; i++) {
            price += (i+3)*50
        }
        price = Math.round(price * (1.1**currentLevel));
        return price;
    },
    getDetails() {
        return {
            description: "mu li 50 anu lili la ni li __+2__ e mu",
            name: "o pona e kepeken",
            emoji: getEmoji('upgrade_usability', "🖥️"),
        }
    },
    getEffectString(level) {
        return `mani +${level*2}`
    },
    getEffect(level, context) {
        return {
            add: context.ping <= 50 ? level*2 : 0,
        }
    },
    isBuyable(context) {
        return true;
    },
    sortOrder() { return 2 },
    type() { return UpgradeTypes.ADD_BONUS }
}