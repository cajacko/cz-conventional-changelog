var { combinedAnnotationsForLanguage } = require('unicode-emoji-annotations');
var punycode = require('punycode');
var fuzzy = require('fuzzy');

const englishAnnotations = combinedAnnotationsForLanguage('en');

const pinnedEmojis = {
  sparkles: 'when adding a new feature',
  'artist palette': 'when improving the format/structure of the code',
  horse: 'when improving performance',
  'non-potable water': 'when plugging memory leaks',
  memo: 'when writing docs',
  'globe with meridians': 'When fixing a browser compatibility issue',
  penguin: 'when fixing something on Linux',
  'red apple': 'when fixing something on Mac OS/iOS/Safari',
  'robot face': 'when fixing something on Android',
  'chequered flag': 'when fixing something on Windows/IE',
  bug: 'when fixing a bug',
  fire: 'when removing code or files',
  'green heart': 'when fixing the CI build',
  'white heavy check mark': 'when adding tests',
  locked: 'when dealing with security',
  'up button': 'when upgrading dependencies',
  'down button': 'when downgrading dependencies',
  wrench: 'when doing a chore/build tasks'
};

const emojisByID = {};
const emojiIDsByKeyword = {};
const pinnedPriority = {};
const allEmojiNames = [];
const emojiIDByName = {};

const pinnedIDs = Object.keys(pinnedEmojis);
const pinnedLength = pinnedIDs.length;

pinnedIDs.forEach((id, i) => {
  pinnedPriority[id] = pinnedLength - i;
});

const getEmojiFromSequence = sequence => {
  const numericCodePointSequence = sequence
    .split(' ')
    .map(codePoint => parseInt(codePoint, 16));

  return punycode.ucs2.encode(numericCodePointSequence);
};

englishAnnotations.forEach(({ sequence, tts, keywords }) => {
  const emoji = getEmojiFromSequence(sequence);
  const name = `${emoji} "${tts}" ${pinnedEmojis[tts] || ''}`;
  const priority = pinnedPriority[tts];
  emojiIDByName[tts] = sequence;

  allEmojiNames.push(tts);

  emojisByID[sequence] = {
    sequence,
    tts,
    keywords,
    emoji,
    name,
    pinnedPriority: priority
  };

  keywords.forEach(keyword => {
    if (!emojiIDsByKeyword[keyword]) emojiIDsByKeyword[keyword] = [];

    if (!emojiIDsByKeyword[keyword].includes(sequence)) {
      emojiIDsByKeyword[keyword].push(sequence);
    }
  });
});

const keywords = Object.keys(emojiIDsByKeyword);

const findEmoji = text => {
  const results = fuzzy.filter(text, keywords);

  const scoreByEmojiID = text ? {} : emojisByID;

  if (text) {
    let max = 0;

    results.forEach(({ original, score }) => {
      const emojiIDs = emojiIDsByKeyword[original];

      emojiIDs.forEach(emojiID => {
        if (!scoreByEmojiID[emojiID]) {
          scoreByEmojiID[emojiID] = {
            keywordScore: 0,
            nameScore: 0
          };
        }

        const { keywordScore } = scoreByEmojiID[emojiID];

        if (score > keywordScore) {
          if (score !== Infinity) {
            max = score;
          }

          scoreByEmojiID[emojiID].keywordScore = score;
        }
      });
    });

    fuzzy.filter(text, allEmojiNames).forEach(({ original, score }) => {
      const emojiID = emojiIDByName[original];

      if (!emojiID) return;

      if (!scoreByEmojiID[emojiID]) {
        scoreByEmojiID[emojiID] = {
          keywordScore: 0,
          nameScore: 0
        };
      }

      const { nameScore } = scoreByEmojiID[emojiID];

      if (score > nameScore) {
        scoreByEmojiID[emojiID].nameScore = score;
      }
    });
  }

  return Object.keys(scoreByEmojiID)
    .map(emojiID => {
      const score = scoreByEmojiID[emojiID];

      return {
        ...score,
        ...emojisByID[emojiID]
      };
    })
    .sort((a, b) => {
      if (text) {
        // Prefer exact matches
        if (text === a.tts) return -1;
        if (text === b.tts) return 1;
      }

      // Prefer pinned over not pinned
      if (a.pinnedPriority && !b.pinnedPriority) return -1;
      if (b.pinnedPriority && !a.pinnedPriority) return 1;

      if (a.pinnedPriority && b.pinnedPriority) {
        if (a.pinnedPriority > b.pinnedPriority) return -1;
        if (a.pinnedPriority < b.pinnedPriority) return 1;
      }

      // Neither are pinned now

      // Prefer keyword score
      if (a.keywordScore > b.keywordScore) return -1;
      if (a.keywordScore < b.keywordScore) return 1;

      if (a.nameScore > b.nameScore) return -1;
      if (a.nameScore < b.nameScore) return 1;

      if (!text) return 0;

      // All scores are equal now

      // Prefer shorter names
      if (a.tts.length > b.tts.length) return 1;
      if (a.tts.length < b.tts.length) return -1;

      return 0;
    })
    .map(({ name }) => name);
};

module.exports = findEmoji;
