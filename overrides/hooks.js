var fuzzy = require('fuzzy');
var prompt = require('./prompt');
var store = require('./store');
var emojiChoices = require('./emojiChoices');

exports.prompt = originalPrompt => options => {
  const emojiIndex = options.findIndex(({ name }) => name === 'subject') + 1;

  options.splice(emojiIndex, 0, {
    type: 'autocomplete',
    name: 'emoji',
    message: 'Prepend an emoji',
    source: (answers, input) =>
      Promise.resolve(['none'].concat(emojiChoices(input))),
    filter: text => {
      if (!text || text === 'none') return null;

      var value = text.split(' ')[0];

      if (value && value !== '') {
        return value.trim() + ' ';
      }

      return null;
    }
  });

  return prompt(
    options.map(option => {
      if (option.name !== 'scope') return option;

      return {
        ...option,
        type: 'autocomplete',
        suggestOnly: true,
        source: (answers, input) =>
          store
            .getScopeSuggestions()
            .then(suggestions =>
              fuzzy
                .filter(input || '', suggestions || [])
                .map(({ original }) => original)
            )
      };
    })
  );
};

exports.postCommit = answers => store.addScopeSuggestion(answers.scope);
