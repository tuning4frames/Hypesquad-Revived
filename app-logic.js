(function (globalScope) {
  const TOKEN_PATTERN = /^[A-Za-z0-9+/]{24}\.[A-Za-z0-9+/]{6}\.[A-Za-z0-9+/\-_]{27}$/;
  const HOUSE_ID_MAP = { 1: 3, 2: 1, 3: 2 };
  const BADGE_FLAGS = [
    { flag: 64, name: 'Bravery', icon: 'images/hypesquadbravery.svg' },
    { flag: 128, name: 'Brilliance', icon: 'images/hypesquadbrilliance.svg' },
    { flag: 256, name: 'Balance', icon: 'images/hypesquadbalance.svg' },
  ];

  function sanitizeToken(rawToken) {
    if (!rawToken) {
      return '';
    }

    let cleaned = String(rawToken).trim();
    const startsWithQuote = cleaned.startsWith('"') || cleaned.startsWith("'");
    const endsWithQuote = cleaned.endsWith('"') || cleaned.endsWith("'");

    if (cleaned.length >= 2 && startsWithQuote && endsWithQuote && cleaned[0] === cleaned[cleaned.length - 1]) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned;
  }

  function isValidDiscordToken(token) {
    return TOKEN_PATTERN.test(token);
  }

  function mapHouseId(selectedHouse) {
    return HOUSE_ID_MAP[selectedHouse] ?? null;
  }

  function getAvatarUrl(user) {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }

    const discriminatorNumber = Number.parseInt(user.discriminator, 10) || 0;
    return `https://cdn.discordapp.com/embed/avatars/${discriminatorNumber % 5}.png`;
  }

  function getCurrentBadge(flags) {
    const resolvedFlags = flags || 0;
    return BADGE_FLAGS.find((badge) => (resolvedFlags & badge.flag) === badge.flag) || null;
  }

  const logic = {
    TOKEN_PATTERN,
    HOUSE_ID_MAP,
    BADGE_FLAGS,
    sanitizeToken,
    isValidDiscordToken,
    mapHouseId,
    getAvatarUrl,
    getCurrentBadge,
  };

  globalScope.HypeSquadLogic = logic;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = logic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
