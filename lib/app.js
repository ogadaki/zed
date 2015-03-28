'use strict';

var _ = require('../externals/lodash');

var commands = require('./commands');
var engine = require('./engine');
var editor = require('./editor');
var storage = require('./storage');
var http = require('./http');
// import view module so that its globals are defined.
var view = require('./view');

var globals = require('./globals');

var exports = {};

exports.init = function () {
    commands.init();
    engine.init();
    editor.init();
    view.init();
    // Load a patch as an example.
    storage.loadPatch('http', 'patches/main.zed');
    // Pollute the global with stuff to be used within patches.
    global.http = http;
    global._ = _;
};
exports.view = view;
exports.commands = commands;

// This module is to be used from the global namespace (i.e. from app.html).
global.app = exports;
