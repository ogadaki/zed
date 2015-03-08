/*eslint quotes: [2, "single"]*/

/*global document, window */

/*global utils */

/*global Mousetrap */

'use strict';

var storage = require('./storage');
var editor = require('./editor');
var terminal = require('./terminal');

// Not the real module name to avoid name clash with 'commands' object which
// contains all the commands.
// // TODO rename both?
var com = {};

com.init = function () {
    window.commands = {};
    var commands = window.commands;

    commands.prev = editor.offsetCurrent.bind(null, -1);
    commands.next = editor.offsetCurrent.bind(null, 1);
    commands.add = editor.add;
    commands.remove = editor.remove;
    commands.inputs = editor.port.bind(null, 'input');
    commands.outputs = editor.port.bind(null, 'output');
    commands.block = editor.block;
    commands.fire = editor.fire;
    commands.set = editor.set;
    commands.move = editor.move;
    commands.offset = editor.moveBy;
    commands.clear = editor.clearAll;


    var editBlock = function (block) {
        Mousetrap.reset();
        Mousetrap.bind('esc', commands.escape);
        block.content.focus();
    };

    commands.edit = function () {
        if (editor.context === 'block') {
            var block = editor.getCurrentBlock();
            editBlock(block);
            editor.stopBlinking();
            // Prevent default when this function is used with Moustrap.
            return false;
        }
    };

    commands.addButton = commands.add.bind(null, 'html', 'button', 'go', 0, 1, undefined, undefined);
    commands.addScript = commands.add.bind(null, 'html', 'script', 'in1 + 2', 1, 1, undefined, undefined);
    commands.addText = commands.add.bind(null, 'html', 'span', 'empty', 1, 1, undefined, undefined);
    commands.addNumber = commands.add.bind(null, 'zed', 'number', '42', 1, 1, undefined, undefined);
    commands.addComment = commands.add.bind(null, 'html', 'comment', 'Comment', 0, 0, undefined, undefined);
    var bindKeysForMainMode = function () {
        Mousetrap.reset();
        Mousetrap.bind('K', commands.offset.bind(null, 0, -10));
        Mousetrap.bind('J', commands.offset.bind(null, 0, 10));
        Mousetrap.bind('H', commands.offset.bind(null, -10, 0));
        Mousetrap.bind('L', commands.offset.bind(null, 10, 0));
        Mousetrap.bind('k', commands.prev);
        Mousetrap.bind('j', commands.next);
        Mousetrap.bind('a n', commands.add.bind(null, 'New'));
        Mousetrap.bind('a h b', commands.addButton);
        Mousetrap.bind('a h s', commands.addScript);
        Mousetrap.bind('a h t', commands.addText);
        Mousetrap.bind('a h n', commands.addNumber);
        Mousetrap.bind('a h c', commands.addComment);
        Mousetrap.bind('r', commands.remove);
        Mousetrap.bind('i', commands.inputs);
        Mousetrap.bind('o', commands.outputs);
        Mousetrap.bind('b', commands.block);
        Mousetrap.bind('c', commands.goToCommandLine);
        Mousetrap.bind('l', commands.link);
        Mousetrap.bind('g', commands.goToBlock);
        Mousetrap.bind('e', commands.edit);
        Mousetrap.bind('space', commands.fire);
    };
    window.bindKeysForMainMode = bindKeysForMainMode;

    commands.escape = function () {
        if (editor.context === 'block') {
            var currentlyEditingElement = utils.dom.getSelectionStart();
            if (currentlyEditingElement !== null) {
                currentlyEditingElement.blur();
                editor.startBlinking();
            }
            bindKeysForMainMode();
        }
    };

    var switchDeemphasisAllBlocks = function () {
        var blocks = document.querySelectorAll('z-block');
        [].forEach.call(blocks, function (b) {
            b.classList.toggle('de-emphasis');
        });
    };

    var hideAllKeys = function (selector) {
        var elements = document.querySelectorAll(selector);
        [].forEach.call(elements, function (element) {
            element.hideKey();
        });
        switchDeemphasisAllBlocks();
    };

    var firstPort;
    var selectPort = function (port) {
        if (firstPort === undefined) {
            firstPort = port;
        } else {
            if (port.connectable(port, firstPort)) {
                port.connect(port, firstPort);
                firstPort = undefined;
                hideAllKeys('z-port');
                bindKeysForMainMode();
            }
        }
    };

    var portToLinkTo;
    commands.link = function () {
        if (editor.context === 'block') {
            var keys = utils.createKeysGenerator();
            firstPort = undefined;
            Mousetrap.reset();
            var ports = document.querySelectorAll('z-port');
            [].forEach.call(ports, function (port) {
                var key = keys.next();
                port.key = key;
                port.showKey();
                // Convert 'aae' into 'a a e'.
                key = key.split('').join(' ');
                Mousetrap.bind(key, selectPort.bind(null, port));
            });
            Mousetrap.bind('esc', function () {
                bindKeysForMainMode();
                hideAllKeys('z-port');
            });
            switchDeemphasisAllBlocks();
        } else {
            var port = editor.getCurrentPort();
            if (port !== null) {
                if (portToLinkTo === undefined) {
                    portToLinkTo = port;
                    portToLinkTo.classList.toggle('to-link-to');
                } else if (port.connectable(port, portToLinkTo)) {
                    port.connect(port, portToLinkTo);
                    portToLinkTo.classList.toggle('to-link-to');
                    portToLinkTo = undefined;
                } else {
                    portToLinkTo.classList.toggle('to-link-to');
                    portToLinkTo = port;
                    portToLinkTo.classList.toggle('to-link-to');
                }
            }
        }
    };

    var setCurrentBlockAndBackToMainMode = function (block) {
        editor.setCurrentBlock(block);
        hideAllKeys('z-block');
        bindKeysForMainMode();
    };

    commands.goToBlock = function () {
        Mousetrap.reset();
        var blocks = document.querySelectorAll('z-block');
        var index = 0;
        var keys = utils.createKeysGenerator();
        [].forEach.call(blocks, function (block) {
            var key = keys.next();
            block.key = key;
            block.showKey();
            // Convert 'aae' into 'a a e'.
            key = key.split('').join(' ');
            Mousetrap.bind(key, setCurrentBlockAndBackToMainMode.bind(null, block));
            index++;
        });
        Mousetrap.bind('esc', function () {
            hideAllKeys('z-block');
            bindKeysForMainMode();
        });
        switchDeemphasisAllBlocks();
    };

    // Set a new stopCallback for Moustrap to avoid stopping when we start
    // editing a contenteditable, so that we can use escape to leave editing.
    Mousetrap.stopCallback = function(e, element, combo) {
        // if the element has the class "mousetrap" then no need to stop
        if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
            return false;
        }

         // stop for input, select, and textarea
         return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA';
     };

    commands.save = storage.savePatch;
    commands.load = storage.loadPatch;
    commands.rm = storage.removePatch;
    commands.list = storage.getPatchNames;
    commands.ls = storage.getPatchNames;

    var terminalOnblur = function () {
        window.bindKeysForMainMode();
        editor.startBlinking();
    };

    var term = terminal.create(commands, terminalOnblur);

    commands.goToCommandLine = function () {
        term.focus();
        Mousetrap.reset();
        editor.stopBlinking();
    };

    // TODO create a term.write(multiLineString) and use it.
    commands.help = function (subject) {
        if (subject === undefined) {
            term.term.write('Press Esc to leave the command line and go back to normal mode.');
            term.term.newLine();
            term.term.newLine();
            term.term.write('Commands: next, prev, remove, add, set content, move, offset');
            term.term.newLine();
            term.term.write('ls, load, save, clear and rm.');
        } else if (subject === 'add') {
            term.term.write('Add a new block just below the current block.');
            term.term.newLine();
            term.term.newLine();
            term.term.write('add html <what> <content> <nb inputs> <nb outputs>');
            term.term.newLine();
            term.term.write('  <what>    is either "button", "script", "text", "number" or a HTML tag.');
            term.term.newLine();
            term.term.write('  <content> is the content of the block (i.e. the button name, the');
            term.term.newLine();
            term.term.write('            script code, the text or number value, etc.).');
        } else {
            term.term.write('No help for "' + subject + '".');
        }
    };

    bindKeysForMainMode();

};

module.exports = com;
