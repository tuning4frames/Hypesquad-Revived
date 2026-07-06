const assert = require('node:assert/strict');
const {
  sanitizeToken,
  isValidDiscordToken,
  mapHouseId,
  getAvatarUrl,
  getCurrentBadge,
} = require('../app-logic.js');

assert.equal(sanitizeToken('  abc  '), 'abc');
assert.equal(sanitizeToken('"abc"'), 'abc');
assert.equal(sanitizeToken("'abc'"), 'abc');
assert.equal(sanitizeToken(' "abc"  '), 'abc');

assert.equal(
  isValidDiscordToken('ABCDEFGHIJKLMNOPQRSTUVWX.abcd12.abcdefghijklmnopqrstuvwxyza'),
  true
);
assert.equal(isValidDiscordToken('not-a-token'), false);

assert.equal(mapHouseId(1), 3);
assert.equal(mapHouseId(2), 1);
assert.equal(mapHouseId(3), 2);
assert.equal(mapHouseId(999), null);

assert.equal(
  getAvatarUrl({ id: '123', avatar: 'hash', discriminator: '7' }),
  'https://cdn.discordapp.com/avatars/123/hash.png'
);
assert.equal(
  getAvatarUrl({ id: '123', avatar: null, discriminator: '7' }),
  'https://cdn.discordapp.com/embed/avatars/2.png'
);

assert.equal(getCurrentBadge(64).name, 'Bravery');
assert.equal(getCurrentBadge(128).name, 'Brilliance');
assert.equal(getCurrentBadge(256).name, 'Balance');
assert.equal(getCurrentBadge(64 | 128).name, 'Bravery');
assert.equal(getCurrentBadge(0), null);

console.log('app-logic tests passed');
