var fuzzy = require('fuzzy');
var prompt = require('./prompt');
var store = require('./store');

exports.prompt = originalPrompt => options =>
  prompt(
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

exports.postCommit = answers => store.addScopeSuggestion(answers.scope);
