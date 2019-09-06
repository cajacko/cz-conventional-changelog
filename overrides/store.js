const { join } = require('path');
const { readJSON, writeJSON, ensureFile } = require('fs-extra');

const homeDir = process.env.HOME || process.env.USERPROFILE;
const settingsPath = join(homeDir, '.@cajacko-commit');

var scopeSuggestionKey = 'scopeSuggestions';

function get(key) {
  return ensureFile(settingsPath).then(() =>
    readJSON(settingsPath)
      .then(settings => settings[key])
      .catch(() =>
        writeJSON(settingsPath, {}, { spaces: 2 }).then(() => undefined)
      )
  );
}

function set(key, value) {
  return ensureFile(settingsPath).then(() =>
    readJSON(settingsPath)
      .then(settings => ({
        ...settings,
        [key]: value
      }))
      .catch(() => ({
        [key]: value
      }))
      .then(settings =>
        writeJSON(settingsPath, settings, { spaces: 2 }).then(() => undefined)
      )
  );
}

function getScopeSuggestions() {
  return get(scopeSuggestionKey).then(suggestions => suggestions || []);
}

exports.getScopeSuggestions = getScopeSuggestions;

exports.addScopeSuggestion = scope =>
  getScopeSuggestions().then(suggestions => {
    const newSuggestions = suggestions.filter(item => item !== scope);

    newSuggestions.unshift(scope);

    return set(scopeSuggestionKey, newSuggestions);
  });
