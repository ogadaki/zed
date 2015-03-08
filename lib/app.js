var commands = require('./commands');
var engine = require('./engine');
var editor = require('./editor');
var storage = require('./storage');
var http = require('./http');

var exports = {};

exports.init = function () {
    commands.init();
    engine.init();
    editor.init();
    global.http = http;
    // Load a patch as an example.
    storage.loadPatch('http', 'patches/main.zed');
};

// This module is to be used from the global namespace (i.e. from app.html).
global.app = exports;
