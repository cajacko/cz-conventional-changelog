var fuzzy = require('fuzzy');
var { git } = require('@cajacko/template');
var chalk = require('chalk');
var lint = require('@commitlint/lint');
var prompt = require('./prompt');
var store = require('./store');
var emojiChoices = require('./emojiChoices');

function stage(options) {
  if (options.doNotStageAutomatically) return Promise.resolve();

  return git.hasStagedChanges(process.cwd()).then(hasStagedChanges => {
    if (hasStagedChanges) return Promise.resolve();

    return (
      git
        .hasUnstagedChanges(process.cwd())
        .then(hasUnstagedChanges => {
          if (!hasUnstagedChanges) {
            throw new Error(chalk.red('There are no changes to commit'));
          }

          return git.stageAll().then(run);
        })
        // eslint-disable-next-line no-console
        .catch(console.error)
    );
  });
}

exports.prompt = (originalPrompt, options) => questions =>
  stage(options).then(() => {
    const emojiIndex =
      questions.findIndex(({ name }) => name === 'subject') + 1;

    questions.splice(emojiIndex, 0, {
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
      questions.map(question => {
        if (question.name !== 'scope') return question;

        return {
          ...question,
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
  });

exports.postCommit = answers => store.addScopeSuggestion(answers.scope);

exports.message = message =>
  lint(message).then(report => {
    if (report.valid) return message;
    console.error(report);
    throw new Error('Commit message is not valid, see logs above');
  });
