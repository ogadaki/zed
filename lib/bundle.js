(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/zed/lib/app.js":[function(require,module,exports){
(function (global){
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
    global.http = http;
    // Load a patch as an example.
    storage.loadPatch('http', 'patches/main.zed');
};
exports.view = view;
exports.commands = commands;

// This module is to be used from the global namespace (i.e. from app.html).
global.app = exports;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./commands":"/home/zed/lib/commands.js","./editor":"/home/zed/lib/editor.js","./engine":"/home/zed/lib/engine.js","./globals":"/home/zed/lib/globals.js","./http":"/home/zed/lib/http.js","./storage":"/home/zed/lib/storage.js","./view":"/home/zed/lib/view.js"}],"/home/zed/lib/commands.js":[function(require,module,exports){
/*eslint quotes: [2, "single"]*/

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
commands.bindKeysForMainMode = bindKeysForMainMode;

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

commands.message = function (string) {
    document.querySelector('#message').innerHTML = string;
};

module.exports = commands;

},{"./editor":"/home/zed/lib/editor.js","./storage":"/home/zed/lib/storage.js","./terminal":"/home/zed/lib/terminal.js","./utils":"/home/zed/lib/utils.js"}],"/home/zed/lib/editor.js":[function(require,module,exports){
/*eslint quotes: [2, "single"]*/

/*global document, window */

'use strict';

var engine = require('./engine');
var utils = require('./utils');

var editor = {};

editor.context = 'block';

editor.getCurrentBlock = function () {
    return document.querySelector('z-block.current');
};

editor.getCurrentPort = function () {
    return document.querySelector('z-port.current');
};

editor.setCurrentBlock = function (block) {
    var current = editor.getCurrentBlock();
    block.classList.toggle('current');
    var message = '';
    if (block.error !== undefined) {
        message = block.error.message;
    }
    // TODO Here we use global instead of require('commands') because of cyclic
    // dependencies.
    window.app.commands.message(message);
    if (current !== null) {
        current.classList.toggle('current');
    }
};
// TODO not in the window namespace
window.setCurrentBlock = editor.setCurrentBlock;

editor.setCurrentPort = function (port) {
    var current = editor.getCurrentPort();
    port.classList.toggle('current');
    if (current !== null) {
        current.classList.toggle('current');
    }
};

editor.offsetCurrentBlock = function (offset) {
    var elements = document.querySelectorAll('z-block');
    var current = editor.getCurrentBlock();
    for (var i = 0; i < elements.length; i++) {
        if (elements[i] === current) {
            var index = (elements.length + i + offset) % elements.length;
            editor.setCurrentBlock(elements[index]);
        }
    }
};

editor.offsetCurrentPort = function (offset) {
    var current = editor.getCurrentPort();
    var elements = current.block.querySelectorAll('z-port.' + editor.context);
    for (var i = 0; i < elements.length; i++) {
        if (elements[i] === current) {
            var index = (elements.length + i + offset) % elements.length;
            editor.setCurrentPort(elements[index]);
        }
    }
};

editor.offsetCurrent = function (offset) {
    if (editor.context === 'block') {
        editor.offsetCurrentBlock(offset);
    } else if (editor.context === 'input' || editor.context === 'output') {
        editor.offsetCurrentPort(offset);
    }
};

editor.createBlockElement = function (content, nInputs, nOutputs, top, left) {
    var patch = document.querySelector('#patch');
    content = [
        '<z-port class="input"></z-port>'.repeat(nInputs),
        content,
        '<z-port class="output"></z-port>'.repeat(nOutputs)
    ].join('');
    var htmlString = '<z-block>' + content + '</z-block>';
    var fragment = utils.dom.createFragment(htmlString);
    var block = fragment.querySelector('z-block');

    var defaultTop = 0;
    var defaultLeft = 0;
    var currentBlock = editor.getCurrentBlock();
    if (currentBlock !== null) {
        var position = utils.dom.getPosition(currentBlock, currentBlock.parentNode);
        defaultTop = position.y + currentBlock.getBoundingClientRect().height + 23;
        defaultLeft = position.x;
    }
    block.style.top = top || defaultTop + 'px';
    block.style.left = left || defaultLeft + 'px';

    editor.setCurrentBlock(block);
    patch.appendChild(fragment);
    return block;
};

editor.addBlock = function (type) {
    var args = arguments;
    var zeClass = '';
    if (args[1] === 'number') {
        type = 'html';
        args[1] = 'span';
        zeClass = 'zed-number';
    }
    var blockClass = args[1];
    if (type === 'html') {
        var tagName = args[1];
        if (args[1] === 'comment') {
            tagName = 'span';
        }
        var content = args[2];
        var newContent = '<' + tagName + ' class="ze-content ' + zeClass + '" contenteditable>' + content + '</' + tagName + '>';
        if (tagName === 'script') {
            newContent = '<script class="ze-content" type="application/x-prevent-script-execution-onload" style="display: block;white-space: pre-wrap;" contenteditable oninput="compileScript(this)">' + content + '</script>';
        }
        if (tagName === 'button') {
            newContent = '<button onclick="sendEventToOutputPort(this)" class="ze-content" contenteditable>' + content + '</button>';
        }
        if (tagName[0] === '<') {
            // Actually tagName contains a HTML string.
            newContent = tagName;
            blockClass = '';
        }
        args = Array.prototype.slice.call(args, 2);
        args[0] = newContent;
    }
    var block = editor.createBlockElement.apply(null, args);
    if (blockClass !== '') {
        block.classList.toggle(blockClass);
    }
};

editor.add = function () {
    var current;
    var port;
    if (editor.context === 'block') {
        editor.addBlock.apply(null, arguments);
    } else if (editor.context === 'input') {
        current = document.querySelector('z-block.current-off-context');
        port = current.addPort('<z-port class="input"></z-port>');
        editor.setCurrentPort(port);
    } else if (editor.context === 'output') {
        current = document.querySelector('z-block.current-off-context');
        port = current.addPort('<z-port class="output"></z-port>');
        editor.setCurrentPort(port);
    }
};

editor.remove = function () {
    var selected = document.querySelector('.selected');
    if (selected !== null && selected.tagName === 'Z-LINK') {
        var link = selected;
        link.unconnect();
    } else if (editor.context === 'block') {
        var block = editor.getCurrentBlock();
        editor.offsetCurrentBlock(1);
        block.unplug();
        block.parentNode.removeChild(block);
    } else if (editor.context === 'input' || editor.context === 'output') {
        var port = editor.getCurrentPort();
        editor.offsetCurrentPort(1);
        port.unplug();
        port.parentNode.removeChild(port);
    }
};

var switchCurrentOnOffContext = function (elementTagName, onOrOff) {
    var className = 'current';
    if (onOrOff === 'on') {
        className += '-off-context';
    }
    var element = document.querySelector(elementTagName + '.' + className);
    element.classList.toggle('current-off-context');
    element.classList.toggle('current');
};

editor.port = function (inputOrOutput) {
    if (editor.context !== 'block') {
        return;
    }
    try {
        switchCurrentOnOffContext('z-block.current * z-port.' + inputOrOutput, 'on');
    } catch (e) {
        var port = document.querySelector('z-block.current * z-port.' + inputOrOutput);
        if (port !== null) {
            port.classList.toggle('current');
        }
    }
    switchCurrentOnOffContext('z-block', 'off');
    editor.context = inputOrOutput;
};

editor.block = function () {
    editor.context = 'block';
    switchCurrentOnOffContext('z-block', 'on');
    try {
        switchCurrentOnOffContext('z-port.input', 'off');
    } catch(e) {}
    try {
        switchCurrentOnOffContext('z-port.output', 'off');
    } catch(e) {}
};

editor.fire = function () {
    if (editor.context === 'block') {
        var block = editor.getCurrentBlock();
        var content = block.content;
        if (content.tagName === 'BUTTON') {
            engine.sendEventToOutputPort(content);
        } else if (content.tagName === 'SCRIPT') {
            engine.fireEvent2(block);
        }
        // In case this function is called as a result of an event (say, space
        // key press) we prevent default event behaviour (say scroll down for
        // space bar).
        return false;
    }
};

editor.set = function (target, value) {
    if (target === 'content') {
        if (editor.context === 'block') {
            var block = editor.getCurrentBlock();
            block.content.innerHTML = value;
        }
    }
};

editor.move = function (left, top) {
    var current = editor.getCurrentBlock();
    current.style.top = top + 'px';
    current.style.left = left + 'px';
    current.redraw();
};

editor.moveBy = function (leftOffset, topOffset) {
    var current = editor.getCurrentBlock();
    var top = Number(current.style.top.slice(0, -2)) + Number(topOffset);
    var left = Number(current.style.left.slice(0, -2)) + Number(leftOffset);
    editor.move(left, top);
};

editor.startBlinking = function () {
    var block = editor.getCurrentBlock();
    if (block !== null) {
        if (block.classList.contains('stop-blinking')) {
            block.classList.toggle('stop-blinking');
        }
    }
};

editor.stopBlinking = function () {
    var block = editor.getCurrentBlock();
    if (!block.classList.contains('stop-blinking')) {
        block.classList.toggle('stop-blinking');
    }
};

var blinkCursor = function () {
    var current = editor.getCurrentBlock();
    if (current !== null) {
        current.classList.toggle('cursor-displayed');
    }
    window.setTimeout(blinkCursor, 1000);
};

editor.init = function () {
    blinkCursor();
};

editor.clearAll = function () {
    var blocks = document.querySelectorAll('z-block');
    _.each(blocks, function (block) {
        block.unplug();
        block.parentNode.removeChild(block);
    });
    document.getElementById('presentation').innerHTML = '';
};

module.exports = editor;

},{"./engine":"/home/zed/lib/engine.js","./utils":"/home/zed/lib/utils.js"}],"/home/zed/lib/engine.js":[function(require,module,exports){
/*eslint quotes: [2, "single"]*/

/*global window */

/*global _ */

/*global getElementBlock */

'use strict';

var utils = require('./utils');

var engine = {};

engine.compileScript = function (element) {
    var string = element.text;
    string = utils.getScripStringtWithNewlines(element);
    var script;
    var compiled;
    try {
        // In case script is an expression.
        var maybeExpression = string;
        script = 'return (' + maybeExpression + ');';
        compiled = new Function('sendToOutput', 'dest1', 'in1', 'in2', 'in3', 'in4', 'in5', script);
        element.compiledScript = compiled;
    } catch (e1) {
        // Compilation failed then it isn't an expression. Try as a
        // function body.
        try {
            script = string;
            compiled = new Function('sendToOutput', 'dest1', 'in1', 'in2', 'in3', 'in4', 'in5', script);
            element.compiledScript = compiled;
        } catch (e) {
            // Not a function body, string is not valid.
            element.compiledScript = null;
        }
    }
};

engine.sendEventToOutputPort = function (element, value) {
    var block = getElementBlock(element);
    var ports = block.ports.outputs;
    if (ports) {
        if (ports.length === 1) {
            var port = ports[0];
            port.links.forEach(function(link) {
                fireEvent(link, value);
            });
        } else {
            // Actually value is an array of values.
            var values = value;
            [].forEach.call(ports, function (port, index) {
                var zeValue = values[index];
                port.links.forEach(function(link) {
                    fireEvent(link, zeValue);
                });
            });
        }
    }
};

var getOutputLinksFirstDestinationContent = function (element) {
    var block = getElementBlock(element);
    var port = block.ports.outputs[0];
    var content;
    if (port !== null) {
        var links = port.links;
        var link = links[0];
        if (link !== undefined) {
            var target = link.end.port.block;
            content = target.content;
        }
    }
    return content;
};

// TODO change name.
engine.fireEvent2 = function (target, value) {
    if (target.classList.contains('has-execution-error')) {
        target.classList.toggle('has-execution-error');
    }
    var content = target.content;
    var tagName = content.tagName;

    if (tagName === 'SCRIPT') {
        var dataPorts = target.querySelectorAll('z-port.input');
        var inputs = [];
        [].forEach.call(dataPorts, function (dataPort) {
            var dataLinks = dataPort === null ? [] : dataPort.links;

            if (dataLinks.length !== 0) {
                if (value === undefined) {
                    var dataLink = _.find(dataLinks, function (link) {
                        var tag = link.begin.port.block.content.tagName;
                        return tag !== 'BUTTON';
                    });
                    var dataLink;

                    if (dataLink !== undefined) {
                        var obj = dataLink.begin.port.block.content;
                        value = obj.value;

                        if (obj.tagName === 'SPAN') {
                            value = obj.innerHTML;
                            if (obj.classList.contains('zed-number')) {
                                value = Number(value);
                            }
                        } else if (obj.tagName === 'SCRIPT') {
                            value = obj.executionResult;
                        }

                        if (value === undefined) {
                            value = obj;
                        }
                    }
                }
                inputs.push(value);
                value = undefined;
            }
        });

        var nextAction = function () {
            sendEventToOutputPort(content, arguments[0]);
        };
        var firstDestinationContent = getOutputLinksFirstDestinationContent(content);

        var theScript = content.compiledScript;
        if (theScript === undefined) {
            compileScript(content);
            theScript = content.compiledScript;
        }
        if (theScript === null) {
            //console.log('Error in script. Aborting.');
            return;
        }

        var args = [];
        args.push(nextAction);
        args.push(firstDestinationContent);
        args = args.concat(inputs);
        var result;
        target.error = {
            message: ''
        };
        try {
            result = theScript.apply(null, args);
        } catch (e) {
            target.classList.toggle('has-execution-error');
            message = 'execution error on line ' + e.lineNumber + ': ' + e.message;
            target.error.message = message;
            if (target.classList.contains('current')) {
                window.app.commands.message(message);
            }
            return;
        }

        if (result !== undefined) {
            // Store result for future use.
            content.executionResult = result;
            if (typeof result.then === 'function') {
                result.then(function (data) {
                    sendEventToOutputPort(content, data);
                });
            } else {
                sendEventToOutputPort(content, result);
            }
        }
    }

    if (tagName === 'NUMBER') {
        if (value !== undefined) {
            content.innerHTML = value;
        }
    }

    if (tagName === 'DIV' || tagName === 'SPAN') {
        if (value !== undefined) {
            content.innerHTML = value;
        } else {
            value = content.innerHTML;
        }
        sendEventToOutputPort(content, value);
    }

    if (tagName === 'INPUT') {
        if (value !== undefined) {
            content.value = value;
        }
    }
    target.redraw();
};

engine.fireEvent = function (link, value) {
    var target = link.end.port.block;
    if (target.ports.inputs[0] === link.end.port) {
        // Only actually fire the block on its first input port.
        fireEvent2(target, value);
    }
};

engine.init = function () {
    window.compileScript = engine.compileScript;
    window.sendEventToOutputPort = engine.sendEventToOutputPort;
    window.fireEvent2 = engine.fireEvent2;
    window.fireEvent = engine.fireEvent;
};

module.exports = engine;

},{"./utils":"/home/zed/lib/utils.js"}],"/home/zed/lib/globals.js":[function(require,module,exports){
// The place to pollute global namespace.

'use strict';

window.loadScript = function (url)
{
    var script = document.createElement('script');
    script.setAttribute('type','text/javascript');
    script.setAttribute('src', url);
    document.body.appendChild(script);
    document.body.removeChild(script);
};

},{}],"/home/zed/lib/http.js":[function(require,module,exports){
var http = {};

http.get = function (url) {
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url);

        request.onload = function() {
            if (request.status === 200) {
                var result;
                try {
                    result = JSON.parse(request.response);
                } catch (e) {
                    result = request.response;
                }
                resolve(result);
            } else {
                reject(request.statusText);
            }
        };

        request.onerror = function() {
            reject(Error('Network error'));
        };

        request.send();
    });
};

module.exports = http;

},{}],"/home/zed/lib/selector.js":[function(require,module,exports){
(function (global){
/*eslint quotes: [2, "single"]*/
/*global window */

'use strict';

var selector = {
    setSelectable: function (element, withStopPropagation) {
        var selector = this;
        element.addEventListener('click', function (event) {
            selector.action(element);
            if (withStopPropagation !== undefined && withStopPropagation === true) {
                event.stopPropagation();
            }
        });
    },

    connectable: function (element1, element2) {
        if (element1.connectable !== undefined) {
            return element1.connectable(element1, element2);
        }
        return false;
    },

    action: function (element) {
        if (this.selected !== undefined) {
            if (this.connectable(this.selected, element)) {
                this.selected.connect(this.selected, element);
                this.selected.classList.toggle('selected');
                this.selected = undefined;
                return;
            }
            this.selected.classList.toggle('selected');
        }
        if (this.selected === element) {
            this.selected = undefined;
        } else {
            this.selected = element;
            element.classList.toggle('selected');
        }
    },

    unselect: function () {
        if (this.selected !== undefined) {
            this.selected.classList.toggle('selected');
            this.selected = undefined;
        }
    }

};

module.exports = selector;
// TODO move elsewhere
global.selector = selector;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/zed/lib/storage.js":[function(require,module,exports){

/*global window */
/*global document */

/*global _ */

/*global commands */

'use strict';

var editor = require('./editor');
var view = require('./view');
var utils = require('./utils');

var storage = {};

function exportPatch () {
    view.switchMode('edit');
    var elements = document.querySelectorAll('z-block');
    var patch = {};
    patch.blocks = [];
    patch.links = [];
    _.each(elements, function (element, index) {
        var contentContainerInnerHTML = element.querySelector('.content-container').innerHTML.trim();
        var content = element.content;
        var tagName = content.tagName.toLowerCase();
        if (element.classList.contains('comment')) {
            tagName = 'comment';
        }
        var value = content.value || content.innerHTML || '';
        if (tagName === 'button') {
            value = content.innerHTML;
            contentContainerInnerHTML = '';
        } else if (tagName === 'script') {
            value = utils.getScripStringtWithNewlines(content);
            contentContainerInnerHTML = '';
        }
        var inputPorts = element.querySelectorAll('z-port.input');
        var outputPorts = element.querySelectorAll('z-port.output');
        patch.blocks.push({
            id: index,
            tagName: tagName,
            nInputs: inputPorts.length,
            nOutputs: outputPorts.length,
            top: element.style.top,
            left: element.style.left,
            width: element.style.width,
            value: value,
            innerHTML: contentContainerInnerHTML
        });
        var phantom = content.phantomedBy;
        if (phantom !== undefined) {
            phantom.setAttribute('data-index-to-phantom', index);
        }
        _.each(inputPorts, function (port, portIndex) {
            var inLinks = port.links;
            _.each(inLinks, function (link) {
                var otherPort = link.begin.port;
                var otherBlock = otherPort.block;
                var otherBlockIndex = _.indexOf(elements, otherBlock);
                var otherBlockPorts = otherBlock.querySelectorAll('z-port.output');
                var otherBlockPortIndex = _.indexOf(otherBlockPorts, otherPort);
                patch.links.push({
                    input: {
                        block: index,
                        port: portIndex
                    },
                    output: {
                        block: otherBlockIndex,
                        port: otherBlockPortIndex
                    }
                });
            });
        });
    });
    patch.presentation = {};
    patch.presentation.innerHTML = document.getElementById('presentation').innerHTML;
    var phantoms = document.getElementById('presentation').querySelectorAll('.phantom');
    _.each(phantoms, function (phantom) {
        // FIXME data-index-to-phantom instead?
        phantom.removeAttribute('data-phantomed-block-id');
    });
    return patch;
};

// TODO move elsewhere
var connectBlocks = function(end, start, inputPortPosition, outputPortPosition) {
    var startPort = (start.querySelectorAll('z-port.output'))[outputPortPosition];
    var endPort = (end.querySelectorAll('z-port.input'))[inputPortPosition];
    if (startPort.connectable === undefined) {
        // TODO connectable takes some time to be defined. Wait for it.
        window.setTimeout(connectBlocks, 1, end, start, inputPortPosition, outputPortPosition);
    } else if (startPort.connectable(startPort, endPort)) {
        startPort.connect(startPort, endPort);
    }
};

// TODO move elsewhere
var createPhantomLinkForBlock = function (block, phantom) {
    var content = block.content;
    if (content === undefined) {
        // FIX ME wait that content actually exists.
        window.setTimeout(createPhantomLinkForBlock, 1, block, phantom);
    } else {
        view.createPhantomLink(content, phantom);
    }
};

var importPatch = function (patch) {
    var elements = [];
    _.each(patch.blocks, function (block) {
        block.nInputs = block.nInputs || 0;
        block.nOutputs = block.nOutputs || 0;
        if (block.tagName === 'script' || block.tagName === 'button' || block.tagName === 'comment') {
            editor.addBlock('html', block.tagName, block.value, block.nInputs, block.nOutputs, block.top, block.left);
        } else {
            editor.addBlock('html', block.innerHTML, '', block.nInputs, block.nOutputs, block.top, block.left);
        }
        var element = document.querySelector('z-block.current');
        elements.push(element);
    });
    _.each(patch.links, function (link) {
        var output = elements[link.output.block];
        var input = elements[link.input.block];
        connectBlocks(input, output, link.input.port, link.output.port);
    });
    var presentation = document.getElementById('presentation');
    presentation.innerHTML = patch.presentation.innerHTML;
    var phantoms = document.getElementById('presentation').querySelectorAll('.phantom');
    _.each(phantoms, function (phantom) {
        var index = phantom.getAttribute('data-index-to-phantom');
        var block = elements[index];
        createPhantomLinkForBlock(block, phantom);
    });
};

storage.savePatch = function (where, name) {
    if (name === undefined) {
        // Only one argument means it is actually the name and we load from
        // localstorage.
        name = where;
        where = 'local';
    }
    var patch = exportPatch();
    if (where === 'local') {
        var patches = JSON.parse(window.localStorage.getItem('patches'));
        patches = patches || {};
        patches[name] = patch;
        window.localStorage.setItem('patches', JSON.stringify(patches));
    } else if (where === 'file') {
        var content = JSON.stringify(patch, null, '    ');
        var blob = new Blob([content], { type : "text/plain", endings: "transparent"});
        window.saveAs(blob, name);
    } else {
        throw Error('bad save location ("' + where +
                        '"), must be "local" or "file"');
    }
};

storage.loadPatch = function (where, what) {
    if (what === undefined) {
        what = where;
        if (Object.prototype.toString.call(what) === '[object File]') {
            where = 'file object';
        } else {
            where = 'local';
        }
    }
    var promise;
    if (where === 'local') {
        var patches = JSON.parse(window.localStorage.getItem('patches'));
        patches = patches || {};
        var patch = patches[what];
        promise = new Promise(function (resolve, reject) {
            if (patch !== undefined) {
                resolve(patch);
            } else {
                reject(Error('No patch with name "' +
                        what + '" in local storage.'));
            }
        });
    } else if (where === 'http') {
        var url = what;
        promise = http.get(url);
    } else if (where === 'file object') {
        var file = what;
        promise = new Promise(function (resolve, reject) {
            var fileReader = new FileReader();
            fileReader.onload = function (event) {
                resolve(JSON.parse(event.target.result));
            };
            fileReader.readAsText(file);
        });
    } else {
        promise = new Promise(function (resolve, reject) {
            reject(Error('bad load location ("' + where +
                        '"), must be "local" or "http"'));
        });
    }
    return promise.then(function (patch) {
        editor.clearAll();
        importPatch(patch);
    });
};

storage.removePatch = function (name) {
    var patches = JSON.parse(window.localStorage.getItem('patches'));
    patches = patches || {};
    var trash = JSON.parse(window.localStorage.getItem('trash'));
    trash = trash || {};
    var patch = patches[name];
    if (patch === undefined) {
        throw 'No patch with name "' + name + '" in local storage.';
    }
    trash[name] = patch;
    delete patches[name];
    window.localStorage.setItem('patches', JSON.stringify(patches));
    editor.clearAll();
};

storage.getPatchNames = function () {
    var patches = JSON.parse(window.localStorage.getItem('patches'));
    return _.keys(patches);
};

module.exports = storage;

},{"./editor":"/home/zed/lib/editor.js","./utils":"/home/zed/lib/utils.js","./view":"/home/zed/lib/view.js"}],"/home/zed/lib/terminal.js":[function(require,module,exports){
// Use of termlib.js for the terminal frame.

/*eslint quotes: [2, "single"]*/

/*global document, window */

// globals from termlib.js
/*global TermGlobals */
/*global termKey */
/*global Parser */
/*global Terminal */

var terminal = {};

terminal.create = function (commands, onblur) {
    'use strict';

    var termDivId = 'command-line-frame';

    var getTermDiv = function () {
        return document.querySelector('#' + termDivId);
    };

    var blur = function () {
        TermGlobals.keylock = true;
        TermGlobals.activeTerm.cursorOff();
        var termDiv = getTermDiv();
        termDiv.classList.toggle('focused');
        onblur();
    };

    var ctrlHandler = function () {
        if (this.inputChar === termKey.ESC) {
            blur();
        }
    };

    var termHandler = function () {
        var that = this;
        that.newLine();
        var parser = new Parser();
        parser.parseLine(that);
        var commandName = that.argv[0];
        if (commands.hasOwnProperty(commandName)) {
            var args = that.argv.slice(1);
            try {
                var result = commands[commandName].apply(null, args);
                if (result !== undefined) {
                    if (result.then !== undefined) {
                        result.then(function (data) {
                            if (data !== undefined) {
                                that.write(data);
                            }
                            that.prompt();
                        }).catch(function (error) {
                            that.write('Error: ' + error.message);
                            that.prompt();
                        });
                    } else {
                        that.write(result);
                        that.prompt();
                    }
                } else {
                    that.prompt();
                }
            } catch (e) {
                that.write(e.message);
                that.prompt();
            }
        } else {
            that.write('unknown command "' + commandName + '".');
            that.prompt();
        }
    };

    var initHandler = function () {
        this.prompt();
    };

    // The termlib.js object
    var term = new Terminal( {
        termDiv: termDivId,
        handler: termHandler,
        bgColor: '#f0f0f0',
        crsrBlinkMode: true,
        crsrBlockMode: false,
        rows: 10,
        frameWidth: 0,
        closeOnESC: false,
        ctrlHandler: ctrlHandler,
        initHandler: initHandler

    } );
    term.open();

    var focus = function () {
        if (TermGlobals.keylock === false) {
            return;
        }
        TermGlobals.keylock = false;
        TermGlobals.activeTerm.cursorOn();
        var termDiv = getTermDiv();
        termDiv.classList.toggle('focused');
    };

    blur();

    return {
        focus: focus,
        term: term
    };
};

module.exports = terminal;

},{}],"/home/zed/lib/utils.js":[function(require,module,exports){
// Syntactic sugar and simple utilities.

/*eslint quotes: [2, "single"]*/
/*global document, window */

/*global _ */

var utils = {};

var dom;
dom = {
    // Create a dom fragment from a HTML string.
    createFragment: function(htmlString) {
        var fragment = document.createDocumentFragment();
        if (htmlString) {
            var div = fragment.appendChild(document.createElement('div'));
            div.innerHTML = htmlString;
            var child;
            /*eslint-disable no-cond-assign */
            while (child = div.firstChild) {
                /*eslint-enable no-cond-assign */
                fragment.insertBefore(child, div);
            }
            fragment.removeChild(div);
        }
        return fragment;
    },

    // Move DOM nodes from a source to a target. The nodes ares selected
    // based on a selector and the place they are insterted is a given tag
    // with a "select" attribute which contains the given selector. If
    //    source is 'aaa <span class="something">zzz</span>'
    // and
    //    target is 'rrr <content select=".something"></content> ttt'
    // After moveContentBasedOnSelector(source, target, '.something'):
    //    source is 'aaa'
    // and
    //    target is 'rrr <span class="something">zzz</span> ttt'
    moveContentBasedOnSelector: function(source, target, selector, targetTag) {
        var content;
        var elements;
        if (selector === '') {
            content = target.querySelector(targetTag);
            elements = source.childNodes;
        } else {
            content = target.querySelector(targetTag + '[select="' + selector + '"]');
            elements = source.querySelectorAll(selector);
        }
        // Warning: it is important to loop elements backward since current
        // element is removed at each step.
        for (var i = elements.length - 1; i >= 0; i--) {
            var element = elements[i];
            // TODO. Le "insert" ci-dessous sur les z-port fait que le
            // detachedCallback est appelé avec l'implementation de custom
            // elments par webreflections mais pas par l'implémentation de
            // Polymer (en utilisant le polyfill de Bosonic) ni avec
            // l'implémentation native de chrome.
            content.parentNode.insertBefore(
                    element,
                    content.nextSibling
            );
            // TODO move this elsewhere.
            if (element.onclick === null) {
                element.onclick = function () {
                    // Use global to access this function because using require
                    // on commands has a cyclic dependency.
                    window.app.commands.editBlock(source);
                };
            }
        }
        content.parentNode.removeChild(content);
    },

    move: function(options) {
        return dom.moveContentBasedOnSelector(
                options.from,
                options.to,
                options.withSelector,
                options.onTag
        );
    },

    // Get the position of the element relative to another one (default is
    // document body).
    getPosition: function (element, relativeElement) {
        var rect = element.getBoundingClientRect();
        relativeElement = relativeElement || document.body;
        var relativeRect = relativeElement.getBoundingClientRect();
        return {
            x: rect.left - relativeRect.left,
            y: rect.top - relativeRect.top
        };
    },

    getSelectionStart: function () {
        var node = document.getSelection().anchorNode;
        return ( (node !== null && node.nodeType === 3) ? node.parentNode : node );
    }

};
utils.dom = dom;

// Usefull for multiline string definition without '\' or multiline
// concatenation with '+'.
utils.stringFromCommentInFunction = function(func) {
    return func.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];
};

utils.createKeysGenerator = function () {
    // Returns a keys generator for a sequence that is build like that:
    //   b, c, d...
    //   ab, ac, ad...
    //   aab, aac, aad...
    // The idea is to have a sequence where each value is not the beginning
    // of any other value (so single 'a' can't be part of the sequence).
    //
    // One goal is to have shortest possible keys. So maybe we should use
    // additionnal prefix chars along with 'a'. And because it will be used
    // for shortcuts, maybe we can choose chars based on their position on
    // the keyboard.
    var index = 0;
    var charCodes = _.range('b'.charCodeAt(0), 'z'.charCodeAt(0) + 1);
    var idStrings = _.map(charCodes, function (charCode) {
        return String.fromCharCode(charCode);
    });
    var generator = {};
    generator.next = function () {
        var key = '';
        var i = index;
        if (i >= charCodes.length) {
            var r = Math.floor(i / charCodes.length);
            i = i % charCodes.length;
            while (r > 0) {
                key += 'a';
                r--;
            }
        }
        key += idStrings[i];
        index++;
        return key;
    };

    return generator;
};

utils.getScripStringtWithNewlines = function (element) {
    // The newlines are lost when using raw innerHTML for script tags
    // (at least on firefox). So we parse each child to add a newline
    // when BR are encountered.
    var value = '';
    [].forEach.call(element.childNodes, function (node) {
        if (node.tagName === 'BR') {
            value += '\n';
        } else {
            value += node.textContent;
        }
    });
    return value;
};


window.utils = utils;
module.exports = utils;

},{}],"/home/zed/lib/view.js":[function(require,module,exports){
(function (global){
/*eslint quotes: [2, "single"]*/

/*global window */
/*global document */

/*global _ */
/*global Mousetrap */

'use strict';

var commands = require('./commands');

var view = {};

var isDescendant = function (child, parent) {
     var node = child.parentNode;
     while (node !== null) {
         if (node === parent) {
             return true;
         }
         node = node.parentNode;
     }
     return false;
};

var getPresentationElement = function () {
  return document.getElementById('presentation');
};

var createPhantomLink = function (phantomed, phantom) {
    phantom.phantomOf = phantomed;
    phantom.classList.add('phantom');
    phantomed.phantomedBy = phantom;
    phantomed.classList.add('phantomed');
};
view.createPhantomLink = createPhantomLink;

var createPhantom = function (element) {
  var phantom = element.cloneNode(true);
  phantom.disabled = true;
  phantom.setAttribute('contentEditable', false);
  // Link the two for later use (in particulary when we will switch
  // display mode).
  createPhantomLink(element, phantom);

  return phantom;
};

var isCurrentSelectionInPresentation = function () {
  // Get the selection range (or cursor position)
  var range = window.getSelection().getRangeAt(0);
  var zePresentation = getPresentationElement();
  // Be sure the selection is in the presentation.
  return isDescendant(range.startContainer, zePresentation);
};

var insertInPlaceOfSelection = function (element) {
  // Get the selection range (or cursor position)
  var range = window.getSelection().getRangeAt(0);
  // Delete whatever is on the range
  range.deleteContents();
  range.insertNode(element);
};

// Insert a selected block in the DOM selection in presentation window.
var insertBlockContentInSelection = function () {
  var block = document.querySelector('z-block.current');
  if (block === undefined) {
    // Nothing is selected.
    return;
  }

  if(isCurrentSelectionInPresentation()) {
    var content = block.content;
    var phantom = createPhantom(content);
    insertInPlaceOfSelection(phantom);

    // TODO eventually switch the two if we are in presentation mode.
  }
};
view.insertBlockContentInSelection = insertBlockContentInSelection;

var getPhantoms = function (element) {
  return element.querySelectorAll('.phantom');
};

var getWindowForMode = function (mode) {
  var id = mode;
  return document.getElementById(id);
};

var swapElements = function (obj1, obj2) {
    // create marker element and insert it where obj1 is
    var temp = document.createElement('div');
    obj1.parentNode.insertBefore(temp, obj1);

    // move obj1 to right before obj2
    obj2.parentNode.insertBefore(obj1, obj2);

    // move obj2 to right before where obj1 used to be
    temp.parentNode.insertBefore(obj2, temp);

    // remove temporary marker node
    temp.parentNode.removeChild(temp);
};

var currentMode = '';

// Do all the stuff needed to switch mode between 'edit' and 'presentation'.
// Mainly swap 'phantom' and 'phantomed' objects pairs.
var switchMode = function (mode) {
    if (mode === currentMode) {
        return;
    }
    currentMode = mode;
  // By convention, the 'phantom' elements actually are in the window
  // associated to the mode we want to switch to. The phantomed one are in the
  // window of the other mode.

  var phantoms = getPhantoms(getWindowForMode(mode));
  _.each(phantoms, function (phantom) {
    // What this object is the phantom of?
    var phantomed = phantom.phantomOf;
    // Simply swap these DOM objects.
    swapElements(phantomed, phantom);
  });
};
view.switchMode = switchMode;

var presentation = {};

// TODO not used?
var selectElement = function (event) {
  presentation.selected = event.target;
};
view.selectElement = selectElement;

var lock = function () {
    var p = getPresentationElement();
    p.contentEditable = false;
    document.querySelector('#lock-button').disabled = true;
    document.querySelector('#unlock-button').disabled = false;
};
view.lock = lock;

var unlock = function () {
    var p = getPresentationElement();
    p.contentEditable = true;
    document.querySelector('#lock-button').disabled = false;
    document.querySelector('#unlock-button').disabled = true;
};
view.unlock = unlock;

var init = function() {
    var p = getPresentationElement();
    p.onfocus = function () {
        Mousetrap.reset();
    };
    p.onblur = function () {
        commands.bindKeysForMainMode();
    };
};
view.init = init;

module.exports = view;
global.view = view;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./commands":"/home/zed/lib/commands.js"}],"/home/zed/webcomponents/z-block.js":[function(require,module,exports){
/*eslint quotes: [2, "single"]*/

/*global document */
/*global HTMLElement */
/*global window */

/*global restyle */
/*global Draggabilly */

'use strict';

var utils = require('../lib/utils');
var selector = require('../lib/selector');

var tagName = 'z-block';

var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
    <div id="main">
        <div class="ports-container inputs">
            <content select="z-port.input"></content>
        </div>
        <span class="block-key">a</span>
        <div class="content-container">
            <content></content>
        </div>
        <div class="ports-container outputs">
            <content select="z-port.output"></content>
        </div>
    </div>
*/});
var template = utils.dom.createFragment(htmlTemplate);

var cssAsJson = {
    // The following will apply to the root DOM element of the custom
    // element.
    '': {
        // By default custom elements are inline elements. Current element
        // has its own height and width and can be insterted in a text
        // flow. So we need a 'display: inline-block' style. Moreover, this
        // is needed as a workaround for a bug in Draggabilly (which only
        // works on block elements, not on inline ones).
        'display': 'inline-block',
        'position': 'absolute'
    },
    '> div': {
        'background': 'white',
        'border-left': '3px solid',
        'border-left-color': 'white',
        'border-right': '3px solid',
        'border-right-color': 'white',
        'boxShadow': '2px 2px 3px 0px #dfdfdf'
    },
    '.content-container': {
        'padding': '8px 15px 8px 15px'
    },
    '.ports-container': {
        'padding': 0,
        'minHeight': 3,
        'overflow': 'visible'
    },
    '.ports-container z-port': {
        'float': 'left',
        'marginLeft': 8,
        'marginRight': 8
    },
    'span.block-key': {
        'font-size': 'smaller',
        'color': '#444',
        'position': 'absolute',
        'bottom': 0,
        'right': 0,
        'padding-right': 3,
        'padding-left': 3,
        'background': '#fff'
    },
    'z-port.input .port-key': {
        'top': 3
    },
    'z-port.output .port-key': {
        'bottom': 3
    }
};
// Apply the css definition and prepending the custom element tag to all
// CSS selectors.
var style = restyle(tagName, cssAsJson);

var redraw = function (block) {
    var ports = block.querySelectorAll('z-port');
    [].forEach.call(ports, function (port) {
        port.redraw();
    });
};

var makeItDraggable = function (block) {
    var draggie = new Draggabilly(block, {
        containment: true
    });
    draggie.externalAnimate = function () {
        redraw(block);
    };
};

var properties = {
    createdCallback: {value: function() {
        // At the beginning the light DOM is stored in the current element.
        var lightDom = this;
        // Start composed DOM with a copy of the template
        var composedDom = template.cloneNode(true);
        // Then progressively move elements from light to composed DOM based on
        // selectors on light DOM and fill <content> tags in composed DOM with
        // them.
        ['z-port.input', 'z-port.output', ''].forEach(function(selector) {
            utils.dom.move({
                from: lightDom, withSelector: selector,
                to: composedDom, onTag: 'content'
            });
        });
        // At this stage composed DOM is completed and light DOM is empty (i.e.
        // 'this' has no children). Composed DOM is set as the content of the
        // current element.
        this.appendChild(composedDom);

        this.hideKey();

        var that = this;
        var ports = that.querySelectorAll('z-port');
        [].forEach.call(ports, function(port) {
            port.block = that;
        });

        this.content = this.querySelector('.ze-content');

        // TODO move elsewhere
        this.onclick = function () {
            window.setCurrentBlock(that);
        };
        this.redraw = redraw.bind(null, this);
        selector.setSelectable(this, true);
    }},

    attachedCallback: {value: function() {
        // TODO bug in chrome or in webreflection polyfill. If makeItDraggable
        // is called in createdCallback then Draggabily adds a
        // 'position:relative' because the css style of block that set
        // position to absolute has not been applied yet (with chrome). With
        // WebReflection's polyfill the style is applied so Draggabilly doesn't
        // change position. Why a different behaviour? Which is wrong ? Chrome,
        // webreflection or the spec? Maybe we can try with polymer polyfill.
        makeItDraggable(this);
    }},

    unplug: {value: function() {
        var ports = this.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.unplug();
        });
    }},

    addPort: {value: function (htmlString) {
        var fragment = utils.dom.createFragment(htmlString);
        var port = fragment.firstChild;
        port.block = this;
        if (port.classList.contains('input')) {
            var portContainer = this.querySelector('.ports-container.inputs');
            portContainer.appendChild(fragment);
        } else if (port.classList.contains('output')) {
            var portContainer = this.querySelector('.ports-container.outputs');
            portContainer.appendChild(fragment);
        }
        return port;
    }},

    keyElement: {
        get: function () {
            return this.querySelector('span.block-key');
        }
    },

    key: {
        set: function (value) {
            this.keyElement.innerHTML = value;
        }
    },

    showKey: {value: function () {
        this.keyElement.style.visibility = 'visible';
    }},

    hideKey: {value: function () {
        this.keyElement.style.visibility = 'hidden';
    }},

    ports: {
        get: function () {
            return {
                'out': this.querySelector('z-port.output'),
                'inputs': this.querySelectorAll('z-port.input'),
                'outputs': this.querySelectorAll('z-port.output')
            };
        }
    }
};

var proto = Object.create(HTMLElement.prototype, properties);
proto.css = style;
document.registerElement(tagName, {prototype: proto});

// TODO clean globals
window.getElementBlock = function (element) {
    // TODO do a search to find the first parent block for cases where
    // element is down in the element hiearchy.
    var maybeBlock = element.parentNode.parentNode.parentNode;
    var block;
    if (maybeBlock.tagName === 'Z-BLOCK') {
        block = maybeBlock;
    } else {
        block = element.phantomedBy.parentNode.parentNode.parentNode;
    }
    return block;
};

},{"../lib/selector":"/home/zed/lib/selector.js","../lib/utils":"/home/zed/lib/utils.js"}],"/home/zed/webcomponents/z-link.js":[function(require,module,exports){
// Custom element to draw a link between two ports.

// We implement this as a div with zero height which width is the length of the
// line and use transforms to set its ends to the ports positions. Reference
// origin position is relative coordinates (0,0) and other end is (width,0).
// So be sure that CSS styling is done accordingly.

/*eslint quotes: [2, "single"]*/

/*global document */
/*global HTMLElement */

/*global getStyleProperty */

/*global _ */
/*global restyle */

'use strict';

var utils = require('../lib/utils');
var selector = require('../lib/selector');

var tagName = 'z-link';

var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
    <div>
        <div class="selector"></div>
    </div>
*/});
var template = utils.dom.createFragment(htmlTemplate);

// TODO Use a custom element for line width.
var lineWidth = 3.0;
var radius = lineWidth / 2;
var cssAsJson = {
    // The following will apply to the root DOM element of the custom
    // element.
    '': {
        'position': 'absolute',
        'height': 0,
        'margin-left': -radius,
        'margin-top': -radius,
        'borderWidth': radius,
        'borderRadius': radius,
        'borderStyle': 'solid',
        'boxShadow': '0px 0px 3px 0px #dfdfdf',
        'borderColor': '#ccc'
    },
    'div.selector': {
        'position': 'absolute',
        'left': '10%',
        'width': '80%',
        'top': -7,
        'height': 14,
        'zIndex': 0,
        'borderColor': '#333'
    }
};
// Apply the css definition and prepending the custom element tag to all
// CSS selectors.
var style = restyle(tagName, cssAsJson);

var getPolarCoordinates = function(position1, position2) {
    var xDiff = position1.x - position2.x;
    var yDiff = position1.y - position2.y;

    return {
        mod: Math.sqrt(xDiff * xDiff + yDiff * yDiff),
        arg: Math.atan(yDiff / xDiff)
    };
};

// Set the style of a given element so that:
// * Its origin (i.e. 0,0 relative coordinates) is placed at one position.
// * Its width is set to the distance between the two positions.
// * It is rotated so that its end point (x = width and y = 0) is placed at
// the other position.
var transformProperty = getStyleProperty('transform');
var setElementEnds = function(element, end1, end2) {
    var origin;
    if (end1.x < end2.x) {
        origin = end1;
    } else {
        origin = end2;
    }

    var polar = getPolarCoordinates(end1, end2);
    var length = polar.mod;
    var angle = polar.arg;

    var top = origin.y + 0.5 * length * Math.sin(angle);
    var left = origin.x - 0.5 * length * (1 - Math.cos(angle));
    var parentPosition = utils.dom.getPosition(element.parentNode);
    left -= parentPosition.x;
    top -= parentPosition.y;

    element.style.width = length + 'px';
    element.style.top = top + 'px';
    element.style.left = left + 'px';
    element.style[transformProperty] = 'rotate(' + angle + 'rad)';
};

var redraw = function (zlink) {
    var end1 = zlink.begin.port;
    var end2 = zlink.end.port;
    if (end1 !== undefined && end2 !== undefined) {
        setElementEnds(zlink, end1.connectionPosition, end2.connectionPosition);
    }
};

var connect = function(zlink, plug, port) {
    if (typeof port === 'string') {
        port = document.querySelector(port);
    }
    plug.port = port;
    plug.port.links.push(zlink);
};

var unconnect = function (zlink) {
    zlink.begin.port.links = _.without(zlink.begin.port.links, zlink);
    zlink.end.port.links = _.without(zlink.end.port.links, zlink);
    if (zlink.parentNode !== null) {
        zlink.parentNode.removeChild(zlink);
    }
};

var proto = Object.create(HTMLElement.prototype);
proto.createdCallback = function() {
    var composedDom = template.cloneNode(true);
    this.appendChild(composedDom);

    // Curried version of 'redraw' with current object instance.
    // Used for event listeners.
    this.redraw = redraw.bind(null, this);
    this.connect = connect.bind(null, this);
    this.unconnect = unconnect.bind(null, this);

    this.begin = {};
    this.end = {};
    if (this.hasAttribute('begin') && this.hasAttribute('end')) {
        // TODO do the same stuff on attributes' changes.
        connect(this, this.begin, this.getAttribute('begin'));
        connect(this, this.end, this.getAttribute('end'));

        this.redraw();
    }

    selector.setSelectable(this, true);
};

proto.css = style;
document.registerElement(tagName, {prototype: proto});

},{"../lib/selector":"/home/zed/lib/selector.js","../lib/utils":"/home/zed/lib/utils.js"}],"/home/zed/webcomponents/z-port.js":[function(require,module,exports){
/*eslint quotes: [2, "single"]*/

/*global document, window */
/*global HTMLElement */

/*global restyle */

'use strict';

var utils = require('../lib/utils');
var selector = require('../lib/selector');

var tagName = 'z-port';

var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
    <span class="port-key">a</span>
    <div class="selector"></div>
*/});
var template = utils.dom.createFragment(htmlTemplate);

var cssAsJson = {
    // The following will apply to the root DOM element of the custom
    // element.
    '': {
        'width': 18,
        'height': 3,
        'background': '#ccc',
        'display': 'inline-block',
        'position': 'relative',
        'overflow': 'visible',
        'zIndex': '5'
    },
    '.port-key': {
        'font-size': '0.7em',
        'color': '#444',
        'position': 'absolute',
        'padding-left': 3,
        'padding-right': 3,
        'zIndex': '10',
        'background': '#fff'
    },
    '.selector': {
        'position': 'absolute',
        'left': -8,
        'top': -8,
        'width': 24,
        'height': 14
    }
};
// Apply the css definition and prepending the custom element tag to all
// CSS selectors.
var style = restyle(tagName, cssAsJson);

var redraw = function (port) {
    [].forEach.call(port.links, function (link) {
        link.redraw();
    });
};


var properties = {

    createdCallback: {value: function() {
        this.links = [];
        this.redraw = redraw.bind(null, this);
        selector.setSelectable(this, true);

        var composedDom = template.cloneNode(true);
        this.appendChild(composedDom);

        this.hideKey();
    }},

    unplug: {value: function () {
        this.links.forEach(function (link) {
            link.unconnect();
        });
    }},

    connectable: {value: function (port1, port2) {
        return (
            (port1.classList.contains('input')
            && port2.classList.contains('output'))
            ||
            (port1.classList.contains('output')
            && port2.classList.contains('input'))
            );
    }},

    connect: {value: function (port1, port2) {
        var link = document.createElement('z-link');
        if (port1.classList.contains('output')) {
            link.connect(link.begin, port1);
            link.connect(link.end, port2);
        } else {
            link.connect(link.end, port1);
            link.connect(link.begin, port2);
        }
        // TODO use another way to find where to add new links.
        var patch = document.querySelector('#patch');
        patch.appendChild(link);
        link.redraw();
    }},

    connectionPosition: {
        get: function () {
            var element = this;
            var rect = element.getBoundingClientRect();
            var position = utils.dom.getPosition(element);
            var center = {
                x: position.x + rect.width / 2,
                y: position.y + rect.height / 2
            };
            return center;
        }
    },

    keyElement: {
        get: function () {
            return this.querySelector('span.port-key');
        }
    },

    key: {
        set: function (value) {
            this.keyElement.innerHTML = value;
        }
    },

    showKey: {value: function () {
        this.keyElement.style.visibility = 'visible';
    }},

    hideKey: {value: function () {
        this.keyElement.style.visibility = 'hidden';
    }}

};

var proto = Object.create(HTMLElement.prototype, properties);
proto.css = style;
document.registerElement(tagName, {prototype: proto});


},{"../lib/selector":"/home/zed/lib/selector.js","../lib/utils":"/home/zed/lib/utils.js"}]},{},["/home/zed/lib/app.js","/home/zed/webcomponents/z-block.js","/home/zed/webcomponents/z-link.js","/home/zed/webcomponents/z-port.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvZ2xvYmFscy5qcyIsImxpYi9odHRwLmpzIiwibGliL3NlbGVjdG9yLmpzIiwibGliL3N0b3JhZ2UuanMiLCJsaWIvdGVybWluYWwuanMiLCJsaWIvdXRpbHMuanMiLCJsaWIvdmlldy5qcyIsIndlYmNvbXBvbmVudHMvei1ibG9jay5qcyIsIndlYmNvbXBvbmVudHMvei1saW5rLmpzIiwid2ViY29tcG9uZW50cy96LXBvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMnKTtcbnZhciBlbmdpbmUgPSByZXF1aXJlKCcuL2VuZ2luZScpO1xudmFyIGVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9yJyk7XG52YXIgc3RvcmFnZSA9IHJlcXVpcmUoJy4vc3RvcmFnZScpO1xudmFyIGh0dHAgPSByZXF1aXJlKCcuL2h0dHAnKTtcbi8vIGltcG9ydCB2aWV3IG1vZHVsZSBzbyB0aGF0IGl0cyBnbG9iYWxzIGFyZSBkZWZpbmVkLlxudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcblxudmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcblxudmFyIGV4cG9ydHMgPSB7fTtcblxuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbW1hbmRzLmluaXQoKTtcbiAgICBlbmdpbmUuaW5pdCgpO1xuICAgIGVkaXRvci5pbml0KCk7XG4gICAgdmlldy5pbml0KCk7XG4gICAgZ2xvYmFsLmh0dHAgPSBodHRwO1xuICAgIC8vIExvYWQgYSBwYXRjaCBhcyBhbiBleGFtcGxlLlxuICAgIHN0b3JhZ2UubG9hZFBhdGNoKCdodHRwJywgJ3BhdGNoZXMvbWFpbi56ZWQnKTtcbn07XG5leHBvcnRzLnZpZXcgPSB2aWV3O1xuZXhwb3J0cy5jb21tYW5kcyA9IGNvbW1hbmRzO1xuXG4vLyBUaGlzIG1vZHVsZSBpcyB0byBiZSB1c2VkIGZyb20gdGhlIGdsb2JhbCBuYW1lc3BhY2UgKGkuZS4gZnJvbSBhcHAuaHRtbCkuXG5nbG9iYWwuYXBwID0gZXhwb3J0cztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgTW91c2V0cmFwICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHRlcm1pbmFsID0gcmVxdWlyZSgnLi90ZXJtaW5hbCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgY29tbWFuZHMgPSB7fTtcblxuY29tbWFuZHMucHJldiA9IGVkaXRvci5vZmZzZXRDdXJyZW50LmJpbmQobnVsbCwgLTEpO1xuY29tbWFuZHMubmV4dCA9IGVkaXRvci5vZmZzZXRDdXJyZW50LmJpbmQobnVsbCwgMSk7XG5jb21tYW5kcy5hZGQgPSBlZGl0b3IuYWRkO1xuY29tbWFuZHMucmVtb3ZlID0gZWRpdG9yLnJlbW92ZTtcbmNvbW1hbmRzLmlucHV0cyA9IGVkaXRvci5wb3J0LmJpbmQobnVsbCwgJ2lucHV0Jyk7XG5jb21tYW5kcy5vdXRwdXRzID0gZWRpdG9yLnBvcnQuYmluZChudWxsLCAnb3V0cHV0Jyk7XG5jb21tYW5kcy5ibG9jayA9IGVkaXRvci5ibG9jaztcbmNvbW1hbmRzLmZpcmUgPSBlZGl0b3IuZmlyZTtcbmNvbW1hbmRzLnNldCA9IGVkaXRvci5zZXQ7XG5jb21tYW5kcy5tb3ZlID0gZWRpdG9yLm1vdmU7XG5jb21tYW5kcy5vZmZzZXQgPSBlZGl0b3IubW92ZUJ5O1xuY29tbWFuZHMuY2xlYXIgPSBlZGl0b3IuY2xlYXJBbGw7XG5cblxudmFyIGVkaXRCbG9jayA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdlc2MnLCBjb21tYW5kcy5lc2NhcGUpO1xuICAgIGJsb2NrLmNvbnRlbnQuZm9jdXMoKTtcbn07XG5jb21tYW5kcy5lZGl0QmxvY2sgPSBlZGl0QmxvY2s7XG5cbmNvbW1hbmRzLmVkaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgZWRpdEJsb2NrKGJsb2NrKTtcbiAgICAgICAgZWRpdG9yLnN0b3BCbGlua2luZygpO1xuICAgICAgICAvLyBQcmV2ZW50IGRlZmF1bHQgd2hlbiB0aGlzIGZ1bmN0aW9uIGlzIHVzZWQgd2l0aCBNb3VzdHJhcC5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmNvbW1hbmRzLmFkZEJ1dHRvbiA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ2J1dHRvbicsICdnbycsIDAsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZFNjcmlwdCA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ3NjcmlwdCcsICdpbjEgKyAyJywgMSwgMSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuY29tbWFuZHMuYWRkVGV4dCA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ3NwYW4nLCAnZW1wdHknLCAxLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGROdW1iZXIgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnemVkJywgJ251bWJlcicsICc0MicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZENvbW1lbnQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdjb21tZW50JywgJ0NvbW1lbnQnLCAwLCAwLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG52YXIgYmluZEtleXNGb3JNYWluTW9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSycsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDAsIC0xMCkpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdKJywgY29tbWFuZHMub2Zmc2V0LmJpbmQobnVsbCwgMCwgMTApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIC0xMCwgMCkpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdMJywgY29tbWFuZHMub2Zmc2V0LmJpbmQobnVsbCwgMTAsIDApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaycsIGNvbW1hbmRzLnByZXYpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdqJywgY29tbWFuZHMubmV4dCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgbicsIGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdOZXcnKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBiJywgY29tbWFuZHMuYWRkQnV0dG9uKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHMnLCBjb21tYW5kcy5hZGRTY3JpcHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggdCcsIGNvbW1hbmRzLmFkZFRleHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggbicsIGNvbW1hbmRzLmFkZE51bWJlcik7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBjJywgY29tbWFuZHMuYWRkQ29tbWVudCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ3InLCBjb21tYW5kcy5yZW1vdmUpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdpJywgY29tbWFuZHMuaW5wdXRzKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnbycsIGNvbW1hbmRzLm91dHB1dHMpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdiJywgY29tbWFuZHMuYmxvY2spO1xuICAgIE1vdXNldHJhcC5iaW5kKCdjJywgY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnbCcsIGNvbW1hbmRzLmxpbmspO1xuICAgIE1vdXNldHJhcC5iaW5kKCdnJywgY29tbWFuZHMuZ29Ub0Jsb2NrKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZScsIGNvbW1hbmRzLmVkaXQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdzcGFjZScsIGNvbW1hbmRzLmZpcmUpO1xufTtcbmNvbW1hbmRzLmJpbmRLZXlzRm9yTWFpbk1vZGUgPSBiaW5kS2V5c0Zvck1haW5Nb2RlO1xuXG5jb21tYW5kcy5lc2NhcGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBjdXJyZW50bHlFZGl0aW5nRWxlbWVudCA9IHV0aWxzLmRvbS5nZXRTZWxlY3Rpb25TdGFydCgpO1xuICAgICAgICBpZiAoY3VycmVudGx5RWRpdGluZ0VsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGN1cnJlbnRseUVkaXRpbmdFbGVtZW50LmJsdXIoKTtcbiAgICAgICAgICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH1cbn07XG5cbnZhciBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGIpIHtcbiAgICAgICAgYi5jbGFzc0xpc3QudG9nZ2xlKCdkZS1lbXBoYXNpcycpO1xuICAgIH0pO1xufTtcblxudmFyIGhpZGVBbGxLZXlzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgW10uZm9yRWFjaC5jYWxsKGVsZW1lbnRzLCBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBlbGVtZW50LmhpZGVLZXkoKTtcbiAgICB9KTtcbiAgICBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzKCk7XG59O1xuXG52YXIgZmlyc3RQb3J0O1xudmFyIHNlbGVjdFBvcnQgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIGlmIChmaXJzdFBvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaXJzdFBvcnQgPSBwb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwb3J0LmNvbm5lY3RhYmxlKHBvcnQsIGZpcnN0UG9ydCkpIHtcbiAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBmaXJzdFBvcnQpO1xuICAgICAgICAgICAgZmlyc3RQb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHBvcnRUb0xpbmtUbztcbmNvbW1hbmRzLmxpbmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBrZXlzID0gdXRpbHMuY3JlYXRlS2V5c0dlbmVyYXRvcigpO1xuICAgICAgICBmaXJzdFBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgICAgICB2YXIgcG9ydHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICAgICAgcG9ydC5rZXkgPSBrZXk7XG4gICAgICAgICAgICBwb3J0LnNob3dLZXkoKTtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCcnKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBNb3VzZXRyYXAuYmluZChrZXksIHNlbGVjdFBvcnQuYmluZChudWxsLCBwb3J0KSk7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwb3J0ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAocG9ydFRvTGlua1RvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8gPSBwb3J0O1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY29ubmVjdGFibGUocG9ydCwgcG9ydFRvTGlua1RvKSkge1xuICAgICAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBwb3J0VG9MaW5rVG8pO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHBvcnQ7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soYmxvY2spO1xuICAgIGhpZGVBbGxLZXlzKCd6LWJsb2NrJyk7XG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xufTtcblxuY29tbWFuZHMuZ29Ub0Jsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwoYmxvY2tzLCBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICBibG9jay5rZXkgPSBrZXk7XG4gICAgICAgIGJsb2NrLnNob3dLZXkoKTtcbiAgICAgICAgLy8gQ29udmVydCAnYWFlJyBpbnRvICdhIGEgZScuXG4gICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZChrZXksIHNldEN1cnJlbnRCbG9ja0FuZEJhY2tUb01haW5Nb2RlLmJpbmQobnVsbCwgYmxvY2spKTtcbiAgICAgICAgaW5kZXgrKztcbiAgICB9KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBoaWRlQWxsS2V5cygnei1ibG9jaycpO1xuICAgICAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgfSk7XG4gICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xufTtcblxuLy8gU2V0IGEgbmV3IHN0b3BDYWxsYmFjayBmb3IgTW91c3RyYXAgdG8gYXZvaWQgc3RvcHBpbmcgd2hlbiB3ZSBzdGFydFxuLy8gZWRpdGluZyBhIGNvbnRlbnRlZGl0YWJsZSwgc28gdGhhdCB3ZSBjYW4gdXNlIGVzY2FwZSB0byBsZWF2ZSBlZGl0aW5nLlxuTW91c2V0cmFwLnN0b3BDYWxsYmFjayA9IGZ1bmN0aW9uKGUsIGVsZW1lbnQsIGNvbWJvKSB7XG4gICAgLy8gaWYgdGhlIGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBcIm1vdXNldHJhcFwiIHRoZW4gbm8gbmVlZCB0byBzdG9wXG4gICAgaWYgKCgnICcgKyBlbGVtZW50LmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignIG1vdXNldHJhcCAnKSA+IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAgLy8gc3RvcCBmb3IgaW5wdXQsIHNlbGVjdCwgYW5kIHRleHRhcmVhXG4gICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQSc7XG4gfTtcblxuY29tbWFuZHMuc2F2ZSA9IHN0b3JhZ2Uuc2F2ZVBhdGNoO1xuY29tbWFuZHMubG9hZCA9IHN0b3JhZ2UubG9hZFBhdGNoO1xuY29tbWFuZHMucm0gPSBzdG9yYWdlLnJlbW92ZVBhdGNoO1xuY29tbWFuZHMubGlzdCA9IHN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcztcbmNvbW1hbmRzLmxzID0gc3RvcmFnZS5nZXRQYXRjaE5hbWVzO1xuXG52YXIgdGVybWluYWxPbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG59O1xuXG52YXIgdGVybTtcbnZhciBpbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB0ZXJtID0gdGVybWluYWwuY3JlYXRlKGNvbW1hbmRzLCB0ZXJtaW5hbE9uYmx1cik7XG4gICAgLy8gVW5wbHVnIHRoZSBpbml0IGZ1bmN0aW9uIHNvIHRoYXQgaXQgd29uJ3QgYmUgdXNlZCBhcyBhIGNvbW1hbmQgZnJvbSB0aGVcbiAgICAvLyB0ZXJtaW5hbC5cbiAgICBkZWxldGUgY29tbWFuZHMuaW5pdDtcbn07XG5jb21tYW5kcy5pbml0ID0gaW5pdDtcblxuY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHRlcm0uZm9jdXMoKTtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBlZGl0b3Iuc3RvcEJsaW5raW5nKCk7XG59O1xuXG4vLyBUT0RPIGNyZWF0ZSBhIHRlcm0ud3JpdGUobXVsdGlMaW5lU3RyaW5nKSBhbmQgdXNlIGl0LlxuY29tbWFuZHMuaGVscCA9IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgaWYgKHN1YmplY3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ1ByZXNzIEVzYyB0byBsZWF2ZSB0aGUgY29tbWFuZCBsaW5lIGFuZCBnbyBiYWNrIHRvIG5vcm1hbCBtb2RlLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0NvbW1hbmRzOiBuZXh0LCBwcmV2LCByZW1vdmUsIGFkZCwgc2V0IGNvbnRlbnQsIG1vdmUsIG9mZnNldCcpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2xzLCBsb2FkLCBzYXZlLCBjbGVhciBhbmQgcm0uJyk7XG4gICAgfSBlbHNlIGlmIChzdWJqZWN0ID09PSAnYWRkJykge1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0FkZCBhIG5ldyBibG9jayBqdXN0IGJlbG93IHRoZSBjdXJyZW50IGJsb2NrLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2FkZCBodG1sIDx3aGF0PiA8Y29udGVudD4gPG5iIGlucHV0cz4gPG5iIG91dHB1dHM+Jyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICA8d2hhdD4gICAgaXMgZWl0aGVyIFwiYnV0dG9uXCIsIFwic2NyaXB0XCIsIFwidGV4dFwiLCBcIm51bWJlclwiIG9yIGEgSFRNTCB0YWcuJyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICA8Y29udGVudD4gaXMgdGhlIGNvbnRlbnQgb2YgdGhlIGJsb2NrIChpLmUuIHRoZSBidXR0b24gbmFtZSwgdGhlJyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICAgICAgICAgICAgc2NyaXB0IGNvZGUsIHRoZSB0ZXh0IG9yIG51bWJlciB2YWx1ZSwgZXRjLikuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdObyBoZWxwIGZvciBcIicgKyBzdWJqZWN0ICsgJ1wiLicpO1xuICAgIH1cbn07XG5cbmNvbW1hbmRzLm1lc3NhZ2UgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI21lc3NhZ2UnKS5pbm5lckhUTUwgPSBzdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVuZ2luZSA9IHJlcXVpcmUoJy4vZW5naW5lJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlZGl0b3IgPSB7fTtcblxuZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuXG5lZGl0b3IuZ2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5nZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1wb3J0LmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5zZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgdmFyIG1lc3NhZ2UgPSAnJztcbiAgICBpZiAoYmxvY2suZXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtZXNzYWdlID0gYmxvY2suZXJyb3IubWVzc2FnZTtcbiAgICB9XG4gICAgLy8gVE9ETyBIZXJlIHdlIHVzZSBnbG9iYWwgaW5zdGVhZCBvZiByZXF1aXJlKCdjb21tYW5kcycpIGJlY2F1c2Ugb2YgY3ljbGljXG4gICAgLy8gZGVwZW5kZW5jaWVzLlxuICAgIHdpbmRvdy5hcHAuY29tbWFuZHMubWVzc2FnZShtZXNzYWdlKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICB9XG59O1xuLy8gVE9ETyBub3QgaW4gdGhlIHdpbmRvdyBuYW1lc3BhY2VcbndpbmRvdy5zZXRDdXJyZW50QmxvY2sgPSBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrO1xuXG5lZGl0b3Iuc2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgcG9ydC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnRCbG9jayA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWxlbWVudHNbaV0gPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IChlbGVtZW50cy5sZW5ndGggKyBpICsgb2Zmc2V0KSAlIGVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soZWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgIHZhciBlbGVtZW50cyA9IGN1cnJlbnQuYmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LicgKyBlZGl0b3IuY29udGV4dCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWxlbWVudHNbaV0gPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IChlbGVtZW50cy5sZW5ndGggKyBpICsgb2Zmc2V0KSAlIGVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChlbGVtZW50c1tpbmRleF0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2sob2Zmc2V0KTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnIHx8IGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQob2Zmc2V0KTtcbiAgICB9XG59O1xuXG5lZGl0b3IuY3JlYXRlQmxvY2tFbGVtZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQsIG5JbnB1dHMsIG5PdXRwdXRzLCB0b3AsIGxlZnQpIHtcbiAgICB2YXIgcGF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF0Y2gnKTtcbiAgICBjb250ZW50ID0gW1xuICAgICAgICAnPHotcG9ydCBjbGFzcz1cImlucHV0XCI+PC96LXBvcnQ+Jy5yZXBlYXQobklucHV0cyksXG4gICAgICAgIGNvbnRlbnQsXG4gICAgICAgICc8ei1wb3J0IGNsYXNzPVwib3V0cHV0XCI+PC96LXBvcnQ+Jy5yZXBlYXQobk91dHB1dHMpXG4gICAgXS5qb2luKCcnKTtcbiAgICB2YXIgaHRtbFN0cmluZyA9ICc8ei1ibG9jaz4nICsgY29udGVudCArICc8L3otYmxvY2s+JztcbiAgICB2YXIgZnJhZ21lbnQgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFN0cmluZyk7XG4gICAgdmFyIGJsb2NrID0gZnJhZ21lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jaycpO1xuXG4gICAgdmFyIGRlZmF1bHRUb3AgPSAwO1xuICAgIHZhciBkZWZhdWx0TGVmdCA9IDA7XG4gICAgdmFyIGN1cnJlbnRCbG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoY3VycmVudEJsb2NrICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihjdXJyZW50QmxvY2ssIGN1cnJlbnRCbG9jay5wYXJlbnROb2RlKTtcbiAgICAgICAgZGVmYXVsdFRvcCA9IHBvc2l0aW9uLnkgKyBjdXJyZW50QmxvY2suZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgMjM7XG4gICAgICAgIGRlZmF1bHRMZWZ0ID0gcG9zaXRpb24ueDtcbiAgICB9XG4gICAgYmxvY2suc3R5bGUudG9wID0gdG9wIHx8IGRlZmF1bHRUb3AgKyAncHgnO1xuICAgIGJsb2NrLnN0eWxlLmxlZnQgPSBsZWZ0IHx8IGRlZmF1bHRMZWZ0ICsgJ3B4JztcblxuICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soYmxvY2spO1xuICAgIHBhdGNoLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICByZXR1cm4gYmxvY2s7XG59O1xuXG5lZGl0b3IuYWRkQmxvY2sgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciB6ZUNsYXNzID0gJyc7XG4gICAgaWYgKGFyZ3NbMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHR5cGUgPSAnaHRtbCc7XG4gICAgICAgIGFyZ3NbMV0gPSAnc3Bhbic7XG4gICAgICAgIHplQ2xhc3MgPSAnemVkLW51bWJlcic7XG4gICAgfVxuICAgIHZhciBibG9ja0NsYXNzID0gYXJnc1sxXTtcbiAgICBpZiAodHlwZSA9PT0gJ2h0bWwnKSB7XG4gICAgICAgIHZhciB0YWdOYW1lID0gYXJnc1sxXTtcbiAgICAgICAgaWYgKGFyZ3NbMV0gPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgdGFnTmFtZSA9ICdzcGFuJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29udGVudCA9IGFyZ3NbMl07XG4gICAgICAgIHZhciBuZXdDb250ZW50ID0gJzwnICsgdGFnTmFtZSArICcgY2xhc3M9XCJ6ZS1jb250ZW50ICcgKyB6ZUNsYXNzICsgJ1wiIGNvbnRlbnRlZGl0YWJsZT4nICsgY29udGVudCArICc8LycgKyB0YWdOYW1lICsgJz4nO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSAnPHNjcmlwdCBjbGFzcz1cInplLWNvbnRlbnRcIiB0eXBlPVwiYXBwbGljYXRpb24veC1wcmV2ZW50LXNjcmlwdC1leGVjdXRpb24tb25sb2FkXCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazt3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XCIgY29udGVudGVkaXRhYmxlIG9uaW5wdXQ9XCJjb21waWxlU2NyaXB0KHRoaXMpXCI+JyArIGNvbnRlbnQgKyAnPC9zY3JpcHQ+JztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSAnPGJ1dHRvbiBvbmNsaWNrPVwic2VuZEV2ZW50VG9PdXRwdXRQb3J0KHRoaXMpXCIgY2xhc3M9XCJ6ZS1jb250ZW50XCIgY29udGVudGVkaXRhYmxlPicgKyBjb250ZW50ICsgJzwvYnV0dG9uPic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWVbMF0gPT09ICc8Jykge1xuICAgICAgICAgICAgLy8gQWN0dWFsbHkgdGFnTmFtZSBjb250YWlucyBhIEhUTUwgc3RyaW5nLlxuICAgICAgICAgICAgbmV3Q29udGVudCA9IHRhZ05hbWU7XG4gICAgICAgICAgICBibG9ja0NsYXNzID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MsIDIpO1xuICAgICAgICBhcmdzWzBdID0gbmV3Q29udGVudDtcbiAgICB9XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmNyZWF0ZUJsb2NrRWxlbWVudC5hcHBseShudWxsLCBhcmdzKTtcbiAgICBpZiAoYmxvY2tDbGFzcyAhPT0gJycpIHtcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZShibG9ja0NsYXNzKTtcbiAgICB9XG59O1xuXG5lZGl0b3IuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJyZW50O1xuICAgIHZhciBwb3J0O1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICBlZGl0b3IuYWRkQmxvY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnKSB7XG4gICAgICAgIGN1cnJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICAgICAgcG9ydCA9IGN1cnJlbnQuYWRkUG9ydCgnPHotcG9ydCBjbGFzcz1cImlucHV0XCI+PC96LXBvcnQ+Jyk7XG4gICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChwb3J0KTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICBjdXJyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgICAgIHBvcnQgPSBjdXJyZW50LmFkZFBvcnQoJzx6LXBvcnQgY2xhc3M9XCJvdXRwdXRcIj48L3otcG9ydD4nKTtcbiAgICAgICAgZWRpdG9yLnNldEN1cnJlbnRQb3J0KHBvcnQpO1xuICAgIH1cbn07XG5cbmVkaXRvci5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGVjdGVkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNlbGVjdGVkJyk7XG4gICAgaWYgKHNlbGVjdGVkICE9PSBudWxsICYmIHNlbGVjdGVkLnRhZ05hbWUgPT09ICdaLUxJTksnKSB7XG4gICAgICAgIHZhciBsaW5rID0gc2VsZWN0ZWQ7XG4gICAgICAgIGxpbmsudW5jb25uZWN0KCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2soMSk7XG4gICAgICAgIGJsb2NrLnVucGx1ZygpO1xuICAgICAgICBibG9jay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGJsb2NrKTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnIHx8IGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICB2YXIgcG9ydCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQoMSk7XG4gICAgICAgIHBvcnQudW5wbHVnKCk7XG4gICAgICAgIHBvcnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwb3J0KTtcbiAgICB9XG59O1xuXG52YXIgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCA9IGZ1bmN0aW9uIChlbGVtZW50VGFnTmFtZSwgb25Pck9mZikge1xuICAgIHZhciBjbGFzc05hbWUgPSAnY3VycmVudCc7XG4gICAgaWYgKG9uT3JPZmYgPT09ICdvbicpIHtcbiAgICAgICAgY2xhc3NOYW1lICs9ICctb2ZmLWNvbnRleHQnO1xuICAgIH1cbiAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudFRhZ05hbWUgKyAnLicgKyBjbGFzc05hbWUpO1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xufTtcblxuZWRpdG9yLnBvcnQgPSBmdW5jdGlvbiAoaW5wdXRPck91dHB1dCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCAhPT0gJ2Jsb2NrJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2suY3VycmVudCAqIHotcG9ydC4nICsgaW5wdXRPck91dHB1dCwgJ29uJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YXIgcG9ydCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCAqIHotcG9ydC4nICsgaW5wdXRPck91dHB1dCk7XG4gICAgICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwb3J0LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrJywgJ29mZicpO1xuICAgIGVkaXRvci5jb250ZXh0ID0gaW5wdXRPck91dHB1dDtcbn07XG5cbmVkaXRvci5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICBlZGl0b3IuY29udGV4dCA9ICdibG9jayc7XG4gICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jaycsICdvbicpO1xuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otcG9ydC5pbnB1dCcsICdvZmYnKTtcbiAgICB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1wb3J0Lm91dHB1dCcsICdvZmYnKTtcbiAgICB9IGNhdGNoKGUpIHt9XG59O1xuXG5lZGl0b3IuZmlyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICB2YXIgY29udGVudCA9IGJsb2NrLmNvbnRlbnQ7XG4gICAgICAgIGlmIChjb250ZW50LnRhZ05hbWUgPT09ICdCVVRUT04nKSB7XG4gICAgICAgICAgICBlbmdpbmUuc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnRlbnQudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICAgIGVuZ2luZS5maXJlRXZlbnQyKGJsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbiBjYXNlIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGFzIGEgcmVzdWx0IG9mIGFuIGV2ZW50IChzYXksIHNwYWNlXG4gICAgICAgIC8vIGtleSBwcmVzcykgd2UgcHJldmVudCBkZWZhdWx0IGV2ZW50IGJlaGF2aW91ciAoc2F5IHNjcm9sbCBkb3duIGZvclxuICAgICAgICAvLyBzcGFjZSBiYXIpLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuZWRpdG9yLnNldCA9IGZ1bmN0aW9uICh0YXJnZXQsIHZhbHVlKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICAgICAgYmxvY2suY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5tb3ZlID0gZnVuY3Rpb24gKGxlZnQsIHRvcCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGN1cnJlbnQuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICBjdXJyZW50LnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICBjdXJyZW50LnJlZHJhdygpO1xufTtcblxuZWRpdG9yLm1vdmVCeSA9IGZ1bmN0aW9uIChsZWZ0T2Zmc2V0LCB0b3BPZmZzZXQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICB2YXIgdG9wID0gTnVtYmVyKGN1cnJlbnQuc3R5bGUudG9wLnNsaWNlKDAsIC0yKSkgKyBOdW1iZXIodG9wT2Zmc2V0KTtcbiAgICB2YXIgbGVmdCA9IE51bWJlcihjdXJyZW50LnN0eWxlLmxlZnQuc2xpY2UoMCwgLTIpKSArIE51bWJlcihsZWZ0T2Zmc2V0KTtcbiAgICBlZGl0b3IubW92ZShsZWZ0LCB0b3ApO1xufTtcblxuZWRpdG9yLnN0YXJ0QmxpbmtpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChibG9jayAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoYmxvY2suY2xhc3NMaXN0LmNvbnRhaW5zKCdzdG9wLWJsaW5raW5nJykpIHtcbiAgICAgICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoJ3N0b3AtYmxpbmtpbmcnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5zdG9wQmxpbmtpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmICghYmxvY2suY2xhc3NMaXN0LmNvbnRhaW5zKCdzdG9wLWJsaW5raW5nJykpIHtcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnc3RvcC1ibGlua2luZycpO1xuICAgIH1cbn07XG5cbnZhciBibGlua0N1cnNvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnNvci1kaXNwbGF5ZWQnKTtcbiAgICB9XG4gICAgd2luZG93LnNldFRpbWVvdXQoYmxpbmtDdXJzb3IsIDEwMDApO1xufTtcblxuZWRpdG9yLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgYmxpbmtDdXJzb3IoKTtcbn07XG5cbmVkaXRvci5jbGVhckFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIF8uZWFjaChibG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBibG9jay51bnBsdWcoKTtcbiAgICAgICAgYmxvY2sucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChibG9jayk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLmlubmVySFRNTCA9ICcnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0b3I7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG4vKmdsb2JhbCBfICovXG5cbi8qZ2xvYmFsIGdldEVsZW1lbnRCbG9jayAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVuZ2luZSA9IHt9O1xuXG5lbmdpbmUuY29tcGlsZVNjcmlwdCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdmFyIHN0cmluZyA9IGVsZW1lbnQudGV4dDtcbiAgICBzdHJpbmcgPSB1dGlscy5nZXRTY3JpcFN0cmluZ3RXaXRoTmV3bGluZXMoZWxlbWVudCk7XG4gICAgdmFyIHNjcmlwdDtcbiAgICB2YXIgY29tcGlsZWQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gSW4gY2FzZSBzY3JpcHQgaXMgYW4gZXhwcmVzc2lvbi5cbiAgICAgICAgdmFyIG1heWJlRXhwcmVzc2lvbiA9IHN0cmluZztcbiAgICAgICAgc2NyaXB0ID0gJ3JldHVybiAoJyArIG1heWJlRXhwcmVzc2lvbiArICcpOyc7XG4gICAgICAgIGNvbXBpbGVkID0gbmV3IEZ1bmN0aW9uKCdzZW5kVG9PdXRwdXQnLCAnZGVzdDEnLCAnaW4xJywgJ2luMicsICdpbjMnLCAnaW40JywgJ2luNScsIHNjcmlwdCk7XG4gICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICB9IGNhdGNoIChlMSkge1xuICAgICAgICAvLyBDb21waWxhdGlvbiBmYWlsZWQgdGhlbiBpdCBpc24ndCBhbiBleHByZXNzaW9uLiBUcnkgYXMgYVxuICAgICAgICAvLyBmdW5jdGlvbiBib2R5LlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2NyaXB0ID0gc3RyaW5nO1xuICAgICAgICAgICAgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24oJ3NlbmRUb091dHB1dCcsICdkZXN0MScsICdpbjEnLCAnaW4yJywgJ2luMycsICdpbjQnLCAnaW41Jywgc2NyaXB0KTtcbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gTm90IGEgZnVuY3Rpb24gYm9keSwgc3RyaW5nIGlzIG5vdCB2YWxpZC5cbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZSkge1xuICAgIHZhciBibG9jayA9IGdldEVsZW1lbnRCbG9jayhlbGVtZW50KTtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5wb3J0cy5vdXRwdXRzO1xuICAgIGlmIChwb3J0cykge1xuICAgICAgICBpZiAocG9ydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgcG9ydCA9IHBvcnRzWzBdO1xuICAgICAgICAgICAgcG9ydC5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB2YWx1ZSBpcyBhbiBhcnJheSBvZiB2YWx1ZXMuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWU7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciB6ZVZhbHVlID0gdmFsdWVzW2luZGV4XTtcbiAgICAgICAgICAgICAgICBwb3J0LmxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgemVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgYmxvY2sgPSBnZXRFbGVtZW50QmxvY2soZWxlbWVudCk7XG4gICAgdmFyIHBvcnQgPSBibG9jay5wb3J0cy5vdXRwdXRzWzBdO1xuICAgIHZhciBjb250ZW50O1xuICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBsaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgIHZhciBsaW5rID0gbGlua3NbMF07XG4gICAgICAgIGlmIChsaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xufTtcblxuLy8gVE9ETyBjaGFuZ2UgbmFtZS5cbmVuZ2luZS5maXJlRXZlbnQyID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnaGFzLWV4ZWN1dGlvbi1lcnJvcicpKSB7XG4gICAgICAgIHRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCdoYXMtZXhlY3V0aW9uLWVycm9yJyk7XG4gICAgfVxuICAgIHZhciBjb250ZW50ID0gdGFyZ2V0LmNvbnRlbnQ7XG4gICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWU7XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgdmFyIGRhdGFQb3J0cyA9IHRhcmdldC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKTtcbiAgICAgICAgdmFyIGlucHV0cyA9IFtdO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwoZGF0YVBvcnRzLCBmdW5jdGlvbiAoZGF0YVBvcnQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhTGlua3MgPSBkYXRhUG9ydCA9PT0gbnVsbCA/IFtdIDogZGF0YVBvcnQubGlua3M7XG5cbiAgICAgICAgICAgIGlmIChkYXRhTGlua3MubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGFMaW5rID0gXy5maW5kKGRhdGFMaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSBsaW5rLmJlZ2luLnBvcnQuYmxvY2suY29udGVudC50YWdOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhZyAhPT0gJ0JVVFRPTic7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YUxpbms7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFMaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBkYXRhTGluay5iZWdpbi5wb3J0LmJsb2NrLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai52YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnU1BBTicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5pbm5lckhUTUw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jbGFzc0xpc3QuY29udGFpbnMoJ3plZC1udW1iZXInKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvYmoudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5leGVjdXRpb25SZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5wdXRzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbmV4dEFjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBhcmd1bWVudHNbMF0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZmlyc3REZXN0aW5hdGlvbkNvbnRlbnQgPSBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50KGNvbnRlbnQpO1xuXG4gICAgICAgIHZhciB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICBpZiAodGhlU2NyaXB0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBpbGVTY3JpcHQoY29udGVudCk7XG4gICAgICAgICAgICB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGVTY3JpcHQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0Vycm9yIGluIHNjcmlwdC4gQWJvcnRpbmcuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBhcmdzLnB1c2gobmV4dEFjdGlvbik7XG4gICAgICAgIGFyZ3MucHVzaChmaXJzdERlc3RpbmF0aW9uQ29udGVudCk7XG4gICAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChpbnB1dHMpO1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0YXJnZXQuZXJyb3IgPSB7XG4gICAgICAgICAgICBtZXNzYWdlOiAnJ1xuICAgICAgICB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhlU2NyaXB0LmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLWV4ZWN1dGlvbi1lcnJvcicpO1xuICAgICAgICAgICAgbWVzc2FnZSA9ICdleGVjdXRpb24gZXJyb3Igb24gbGluZSAnICsgZS5saW5lTnVtYmVyICsgJzogJyArIGUubWVzc2FnZTtcbiAgICAgICAgICAgIHRhcmdldC5lcnJvci5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjdXJyZW50JykpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYXBwLmNvbW1hbmRzLm1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlc3VsdCBmb3IgZnV0dXJlIHVzZS5cbiAgICAgICAgICAgIGNvbnRlbnQuZXhlY3V0aW9uUmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ05VTUJFUicpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ0RJVicgfHwgdGFnTmFtZSA9PT0gJ1NQQU4nKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSBjb250ZW50LmlubmVySFRNTDtcbiAgICAgICAgfVxuICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgdmFsdWUpO1xuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnSU5QVVQnKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGFyZ2V0LnJlZHJhdygpO1xufTtcblxuZW5naW5lLmZpcmVFdmVudCA9IGZ1bmN0aW9uIChsaW5rLCB2YWx1ZSkge1xuICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgIGlmICh0YXJnZXQucG9ydHMuaW5wdXRzWzBdID09PSBsaW5rLmVuZC5wb3J0KSB7XG4gICAgICAgIC8vIE9ubHkgYWN0dWFsbHkgZmlyZSB0aGUgYmxvY2sgb24gaXRzIGZpcnN0IGlucHV0IHBvcnQuXG4gICAgICAgIGZpcmVFdmVudDIodGFyZ2V0LCB2YWx1ZSk7XG4gICAgfVxufTtcblxuZW5naW5lLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LmNvbXBpbGVTY3JpcHQgPSBlbmdpbmUuY29tcGlsZVNjcmlwdDtcbiAgICB3aW5kb3cuc2VuZEV2ZW50VG9PdXRwdXRQb3J0ID0gZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydDtcbiAgICB3aW5kb3cuZmlyZUV2ZW50MiA9IGVuZ2luZS5maXJlRXZlbnQyO1xuICAgIHdpbmRvdy5maXJlRXZlbnQgPSBlbmdpbmUuZmlyZUV2ZW50O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbmdpbmU7XG4iLCIvLyBUaGUgcGxhY2UgdG8gcG9sbHV0ZSBnbG9iYWwgbmFtZXNwYWNlLlxuXG4ndXNlIHN0cmljdCc7XG5cbndpbmRvdy5sb2FkU2NyaXB0ID0gZnVuY3Rpb24gKHVybClcbntcbiAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnNldEF0dHJpYnV0ZSgndHlwZScsJ3RleHQvamF2YXNjcmlwdCcpO1xuICAgIHNjcmlwdC5zZXRBdHRyaWJ1dGUoJ3NyYycsIHVybCk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbn07XG4iLCJ2YXIgaHR0cCA9IHt9O1xuXG5odHRwLmdldCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsKTtcblxuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0LnN0YXR1c1RleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIGVycm9yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBodHRwO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuLypnbG9iYWwgd2luZG93ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHNlbGVjdG9yID0ge1xuICAgIHNldFNlbGVjdGFibGU6IGZ1bmN0aW9uIChlbGVtZW50LCB3aXRoU3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IHRoaXM7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHNlbGVjdG9yLmFjdGlvbihlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICh3aXRoU3RvcFByb3BhZ2F0aW9uICE9PSB1bmRlZmluZWQgJiYgd2l0aFN0b3BQcm9wYWdhdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29ubmVjdGFibGU6IGZ1bmN0aW9uIChlbGVtZW50MSwgZWxlbWVudDIpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQxLmNvbm5lY3RhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50MS5jb25uZWN0YWJsZShlbGVtZW50MSwgZWxlbWVudDIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgYWN0aW9uOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25uZWN0YWJsZSh0aGlzLnNlbGVjdGVkLCBlbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY29ubmVjdCh0aGlzLnNlbGVjdGVkLCBlbGVtZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gZWxlbWVudDtcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bnNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdG9yO1xuLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxuZ2xvYmFsLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4iLCJcbi8qZ2xvYmFsIHdpbmRvdyAqL1xuLypnbG9iYWwgZG9jdW1lbnQgKi9cblxuLypnbG9iYWwgXyAqL1xuXG4vKmdsb2JhbCBjb21tYW5kcyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHN0b3JhZ2UgPSB7fTtcblxuZnVuY3Rpb24gZXhwb3J0UGF0Y2ggKCkge1xuICAgIHZpZXcuc3dpdGNoTW9kZSgnZWRpdCcpO1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otYmxvY2snKTtcbiAgICB2YXIgcGF0Y2ggPSB7fTtcbiAgICBwYXRjaC5ibG9ja3MgPSBbXTtcbiAgICBwYXRjaC5saW5rcyA9IFtdO1xuICAgIF8uZWFjaChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQsIGluZGV4KSB7XG4gICAgICAgIHZhciBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudC1jb250YWluZXInKS5pbm5lckhUTUwudHJpbSgpO1xuICAgICAgICB2YXIgY29udGVudCA9IGVsZW1lbnQuY29udGVudDtcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjb21tZW50JykpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSAnY29tbWVudCc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlID0gY29udGVudC52YWx1ZSB8fCBjb250ZW50LmlubmVySFRNTCB8fCAnJztcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRlbnQuaW5uZXJIVE1MO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHV0aWxzLmdldFNjcmlwU3RyaW5ndFdpdGhOZXdsaW5lcyhjb250ZW50KTtcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXJJbm5lckhUTUwgPSAnJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5wdXRQb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0Jyk7XG4gICAgICAgIHZhciBvdXRwdXRQb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpO1xuICAgICAgICBwYXRjaC5ibG9ja3MucHVzaCh7XG4gICAgICAgICAgICBpZDogaW5kZXgsXG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgICAgICAgICAgbklucHV0czogaW5wdXRQb3J0cy5sZW5ndGgsXG4gICAgICAgICAgICBuT3V0cHV0czogb3V0cHV0UG9ydHMubGVuZ3RoLFxuICAgICAgICAgICAgdG9wOiBlbGVtZW50LnN0eWxlLnRvcCxcbiAgICAgICAgICAgIGxlZnQ6IGVsZW1lbnQuc3R5bGUubGVmdCxcbiAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgaW5uZXJIVE1MOiBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcGhhbnRvbSA9IGNvbnRlbnQucGhhbnRvbWVkQnk7XG4gICAgICAgIGlmIChwaGFudG9tICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBoYW50b20uc2V0QXR0cmlidXRlKCdkYXRhLWluZGV4LXRvLXBoYW50b20nLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKGlucHV0UG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBwb3J0SW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBpbkxpbmtzID0gcG9ydC5saW5rcztcbiAgICAgICAgICAgIF8uZWFjaChpbkxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclBvcnQgPSBsaW5rLmJlZ2luLnBvcnQ7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2sgPSBvdGhlclBvcnQuYmxvY2s7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tJbmRleCA9IF8uaW5kZXhPZihlbGVtZW50cywgb3RoZXJCbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tQb3J0cyA9IG90aGVyQmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrUG9ydEluZGV4ID0gXy5pbmRleE9mKG90aGVyQmxvY2tQb3J0cywgb3RoZXJQb3J0KTtcbiAgICAgICAgICAgICAgICBwYXRjaC5saW5rcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrOiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHBvcnRJbmRleFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrOiBvdGhlckJsb2NrSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBvdGhlckJsb2NrUG9ydEluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBwYXRjaC5wcmVzZW50YXRpb24gPSB7fTtcbiAgICBwYXRjaC5wcmVzZW50YXRpb24uaW5uZXJIVE1MID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLmlubmVySFRNTDtcbiAgICB2YXIgcGhhbnRvbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbiAgICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgICAgIC8vIEZJWE1FIGRhdGEtaW5kZXgtdG8tcGhhbnRvbSBpbnN0ZWFkP1xuICAgICAgICBwaGFudG9tLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1waGFudG9tZWQtYmxvY2staWQnKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcGF0Y2g7XG59O1xuXG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG52YXIgY29ubmVjdEJsb2NrcyA9IGZ1bmN0aW9uKGVuZCwgc3RhcnQsIGlucHV0UG9ydFBvc2l0aW9uLCBvdXRwdXRQb3J0UG9zaXRpb24pIHtcbiAgICB2YXIgc3RhcnRQb3J0ID0gKHN0YXJ0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKSlbb3V0cHV0UG9ydFBvc2l0aW9uXTtcbiAgICB2YXIgZW5kUG9ydCA9IChlbmQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0JykpW2lucHV0UG9ydFBvc2l0aW9uXTtcbiAgICBpZiAoc3RhcnRQb3J0LmNvbm5lY3RhYmxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVE9ETyBjb25uZWN0YWJsZSB0YWtlcyBzb21lIHRpbWUgdG8gYmUgZGVmaW5lZC4gV2FpdCBmb3IgaXQuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3RCbG9ja3MsIDEsIGVuZCwgc3RhcnQsIGlucHV0UG9ydFBvc2l0aW9uLCBvdXRwdXRQb3J0UG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAoc3RhcnRQb3J0LmNvbm5lY3RhYmxlKHN0YXJ0UG9ydCwgZW5kUG9ydCkpIHtcbiAgICAgICAgc3RhcnRQb3J0LmNvbm5lY3Qoc3RhcnRQb3J0LCBlbmRQb3J0KTtcbiAgICB9XG59O1xuXG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG52YXIgY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jayA9IGZ1bmN0aW9uIChibG9jaywgcGhhbnRvbSkge1xuICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICBpZiAoY29udGVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEZJWCBNRSB3YWl0IHRoYXQgY29udGVudCBhY3R1YWxseSBleGlzdHMuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2ssIDEsIGJsb2NrLCBwaGFudG9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3LmNyZWF0ZVBoYW50b21MaW5rKGNvbnRlbnQsIHBoYW50b20pO1xuICAgIH1cbn07XG5cbnZhciBpbXBvcnRQYXRjaCA9IGZ1bmN0aW9uIChwYXRjaCkge1xuICAgIHZhciBlbGVtZW50cyA9IFtdO1xuICAgIF8uZWFjaChwYXRjaC5ibG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBibG9jay5uSW5wdXRzID0gYmxvY2subklucHV0cyB8fCAwO1xuICAgICAgICBibG9jay5uT3V0cHV0cyA9IGJsb2NrLm5PdXRwdXRzIHx8IDA7XG4gICAgICAgIGlmIChibG9jay50YWdOYW1lID09PSAnc2NyaXB0JyB8fMKgYmxvY2sudGFnTmFtZSA9PT0gJ2J1dHRvbicgfHwgYmxvY2sudGFnTmFtZSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQmxvY2soJ2h0bWwnLCBibG9jay50YWdOYW1lLCBibG9jay52YWx1ZSwgYmxvY2subklucHV0cywgYmxvY2subk91dHB1dHMsIGJsb2NrLnRvcCwgYmxvY2subGVmdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQmxvY2soJ2h0bWwnLCBibG9jay5pbm5lckhUTUwsICcnLCBibG9jay5uSW5wdXRzLCBibG9jay5uT3V0cHV0cywgYmxvY2sudG9wLCBibG9jay5sZWZ0KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCcpO1xuICAgICAgICBlbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgIH0pO1xuICAgIF8uZWFjaChwYXRjaC5saW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IGVsZW1lbnRzW2xpbmsub3V0cHV0LmJsb2NrXTtcbiAgICAgICAgdmFyIGlucHV0ID0gZWxlbWVudHNbbGluay5pbnB1dC5ibG9ja107XG4gICAgICAgIGNvbm5lY3RCbG9ja3MoaW5wdXQsIG91dHB1dCwgbGluay5pbnB1dC5wb3J0LCBsaW5rLm91dHB1dC5wb3J0KTtcbiAgICB9KTtcbiAgICB2YXIgcHJlc2VudGF0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpO1xuICAgIHByZXNlbnRhdGlvbi5pbm5lckhUTUwgPSBwYXRjaC5wcmVzZW50YXRpb24uaW5uZXJIVE1MO1xuICAgIHZhciBwaGFudG9tcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xuICAgIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcGhhbnRvbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgtdG8tcGhhbnRvbScpO1xuICAgICAgICB2YXIgYmxvY2sgPSBlbGVtZW50c1tpbmRleF07XG4gICAgICAgIGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2soYmxvY2ssIHBoYW50b20pO1xuICAgIH0pO1xufTtcblxuc3RvcmFnZS5zYXZlUGF0Y2ggPSBmdW5jdGlvbiAod2hlcmUsIG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE9ubHkgb25lIGFyZ3VtZW50IG1lYW5zIGl0IGlzIGFjdHVhbGx5IHRoZSBuYW1lIGFuZCB3ZSBsb2FkIGZyb21cbiAgICAgICAgLy8gbG9jYWxzdG9yYWdlLlxuICAgICAgICBuYW1lID0gd2hlcmU7XG4gICAgICAgIHdoZXJlID0gJ2xvY2FsJztcbiAgICB9XG4gICAgdmFyIHBhdGNoID0gZXhwb3J0UGF0Y2goKTtcbiAgICBpZiAod2hlcmUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICAgICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgICAgIHBhdGNoZXNbbmFtZV0gPSBwYXRjaDtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwYXRjaGVzJywgSlNPTi5zdHJpbmdpZnkocGF0Y2hlcykpO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdmaWxlJykge1xuICAgICAgICB2YXIgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhdGNoLCBudWxsLCAnICAgICcpO1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtjb250ZW50XSwgeyB0eXBlIDogXCJ0ZXh0L3BsYWluXCIsIGVuZGluZ3M6IFwidHJhbnNwYXJlbnRcIn0pO1xuICAgICAgICB3aW5kb3cuc2F2ZUFzKGJsb2IsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKCdiYWQgc2F2ZSBsb2NhdGlvbiAoXCInICsgd2hlcmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiKSwgbXVzdCBiZSBcImxvY2FsXCIgb3IgXCJmaWxlXCInKTtcbiAgICB9XG59O1xuXG5zdG9yYWdlLmxvYWRQYXRjaCA9IGZ1bmN0aW9uICh3aGVyZSwgd2hhdCkge1xuICAgIGlmICh3aGF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgd2hhdCA9IHdoZXJlO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdoYXQpID09PSAnW29iamVjdCBGaWxlXScpIHtcbiAgICAgICAgICAgIHdoZXJlID0gJ2ZpbGUgb2JqZWN0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoZXJlID0gJ2xvY2FsJztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgcHJvbWlzZTtcbiAgICBpZiAod2hlcmUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICAgICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgICAgIHZhciBwYXRjaCA9IHBhdGNoZXNbd2hhdF07XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAocGF0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGF0Y2gpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoJ05vIHBhdGNoIHdpdGggbmFtZSBcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hhdCArICdcIiBpbiBsb2NhbCBzdG9yYWdlLicpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2h0dHAnKSB7XG4gICAgICAgIHZhciB1cmwgPSB3aGF0O1xuICAgICAgICBwcm9taXNlID0gaHR0cC5nZXQodXJsKTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnZmlsZSBvYmplY3QnKSB7XG4gICAgICAgIHZhciBmaWxlID0gd2hhdDtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgIGZpbGVSZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGV2ZW50LnRhcmdldC5yZXN1bHQpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmaWxlUmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ2JhZCBsb2FkIGxvY2F0aW9uIChcIicgKyB3aGVyZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIpLCBtdXN0IGJlIFwibG9jYWxcIiBvciBcImh0dHBcIicpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICAgIGVkaXRvci5jbGVhckFsbCgpO1xuICAgICAgICBpbXBvcnRQYXRjaChwYXRjaCk7XG4gICAgfSk7XG59O1xuXG5zdG9yYWdlLnJlbW92ZVBhdGNoID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgIHZhciB0cmFzaCA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0cmFzaCcpKTtcbiAgICB0cmFzaCA9IHRyYXNoIHx8IHt9O1xuICAgIHZhciBwYXRjaCA9IHBhdGNoZXNbbmFtZV07XG4gICAgaWYgKHBhdGNoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgJ05vIHBhdGNoIHdpdGggbmFtZSBcIicgKyBuYW1lICsgJ1wiIGluIGxvY2FsIHN0b3JhZ2UuJztcbiAgICB9XG4gICAgdHJhc2hbbmFtZV0gPSBwYXRjaDtcbiAgICBkZWxldGUgcGF0Y2hlc1tuYW1lXTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3BhdGNoZXMnLCBKU09OLnN0cmluZ2lmeShwYXRjaGVzKSk7XG4gICAgZWRpdG9yLmNsZWFyQWxsKCk7XG59O1xuXG5zdG9yYWdlLmdldFBhdGNoTmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICByZXR1cm4gXy5rZXlzKHBhdGNoZXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdG9yYWdlO1xuIiwiLy8gVXNlIG9mIHRlcm1saWIuanMgZm9yIHRoZSB0ZXJtaW5hbCBmcmFtZS5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbi8vIGdsb2JhbHMgZnJvbSB0ZXJtbGliLmpzXG4vKmdsb2JhbCBUZXJtR2xvYmFscyAqL1xuLypnbG9iYWwgdGVybUtleSAqL1xuLypnbG9iYWwgUGFyc2VyICovXG4vKmdsb2JhbCBUZXJtaW5hbCAqL1xuXG52YXIgdGVybWluYWwgPSB7fTtcblxudGVybWluYWwuY3JlYXRlID0gZnVuY3Rpb24gKGNvbW1hbmRzLCBvbmJsdXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgdGVybURpdklkID0gJ2NvbW1hbmQtbGluZS1mcmFtZSc7XG5cbiAgICB2YXIgZ2V0VGVybURpdiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgdGVybURpdklkKTtcbiAgICB9O1xuXG4gICAgdmFyIGJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFRlcm1HbG9iYWxzLmtleWxvY2sgPSB0cnVlO1xuICAgICAgICBUZXJtR2xvYmFscy5hY3RpdmVUZXJtLmN1cnNvck9mZigpO1xuICAgICAgICB2YXIgdGVybURpdiA9IGdldFRlcm1EaXYoKTtcbiAgICAgICAgdGVybURpdi5jbGFzc0xpc3QudG9nZ2xlKCdmb2N1c2VkJyk7XG4gICAgICAgIG9uYmx1cigpO1xuICAgIH07XG5cbiAgICB2YXIgY3RybEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0Q2hhciA9PT0gdGVybUtleS5FU0MpIHtcbiAgICAgICAgICAgIGJsdXIoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgdGVybUhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhhdC5uZXdMaW5lKCk7XG4gICAgICAgIHZhciBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG4gICAgICAgIHBhcnNlci5wYXJzZUxpbmUodGhhdCk7XG4gICAgICAgIHZhciBjb21tYW5kTmFtZSA9IHRoYXQuYXJndlswXTtcbiAgICAgICAgaWYgKGNvbW1hbmRzLmhhc093blByb3BlcnR5KGNvbW1hbmROYW1lKSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGF0LmFyZ3Yuc2xpY2UoMSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBjb21tYW5kc1tjb21tYW5kTmFtZV0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudGhlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoJ0Vycm9yOiAnICsgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC53cml0ZSgndW5rbm93biBjb21tYW5kIFwiJyArIGNvbW1hbmROYW1lICsgJ1wiLicpO1xuICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaW5pdEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfTtcblxuICAgIC8vIFRoZSB0ZXJtbGliLmpzIG9iamVjdFxuICAgIHZhciB0ZXJtID0gbmV3IFRlcm1pbmFsKCB7XG4gICAgICAgIHRlcm1EaXY6IHRlcm1EaXZJZCxcbiAgICAgICAgaGFuZGxlcjogdGVybUhhbmRsZXIsXG4gICAgICAgIGJnQ29sb3I6ICcjZjBmMGYwJyxcbiAgICAgICAgY3JzckJsaW5rTW9kZTogdHJ1ZSxcbiAgICAgICAgY3JzckJsb2NrTW9kZTogZmFsc2UsXG4gICAgICAgIHJvd3M6IDEwLFxuICAgICAgICBmcmFtZVdpZHRoOiAwLFxuICAgICAgICBjbG9zZU9uRVNDOiBmYWxzZSxcbiAgICAgICAgY3RybEhhbmRsZXI6IGN0cmxIYW5kbGVyLFxuICAgICAgICBpbml0SGFuZGxlcjogaW5pdEhhbmRsZXJcblxuICAgIH0gKTtcbiAgICB0ZXJtLm9wZW4oKTtcblxuICAgIHZhciBmb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFRlcm1HbG9iYWxzLmtleWxvY2sgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgVGVybUdsb2JhbHMua2V5bG9jayA9IGZhbHNlO1xuICAgICAgICBUZXJtR2xvYmFscy5hY3RpdmVUZXJtLmN1cnNvck9uKCk7XG4gICAgICAgIHZhciB0ZXJtRGl2ID0gZ2V0VGVybURpdigpO1xuICAgICAgICB0ZXJtRGl2LmNsYXNzTGlzdC50b2dnbGUoJ2ZvY3VzZWQnKTtcbiAgICB9O1xuXG4gICAgYmx1cigpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZm9jdXM6IGZvY3VzLFxuICAgICAgICB0ZXJtOiB0ZXJtXG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdGVybWluYWw7XG4iLCIvLyBTeW50YWN0aWMgc3VnYXIgYW5kIHNpbXBsZSB1dGlsaXRpZXMuXG5cbi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cblxuLypnbG9iYWwgXyAqL1xuXG52YXIgdXRpbHMgPSB7fTtcblxudmFyIGRvbTtcbmRvbSA9IHtcbiAgICAvLyBDcmVhdGUgYSBkb20gZnJhZ21lbnQgZnJvbSBhIEhUTUwgc3RyaW5nLlxuICAgIGNyZWF0ZUZyYWdtZW50OiBmdW5jdGlvbihodG1sU3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgaWYgKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBkaXYgPSBmcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XG4gICAgICAgICAgICBkaXYuaW5uZXJIVE1MID0gaHRtbFN0cmluZztcbiAgICAgICAgICAgIHZhciBjaGlsZDtcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICAgICAgICAgIHdoaWxlIChjaGlsZCA9IGRpdi5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgLyplc2xpbnQtZW5hYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgICAgICAgICAgICAgZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBkaXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhZ21lbnQucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfSxcblxuICAgIC8vIE1vdmUgRE9NIG5vZGVzIGZyb20gYSBzb3VyY2UgdG8gYSB0YXJnZXQuIFRoZSBub2RlcyBhcmVzIHNlbGVjdGVkXG4gICAgLy8gYmFzZWQgb24gYSBzZWxlY3RvciBhbmQgdGhlIHBsYWNlIHRoZXkgYXJlIGluc3RlcnRlZCBpcyBhIGdpdmVuIHRhZ1xuICAgIC8vIHdpdGggYSBcInNlbGVjdFwiIGF0dHJpYnV0ZSB3aGljaCBjb250YWlucyB0aGUgZ2l2ZW4gc2VsZWN0b3IuIElmXG4gICAgLy8gICAgc291cmNlIGlzICdhYWEgPHNwYW4gY2xhc3M9XCJzb21ldGhpbmdcIj56eno8L3NwYW4+J1xuICAgIC8vIGFuZFxuICAgIC8vICAgIHRhcmdldCBpcyAncnJyIDxjb250ZW50IHNlbGVjdD1cIi5zb21ldGhpbmdcIj48L2NvbnRlbnQ+IHR0dCdcbiAgICAvLyBBZnRlciBtb3ZlQ29udGVudEJhc2VkT25TZWxlY3Rvcihzb3VyY2UsIHRhcmdldCwgJy5zb21ldGhpbmcnKTpcbiAgICAvLyAgICBzb3VyY2UgaXMgJ2FhYSdcbiAgICAvLyBhbmRcbiAgICAvLyAgICB0YXJnZXQgaXMgJ3JyciA8c3BhbiBjbGFzcz1cInNvbWV0aGluZ1wiPnp6ejwvc3Bhbj4gdHR0J1xuICAgIG1vdmVDb250ZW50QmFzZWRPblNlbGVjdG9yOiBmdW5jdGlvbihzb3VyY2UsIHRhcmdldCwgc2VsZWN0b3IsIHRhcmdldFRhZykge1xuICAgICAgICB2YXIgY29udGVudDtcbiAgICAgICAgdmFyIGVsZW1lbnRzO1xuICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0VGFnKTtcbiAgICAgICAgICAgIGVsZW1lbnRzID0gc291cmNlLmNoaWxkTm9kZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0VGFnICsgJ1tzZWxlY3Q9XCInICsgc2VsZWN0b3IgKyAnXCJdJyk7XG4gICAgICAgICAgICBlbGVtZW50cyA9IHNvdXJjZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXYXJuaW5nOiBpdCBpcyBpbXBvcnRhbnQgdG8gbG9vcCBlbGVtZW50cyBiYWNrd2FyZCBzaW5jZSBjdXJyZW50XG4gICAgICAgIC8vIGVsZW1lbnQgaXMgcmVtb3ZlZCBhdCBlYWNoIHN0ZXAuXG4gICAgICAgIGZvciAodmFyIGkgPSBlbGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIC8vIFRPRE8uIExlIFwiaW5zZXJ0XCIgY2ktZGVzc291cyBzdXIgbGVzIHotcG9ydCBmYWl0IHF1ZSBsZVxuICAgICAgICAgICAgLy8gZGV0YWNoZWRDYWxsYmFjayBlc3QgYXBwZWzDqSBhdmVjIGwnaW1wbGVtZW50YXRpb24gZGUgY3VzdG9tXG4gICAgICAgICAgICAvLyBlbG1lbnRzIHBhciB3ZWJyZWZsZWN0aW9ucyBtYWlzIHBhcyBwYXIgbCdpbXBsw6ltZW50YXRpb24gZGVcbiAgICAgICAgICAgIC8vIFBvbHltZXIgKGVuIHV0aWxpc2FudCBsZSBwb2x5ZmlsbCBkZSBCb3NvbmljKSBuaSBhdmVjXG4gICAgICAgICAgICAvLyBsJ2ltcGzDqW1lbnRhdGlvbiBuYXRpdmUgZGUgY2hyb21lLlxuICAgICAgICAgICAgY29udGVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5uZXh0U2libGluZ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIFRPRE8gbW92ZSB0aGlzIGVsc2V3aGVyZS5cbiAgICAgICAgICAgIGlmIChlbGVtZW50Lm9uY2xpY2sgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBnbG9iYWwgdG8gYWNjZXNzIHRoaXMgZnVuY3Rpb24gYmVjYXVzZSB1c2luZyByZXF1aXJlXG4gICAgICAgICAgICAgICAgICAgIC8vIG9uIGNvbW1hbmRzIGhhcyBhIGN5Y2xpYyBkZXBlbmRlbmN5LlxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuYXBwLmNvbW1hbmRzLmVkaXRCbG9jayhzb3VyY2UpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNvbnRlbnQpO1xuICAgIH0sXG5cbiAgICBtb3ZlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBkb20ubW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5mcm9tLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMudG8sXG4gICAgICAgICAgICAgICAgb3B0aW9ucy53aXRoU2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vblRhZ1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvLyBHZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50IHJlbGF0aXZlIHRvIGFub3RoZXIgb25lIChkZWZhdWx0IGlzXG4gICAgLy8gZG9jdW1lbnQgYm9keSkuXG4gICAgZ2V0UG9zaXRpb246IGZ1bmN0aW9uIChlbGVtZW50LCByZWxhdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZWxhdGl2ZUVsZW1lbnQgPSByZWxhdGl2ZUVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keTtcbiAgICAgICAgdmFyIHJlbGF0aXZlUmVjdCA9IHJlbGF0aXZlRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHJlY3QubGVmdCAtIHJlbGF0aXZlUmVjdC5sZWZ0LFxuICAgICAgICAgICAgeTogcmVjdC50b3AgLSByZWxhdGl2ZVJlY3QudG9wXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGdldFNlbGVjdGlvblN0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCkuYW5jaG9yTm9kZTtcbiAgICAgICAgcmV0dXJuICggKG5vZGUgIT09IG51bGwgJiYgbm9kZS5ub2RlVHlwZSA9PT0gMykgPyBub2RlLnBhcmVudE5vZGUgOiBub2RlICk7XG4gICAgfVxuXG59O1xudXRpbHMuZG9tID0gZG9tO1xuXG4vLyBVc2VmdWxsIGZvciBtdWx0aWxpbmUgc3RyaW5nIGRlZmluaXRpb24gd2l0aG91dCAnXFwnIG9yIG11bHRpbGluZVxuLy8gY29uY2F0ZW5hdGlvbiB3aXRoICcrJy5cbnV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbiA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuYy50b1N0cmluZygpLm1hdGNoKC9bXl0qXFwvXFwqKFteXSopXFwqXFwvXFxzKlxcfSQvKVsxXTtcbn07XG5cbnV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gUmV0dXJucyBhIGtleXMgZ2VuZXJhdG9yIGZvciBhIHNlcXVlbmNlIHRoYXQgaXMgYnVpbGQgbGlrZSB0aGF0OlxuICAgIC8vICAgYiwgYywgZC4uLlxuICAgIC8vICAgYWIsIGFjLCBhZC4uLlxuICAgIC8vICAgYWFiLCBhYWMsIGFhZC4uLlxuICAgIC8vIFRoZSBpZGVhIGlzIHRvIGhhdmUgYSBzZXF1ZW5jZSB3aGVyZSBlYWNoIHZhbHVlIGlzIG5vdCB0aGUgYmVnaW5uaW5nXG4gICAgLy8gb2YgYW55IG90aGVyIHZhbHVlIChzbyBzaW5nbGUgJ2EnIGNhbid0IGJlIHBhcnQgb2YgdGhlIHNlcXVlbmNlKS5cbiAgICAvL1xuICAgIC8vIE9uZSBnb2FsIGlzIHRvIGhhdmUgc2hvcnRlc3QgcG9zc2libGUga2V5cy4gU28gbWF5YmUgd2Ugc2hvdWxkIHVzZVxuICAgIC8vIGFkZGl0aW9ubmFsIHByZWZpeCBjaGFycyBhbG9uZyB3aXRoICdhJy4gQW5kIGJlY2F1c2UgaXQgd2lsbCBiZSB1c2VkXG4gICAgLy8gZm9yIHNob3J0Y3V0cywgbWF5YmUgd2UgY2FuIGNob29zZSBjaGFycyBiYXNlZCBvbiB0aGVpciBwb3NpdGlvbiBvblxuICAgIC8vIHRoZSBrZXlib2FyZC5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBjaGFyQ29kZXMgPSBfLnJhbmdlKCdiJy5jaGFyQ29kZUF0KDApLCAneicuY2hhckNvZGVBdCgwKSArIDEpO1xuICAgIHZhciBpZFN0cmluZ3MgPSBfLm1hcChjaGFyQ29kZXMsIGZ1bmN0aW9uIChjaGFyQ29kZSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZSk7XG4gICAgfSk7XG4gICAgdmFyIGdlbmVyYXRvciA9IHt9O1xuICAgIGdlbmVyYXRvci5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIga2V5ID0gJyc7XG4gICAgICAgIHZhciBpID0gaW5kZXg7XG4gICAgICAgIGlmIChpID49IGNoYXJDb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciByID0gTWF0aC5mbG9vcihpIC8gY2hhckNvZGVzLmxlbmd0aCk7XG4gICAgICAgICAgICBpID0gaSAlIGNoYXJDb2Rlcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAociA+IDApIHtcbiAgICAgICAgICAgICAgICBrZXkgKz0gJ2EnO1xuICAgICAgICAgICAgICAgIHItLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBrZXkgKz0gaWRTdHJpbmdzW2ldO1xuICAgICAgICBpbmRleCsrO1xuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH07XG5cbiAgICByZXR1cm4gZ2VuZXJhdG9yO1xufTtcblxudXRpbHMuZ2V0U2NyaXBTdHJpbmd0V2l0aE5ld2xpbmVzID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBUaGUgbmV3bGluZXMgYXJlIGxvc3Qgd2hlbiB1c2luZyByYXcgaW5uZXJIVE1MIGZvciBzY3JpcHQgdGFnc1xuICAgIC8vIChhdCBsZWFzdCBvbiBmaXJlZm94KS4gU28gd2UgcGFyc2UgZWFjaCBjaGlsZCB0byBhZGQgYSBuZXdsaW5lXG4gICAgLy8gd2hlbiBCUiBhcmUgZW5jb3VudGVyZWQuXG4gICAgdmFyIHZhbHVlID0gJyc7XG4gICAgW10uZm9yRWFjaC5jYWxsKGVsZW1lbnQuY2hpbGROb2RlcywgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ0JSJykge1xuICAgICAgICAgICAgdmFsdWUgKz0gJ1xcbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSArPSBub2RlLnRleHRDb250ZW50O1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuXG53aW5kb3cudXRpbHMgPSB1dGlscztcbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuLypnbG9iYWwgZG9jdW1lbnQgKi9cblxuLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgTW91c2V0cmFwICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcycpO1xuXG52YXIgdmlldyA9IHt9O1xuXG52YXIgaXNEZXNjZW5kYW50ID0gZnVuY3Rpb24gKGNoaWxkLCBwYXJlbnQpIHtcbiAgICAgdmFyIG5vZGUgPSBjaGlsZC5wYXJlbnROb2RlO1xuICAgICB3aGlsZSAobm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgaWYgKG5vZGUgPT09IHBhcmVudCkge1xuICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgfVxuICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgfVxuICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgZ2V0UHJlc2VudGF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKTtcbn07XG5cbnZhciBjcmVhdGVQaGFudG9tTGluayA9IGZ1bmN0aW9uIChwaGFudG9tZWQsIHBoYW50b20pIHtcbiAgICBwaGFudG9tLnBoYW50b21PZiA9IHBoYW50b21lZDtcbiAgICBwaGFudG9tLmNsYXNzTGlzdC5hZGQoJ3BoYW50b20nKTtcbiAgICBwaGFudG9tZWQucGhhbnRvbWVkQnkgPSBwaGFudG9tO1xuICAgIHBoYW50b21lZC5jbGFzc0xpc3QuYWRkKCdwaGFudG9tZWQnKTtcbn07XG52aWV3LmNyZWF0ZVBoYW50b21MaW5rID0gY3JlYXRlUGhhbnRvbUxpbms7XG5cbnZhciBjcmVhdGVQaGFudG9tID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyIHBoYW50b20gPSBlbGVtZW50LmNsb25lTm9kZSh0cnVlKTtcbiAgcGhhbnRvbS5kaXNhYmxlZCA9IHRydWU7XG4gIHBoYW50b20uc2V0QXR0cmlidXRlKCdjb250ZW50RWRpdGFibGUnLCBmYWxzZSk7XG4gIC8vIExpbmsgdGhlIHR3byBmb3IgbGF0ZXIgdXNlIChpbiBwYXJ0aWN1bGFyeSB3aGVuIHdlIHdpbGwgc3dpdGNoXG4gIC8vIGRpc3BsYXkgbW9kZSkuXG4gIGNyZWF0ZVBoYW50b21MaW5rKGVsZW1lbnQsIHBoYW50b20pO1xuXG4gIHJldHVybiBwaGFudG9tO1xufTtcblxudmFyIGlzQ3VycmVudFNlbGVjdGlvbkluUHJlc2VudGF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgdGhlIHNlbGVjdGlvbiByYW5nZSAob3IgY3Vyc29yIHBvc2l0aW9uKVxuICB2YXIgcmFuZ2UgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCkuZ2V0UmFuZ2VBdCgwKTtcbiAgdmFyIHplUHJlc2VudGF0aW9uID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAvLyBCZSBzdXJlIHRoZSBzZWxlY3Rpb24gaXMgaW4gdGhlIHByZXNlbnRhdGlvbi5cbiAgcmV0dXJuIGlzRGVzY2VuZGFudChyYW5nZS5zdGFydENvbnRhaW5lciwgemVQcmVzZW50YXRpb24pO1xufTtcblxudmFyIGluc2VydEluUGxhY2VPZlNlbGVjdGlvbiA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIC8vIEdldCB0aGUgc2VsZWN0aW9uIHJhbmdlIChvciBjdXJzb3IgcG9zaXRpb24pXG4gIHZhciByYW5nZSA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICAvLyBEZWxldGUgd2hhdGV2ZXIgaXMgb24gdGhlIHJhbmdlXG4gIHJhbmdlLmRlbGV0ZUNvbnRlbnRzKCk7XG4gIHJhbmdlLmluc2VydE5vZGUoZWxlbWVudCk7XG59O1xuXG4vLyBJbnNlcnQgYSBzZWxlY3RlZCBibG9jayBpbiB0aGUgRE9NIHNlbGVjdGlvbiBpbiBwcmVzZW50YXRpb24gd2luZG93LlxudmFyIGluc2VydEJsb2NrQ29udGVudEluU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYmxvY2sgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbiAgaWYgKGJsb2NrID09PSB1bmRlZmluZWQpIHtcbiAgICAvLyBOb3RoaW5nIGlzIHNlbGVjdGVkLlxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmKGlzQ3VycmVudFNlbGVjdGlvbkluUHJlc2VudGF0aW9uKCkpIHtcbiAgICB2YXIgY29udGVudCA9IGJsb2NrLmNvbnRlbnQ7XG4gICAgdmFyIHBoYW50b20gPSBjcmVhdGVQaGFudG9tKGNvbnRlbnQpO1xuICAgIGluc2VydEluUGxhY2VPZlNlbGVjdGlvbihwaGFudG9tKTtcblxuICAgIC8vIFRPRE8gZXZlbnR1YWxseSBzd2l0Y2ggdGhlIHR3byBpZiB3ZSBhcmUgaW4gcHJlc2VudGF0aW9uIG1vZGUuXG4gIH1cbn07XG52aWV3Lmluc2VydEJsb2NrQ29udGVudEluU2VsZWN0aW9uID0gaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb247XG5cbnZhciBnZXRQaGFudG9tcyA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHJldHVybiBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5waGFudG9tJyk7XG59O1xuXG52YXIgZ2V0V2luZG93Rm9yTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG4gIHZhciBpZCA9IG1vZGU7XG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG59O1xuXG52YXIgc3dhcEVsZW1lbnRzID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHtcbiAgICAvLyBjcmVhdGUgbWFya2VyIGVsZW1lbnQgYW5kIGluc2VydCBpdCB3aGVyZSBvYmoxIGlzXG4gICAgdmFyIHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvYmoxLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRlbXAsIG9iajEpO1xuXG4gICAgLy8gbW92ZSBvYmoxIHRvIHJpZ2h0IGJlZm9yZSBvYmoyXG4gICAgb2JqMi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShvYmoxLCBvYmoyKTtcblxuICAgIC8vIG1vdmUgb2JqMiB0byByaWdodCBiZWZvcmUgd2hlcmUgb2JqMSB1c2VkIHRvIGJlXG4gICAgdGVtcC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShvYmoyLCB0ZW1wKTtcblxuICAgIC8vIHJlbW92ZSB0ZW1wb3JhcnkgbWFya2VyIG5vZGVcbiAgICB0ZW1wLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGVtcCk7XG59O1xuXG52YXIgY3VycmVudE1vZGUgPSAnJztcblxuLy8gRG8gYWxsIHRoZSBzdHVmZiBuZWVkZWQgdG8gc3dpdGNoIG1vZGUgYmV0d2VlbiAnZWRpdCcgYW5kICdwcmVzZW50YXRpb24nLlxuLy8gTWFpbmx5IHN3YXAgJ3BoYW50b20nIGFuZCAncGhhbnRvbWVkJyBvYmplY3RzIHBhaXJzLlxudmFyIHN3aXRjaE1vZGUgPSBmdW5jdGlvbiAobW9kZSkge1xuICAgIGlmIChtb2RlID09PSBjdXJyZW50TW9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGN1cnJlbnRNb2RlID0gbW9kZTtcbiAgLy8gQnkgY29udmVudGlvbiwgdGhlICdwaGFudG9tJyBlbGVtZW50cyBhY3R1YWxseSBhcmUgaW4gdGhlIHdpbmRvd1xuICAvLyBhc3NvY2lhdGVkIHRvIHRoZSBtb2RlIHdlIHdhbnQgdG8gc3dpdGNoIHRvLiBUaGUgcGhhbnRvbWVkIG9uZSBhcmUgaW4gdGhlXG4gIC8vIHdpbmRvdyBvZiB0aGUgb3RoZXIgbW9kZS5cblxuICB2YXIgcGhhbnRvbXMgPSBnZXRQaGFudG9tcyhnZXRXaW5kb3dGb3JNb2RlKG1vZGUpKTtcbiAgXy5lYWNoKHBoYW50b21zLCBmdW5jdGlvbiAocGhhbnRvbSkge1xuICAgIC8vIFdoYXQgdGhpcyBvYmplY3QgaXMgdGhlIHBoYW50b20gb2Y/XG4gICAgdmFyIHBoYW50b21lZCA9IHBoYW50b20ucGhhbnRvbU9mO1xuICAgIC8vIFNpbXBseSBzd2FwIHRoZXNlIERPTSBvYmplY3RzLlxuICAgIHN3YXBFbGVtZW50cyhwaGFudG9tZWQsIHBoYW50b20pO1xuICB9KTtcbn07XG52aWV3LnN3aXRjaE1vZGUgPSBzd2l0Y2hNb2RlO1xuXG52YXIgcHJlc2VudGF0aW9uID0ge307XG5cbi8vIFRPRE8gbm90IHVzZWQ/XG52YXIgc2VsZWN0RWxlbWVudCA9IGZ1bmN0aW9uIChldmVudCkge1xuICBwcmVzZW50YXRpb24uc2VsZWN0ZWQgPSBldmVudC50YXJnZXQ7XG59O1xudmlldy5zZWxlY3RFbGVtZW50ID0gc2VsZWN0RWxlbWVudDtcblxudmFyIGxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHAgPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gICAgcC5jb250ZW50RWRpdGFibGUgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjbG9jay1idXR0b24nKS5kaXNhYmxlZCA9IHRydWU7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3VubG9jay1idXR0b24nKS5kaXNhYmxlZCA9IGZhbHNlO1xufTtcbnZpZXcubG9jayA9IGxvY2s7XG5cbnZhciB1bmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHAgPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gICAgcC5jb250ZW50RWRpdGFibGUgPSB0cnVlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNsb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gZmFsc2U7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3VubG9jay1idXR0b24nKS5kaXNhYmxlZCA9IHRydWU7XG59O1xudmlldy51bmxvY2sgPSB1bmxvY2s7XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHAgPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gICAgcC5vbmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICB9O1xuICAgIHAub25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb21tYW5kcy5iaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgfTtcbn07XG52aWV3LmluaXQgPSBpbml0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXc7XG5nbG9iYWwudmlldyA9IHZpZXc7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50ICovXG4vKmdsb2JhbCBIVE1MRWxlbWVudCAqL1xuLypnbG9iYWwgd2luZG93ICovXG5cbi8qZ2xvYmFsIHJlc3R5bGUgKi9cbi8qZ2xvYmFsIERyYWdnYWJpbGx5ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1ibG9jayc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPGRpdiBpZD1cIm1haW5cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBvcnRzLWNvbnRhaW5lciBpbnB1dHNcIj5cbiAgICAgICAgICAgIDxjb250ZW50IHNlbGVjdD1cInotcG9ydC5pbnB1dFwiPjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwiYmxvY2sta2V5XCI+YTwvc3Bhbj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnQtY29udGFpbmVyXCI+XG4gICAgICAgICAgICA8Y29udGVudD48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwicG9ydHMtY29udGFpbmVyIG91dHB1dHNcIj5cbiAgICAgICAgICAgIDxjb250ZW50IHNlbGVjdD1cInotcG9ydC5vdXRwdXRcIj48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAvLyBCeSBkZWZhdWx0IGN1c3RvbSBlbGVtZW50cyBhcmUgaW5saW5lIGVsZW1lbnRzLiBDdXJyZW50IGVsZW1lbnRcbiAgICAgICAgLy8gaGFzIGl0cyBvd24gaGVpZ2h0IGFuZCB3aWR0aCBhbmQgY2FuIGJlIGluc3RlcnRlZCBpbiBhIHRleHRcbiAgICAgICAgLy8gZmxvdy4gU28gd2UgbmVlZCBhICdkaXNwbGF5OiBpbmxpbmUtYmxvY2snIHN0eWxlLiBNb3Jlb3ZlciwgdGhpc1xuICAgICAgICAvLyBpcyBuZWVkZWQgYXMgYSB3b3JrYXJvdW5kIGZvciBhIGJ1ZyBpbiBEcmFnZ2FiaWxseSAod2hpY2ggb25seVxuICAgICAgICAvLyB3b3JrcyBvbiBibG9jayBlbGVtZW50cywgbm90IG9uIGlubGluZSBvbmVzKS5cbiAgICAgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJ1xuICAgIH0sXG4gICAgJz4gZGl2Jzoge1xuICAgICAgICAnYmFja2dyb3VuZCc6ICd3aGl0ZScsXG4gICAgICAgICdib3JkZXItbGVmdCc6ICczcHggc29saWQnLFxuICAgICAgICAnYm9yZGVyLWxlZnQtY29sb3InOiAnd2hpdGUnLFxuICAgICAgICAnYm9yZGVyLXJpZ2h0JzogJzNweCBzb2xpZCcsXG4gICAgICAgICdib3JkZXItcmlnaHQtY29sb3InOiAnd2hpdGUnLFxuICAgICAgICAnYm94U2hhZG93JzogJzJweCAycHggM3B4IDBweCAjZGZkZmRmJ1xuICAgIH0sXG4gICAgJy5jb250ZW50LWNvbnRhaW5lcic6IHtcbiAgICAgICAgJ3BhZGRpbmcnOiAnOHB4IDE1cHggOHB4IDE1cHgnXG4gICAgfSxcbiAgICAnLnBvcnRzLWNvbnRhaW5lcic6IHtcbiAgICAgICAgJ3BhZGRpbmcnOiAwLFxuICAgICAgICAnbWluSGVpZ2h0JzogMyxcbiAgICAgICAgJ292ZXJmbG93JzogJ3Zpc2libGUnXG4gICAgfSxcbiAgICAnLnBvcnRzLWNvbnRhaW5lciB6LXBvcnQnOiB7XG4gICAgICAgICdmbG9hdCc6ICdsZWZ0JyxcbiAgICAgICAgJ21hcmdpbkxlZnQnOiA4LFxuICAgICAgICAnbWFyZ2luUmlnaHQnOiA4XG4gICAgfSxcbiAgICAnc3Bhbi5ibG9jay1rZXknOiB7XG4gICAgICAgICdmb250LXNpemUnOiAnc21hbGxlcicsXG4gICAgICAgICdjb2xvcic6ICcjNDQ0JyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2JvdHRvbSc6IDAsXG4gICAgICAgICdyaWdodCc6IDAsXG4gICAgICAgICdwYWRkaW5nLXJpZ2h0JzogMyxcbiAgICAgICAgJ3BhZGRpbmctbGVmdCc6IDMsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNmZmYnXG4gICAgfSxcbiAgICAnei1wb3J0LmlucHV0IC5wb3J0LWtleSc6IHtcbiAgICAgICAgJ3RvcCc6IDNcbiAgICB9LFxuICAgICd6LXBvcnQub3V0cHV0IC5wb3J0LWtleSc6IHtcbiAgICAgICAgJ2JvdHRvbSc6IDNcbiAgICB9XG59O1xuLy8gQXBwbHkgdGhlIGNzcyBkZWZpbml0aW9uIGFuZCBwcmVwZW5kaW5nIHRoZSBjdXN0b20gZWxlbWVudCB0YWcgdG8gYWxsXG4vLyBDU1Mgc2VsZWN0b3JzLlxudmFyIHN0eWxlID0gcmVzdHlsZSh0YWdOYW1lLCBjc3NBc0pzb24pO1xuXG52YXIgcmVkcmF3ID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIHBvcnRzID0gYmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICBwb3J0LnJlZHJhdygpO1xuICAgIH0pO1xufTtcblxudmFyIG1ha2VJdERyYWdnYWJsZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIHZhciBkcmFnZ2llID0gbmV3IERyYWdnYWJpbGx5KGJsb2NrLCB7XG4gICAgICAgIGNvbnRhaW5tZW50OiB0cnVlXG4gICAgfSk7XG4gICAgZHJhZ2dpZS5leHRlcm5hbEFuaW1hdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlZHJhdyhibG9jayk7XG4gICAgfTtcbn07XG5cbnZhciBwcm9wZXJ0aWVzID0ge1xuICAgIGNyZWF0ZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQXQgdGhlIGJlZ2lubmluZyB0aGUgbGlnaHQgRE9NIGlzIHN0b3JlZCBpbiB0aGUgY3VycmVudCBlbGVtZW50LlxuICAgICAgICB2YXIgbGlnaHREb20gPSB0aGlzO1xuICAgICAgICAvLyBTdGFydCBjb21wb3NlZCBET00gd2l0aCBhIGNvcHkgb2YgdGhlIHRlbXBsYXRlXG4gICAgICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgLy8gVGhlbiBwcm9ncmVzc2l2ZWx5IG1vdmUgZWxlbWVudHMgZnJvbSBsaWdodCB0byBjb21wb3NlZCBET00gYmFzZWQgb25cbiAgICAgICAgLy8gc2VsZWN0b3JzIG9uIGxpZ2h0IERPTSBhbmQgZmlsbCA8Y29udGVudD4gdGFncyBpbiBjb21wb3NlZCBET00gd2l0aFxuICAgICAgICAvLyB0aGVtLlxuICAgICAgICBbJ3otcG9ydC5pbnB1dCcsICd6LXBvcnQub3V0cHV0JywgJyddLmZvckVhY2goZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHV0aWxzLmRvbS5tb3ZlKHtcbiAgICAgICAgICAgICAgICBmcm9tOiBsaWdodERvbSwgd2l0aFNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICB0bzogY29tcG9zZWREb20sIG9uVGFnOiAnY29udGVudCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gQXQgdGhpcyBzdGFnZSBjb21wb3NlZCBET00gaXMgY29tcGxldGVkIGFuZCBsaWdodCBET00gaXMgZW1wdHkgKGkuZS5cbiAgICAgICAgLy8gJ3RoaXMnIGhhcyBubyBjaGlsZHJlbikuIENvbXBvc2VkIERPTSBpcyBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgdGhlXG4gICAgICAgIC8vIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAgICAgdGhpcy5oaWRlS2V5KCk7XG5cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcG9ydHMgPSB0aGF0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uKHBvcnQpIHtcbiAgICAgICAgICAgIHBvcnQuYmxvY2sgPSB0aGF0O1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy56ZS1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxuICAgICAgICB0aGlzLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB3aW5kb3cuc2V0Q3VycmVudEJsb2NrKHRoYXQpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgICAgICBzZWxlY3Rvci5zZXRTZWxlY3RhYmxlKHRoaXMsIHRydWUpO1xuICAgIH19LFxuXG4gICAgYXR0YWNoZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gVE9ETyBidWcgaW4gY2hyb21lIG9yIGluIHdlYnJlZmxlY3Rpb24gcG9seWZpbGwuIElmIG1ha2VJdERyYWdnYWJsZVxuICAgICAgICAvLyBpcyBjYWxsZWQgaW4gY3JlYXRlZENhbGxiYWNrIHRoZW4gRHJhZ2dhYmlseSBhZGRzIGFcbiAgICAgICAgLy8gJ3Bvc2l0aW9uOnJlbGF0aXZlJyBiZWNhdXNlIHRoZSBjc3Mgc3R5bGUgb2YgYmxvY2sgdGhhdCBzZXRcbiAgICAgICAgLy8gcG9zaXRpb24gdG8gYWJzb2x1dGUgaGFzIG5vdCBiZWVuIGFwcGxpZWQgeWV0ICh3aXRoIGNocm9tZSkuIFdpdGhcbiAgICAgICAgLy8gV2ViUmVmbGVjdGlvbidzIHBvbHlmaWxsIHRoZSBzdHlsZSBpcyBhcHBsaWVkIHNvIERyYWdnYWJpbGx5IGRvZXNuJ3RcbiAgICAgICAgLy8gY2hhbmdlIHBvc2l0aW9uLiBXaHkgYSBkaWZmZXJlbnQgYmVoYXZpb3VyPyBXaGljaCBpcyB3cm9uZyA/IENocm9tZSxcbiAgICAgICAgLy8gd2VicmVmbGVjdGlvbiBvciB0aGUgc3BlYz8gTWF5YmUgd2UgY2FuIHRyeSB3aXRoIHBvbHltZXIgcG9seWZpbGwuXG4gICAgICAgIG1ha2VJdERyYWdnYWJsZSh0aGlzKTtcbiAgICB9fSxcblxuICAgIHVucGx1Zzoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBvcnRzID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICAgICAgcG9ydC51bnBsdWcoKTtcbiAgICAgICAgfSk7XG4gICAgfX0sXG5cbiAgICBhZGRQb3J0OiB7dmFsdWU6IGZ1bmN0aW9uIChodG1sU3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sU3RyaW5nKTtcbiAgICAgICAgdmFyIHBvcnQgPSBmcmFnbWVudC5maXJzdENoaWxkO1xuICAgICAgICBwb3J0LmJsb2NrID0gdGhpcztcbiAgICAgICAgaWYgKHBvcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpKSB7XG4gICAgICAgICAgICB2YXIgcG9ydENvbnRhaW5lciA9IHRoaXMucXVlcnlTZWxlY3RvcignLnBvcnRzLWNvbnRhaW5lci5pbnB1dHMnKTtcbiAgICAgICAgICAgIHBvcnRDb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSkge1xuICAgICAgICAgICAgdmFyIHBvcnRDb250YWluZXIgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5wb3J0cy1jb250YWluZXIub3V0cHV0cycpO1xuICAgICAgICAgICAgcG9ydENvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBvcnQ7XG4gICAgfX0sXG5cbiAgICBrZXlFbGVtZW50OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3Rvcignc3Bhbi5ibG9jay1rZXknKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXk6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMua2V5RWxlbWVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzaG93S2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfX0sXG5cbiAgICBoaWRlS2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICB9fSxcblxuICAgIHBvcnRzOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnb3V0JzogdGhpcy5xdWVyeVNlbGVjdG9yKCd6LXBvcnQub3V0cHV0JyksXG4gICAgICAgICAgICAgICAgJ2lucHV0cyc6IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0JyksXG4gICAgICAgICAgICAgICAgJ291dHB1dHMnOiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlLCBwcm9wZXJ0aWVzKTtcbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG5cbi8vIFRPRE8gY2xlYW4gZ2xvYmFsc1xud2luZG93LmdldEVsZW1lbnRCbG9jayA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgLy8gVE9ETyBkbyBhIHNlYXJjaCB0byBmaW5kIHRoZSBmaXJzdCBwYXJlbnQgYmxvY2sgZm9yIGNhc2VzIHdoZXJlXG4gICAgLy8gZWxlbWVudCBpcyBkb3duIGluIHRoZSBlbGVtZW50IGhpZWFyY2h5LlxuICAgIHZhciBtYXliZUJsb2NrID0gZWxlbWVudC5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICB2YXIgYmxvY2s7XG4gICAgaWYgKG1heWJlQmxvY2sudGFnTmFtZSA9PT0gJ1otQkxPQ0snKSB7XG4gICAgICAgIGJsb2NrID0gbWF5YmVCbG9jaztcbiAgICB9IGVsc2Uge1xuICAgICAgICBibG9jayA9IGVsZW1lbnQucGhhbnRvbWVkQnkucGFyZW50Tm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBibG9jaztcbn07XG4iLCIvLyBDdXN0b20gZWxlbWVudCB0byBkcmF3IGEgbGluayBiZXR3ZWVuIHR3byBwb3J0cy5cblxuLy8gV2UgaW1wbGVtZW50IHRoaXMgYXMgYSBkaXYgd2l0aCB6ZXJvIGhlaWdodCB3aGljaCB3aWR0aCBpcyB0aGUgbGVuZ3RoIG9mIHRoZVxuLy8gbGluZSBhbmQgdXNlIHRyYW5zZm9ybXMgdG8gc2V0IGl0cyBlbmRzIHRvIHRoZSBwb3J0cyBwb3NpdGlvbnMuIFJlZmVyZW5jZVxuLy8gb3JpZ2luIHBvc2l0aW9uIGlzIHJlbGF0aXZlIGNvb3JkaW5hdGVzICgwLDApIGFuZCBvdGhlciBlbmQgaXMgKHdpZHRoLDApLlxuLy8gU28gYmUgc3VyZSB0aGF0IENTUyBzdHlsaW5nIGlzIGRvbmUgYWNjb3JkaW5nbHkuXG5cbi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG5cbi8qZ2xvYmFsIGdldFN0eWxlUHJvcGVydHkgKi9cblxuLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgcmVzdHlsZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi4vbGliL3NlbGVjdG9yJyk7XG5cbnZhciB0YWdOYW1lID0gJ3otbGluayc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPGRpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+XG4gICAgPC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbi8vIFRPRE8gVXNlIGEgY3VzdG9tIGVsZW1lbnQgZm9yIGxpbmUgd2lkdGguXG52YXIgbGluZVdpZHRoID0gMy4wO1xudmFyIHJhZGl1cyA9IGxpbmVXaWR0aCAvIDI7XG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnaGVpZ2h0JzogMCxcbiAgICAgICAgJ21hcmdpbi1sZWZ0JzogLXJhZGl1cyxcbiAgICAgICAgJ21hcmdpbi10b3AnOiAtcmFkaXVzLFxuICAgICAgICAnYm9yZGVyV2lkdGgnOiByYWRpdXMsXG4gICAgICAgICdib3JkZXJSYWRpdXMnOiByYWRpdXMsXG4gICAgICAgICdib3JkZXJTdHlsZSc6ICdzb2xpZCcsXG4gICAgICAgICdib3hTaGFkb3cnOiAnMHB4IDBweCAzcHggMHB4ICNkZmRmZGYnLFxuICAgICAgICAnYm9yZGVyQ29sb3InOiAnI2NjYydcbiAgICB9LFxuICAgICdkaXYuc2VsZWN0b3InOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdsZWZ0JzogJzEwJScsXG4gICAgICAgICd3aWR0aCc6ICc4MCUnLFxuICAgICAgICAndG9wJzogLTcsXG4gICAgICAgICdoZWlnaHQnOiAxNCxcbiAgICAgICAgJ3pJbmRleCc6IDAsXG4gICAgICAgICdib3JkZXJDb2xvcic6ICcjMzMzJ1xuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciBnZXRQb2xhckNvb3JkaW5hdGVzID0gZnVuY3Rpb24ocG9zaXRpb24xLCBwb3NpdGlvbjIpIHtcbiAgICB2YXIgeERpZmYgPSBwb3NpdGlvbjEueCAtIHBvc2l0aW9uMi54O1xuICAgIHZhciB5RGlmZiA9IHBvc2l0aW9uMS55IC0gcG9zaXRpb24yLnk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBtb2Q6IE1hdGguc3FydCh4RGlmZiAqIHhEaWZmICsgeURpZmYgKiB5RGlmZiksXG4gICAgICAgIGFyZzogTWF0aC5hdGFuKHlEaWZmIC8geERpZmYpXG4gICAgfTtcbn07XG5cbi8vIFNldCB0aGUgc3R5bGUgb2YgYSBnaXZlbiBlbGVtZW50IHNvIHRoYXQ6XG4vLyAqIEl0cyBvcmlnaW4gKGkuZS4gMCwwIHJlbGF0aXZlIGNvb3JkaW5hdGVzKSBpcyBwbGFjZWQgYXQgb25lIHBvc2l0aW9uLlxuLy8gKiBJdHMgd2lkdGggaXMgc2V0IHRvIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gcG9zaXRpb25zLlxuLy8gKiBJdCBpcyByb3RhdGVkIHNvIHRoYXQgaXRzIGVuZCBwb2ludCAoeCA9IHdpZHRoIGFuZCB5ID0gMCkgaXMgcGxhY2VkIGF0XG4vLyB0aGUgb3RoZXIgcG9zaXRpb24uXG52YXIgdHJhbnNmb3JtUHJvcGVydHkgPSBnZXRTdHlsZVByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbnZhciBzZXRFbGVtZW50RW5kcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGVuZDEsIGVuZDIpIHtcbiAgICB2YXIgb3JpZ2luO1xuICAgIGlmIChlbmQxLnggPCBlbmQyLngpIHtcbiAgICAgICAgb3JpZ2luID0gZW5kMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvcmlnaW4gPSBlbmQyO1xuICAgIH1cblxuICAgIHZhciBwb2xhciA9IGdldFBvbGFyQ29vcmRpbmF0ZXMoZW5kMSwgZW5kMik7XG4gICAgdmFyIGxlbmd0aCA9IHBvbGFyLm1vZDtcbiAgICB2YXIgYW5nbGUgPSBwb2xhci5hcmc7XG5cbiAgICB2YXIgdG9wID0gb3JpZ2luLnkgKyAwLjUgKiBsZW5ndGggKiBNYXRoLnNpbihhbmdsZSk7XG4gICAgdmFyIGxlZnQgPSBvcmlnaW4ueCAtIDAuNSAqIGxlbmd0aCAqICgxIC0gTWF0aC5jb3MoYW5nbGUpKTtcbiAgICB2YXIgcGFyZW50UG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICBsZWZ0IC09IHBhcmVudFBvc2l0aW9uLng7XG4gICAgdG9wIC09IHBhcmVudFBvc2l0aW9uLnk7XG5cbiAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gbGVuZ3RoICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZVt0cmFuc2Zvcm1Qcm9wZXJ0eV0gPSAncm90YXRlKCcgKyBhbmdsZSArICdyYWQpJztcbn07XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAoemxpbmspIHtcbiAgICB2YXIgZW5kMSA9IHpsaW5rLmJlZ2luLnBvcnQ7XG4gICAgdmFyIGVuZDIgPSB6bGluay5lbmQucG9ydDtcbiAgICBpZiAoZW5kMSAhPT0gdW5kZWZpbmVkICYmIGVuZDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZXRFbGVtZW50RW5kcyh6bGluaywgZW5kMS5jb25uZWN0aW9uUG9zaXRpb24sIGVuZDIuY29ubmVjdGlvblBvc2l0aW9uKTtcbiAgICB9XG59O1xuXG52YXIgY29ubmVjdCA9IGZ1bmN0aW9uKHpsaW5rLCBwbHVnLCBwb3J0KSB7XG4gICAgaWYgKHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJykge1xuICAgICAgICBwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihwb3J0KTtcbiAgICB9XG4gICAgcGx1Zy5wb3J0ID0gcG9ydDtcbiAgICBwbHVnLnBvcnQubGlua3MucHVzaCh6bGluayk7XG59O1xuXG52YXIgdW5jb25uZWN0ID0gZnVuY3Rpb24gKHpsaW5rKSB7XG4gICAgemxpbmsuYmVnaW4ucG9ydC5saW5rcyA9IF8ud2l0aG91dCh6bGluay5iZWdpbi5wb3J0LmxpbmtzLCB6bGluayk7XG4gICAgemxpbmsuZW5kLnBvcnQubGlua3MgPSBfLndpdGhvdXQoemxpbmsuZW5kLnBvcnQubGlua3MsIHpsaW5rKTtcbiAgICBpZiAoemxpbmsucGFyZW50Tm9kZSAhPT0gbnVsbCkge1xuICAgICAgICB6bGluay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHpsaW5rKTtcbiAgICB9XG59O1xuXG52YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG5wcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29tcG9zZWREb20gPSB0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAvLyBDdXJyaWVkIHZlcnNpb24gb2YgJ3JlZHJhdycgd2l0aCBjdXJyZW50IG9iamVjdCBpbnN0YW5jZS5cbiAgICAvLyBVc2VkIGZvciBldmVudCBsaXN0ZW5lcnMuXG4gICAgdGhpcy5yZWRyYXcgPSByZWRyYXcuYmluZChudWxsLCB0aGlzKTtcbiAgICB0aGlzLmNvbm5lY3QgPSBjb25uZWN0LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgdGhpcy51bmNvbm5lY3QgPSB1bmNvbm5lY3QuYmluZChudWxsLCB0aGlzKTtcblxuICAgIHRoaXMuYmVnaW4gPSB7fTtcbiAgICB0aGlzLmVuZCA9IHt9O1xuICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZSgnYmVnaW4nKSAmJiB0aGlzLmhhc0F0dHJpYnV0ZSgnZW5kJykpIHtcbiAgICAgICAgLy8gVE9ETyBkbyB0aGUgc2FtZSBzdHVmZiBvbiBhdHRyaWJ1dGVzJyBjaGFuZ2VzLlxuICAgICAgICBjb25uZWN0KHRoaXMsIHRoaXMuYmVnaW4sIHRoaXMuZ2V0QXR0cmlidXRlKCdiZWdpbicpKTtcbiAgICAgICAgY29ubmVjdCh0aGlzLCB0aGlzLmVuZCwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2VuZCcpKTtcblxuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG59O1xuXG5wcm90by5jc3MgPSBzdHlsZTtcbmRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCh0YWdOYW1lLCB7cHJvdG90eXBlOiBwcm90b30pO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG4vKmdsb2JhbCBIVE1MRWxlbWVudCAqL1xuXG4vKmdsb2JhbCByZXN0eWxlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1wb3J0JztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8c3BhbiBjbGFzcz1cInBvcnQta2V5XCI+YTwvc3Bhbj5cbiAgICA8ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj5cbiovfSk7XG52YXIgdGVtcGxhdGUgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFRlbXBsYXRlKTtcblxudmFyIGNzc0FzSnNvbiA9IHtcbiAgICAvLyBUaGUgZm9sbG93aW5nIHdpbGwgYXBwbHkgdG8gdGhlIHJvb3QgRE9NIGVsZW1lbnQgb2YgdGhlIGN1c3RvbVxuICAgIC8vIGVsZW1lbnQuXG4gICAgJyc6IHtcbiAgICAgICAgJ3dpZHRoJzogMTgsXG4gICAgICAgICdoZWlnaHQnOiAzLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICcjY2NjJyxcbiAgICAgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ3JlbGF0aXZlJyxcbiAgICAgICAgJ292ZXJmbG93JzogJ3Zpc2libGUnLFxuICAgICAgICAnekluZGV4JzogJzUnXG4gICAgfSxcbiAgICAnLnBvcnQta2V5Jzoge1xuICAgICAgICAnZm9udC1zaXplJzogJzAuN2VtJyxcbiAgICAgICAgJ2NvbG9yJzogJyM0NDQnLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAncGFkZGluZy1sZWZ0JzogMyxcbiAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiAzLFxuICAgICAgICAnekluZGV4JzogJzEwJyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2ZmZidcbiAgICB9LFxuICAgICcuc2VsZWN0b3InOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdsZWZ0JzogLTgsXG4gICAgICAgICd0b3AnOiAtOCxcbiAgICAgICAgJ3dpZHRoJzogMjQsXG4gICAgICAgICdoZWlnaHQnOiAxNFxuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIFtdLmZvckVhY2guY2FsbChwb3J0LmxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICBsaW5rLnJlZHJhdygpO1xuICAgIH0pO1xufTtcblxuXG52YXIgcHJvcGVydGllcyA9IHtcblxuICAgIGNyZWF0ZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saW5rcyA9IFtdO1xuICAgICAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgICAgICBzZWxlY3Rvci5zZXRTZWxlY3RhYmxlKHRoaXMsIHRydWUpO1xuXG4gICAgICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAgICAgdGhpcy5oaWRlS2V5KCk7XG4gICAgfX0sXG5cbiAgICB1bnBsdWc6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxpbmtzLmZvckVhY2goZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgIGxpbmsudW5jb25uZWN0KCk7XG4gICAgICAgIH0pO1xuICAgIH19LFxuXG4gICAgY29ubmVjdGFibGU6IHt2YWx1ZTogZnVuY3Rpb24gKHBvcnQxLCBwb3J0Mikge1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgKHBvcnQxLmNsYXNzTGlzdC5jb250YWlucygnaW5wdXQnKVxuICAgICAgICAgICAgJiYgcG9ydDIuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSlcbiAgICAgICAgICAgIHx8XG4gICAgICAgICAgICAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKVxuICAgICAgICAgICAgJiYgcG9ydDIuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpKVxuICAgICAgICAgICAgKTtcbiAgICB9fSxcblxuICAgIGNvbm5lY3Q6IHt2YWx1ZTogZnVuY3Rpb24gKHBvcnQxLCBwb3J0Mikge1xuICAgICAgICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3otbGluaycpO1xuICAgICAgICBpZiAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSkge1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuYmVnaW4sIHBvcnQxKTtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmVuZCwgcG9ydDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuZW5kLCBwb3J0MSk7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5iZWdpbiwgcG9ydDIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gdXNlIGFub3RoZXIgd2F5IHRvIGZpbmQgd2hlcmUgdG8gYWRkIG5ldyBsaW5rcy5cbiAgICAgICAgdmFyIHBhdGNoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhdGNoJyk7XG4gICAgICAgIHBhdGNoLmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICBsaW5rLnJlZHJhdygpO1xuICAgIH19LFxuXG4gICAgY29ubmVjdGlvblBvc2l0aW9uOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gdXRpbHMuZG9tLmdldFBvc2l0aW9uKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyIGNlbnRlciA9IHtcbiAgICAgICAgICAgICAgICB4OiBwb3NpdGlvbi54ICsgcmVjdC53aWR0aCAvIDIsXG4gICAgICAgICAgICAgICAgeTogcG9zaXRpb24ueSArIHJlY3QuaGVpZ2h0IC8gMlxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBjZW50ZXI7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAga2V5RWxlbWVudDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3NwYW4ucG9ydC1rZXknKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXk6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMua2V5RWxlbWVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzaG93S2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfX0sXG5cbiAgICBoaWRlS2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICB9fVxuXG59O1xuXG52YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSwgcHJvcGVydGllcyk7XG5wcm90by5jc3MgPSBzdHlsZTtcbmRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCh0YWdOYW1lLCB7cHJvdG90eXBlOiBwcm90b30pO1xuXG4iXX0=
