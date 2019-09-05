'format cjs';

var inquirer = require('inquirer');
var AutoComplete = require('inquirer-autocomplete-prompt');

inquirer.registerPrompt('autocomplete', AutoComplete);

module.exports = (originalPrompt, options) => inquirer.prompt(options);
