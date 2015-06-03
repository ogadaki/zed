'use strict';

let _ = require('../externals/lodash');

let commands = require('./commands');
let engine = require('./engine');
let editor = require('./editor');
let storage = require('./storage');
let http = require('./http');
// import view module so that its globals are defined.
let view = require('./view');

let exports = {};

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
