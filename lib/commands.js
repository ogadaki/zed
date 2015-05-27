/*global Mousetrap */

'use strict';

var storage = require('./storage');
var editor = require('./editor');
var terminal = require('./terminal');
var utils = require('./utils');

var commands = {};

commands.prev = editor.offsetCurrent.bind(null, -1);
commands.next = editor.offsetCurrent.bind(null, 1);
commands.add = editor.add;
commands.addInput = editor.addInput;
commands.addOutput = editor.addOutput;
commands.remove = editor.remove;
commands.inputs = editor.port.bind(null, 'input');
commands.outputs = editor.port.bind(null, 'output');
commands.linkFromInput = editor.linkFromInput;
commands.linkFromOutput = editor.linkFromOutput;
commands.block = editor.block;
commands.fire = editor.fire;
commands.set = editor.set;
commands.move = editor.move;
commands.offset = editor.moveBy;
commands.clear = editor.clearAll;
commands.toggleMenu = function () {
    document.body.classList.toggle('menu-hidden');
};
commands.toggleLock = function () {
    editor.toggleLock();
    commands.bindKeysForMainMode();
};

window.moreInfo = function () {
    alert(
            'Clicking on a button in edit mode starts\n' +
            'editing its content. If instead you want\n' +
            'to use it, you have to first lock the patch\n' +
            'either with the "toggle lock" action in the\n' +
            'menu or with the "L" keyboard shortcut.'
            );
};

var editBlock = function (block) {
    if (!editor.lock) {
        Mousetrap.reset();
        Mousetrap.bind('esc', commands.escape);
        block.content.focus();
        block.content.editing = true;
        if (block.content.tagName === 'BUTTON') {
            commands.message(
                    'Start editing button\'s content. To use the button ' +
                    'instead, first lock the patch ' +
                    '(<a href="javascript:moreInfo()">more info</a>).'
                    );
        }
    }
};
commands.editBlock = editBlock;

commands.edit = function () {
    if (editor.context === 'block') {
        var block = editor.getCurrentBlock();
        editBlock(block);
        editor.stopBlinking();
        // Prevent default when this function is used with Moustrap.
        return false;
    }
};


commands.closeProperties = function () {
    let propertiesFrame = document.querySelector('#properties-frame');
    propertiesFrame.style.visibility = 'hidden';
    commands.escape();
};

commands.editHtml = function () {
    if (!editor.lock) {
        Mousetrap.reset();
        let propertiesFrame = document.querySelector('#properties-frame');
        let htmlEditor = document.querySelector('#block-inner-html');
        propertiesFrame.style.visibility = 'visible';
        htmlEditor.focus();
        editor.stopBlinking();
        Mousetrap.bind('esc', commands.closeProperties);
        // Prevent default when this function is used with Moustrap.
        return false;
    }
};

commands.addButton = commands.add.bind(null, 'html', 'button', 'go', 0, 1, undefined, undefined);
commands.addScript = commands.add.bind(null, 'html', 'script', 'in1 + 2', 1, 1, undefined, undefined);
commands.addText = commands.add.bind(null, 'html', 'span', 'empty', 1, 1, undefined, undefined);
commands.addNumber = commands.add.bind(null, 'zed', 'number', '42', 1, 1, undefined, undefined);
commands.addComment = commands.add.bind(null, 'html', 'comment', 'Comment', 0, 0, undefined, undefined);
commands.addData = commands.add.bind(null, 'html', 'data', 'data', 1, 1, undefined, undefined);
commands.addEvent = commands.add.bind(null, 'html', 'event', 'on event', 0, 1, undefined, undefined);

let bindNonEditKeys = function () {
    Mousetrap.bind('k', commands.prev);
    Mousetrap.bind('j', commands.next);
    Mousetrap.bind('b', commands.block);
    Mousetrap.bind('c', commands.goToCommandLine);
    Mousetrap.bind('g', commands.goToBlock);
    Mousetrap.bind('space', commands.fire);
    Mousetrap.bind('m', commands.toggleMenu);
    Mousetrap.bind('L', commands.toggleLock);
};

var bindKeysForMainMode = function () {
    Mousetrap.reset();
    if (!editor.lock) {
        Mousetrap.bind('up', commands.offset.bind(null, 0, -10));
        Mousetrap.bind('down', commands.offset.bind(null, 0, 10));
        Mousetrap.bind('left', commands.offset.bind(null, -10, 0));
        Mousetrap.bind('right', commands.offset.bind(null, 10, 0));
        Mousetrap.bind('shift+up', commands.offset.bind(null, 0, -50));
        Mousetrap.bind('shift+down', commands.offset.bind(null, 0, 50));
        Mousetrap.bind('shift+left', commands.offset.bind(null, -50, 0));
        Mousetrap.bind('shift+right', commands.offset.bind(null, 50, 0));
        Mousetrap.bind('a b', commands.addButton);
        Mousetrap.bind('a s', commands.addScript);
        Mousetrap.bind('a t', commands.addText);
        Mousetrap.bind('a n', commands.addNumber);
        Mousetrap.bind('a c', commands.addComment);
        Mousetrap.bind('a d', commands.addData);
        Mousetrap.bind('a e', commands.addEvent);
        Mousetrap.bind('a i', commands.addInput);
        Mousetrap.bind('a o', commands.addOutput);
        Mousetrap.bind('r', commands.remove);
        Mousetrap.bind('del', commands.remove);
        Mousetrap.bind('i', commands.linkFromInput);
        Mousetrap.bind('o', commands.linkFromOutput);
        Mousetrap.bind('C', commands.clear);
        Mousetrap.bind('l', commands.link);
        Mousetrap.bind('e', commands.edit);
        Mousetrap.bind('h', commands.editHtml);
    }
    bindNonEditKeys();
};
commands.bindKeysForMainMode = bindKeysForMainMode;

commands.escape = function () {
    if (editor.context === 'block') {
        var currentlyEditingElement = utils.dom.getSelectionStart();
        if (currentlyEditingElement !== null) {
            currentlyEditingElement.blur();
            editor.startBlinking();
            currentlyEditingElement.editing = false;
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
        [].forEach.call(ports, function (zePort) {
            var key = keys.next();
            zePort.key = key;
            zePort.showKey();
            // Convert 'aae' into 'a a e'.
            key = key.split('').join(' ');
            Mousetrap.bind(key, selectPort.bind(null, zePort));
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
Mousetrap.stopCallback = function(e, element) {
    // if the element has the class "mousetrap" then no need to stop
    if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
        return false;
    }

     // stop for input, select, and textarea
     return element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA';
 };

commands.save = storage.savePatch;
commands.load = storage.loadPatch;
commands.rm = storage.removePatch;
commands.list = storage.getPatchNames;
commands.ls = storage.getPatchNames;

let setCommandLineFrameVisibility = function (visibility) {
    document.querySelector('#command-line-frame').style.visibility = visibility;
};

var terminalOnblur = function () {
    setCommandLineFrameVisibility('hidden');
    bindKeysForMainMode();
    editor.startBlinking();
};

var term;
var init = function () {
    bindKeysForMainMode();
    term = terminal.create(commands, terminalOnblur);
    // Unplug the init function so that it won't be used as a command from the
    // terminal.
    delete commands.init;
};
commands.init = init;

commands.goToCommandLine = function () {
    term.focus();
    setCommandLineFrameVisibility('visible');
    Mousetrap.reset();
    editor.stopBlinking();
};

commands.closeCommandLine = function () {
    term.blur();
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

commands.message = function (string) {
    document.querySelector('#message').innerHTML = string;
};

commands.updateCurrentBlockContent = function () {
    let html = document.querySelector('#block-inner-html').textContent;
    let block = editor.getCurrentBlock();
    block.contentInnerHTML = html;
};

module.exports = commands;
