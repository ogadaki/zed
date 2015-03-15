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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvZ2xvYmFscy5qcyIsImxpYi9odHRwLmpzIiwibGliL3NlbGVjdG9yLmpzIiwibGliL3N0b3JhZ2UuanMiLCJsaWIvdGVybWluYWwuanMiLCJsaWIvdXRpbHMuanMiLCJsaWIvdmlldy5qcyIsIndlYmNvbXBvbmVudHMvei1ibG9jay5qcyIsIndlYmNvbXBvbmVudHMvei1saW5rLmpzIiwid2ViY29tcG9uZW50cy96LXBvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMnKTtcbnZhciBlbmdpbmUgPSByZXF1aXJlKCcuL2VuZ2luZScpO1xudmFyIGVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9yJyk7XG52YXIgc3RvcmFnZSA9IHJlcXVpcmUoJy4vc3RvcmFnZScpO1xudmFyIGh0dHAgPSByZXF1aXJlKCcuL2h0dHAnKTtcbi8vIGltcG9ydCB2aWV3IG1vZHVsZSBzbyB0aGF0IGl0cyBnbG9iYWxzIGFyZSBkZWZpbmVkLlxudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcblxudmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcblxudmFyIGV4cG9ydHMgPSB7fTtcblxuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbW1hbmRzLmluaXQoKTtcbiAgICBlbmdpbmUuaW5pdCgpO1xuICAgIGVkaXRvci5pbml0KCk7XG4gICAgdmlldy5pbml0KCk7XG4gICAgZ2xvYmFsLmh0dHAgPSBodHRwO1xuICAgIC8vIExvYWQgYSBwYXRjaCBhcyBhbiBleGFtcGxlLlxuICAgIHN0b3JhZ2UubG9hZFBhdGNoKCdodHRwJywgJ3BhdGNoZXMvbWFpbi56ZWQnKTtcbn07XG5leHBvcnRzLnZpZXcgPSB2aWV3O1xuZXhwb3J0cy5jb21tYW5kcyA9IGNvbW1hbmRzO1xuXG4vLyBUaGlzIG1vZHVsZSBpcyB0byBiZSB1c2VkIGZyb20gdGhlIGdsb2JhbCBuYW1lc3BhY2UgKGkuZS4gZnJvbSBhcHAuaHRtbCkuXG5nbG9iYWwuYXBwID0gZXhwb3J0cztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgTW91c2V0cmFwICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHRlcm1pbmFsID0gcmVxdWlyZSgnLi90ZXJtaW5hbCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgY29tbWFuZHMgPSB7fTtcblxuY29tbWFuZHMucHJldiA9IGVkaXRvci5vZmZzZXRDdXJyZW50LmJpbmQobnVsbCwgLTEpO1xuY29tbWFuZHMubmV4dCA9IGVkaXRvci5vZmZzZXRDdXJyZW50LmJpbmQobnVsbCwgMSk7XG5jb21tYW5kcy5hZGQgPSBlZGl0b3IuYWRkO1xuY29tbWFuZHMucmVtb3ZlID0gZWRpdG9yLnJlbW92ZTtcbmNvbW1hbmRzLmlucHV0cyA9IGVkaXRvci5wb3J0LmJpbmQobnVsbCwgJ2lucHV0Jyk7XG5jb21tYW5kcy5vdXRwdXRzID0gZWRpdG9yLnBvcnQuYmluZChudWxsLCAnb3V0cHV0Jyk7XG5jb21tYW5kcy5ibG9jayA9IGVkaXRvci5ibG9jaztcbmNvbW1hbmRzLmZpcmUgPSBlZGl0b3IuZmlyZTtcbmNvbW1hbmRzLnNldCA9IGVkaXRvci5zZXQ7XG5jb21tYW5kcy5tb3ZlID0gZWRpdG9yLm1vdmU7XG5jb21tYW5kcy5vZmZzZXQgPSBlZGl0b3IubW92ZUJ5O1xuY29tbWFuZHMuY2xlYXIgPSBlZGl0b3IuY2xlYXJBbGw7XG5cblxudmFyIGVkaXRCbG9jayA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdlc2MnLCBjb21tYW5kcy5lc2NhcGUpO1xuICAgIGJsb2NrLmNvbnRlbnQuZm9jdXMoKTtcbn07XG5jb21tYW5kcy5lZGl0QmxvY2sgPSBlZGl0QmxvY2s7XG5cbmNvbW1hbmRzLmVkaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgZWRpdEJsb2NrKGJsb2NrKTtcbiAgICAgICAgZWRpdG9yLnN0b3BCbGlua2luZygpO1xuICAgICAgICAvLyBQcmV2ZW50IGRlZmF1bHQgd2hlbiB0aGlzIGZ1bmN0aW9uIGlzIHVzZWQgd2l0aCBNb3VzdHJhcC5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmNvbW1hbmRzLmFkZEJ1dHRvbiA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ2J1dHRvbicsICdnbycsIDAsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZFNjcmlwdCA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ3NjcmlwdCcsICdpbjEgKyAyJywgMSwgMSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuY29tbWFuZHMuYWRkVGV4dCA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ3NwYW4nLCAnZW1wdHknLCAxLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGROdW1iZXIgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnemVkJywgJ251bWJlcicsICc0MicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZENvbW1lbnQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdjb21tZW50JywgJ0NvbW1lbnQnLCAwLCAwLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG52YXIgYmluZEtleXNGb3JNYWluTW9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSycsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDAsIC0xMCkpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdKJywgY29tbWFuZHMub2Zmc2V0LmJpbmQobnVsbCwgMCwgMTApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIC0xMCwgMCkpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdMJywgY29tbWFuZHMub2Zmc2V0LmJpbmQobnVsbCwgMTAsIDApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaycsIGNvbW1hbmRzLnByZXYpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdqJywgY29tbWFuZHMubmV4dCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgbicsIGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdOZXcnKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBiJywgY29tbWFuZHMuYWRkQnV0dG9uKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHMnLCBjb21tYW5kcy5hZGRTY3JpcHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggdCcsIGNvbW1hbmRzLmFkZFRleHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggbicsIGNvbW1hbmRzLmFkZE51bWJlcik7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBjJywgY29tbWFuZHMuYWRkQ29tbWVudCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ3InLCBjb21tYW5kcy5yZW1vdmUpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdpJywgY29tbWFuZHMuaW5wdXRzKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnbycsIGNvbW1hbmRzLm91dHB1dHMpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdiJywgY29tbWFuZHMuYmxvY2spO1xuICAgIE1vdXNldHJhcC5iaW5kKCdjJywgY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnbCcsIGNvbW1hbmRzLmxpbmspO1xuICAgIE1vdXNldHJhcC5iaW5kKCdnJywgY29tbWFuZHMuZ29Ub0Jsb2NrKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZScsIGNvbW1hbmRzLmVkaXQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdzcGFjZScsIGNvbW1hbmRzLmZpcmUpO1xufTtcbmNvbW1hbmRzLmJpbmRLZXlzRm9yTWFpbk1vZGUgPSBiaW5kS2V5c0Zvck1haW5Nb2RlO1xuXG5jb21tYW5kcy5lc2NhcGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBjdXJyZW50bHlFZGl0aW5nRWxlbWVudCA9IHV0aWxzLmRvbS5nZXRTZWxlY3Rpb25TdGFydCgpO1xuICAgICAgICBpZiAoY3VycmVudGx5RWRpdGluZ0VsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGN1cnJlbnRseUVkaXRpbmdFbGVtZW50LmJsdXIoKTtcbiAgICAgICAgICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH1cbn07XG5cbnZhciBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGIpIHtcbiAgICAgICAgYi5jbGFzc0xpc3QudG9nZ2xlKCdkZS1lbXBoYXNpcycpO1xuICAgIH0pO1xufTtcblxudmFyIGhpZGVBbGxLZXlzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgW10uZm9yRWFjaC5jYWxsKGVsZW1lbnRzLCBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBlbGVtZW50LmhpZGVLZXkoKTtcbiAgICB9KTtcbiAgICBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzKCk7XG59O1xuXG52YXIgZmlyc3RQb3J0O1xudmFyIHNlbGVjdFBvcnQgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIGlmIChmaXJzdFBvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaXJzdFBvcnQgPSBwb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwb3J0LmNvbm5lY3RhYmxlKHBvcnQsIGZpcnN0UG9ydCkpIHtcbiAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBmaXJzdFBvcnQpO1xuICAgICAgICAgICAgZmlyc3RQb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHBvcnRUb0xpbmtUbztcbmNvbW1hbmRzLmxpbmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBrZXlzID0gdXRpbHMuY3JlYXRlS2V5c0dlbmVyYXRvcigpO1xuICAgICAgICBmaXJzdFBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgICAgICB2YXIgcG9ydHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICAgICAgcG9ydC5rZXkgPSBrZXk7XG4gICAgICAgICAgICBwb3J0LnNob3dLZXkoKTtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCcnKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBNb3VzZXRyYXAuYmluZChrZXksIHNlbGVjdFBvcnQuYmluZChudWxsLCBwb3J0KSk7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwb3J0ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAocG9ydFRvTGlua1RvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8gPSBwb3J0O1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY29ubmVjdGFibGUocG9ydCwgcG9ydFRvTGlua1RvKSkge1xuICAgICAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBwb3J0VG9MaW5rVG8pO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHBvcnQ7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soYmxvY2spO1xuICAgIGhpZGVBbGxLZXlzKCd6LWJsb2NrJyk7XG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xufTtcblxuY29tbWFuZHMuZ29Ub0Jsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwoYmxvY2tzLCBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICBibG9jay5rZXkgPSBrZXk7XG4gICAgICAgIGJsb2NrLnNob3dLZXkoKTtcbiAgICAgICAgLy8gQ29udmVydCAnYWFlJyBpbnRvICdhIGEgZScuXG4gICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZChrZXksIHNldEN1cnJlbnRCbG9ja0FuZEJhY2tUb01haW5Nb2RlLmJpbmQobnVsbCwgYmxvY2spKTtcbiAgICAgICAgaW5kZXgrKztcbiAgICB9KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBoaWRlQWxsS2V5cygnei1ibG9jaycpO1xuICAgICAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgfSk7XG4gICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xufTtcblxuLy8gU2V0IGEgbmV3IHN0b3BDYWxsYmFjayBmb3IgTW91c3RyYXAgdG8gYXZvaWQgc3RvcHBpbmcgd2hlbiB3ZSBzdGFydFxuLy8gZWRpdGluZyBhIGNvbnRlbnRlZGl0YWJsZSwgc28gdGhhdCB3ZSBjYW4gdXNlIGVzY2FwZSB0byBsZWF2ZSBlZGl0aW5nLlxuTW91c2V0cmFwLnN0b3BDYWxsYmFjayA9IGZ1bmN0aW9uKGUsIGVsZW1lbnQsIGNvbWJvKSB7XG4gICAgLy8gaWYgdGhlIGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBcIm1vdXNldHJhcFwiIHRoZW4gbm8gbmVlZCB0byBzdG9wXG4gICAgaWYgKCgnICcgKyBlbGVtZW50LmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignIG1vdXNldHJhcCAnKSA+IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAgLy8gc3RvcCBmb3IgaW5wdXQsIHNlbGVjdCwgYW5kIHRleHRhcmVhXG4gICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQSc7XG4gfTtcblxuY29tbWFuZHMuc2F2ZSA9IHN0b3JhZ2Uuc2F2ZVBhdGNoO1xuY29tbWFuZHMubG9hZCA9IHN0b3JhZ2UubG9hZFBhdGNoO1xuY29tbWFuZHMucm0gPSBzdG9yYWdlLnJlbW92ZVBhdGNoO1xuY29tbWFuZHMubGlzdCA9IHN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcztcbmNvbW1hbmRzLmxzID0gc3RvcmFnZS5nZXRQYXRjaE5hbWVzO1xuXG52YXIgdGVybWluYWxPbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG59O1xuXG52YXIgdGVybTtcbnZhciBpbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB0ZXJtID0gdGVybWluYWwuY3JlYXRlKGNvbW1hbmRzLCB0ZXJtaW5hbE9uYmx1cik7XG4gICAgLy8gVW5wbHVnIHRoZSBpbml0IGZ1bmN0aW9uIHNvIHRoYXQgaXQgd29uJ3QgYmUgdXNlZCBhcyBhIGNvbW1hbmQgZnJvbSB0aGVcbiAgICAvLyB0ZXJtaW5hbC5cbiAgICBkZWxldGUgY29tbWFuZHMuaW5pdDtcbn07XG5jb21tYW5kcy5pbml0ID0gaW5pdDtcblxuY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHRlcm0uZm9jdXMoKTtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBlZGl0b3Iuc3RvcEJsaW5raW5nKCk7XG59O1xuXG4vLyBUT0RPIGNyZWF0ZSBhIHRlcm0ud3JpdGUobXVsdGlMaW5lU3RyaW5nKSBhbmQgdXNlIGl0LlxuY29tbWFuZHMuaGVscCA9IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgaWYgKHN1YmplY3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ1ByZXNzIEVzYyB0byBsZWF2ZSB0aGUgY29tbWFuZCBsaW5lIGFuZCBnbyBiYWNrIHRvIG5vcm1hbCBtb2RlLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0NvbW1hbmRzOiBuZXh0LCBwcmV2LCByZW1vdmUsIGFkZCwgc2V0IGNvbnRlbnQsIG1vdmUsIG9mZnNldCcpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2xzLCBsb2FkLCBzYXZlLCBjbGVhciBhbmQgcm0uJyk7XG4gICAgfSBlbHNlIGlmIChzdWJqZWN0ID09PSAnYWRkJykge1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0FkZCBhIG5ldyBibG9jayBqdXN0IGJlbG93IHRoZSBjdXJyZW50IGJsb2NrLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2FkZCBodG1sIDx3aGF0PiA8Y29udGVudD4gPG5iIGlucHV0cz4gPG5iIG91dHB1dHM+Jyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICA8d2hhdD4gICAgaXMgZWl0aGVyIFwiYnV0dG9uXCIsIFwic2NyaXB0XCIsIFwidGV4dFwiLCBcIm51bWJlclwiIG9yIGEgSFRNTCB0YWcuJyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICA8Y29udGVudD4gaXMgdGhlIGNvbnRlbnQgb2YgdGhlIGJsb2NrIChpLmUuIHRoZSBidXR0b24gbmFtZSwgdGhlJyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICAgICAgICAgICAgc2NyaXB0IGNvZGUsIHRoZSB0ZXh0IG9yIG51bWJlciB2YWx1ZSwgZXRjLikuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdObyBoZWxwIGZvciBcIicgKyBzdWJqZWN0ICsgJ1wiLicpO1xuICAgIH1cbn07XG5cbmNvbW1hbmRzLm1lc3NhZ2UgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI21lc3NhZ2UnKS5pbm5lckhUTUwgPSBzdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVuZ2luZSA9IHJlcXVpcmUoJy4vZW5naW5lJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlZGl0b3IgPSB7fTtcblxuZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuXG5lZGl0b3IuZ2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5nZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1wb3J0LmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5zZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgdmFyIG1lc3NhZ2UgPSAnJztcbiAgICBpZiAoYmxvY2suZXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtZXNzYWdlID0gYmxvY2suZXJyb3IubWVzc2FnZTtcbiAgICB9XG4gICAgLy8gVE9ETyBIZXJlIHdlIHVzZSBnbG9iYWwgaW5zdGVhZCBvZiByZXF1aXJlKCdjb21tYW5kcycpIGJlY2F1c2Ugb2YgY3ljbGljXG4gICAgLy8gZGVwZW5kZW5jaWVzLlxuICAgIHdpbmRvdy5hcHAuY29tbWFuZHMubWVzc2FnZShtZXNzYWdlKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICB9XG59O1xuLy8gVE9ETyBub3QgaW4gdGhlIHdpbmRvdyBuYW1lc3BhY2VcbndpbmRvdy5zZXRDdXJyZW50QmxvY2sgPSBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrO1xuXG5lZGl0b3Iuc2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgcG9ydC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnRCbG9jayA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWxlbWVudHNbaV0gPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IChlbGVtZW50cy5sZW5ndGggKyBpICsgb2Zmc2V0KSAlIGVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soZWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgIHZhciBlbGVtZW50cyA9IGN1cnJlbnQuYmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LicgKyBlZGl0b3IuY29udGV4dCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWxlbWVudHNbaV0gPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IChlbGVtZW50cy5sZW5ndGggKyBpICsgb2Zmc2V0KSAlIGVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChlbGVtZW50c1tpbmRleF0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2sob2Zmc2V0KTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnIHx8IGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQob2Zmc2V0KTtcbiAgICB9XG59O1xuXG5lZGl0b3IuY3JlYXRlQmxvY2tFbGVtZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQsIG5JbnB1dHMsIG5PdXRwdXRzLCB0b3AsIGxlZnQpIHtcbiAgICB2YXIgcGF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF0Y2gnKTtcbiAgICBjb250ZW50ID0gW1xuICAgICAgICAnPHotcG9ydCBjbGFzcz1cImlucHV0XCI+PC96LXBvcnQ+Jy5yZXBlYXQobklucHV0cyksXG4gICAgICAgIGNvbnRlbnQsXG4gICAgICAgICc8ei1wb3J0IGNsYXNzPVwib3V0cHV0XCI+PC96LXBvcnQ+Jy5yZXBlYXQobk91dHB1dHMpXG4gICAgXS5qb2luKCcnKTtcbiAgICB2YXIgaHRtbFN0cmluZyA9ICc8ei1ibG9jaz4nICsgY29udGVudCArICc8L3otYmxvY2s+JztcbiAgICB2YXIgZnJhZ21lbnQgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFN0cmluZyk7XG4gICAgdmFyIGJsb2NrID0gZnJhZ21lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jaycpO1xuXG4gICAgdmFyIGRlZmF1bHRUb3AgPSAwO1xuICAgIHZhciBkZWZhdWx0TGVmdCA9IDA7XG4gICAgdmFyIGN1cnJlbnRCbG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoY3VycmVudEJsb2NrICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihjdXJyZW50QmxvY2ssIGN1cnJlbnRCbG9jay5wYXJlbnROb2RlKTtcbiAgICAgICAgZGVmYXVsdFRvcCA9IHBvc2l0aW9uLnkgKyBjdXJyZW50QmxvY2suZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgMjM7XG4gICAgICAgIGRlZmF1bHRMZWZ0ID0gcG9zaXRpb24ueDtcbiAgICB9XG4gICAgYmxvY2suc3R5bGUudG9wID0gdG9wIHx8IGRlZmF1bHRUb3AgKyAncHgnO1xuICAgIGJsb2NrLnN0eWxlLmxlZnQgPSBsZWZ0IHx8IGRlZmF1bHRMZWZ0ICsgJ3B4JztcblxuICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soYmxvY2spO1xuICAgIHBhdGNoLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICByZXR1cm4gYmxvY2s7XG59O1xuXG5lZGl0b3IuYWRkQmxvY2sgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciB6ZUNsYXNzID0gJyc7XG4gICAgaWYgKGFyZ3NbMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHR5cGUgPSAnaHRtbCc7XG4gICAgICAgIGFyZ3NbMV0gPSAnc3Bhbic7XG4gICAgICAgIHplQ2xhc3MgPSAnemVkLW51bWJlcic7XG4gICAgfVxuICAgIHZhciBibG9ja0NsYXNzID0gYXJnc1sxXTtcbiAgICBpZiAodHlwZSA9PT0gJ2h0bWwnKSB7XG4gICAgICAgIHZhciB0YWdOYW1lID0gYXJnc1sxXTtcbiAgICAgICAgaWYgKGFyZ3NbMV0gPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgdGFnTmFtZSA9ICdzcGFuJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29udGVudCA9IGFyZ3NbMl07XG4gICAgICAgIHZhciBuZXdDb250ZW50ID0gJzwnICsgdGFnTmFtZSArICcgY2xhc3M9XCJ6ZS1jb250ZW50ICcgKyB6ZUNsYXNzICsgJ1wiIGNvbnRlbnRlZGl0YWJsZT4nICsgY29udGVudCArICc8LycgKyB0YWdOYW1lICsgJz4nO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSAnPHNjcmlwdCBjbGFzcz1cInplLWNvbnRlbnRcIiB0eXBlPVwiYXBwbGljYXRpb24veC1wcmV2ZW50LXNjcmlwdC1leGVjdXRpb24tb25sb2FkXCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazt3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XCIgY29udGVudGVkaXRhYmxlIG9uaW5wdXQ9XCJjb21waWxlU2NyaXB0KHRoaXMpXCI+JyArIGNvbnRlbnQgKyAnPC9zY3JpcHQ+JztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSAnPGJ1dHRvbiBvbmNsaWNrPVwic2VuZEV2ZW50VG9PdXRwdXRQb3J0KHRoaXMpXCIgY2xhc3M9XCJ6ZS1jb250ZW50XCIgY29udGVudGVkaXRhYmxlPicgKyBjb250ZW50ICsgJzwvYnV0dG9uPic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWVbMF0gPT09ICc8Jykge1xuICAgICAgICAgICAgLy8gQWN0dWFsbHkgdGFnTmFtZSBjb250YWlucyBhIEhUTUwgc3RyaW5nLlxuICAgICAgICAgICAgbmV3Q29udGVudCA9IHRhZ05hbWU7XG4gICAgICAgICAgICBibG9ja0NsYXNzID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MsIDIpO1xuICAgICAgICBhcmdzWzBdID0gbmV3Q29udGVudDtcbiAgICB9XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmNyZWF0ZUJsb2NrRWxlbWVudC5hcHBseShudWxsLCBhcmdzKTtcbiAgICBpZiAoYmxvY2tDbGFzcyAhPT0gJycpIHtcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZShibG9ja0NsYXNzKTtcbiAgICB9XG59O1xuXG5lZGl0b3IuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJyZW50O1xuICAgIHZhciBwb3J0O1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICBlZGl0b3IuYWRkQmxvY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnKSB7XG4gICAgICAgIGN1cnJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICAgICAgcG9ydCA9IGN1cnJlbnQuYWRkUG9ydCgnPHotcG9ydCBjbGFzcz1cImlucHV0XCI+PC96LXBvcnQ+Jyk7XG4gICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChwb3J0KTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICBjdXJyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgICAgIHBvcnQgPSBjdXJyZW50LmFkZFBvcnQoJzx6LXBvcnQgY2xhc3M9XCJvdXRwdXRcIj48L3otcG9ydD4nKTtcbiAgICAgICAgZWRpdG9yLnNldEN1cnJlbnRQb3J0KHBvcnQpO1xuICAgIH1cbn07XG5cbmVkaXRvci5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGVjdGVkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNlbGVjdGVkJyk7XG4gICAgaWYgKHNlbGVjdGVkICE9PSBudWxsICYmIHNlbGVjdGVkLnRhZ05hbWUgPT09ICdaLUxJTksnKSB7XG4gICAgICAgIHZhciBsaW5rID0gc2VsZWN0ZWQ7XG4gICAgICAgIGxpbmsudW5jb25uZWN0KCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2soMSk7XG4gICAgICAgIGJsb2NrLnVucGx1ZygpO1xuICAgICAgICBibG9jay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGJsb2NrKTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnIHx8IGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICB2YXIgcG9ydCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQoMSk7XG4gICAgICAgIHBvcnQudW5wbHVnKCk7XG4gICAgICAgIHBvcnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwb3J0KTtcbiAgICB9XG59O1xuXG52YXIgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCA9IGZ1bmN0aW9uIChlbGVtZW50VGFnTmFtZSwgb25Pck9mZikge1xuICAgIHZhciBjbGFzc05hbWUgPSAnY3VycmVudCc7XG4gICAgaWYgKG9uT3JPZmYgPT09ICdvbicpIHtcbiAgICAgICAgY2xhc3NOYW1lICs9ICctb2ZmLWNvbnRleHQnO1xuICAgIH1cbiAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudFRhZ05hbWUgKyAnLicgKyBjbGFzc05hbWUpO1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xufTtcblxuZWRpdG9yLnBvcnQgPSBmdW5jdGlvbiAoaW5wdXRPck91dHB1dCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCAhPT0gJ2Jsb2NrJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2suY3VycmVudCAqIHotcG9ydC4nICsgaW5wdXRPck91dHB1dCwgJ29uJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YXIgcG9ydCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCAqIHotcG9ydC4nICsgaW5wdXRPck91dHB1dCk7XG4gICAgICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwb3J0LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrJywgJ29mZicpO1xuICAgIGVkaXRvci5jb250ZXh0ID0gaW5wdXRPck91dHB1dDtcbn07XG5cbmVkaXRvci5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICBlZGl0b3IuY29udGV4dCA9ICdibG9jayc7XG4gICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jaycsICdvbicpO1xuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otcG9ydC5pbnB1dCcsICdvZmYnKTtcbiAgICB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1wb3J0Lm91dHB1dCcsICdvZmYnKTtcbiAgICB9IGNhdGNoKGUpIHt9XG59O1xuXG5lZGl0b3IuZmlyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICB2YXIgY29udGVudCA9IGJsb2NrLmNvbnRlbnQ7XG4gICAgICAgIGlmIChjb250ZW50LnRhZ05hbWUgPT09ICdCVVRUT04nKSB7XG4gICAgICAgICAgICBlbmdpbmUuc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnRlbnQudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICAgIGVuZ2luZS5maXJlRXZlbnQyKGJsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbiBjYXNlIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGFzIGEgcmVzdWx0IG9mIGFuIGV2ZW50IChzYXksIHNwYWNlXG4gICAgICAgIC8vIGtleSBwcmVzcykgd2UgcHJldmVudCBkZWZhdWx0IGV2ZW50IGJlaGF2aW91ciAoc2F5IHNjcm9sbCBkb3duIGZvclxuICAgICAgICAvLyBzcGFjZSBiYXIpLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuZWRpdG9yLnNldCA9IGZ1bmN0aW9uICh0YXJnZXQsIHZhbHVlKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICAgICAgYmxvY2suY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5tb3ZlID0gZnVuY3Rpb24gKGxlZnQsIHRvcCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGN1cnJlbnQuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICBjdXJyZW50LnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICBjdXJyZW50LnJlZHJhdygpO1xufTtcblxuZWRpdG9yLm1vdmVCeSA9IGZ1bmN0aW9uIChsZWZ0T2Zmc2V0LCB0b3BPZmZzZXQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICB2YXIgdG9wID0gTnVtYmVyKGN1cnJlbnQuc3R5bGUudG9wLnNsaWNlKDAsIC0yKSkgKyBOdW1iZXIodG9wT2Zmc2V0KTtcbiAgICB2YXIgbGVmdCA9IE51bWJlcihjdXJyZW50LnN0eWxlLmxlZnQuc2xpY2UoMCwgLTIpKSArIE51bWJlcihsZWZ0T2Zmc2V0KTtcbiAgICBlZGl0b3IubW92ZShsZWZ0LCB0b3ApO1xufTtcblxuZWRpdG9yLnN0YXJ0QmxpbmtpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChibG9jayAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoYmxvY2suY2xhc3NMaXN0LmNvbnRhaW5zKCdzdG9wLWJsaW5raW5nJykpIHtcbiAgICAgICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoJ3N0b3AtYmxpbmtpbmcnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5zdG9wQmxpbmtpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmICghYmxvY2suY2xhc3NMaXN0LmNvbnRhaW5zKCdzdG9wLWJsaW5raW5nJykpIHtcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnc3RvcC1ibGlua2luZycpO1xuICAgIH1cbn07XG5cbnZhciBibGlua0N1cnNvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnNvci1kaXNwbGF5ZWQnKTtcbiAgICB9XG4gICAgd2luZG93LnNldFRpbWVvdXQoYmxpbmtDdXJzb3IsIDEwMDApO1xufTtcblxuZWRpdG9yLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgYmxpbmtDdXJzb3IoKTtcbn07XG5cbmVkaXRvci5jbGVhckFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIF8uZWFjaChibG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBibG9jay51bnBsdWcoKTtcbiAgICAgICAgYmxvY2sucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChibG9jayk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLmlubmVySFRNTCA9ICcnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0b3I7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG4vKmdsb2JhbCBfICovXG5cbi8qZ2xvYmFsIGdldEVsZW1lbnRCbG9jayAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVuZ2luZSA9IHt9O1xuXG5lbmdpbmUuY29tcGlsZVNjcmlwdCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdmFyIHN0cmluZyA9IGVsZW1lbnQudGV4dDtcbiAgICBzdHJpbmcgPSB1dGlscy5nZXRTY3JpcFN0cmluZ3RXaXRoTmV3bGluZXMoZWxlbWVudCk7XG4gICAgdmFyIHNjcmlwdDtcbiAgICB2YXIgY29tcGlsZWQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gSW4gY2FzZSBzY3JpcHQgaXMgYW4gZXhwcmVzc2lvbi5cbiAgICAgICAgdmFyIG1heWJlRXhwcmVzc2lvbiA9IHN0cmluZztcbiAgICAgICAgc2NyaXB0ID0gJ3JldHVybiAoJyArIG1heWJlRXhwcmVzc2lvbiArICcpOyc7XG4gICAgICAgIGNvbXBpbGVkID0gbmV3IEZ1bmN0aW9uKCdzZW5kVG9PdXRwdXQnLCAnZGVzdDEnLCAnaW4xJywgJ2luMicsICdpbjMnLCAnaW40JywgJ2luNScsIHNjcmlwdCk7XG4gICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICB9IGNhdGNoIChlMSkge1xuICAgICAgICAvLyBDb21waWxhdGlvbiBmYWlsZWQgdGhlbiBpdCBpc24ndCBhbiBleHByZXNzaW9uLiBUcnkgYXMgYVxuICAgICAgICAvLyBmdW5jdGlvbiBib2R5LlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2NyaXB0ID0gc3RyaW5nO1xuICAgICAgICAgICAgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24oJ3NlbmRUb091dHB1dCcsICdkZXN0MScsICdpbjEnLCAnaW4yJywgJ2luMycsICdpbjQnLCAnaW41Jywgc2NyaXB0KTtcbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gTm90IGEgZnVuY3Rpb24gYm9keSwgc3RyaW5nIGlzIG5vdCB2YWxpZC5cbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZSkge1xuICAgIHZhciBibG9jayA9IGdldEVsZW1lbnRCbG9jayhlbGVtZW50KTtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5wb3J0cy5vdXRwdXRzO1xuICAgIGlmIChwb3J0cykge1xuICAgICAgICBpZiAocG9ydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgcG9ydCA9IHBvcnRzWzBdO1xuICAgICAgICAgICAgcG9ydC5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB2YWx1ZSBpcyBhbiBhcnJheSBvZiB2YWx1ZXMuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWU7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciB6ZVZhbHVlID0gdmFsdWVzW2luZGV4XTtcbiAgICAgICAgICAgICAgICBwb3J0LmxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgemVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgYmxvY2sgPSBnZXRFbGVtZW50QmxvY2soZWxlbWVudCk7XG4gICAgdmFyIHBvcnQgPSBibG9jay5wb3J0cy5vdXRwdXRzWzBdO1xuICAgIHZhciBjb250ZW50O1xuICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBsaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgIHZhciBsaW5rID0gbGlua3NbMF07XG4gICAgICAgIGlmIChsaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xufTtcblxuLy8gVE9ETyBjaGFuZ2UgbmFtZS5cbmVuZ2luZS5maXJlRXZlbnQyID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnaGFzLWV4ZWN1dGlvbi1lcnJvcicpKSB7XG4gICAgICAgIHRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCdoYXMtZXhlY3V0aW9uLWVycm9yJyk7XG4gICAgfVxuICAgIHZhciBjb250ZW50ID0gdGFyZ2V0LmNvbnRlbnQ7XG4gICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWU7XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgdmFyIGRhdGFQb3J0cyA9IHRhcmdldC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKTtcbiAgICAgICAgdmFyIGlucHV0cyA9IFtdO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwoZGF0YVBvcnRzLCBmdW5jdGlvbiAoZGF0YVBvcnQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhTGlua3MgPSBkYXRhUG9ydCA9PT0gbnVsbCA/IFtdIDogZGF0YVBvcnQubGlua3M7XG5cbiAgICAgICAgICAgIGlmIChkYXRhTGlua3MubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGFMaW5rID0gXy5maW5kKGRhdGFMaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSBsaW5rLmJlZ2luLnBvcnQuYmxvY2suY29udGVudC50YWdOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhZyAhPT0gJ0JVVFRPTic7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YUxpbms7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFMaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBkYXRhTGluay5iZWdpbi5wb3J0LmJsb2NrLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai52YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnU1BBTicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5pbm5lckhUTUw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jbGFzc0xpc3QuY29udGFpbnMoJ3plZC1udW1iZXInKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvYmoudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5leGVjdXRpb25SZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5wdXRzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbmV4dEFjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBhcmd1bWVudHNbMF0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZmlyc3REZXN0aW5hdGlvbkNvbnRlbnQgPSBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50KGNvbnRlbnQpO1xuXG4gICAgICAgIHZhciB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICBpZiAodGhlU2NyaXB0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBpbGVTY3JpcHQoY29udGVudCk7XG4gICAgICAgICAgICB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGVTY3JpcHQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0Vycm9yIGluIHNjcmlwdC4gQWJvcnRpbmcuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBhcmdzLnB1c2gobmV4dEFjdGlvbik7XG4gICAgICAgIGFyZ3MucHVzaChmaXJzdERlc3RpbmF0aW9uQ29udGVudCk7XG4gICAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChpbnB1dHMpO1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0YXJnZXQuZXJyb3IgPSB7XG4gICAgICAgICAgICBtZXNzYWdlOiAnJ1xuICAgICAgICB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhlU2NyaXB0LmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLWV4ZWN1dGlvbi1lcnJvcicpO1xuICAgICAgICAgICAgbWVzc2FnZSA9ICdleGVjdXRpb24gZXJyb3Igb24gbGluZSAnICsgZS5saW5lTnVtYmVyICsgJzogJyArIGUubWVzc2FnZTtcbiAgICAgICAgICAgIHRhcmdldC5lcnJvci5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU3RvcmUgcmVzdWx0IGZvciBmdXR1cmUgdXNlLlxuICAgICAgICAgICAgY29udGVudC5leGVjdXRpb25SZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3VsdC50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnTlVNQkVSJykge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnRElWJyB8fCB0YWdOYW1lID09PSAnU1BBTicpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRlbnQuaW5uZXJIVE1MO1xuICAgICAgICB9XG4gICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdJTlBVVCcpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0YXJnZXQucmVkcmF3KCk7XG59O1xuXG5lbmdpbmUuZmlyZUV2ZW50ID0gZnVuY3Rpb24gKGxpbmssIHZhbHVlKSB7XG4gICAgdmFyIHRhcmdldCA9IGxpbmsuZW5kLnBvcnQuYmxvY2s7XG4gICAgaWYgKHRhcmdldC5wb3J0cy5pbnB1dHNbMF0gPT09IGxpbmsuZW5kLnBvcnQpIHtcbiAgICAgICAgLy8gT25seSBhY3R1YWxseSBmaXJlIHRoZSBibG9jayBvbiBpdHMgZmlyc3QgaW5wdXQgcG9ydC5cbiAgICAgICAgZmlyZUV2ZW50Mih0YXJnZXQsIHZhbHVlKTtcbiAgICB9XG59O1xuXG5lbmdpbmUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB3aW5kb3cuY29tcGlsZVNjcmlwdCA9IGVuZ2luZS5jb21waWxlU2NyaXB0O1xuICAgIHdpbmRvdy5zZW5kRXZlbnRUb091dHB1dFBvcnQgPSBlbmdpbmUuc2VuZEV2ZW50VG9PdXRwdXRQb3J0O1xuICAgIHdpbmRvdy5maXJlRXZlbnQyID0gZW5naW5lLmZpcmVFdmVudDI7XG4gICAgd2luZG93LmZpcmVFdmVudCA9IGVuZ2luZS5maXJlRXZlbnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVuZ2luZTtcbiIsIi8vIFRoZSBwbGFjZSB0byBwb2xsdXRlIGdsb2JhbCBuYW1lc3BhY2UuXG5cbid1c2Ugc3RyaWN0Jztcblxud2luZG93LmxvYWRTY3JpcHQgPSBmdW5jdGlvbiAodXJsKVxue1xuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQuc2V0QXR0cmlidXRlKCd0eXBlJywndGV4dC9qYXZhc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnNldEF0dHJpYnV0ZSgnc3JjJywgdXJsKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChzY3JpcHQpO1xufTtcbiIsInZhciBodHRwID0ge307XG5cbmh0dHAuZ2V0ID0gZnVuY3Rpb24gKHVybCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwpO1xuXG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcXVlc3QucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3Quc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ05ldHdvcmsgZXJyb3InKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGh0dHA7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2VsZWN0b3IgPSB7XG4gICAgc2V0U2VsZWN0YWJsZTogZnVuY3Rpb24gKGVsZW1lbnQsIHdpdGhTdG9wUHJvcGFnYXRpb24pIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcztcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgc2VsZWN0b3IuYWN0aW9uKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHdpdGhTdG9wUHJvcGFnYXRpb24gIT09IHVuZGVmaW5lZCAmJiB3aXRoU3RvcFByb3BhZ2F0aW9uID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBjb25uZWN0YWJsZTogZnVuY3Rpb24gKGVsZW1lbnQxLCBlbGVtZW50Mikge1xuICAgICAgICBpZiAoZWxlbWVudDEuY29ubmVjdGFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQxLmNvbm5lY3RhYmxlKGVsZW1lbnQxLCBlbGVtZW50Mik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICBhY3Rpb246IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3RhYmxlKHRoaXMuc2VsZWN0ZWQsIGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jb25uZWN0KHRoaXMuc2VsZWN0ZWQsIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSBlbGVtZW50O1xuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVuc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2VsZWN0b3I7XG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG5nbG9iYWwuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiIsIlxuLypnbG9iYWwgd2luZG93ICovXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuXG4vKmdsb2JhbCBfICovXG5cbi8qZ2xvYmFsIGNvbW1hbmRzICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9yJyk7XG52YXIgdmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgc3RvcmFnZSA9IHt9O1xuXG5mdW5jdGlvbiBleHBvcnRQYXRjaCAoKSB7XG4gICAgdmlldy5zd2l0Y2hNb2RlKCdlZGl0Jyk7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBwYXRjaCA9IHt9O1xuICAgIHBhdGNoLmJsb2NrcyA9IFtdO1xuICAgIHBhdGNoLmxpbmtzID0gW107XG4gICAgXy5lYWNoKGVsZW1lbnRzLCBmdW5jdGlvbiAoZWxlbWVudCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGNvbnRlbnRDb250YWluZXJJbm5lckhUTUwgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50LWNvbnRhaW5lcicpLmlubmVySFRNTC50cmltKCk7XG4gICAgICAgIHZhciBjb250ZW50ID0gZWxlbWVudC5jb250ZW50O1xuICAgICAgICB2YXIgdGFnTmFtZSA9IGNvbnRlbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAoZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2NvbW1lbnQnKSkge1xuICAgICAgICAgICAgdGFnTmFtZSA9ICdjb21tZW50JztcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFsdWUgPSBjb250ZW50LnZhbHVlIHx8IGNvbnRlbnQuaW5uZXJIVE1MIHx8ICcnO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY29udGVudC5pbm5lckhUTUw7XG4gICAgICAgICAgICBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH0gZWxzZSBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdXRpbHMuZ2V0U2NyaXBTdHJpbmd0V2l0aE5ld2xpbmVzKGNvbnRlbnQpO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbnB1dFBvcnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKTtcbiAgICAgICAgdmFyIG91dHB1dFBvcnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0Jyk7XG4gICAgICAgIHBhdGNoLmJsb2Nrcy5wdXNoKHtcbiAgICAgICAgICAgIGlkOiBpbmRleCxcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgICAgICAgICBuSW5wdXRzOiBpbnB1dFBvcnRzLmxlbmd0aCxcbiAgICAgICAgICAgIG5PdXRwdXRzOiBvdXRwdXRQb3J0cy5sZW5ndGgsXG4gICAgICAgICAgICB0b3A6IGVsZW1lbnQuc3R5bGUudG9wLFxuICAgICAgICAgICAgbGVmdDogZWxlbWVudC5zdHlsZS5sZWZ0LFxuICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnQuc3R5bGUud2lkdGgsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBpbm5lckhUTUw6IGNvbnRlbnRDb250YWluZXJJbm5lckhUTUxcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBwaGFudG9tID0gY29udGVudC5waGFudG9tZWRCeTtcbiAgICAgICAgaWYgKHBoYW50b20gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGhhbnRvbS5zZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgtdG8tcGhhbnRvbScsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICBfLmVhY2goaW5wdXRQb3J0cywgZnVuY3Rpb24gKHBvcnQsIHBvcnRJbmRleCkge1xuICAgICAgICAgICAgdmFyIGluTGlua3MgPSBwb3J0LmxpbmtzO1xuICAgICAgICAgICAgXy5lYWNoKGluTGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyUG9ydCA9IGxpbmsuYmVnaW4ucG9ydDtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9jayA9IG90aGVyUG9ydC5ibG9jaztcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9ja0luZGV4ID0gXy5pbmRleE9mKGVsZW1lbnRzLCBvdGhlckJsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9ja1BvcnRzID0gb3RoZXJCbG9jay5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0Jyk7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tQb3J0SW5kZXggPSBfLmluZGV4T2Yob3RoZXJCbG9ja1BvcnRzLCBvdGhlclBvcnQpO1xuICAgICAgICAgICAgICAgIHBhdGNoLmxpbmtzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2s6IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcG9ydEluZGV4XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2s6IG90aGVyQmxvY2tJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IG90aGVyQmxvY2tQb3J0SW5kZXhcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHBhdGNoLnByZXNlbnRhdGlvbiA9IHt9O1xuICAgIHBhdGNoLnByZXNlbnRhdGlvbi5pbm5lckhUTUwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykuaW5uZXJIVE1MO1xuICAgIHZhciBwaGFudG9tcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xuICAgIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAgICAgLy8gRklYTUUgZGF0YS1pbmRleC10by1waGFudG9tIGluc3RlYWQ/XG4gICAgICAgIHBoYW50b20ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXBoYW50b21lZC1ibG9jay1pZCcpO1xuICAgIH0pO1xuICAgIHJldHVybiBwYXRjaDtcbn07XG5cbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbnZhciBjb25uZWN0QmxvY2tzID0gZnVuY3Rpb24oZW5kLCBzdGFydCwgaW5wdXRQb3J0UG9zaXRpb24sIG91dHB1dFBvcnRQb3NpdGlvbikge1xuICAgIHZhciBzdGFydFBvcnQgPSAoc3RhcnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpKVtvdXRwdXRQb3J0UG9zaXRpb25dO1xuICAgIHZhciBlbmRQb3J0ID0gKGVuZC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKSlbaW5wdXRQb3J0UG9zaXRpb25dO1xuICAgIGlmIChzdGFydFBvcnQuY29ubmVjdGFibGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUT0RPIGNvbm5lY3RhYmxlIHRha2VzIHNvbWUgdGltZSB0byBiZSBkZWZpbmVkLiBXYWl0IGZvciBpdC5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY29ubmVjdEJsb2NrcywgMSwgZW5kLCBzdGFydCwgaW5wdXRQb3J0UG9zaXRpb24sIG91dHB1dFBvcnRQb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChzdGFydFBvcnQuY29ubmVjdGFibGUoc3RhcnRQb3J0LCBlbmRQb3J0KSkge1xuICAgICAgICBzdGFydFBvcnQuY29ubmVjdChzdGFydFBvcnQsIGVuZFBvcnQpO1xuICAgIH1cbn07XG5cbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbnZhciBjcmVhdGVQaGFudG9tTGlua0ZvckJsb2NrID0gZnVuY3Rpb24gKGJsb2NrLCBwaGFudG9tKSB7XG4gICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgIGlmIChjb250ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gRklYIE1FIHdhaXQgdGhhdCBjb250ZW50IGFjdHVhbGx5IGV4aXN0cy5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jaywgMSwgYmxvY2ssIHBoYW50b20pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcuY3JlYXRlUGhhbnRvbUxpbmsoY29udGVudCwgcGhhbnRvbSk7XG4gICAgfVxufTtcblxudmFyIGltcG9ydFBhdGNoID0gZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgdmFyIGVsZW1lbnRzID0gW107XG4gICAgXy5lYWNoKHBhdGNoLmJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIGJsb2NrLm5JbnB1dHMgPSBibG9jay5uSW5wdXRzIHx8IDA7XG4gICAgICAgIGJsb2NrLm5PdXRwdXRzID0gYmxvY2subk91dHB1dHMgfHwgMDtcbiAgICAgICAgaWYgKGJsb2NrLnRhZ05hbWUgPT09ICdzY3JpcHQnIHx8wqBibG9jay50YWdOYW1lID09PSAnYnV0dG9uJyB8fCBibG9jay50YWdOYW1lID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgIGVkaXRvci5hZGRCbG9jaygnaHRtbCcsIGJsb2NrLnRhZ05hbWUsIGJsb2NrLnZhbHVlLCBibG9jay5uSW5wdXRzLCBibG9jay5uT3V0cHV0cywgYmxvY2sudG9wLCBibG9jay5sZWZ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVkaXRvci5hZGRCbG9jaygnaHRtbCcsIGJsb2NrLmlubmVySFRNTCwgJycsIGJsb2NrLm5JbnB1dHMsIGJsb2NrLm5PdXRwdXRzLCBibG9jay50b3AsIGJsb2NrLmxlZnQpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50Jyk7XG4gICAgICAgIGVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgfSk7XG4gICAgXy5lYWNoKHBhdGNoLmxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICB2YXIgb3V0cHV0ID0gZWxlbWVudHNbbGluay5vdXRwdXQuYmxvY2tdO1xuICAgICAgICB2YXIgaW5wdXQgPSBlbGVtZW50c1tsaW5rLmlucHV0LmJsb2NrXTtcbiAgICAgICAgY29ubmVjdEJsb2NrcyhpbnB1dCwgb3V0cHV0LCBsaW5rLmlucHV0LnBvcnQsIGxpbmsub3V0cHV0LnBvcnQpO1xuICAgIH0pO1xuICAgIHZhciBwcmVzZW50YXRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJyk7XG4gICAgcHJlc2VudGF0aW9uLmlubmVySFRNTCA9IHBhdGNoLnByZXNlbnRhdGlvbi5pbm5lckhUTUw7XG4gICAgdmFyIHBoYW50b21zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLnF1ZXJ5U2VsZWN0b3JBbGwoJy5waGFudG9tJyk7XG4gICAgXy5lYWNoKHBoYW50b21zLCBmdW5jdGlvbiAocGhhbnRvbSkge1xuICAgICAgICB2YXIgaW5kZXggPSBwaGFudG9tLmdldEF0dHJpYnV0ZSgnZGF0YS1pbmRleC10by1waGFudG9tJyk7XG4gICAgICAgIHZhciBibG9jayA9IGVsZW1lbnRzW2luZGV4XTtcbiAgICAgICAgY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jayhibG9jaywgcGhhbnRvbSk7XG4gICAgfSk7XG59O1xuXG5zdG9yYWdlLnNhdmVQYXRjaCA9IGZ1bmN0aW9uICh3aGVyZSwgbmFtZSkge1xuICAgIGlmIChuYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gT25seSBvbmUgYXJndW1lbnQgbWVhbnMgaXQgaXMgYWN0dWFsbHkgdGhlIG5hbWUgYW5kIHdlIGxvYWQgZnJvbVxuICAgICAgICAvLyBsb2NhbHN0b3JhZ2UuXG4gICAgICAgIG5hbWUgPSB3aGVyZTtcbiAgICAgICAgd2hlcmUgPSAnbG9jYWwnO1xuICAgIH1cbiAgICB2YXIgcGF0Y2ggPSBleHBvcnRQYXRjaCgpO1xuICAgIGlmICh3aGVyZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgICAgICBwYXRjaGVzID0gcGF0Y2hlcyB8fCB7fTtcbiAgICAgICAgcGF0Y2hlc1tuYW1lXSA9IHBhdGNoO1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3BhdGNoZXMnLCBKU09OLnN0cmluZ2lmeShwYXRjaGVzKSk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2ZpbGUnKSB7XG4gICAgICAgIHZhciBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocGF0Y2gsIG51bGwsICcgICAgJyk7XG4gICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2NvbnRlbnRdLCB7IHR5cGUgOiBcInRleHQvcGxhaW5cIiwgZW5kaW5nczogXCJ0cmFuc3BhcmVudFwifSk7XG4gICAgICAgIHdpbmRvdy5zYXZlQXMoYmxvYiwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2JhZCBzYXZlIGxvY2F0aW9uIChcIicgKyB3aGVyZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIpLCBtdXN0IGJlIFwibG9jYWxcIiBvciBcImZpbGVcIicpO1xuICAgIH1cbn07XG5cbnN0b3JhZ2UubG9hZFBhdGNoID0gZnVuY3Rpb24gKHdoZXJlLCB3aGF0KSB7XG4gICAgaWYgKHdoYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB3aGF0ID0gd2hlcmU7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2hhdCkgPT09ICdbb2JqZWN0IEZpbGVdJykge1xuICAgICAgICAgICAgd2hlcmUgPSAnZmlsZSBvYmplY3QnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hlcmUgPSAnbG9jYWwnO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBwcm9taXNlO1xuICAgIGlmICh3aGVyZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgICAgICBwYXRjaGVzID0gcGF0Y2hlcyB8fCB7fTtcbiAgICAgICAgdmFyIHBhdGNoID0gcGF0Y2hlc1t3aGF0XTtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmIChwYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYXRjaCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChFcnJvcignTm8gcGF0Y2ggd2l0aCBuYW1lIFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGF0ICsgJ1wiIGluIGxvY2FsIHN0b3JhZ2UuJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnaHR0cCcpIHtcbiAgICAgICAgdmFyIHVybCA9IHdoYXQ7XG4gICAgICAgIHByb21pc2UgPSBodHRwLmdldCh1cmwpO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdmaWxlIG9iamVjdCcpIHtcbiAgICAgICAgdmFyIGZpbGUgPSB3aGF0O1xuICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIGZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UoZXZlbnQudGFyZ2V0LnJlc3VsdCkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZpbGVSZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcignYmFkIGxvYWQgbG9jYXRpb24gKFwiJyArIHdoZXJlICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdcIiksIG11c3QgYmUgXCJsb2NhbFwiIG9yIFwiaHR0cFwiJykpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbiAocGF0Y2gpIHtcbiAgICAgICAgZWRpdG9yLmNsZWFyQWxsKCk7XG4gICAgICAgIGltcG9ydFBhdGNoKHBhdGNoKTtcbiAgICB9KTtcbn07XG5cbnN0b3JhZ2UucmVtb3ZlUGF0Y2ggPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgdmFyIHRyYXNoID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3RyYXNoJykpO1xuICAgIHRyYXNoID0gdHJhc2ggfHwge307XG4gICAgdmFyIHBhdGNoID0gcGF0Y2hlc1tuYW1lXTtcbiAgICBpZiAocGF0Y2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyAnTm8gcGF0Y2ggd2l0aCBuYW1lIFwiJyArIG5hbWUgKyAnXCIgaW4gbG9jYWwgc3RvcmFnZS4nO1xuICAgIH1cbiAgICB0cmFzaFtuYW1lXSA9IHBhdGNoO1xuICAgIGRlbGV0ZSBwYXRjaGVzW25hbWVdO1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGF0Y2hlcycsIEpTT04uc3RyaW5naWZ5KHBhdGNoZXMpKTtcbiAgICBlZGl0b3IuY2xlYXJBbGwoKTtcbn07XG5cbnN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgIHJldHVybiBfLmtleXMocGF0Y2hlcyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0b3JhZ2U7XG4iLCIvLyBVc2Ugb2YgdGVybWxpYi5qcyBmb3IgdGhlIHRlcm1pbmFsIGZyYW1lLlxuXG4vKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cblxuLy8gZ2xvYmFscyBmcm9tIHRlcm1saWIuanNcbi8qZ2xvYmFsIFRlcm1HbG9iYWxzICovXG4vKmdsb2JhbCB0ZXJtS2V5ICovXG4vKmdsb2JhbCBQYXJzZXIgKi9cbi8qZ2xvYmFsIFRlcm1pbmFsICovXG5cbnZhciB0ZXJtaW5hbCA9IHt9O1xuXG50ZXJtaW5hbC5jcmVhdGUgPSBmdW5jdGlvbiAoY29tbWFuZHMsIG9uYmx1cikge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciB0ZXJtRGl2SWQgPSAnY29tbWFuZC1saW5lLWZyYW1lJztcblxuICAgIHZhciBnZXRUZXJtRGl2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycgKyB0ZXJtRGl2SWQpO1xuICAgIH07XG5cbiAgICB2YXIgYmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgVGVybUdsb2JhbHMua2V5bG9jayA9IHRydWU7XG4gICAgICAgIFRlcm1HbG9iYWxzLmFjdGl2ZVRlcm0uY3Vyc29yT2ZmKCk7XG4gICAgICAgIHZhciB0ZXJtRGl2ID0gZ2V0VGVybURpdigpO1xuICAgICAgICB0ZXJtRGl2LmNsYXNzTGlzdC50b2dnbGUoJ2ZvY3VzZWQnKTtcbiAgICAgICAgb25ibHVyKCk7XG4gICAgfTtcblxuICAgIHZhciBjdHJsSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRDaGFyID09PSB0ZXJtS2V5LkVTQykge1xuICAgICAgICAgICAgYmx1cigpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciB0ZXJtSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGF0Lm5ld0xpbmUoKTtcbiAgICAgICAgdmFyIHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbiAgICAgICAgcGFyc2VyLnBhcnNlTGluZSh0aGF0KTtcbiAgICAgICAgdmFyIGNvbW1hbmROYW1lID0gdGhhdC5hcmd2WzBdO1xuICAgICAgICBpZiAoY29tbWFuZHMuaGFzT3duUHJvcGVydHkoY29tbWFuZE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHRoYXQuYXJndi5zbGljZSgxKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNvbW1hbmRzW2NvbW1hbmROYW1lXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC50aGVuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZSgnRXJyb3I6ICcgKyBlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhhdC53cml0ZShlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0LndyaXRlKCd1bmtub3duIGNvbW1hbmQgXCInICsgY29tbWFuZE5hbWUgKyAnXCIuJyk7XG4gICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBpbml0SGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wcm9tcHQoKTtcbiAgICB9O1xuXG4gICAgLy8gVGhlIHRlcm1saWIuanMgb2JqZWN0XG4gICAgdmFyIHRlcm0gPSBuZXcgVGVybWluYWwoIHtcbiAgICAgICAgdGVybURpdjogdGVybURpdklkLFxuICAgICAgICBoYW5kbGVyOiB0ZXJtSGFuZGxlcixcbiAgICAgICAgYmdDb2xvcjogJyNmMGYwZjAnLFxuICAgICAgICBjcnNyQmxpbmtNb2RlOiB0cnVlLFxuICAgICAgICBjcnNyQmxvY2tNb2RlOiBmYWxzZSxcbiAgICAgICAgcm93czogMTAsXG4gICAgICAgIGZyYW1lV2lkdGg6IDAsXG4gICAgICAgIGNsb3NlT25FU0M6IGZhbHNlLFxuICAgICAgICBjdHJsSGFuZGxlcjogY3RybEhhbmRsZXIsXG4gICAgICAgIGluaXRIYW5kbGVyOiBpbml0SGFuZGxlclxuXG4gICAgfSApO1xuICAgIHRlcm0ub3BlbigpO1xuXG4gICAgdmFyIGZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoVGVybUdsb2JhbHMua2V5bG9jayA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBUZXJtR2xvYmFscy5rZXlsb2NrID0gZmFsc2U7XG4gICAgICAgIFRlcm1HbG9iYWxzLmFjdGl2ZVRlcm0uY3Vyc29yT24oKTtcbiAgICAgICAgdmFyIHRlcm1EaXYgPSBnZXRUZXJtRGl2KCk7XG4gICAgICAgIHRlcm1EaXYuY2xhc3NMaXN0LnRvZ2dsZSgnZm9jdXNlZCcpO1xuICAgIH07XG5cbiAgICBibHVyKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBmb2N1czogZm9jdXMsXG4gICAgICAgIHRlcm06IHRlcm1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB0ZXJtaW5hbDtcbiIsIi8vIFN5bnRhY3RpYyBzdWdhciBhbmQgc2ltcGxlIHV0aWxpdGllcy5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuLypnbG9iYWwgZG9jdW1lbnQsIHdpbmRvdyAqL1xuXG4vKmdsb2JhbCBfICovXG5cbnZhciB1dGlscyA9IHt9O1xuXG52YXIgZG9tO1xuZG9tID0ge1xuICAgIC8vIENyZWF0ZSBhIGRvbSBmcmFnbWVudCBmcm9tIGEgSFRNTCBzdHJpbmcuXG4gICAgY3JlYXRlRnJhZ21lbnQ6IGZ1bmN0aW9uKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICBpZiAoaHRtbFN0cmluZykge1xuICAgICAgICAgICAgdmFyIGRpdiA9IGZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKTtcbiAgICAgICAgICAgIGRpdi5pbm5lckhUTUwgPSBodG1sU3RyaW5nO1xuICAgICAgICAgICAgdmFyIGNoaWxkO1xuICAgICAgICAgICAgLyplc2xpbnQtZGlzYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgICAgICAgICAgd2hpbGUgKGNoaWxkID0gZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAvKmVzbGludC1lbmFibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICAgICAgICAgICAgICBmcmFnbWVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIGRpdik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFnbWVudC5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICB9LFxuXG4gICAgLy8gTW92ZSBET00gbm9kZXMgZnJvbSBhIHNvdXJjZSB0byBhIHRhcmdldC4gVGhlIG5vZGVzIGFyZXMgc2VsZWN0ZWRcbiAgICAvLyBiYXNlZCBvbiBhIHNlbGVjdG9yIGFuZCB0aGUgcGxhY2UgdGhleSBhcmUgaW5zdGVydGVkIGlzIGEgZ2l2ZW4gdGFnXG4gICAgLy8gd2l0aCBhIFwic2VsZWN0XCIgYXR0cmlidXRlIHdoaWNoIGNvbnRhaW5zIHRoZSBnaXZlbiBzZWxlY3Rvci4gSWZcbiAgICAvLyAgICBzb3VyY2UgaXMgJ2FhYSA8c3BhbiBjbGFzcz1cInNvbWV0aGluZ1wiPnp6ejwvc3Bhbj4nXG4gICAgLy8gYW5kXG4gICAgLy8gICAgdGFyZ2V0IGlzICdycnIgPGNvbnRlbnQgc2VsZWN0PVwiLnNvbWV0aGluZ1wiPjwvY29udGVudD4gdHR0J1xuICAgIC8vIEFmdGVyIG1vdmVDb250ZW50QmFzZWRPblNlbGVjdG9yKHNvdXJjZSwgdGFyZ2V0LCAnLnNvbWV0aGluZycpOlxuICAgIC8vICAgIHNvdXJjZSBpcyAnYWFhJ1xuICAgIC8vIGFuZFxuICAgIC8vICAgIHRhcmdldCBpcyAncnJyIDxzcGFuIGNsYXNzPVwic29tZXRoaW5nXCI+enp6PC9zcGFuPiB0dHQnXG4gICAgbW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3I6IGZ1bmN0aW9uKHNvdXJjZSwgdGFyZ2V0LCBzZWxlY3RvciwgdGFyZ2V0VGFnKSB7XG4gICAgICAgIHZhciBjb250ZW50O1xuICAgICAgICB2YXIgZWxlbWVudHM7XG4gICAgICAgIGlmIChzZWxlY3RvciA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnRlbnQgPSB0YXJnZXQucXVlcnlTZWxlY3Rvcih0YXJnZXRUYWcpO1xuICAgICAgICAgICAgZWxlbWVudHMgPSBzb3VyY2UuY2hpbGROb2RlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRlbnQgPSB0YXJnZXQucXVlcnlTZWxlY3Rvcih0YXJnZXRUYWcgKyAnW3NlbGVjdD1cIicgKyBzZWxlY3RvciArICdcIl0nKTtcbiAgICAgICAgICAgIGVsZW1lbnRzID0gc291cmNlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdhcm5pbmc6IGl0IGlzIGltcG9ydGFudCB0byBsb29wIGVsZW1lbnRzIGJhY2t3YXJkIHNpbmNlIGN1cnJlbnRcbiAgICAgICAgLy8gZWxlbWVudCBpcyByZW1vdmVkIGF0IGVhY2ggc3RlcC5cbiAgICAgICAgZm9yICh2YXIgaSA9IGVsZW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgLy8gVE9ETy4gTGUgXCJpbnNlcnRcIiBjaS1kZXNzb3VzIHN1ciBsZXMgei1wb3J0IGZhaXQgcXVlIGxlXG4gICAgICAgICAgICAvLyBkZXRhY2hlZENhbGxiYWNrIGVzdCBhcHBlbMOpIGF2ZWMgbCdpbXBsZW1lbnRhdGlvbiBkZSBjdXN0b21cbiAgICAgICAgICAgIC8vIGVsbWVudHMgcGFyIHdlYnJlZmxlY3Rpb25zIG1haXMgcGFzIHBhciBsJ2ltcGzDqW1lbnRhdGlvbiBkZVxuICAgICAgICAgICAgLy8gUG9seW1lciAoZW4gdXRpbGlzYW50IGxlIHBvbHlmaWxsIGRlIEJvc29uaWMpIG5pIGF2ZWNcbiAgICAgICAgICAgIC8vIGwnaW1wbMOpbWVudGF0aW9uIG5hdGl2ZSBkZSBjaHJvbWUuXG4gICAgICAgICAgICBjb250ZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50Lm5leHRTaWJsaW5nXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gVE9ETyBtb3ZlIHRoaXMgZWxzZXdoZXJlLlxuICAgICAgICAgICAgaWYgKGVsZW1lbnQub25jbGljayA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQub25jbGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGdsb2JhbCB0byBhY2Nlc3MgdGhpcyBmdW5jdGlvbiBiZWNhdXNlIHVzaW5nIHJlcXVpcmVcbiAgICAgICAgICAgICAgICAgICAgLy8gb24gY29tbWFuZHMgaGFzIGEgY3ljbGljIGRlcGVuZGVuY3kuXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5hcHAuY29tbWFuZHMuZWRpdEJsb2NrKHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb250ZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY29udGVudCk7XG4gICAgfSxcblxuICAgIG1vdmU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGRvbS5tb3ZlQ29udGVudEJhc2VkT25TZWxlY3RvcihcbiAgICAgICAgICAgICAgICBvcHRpb25zLmZyb20sXG4gICAgICAgICAgICAgICAgb3B0aW9ucy50byxcbiAgICAgICAgICAgICAgICBvcHRpb25zLndpdGhTZWxlY3RvcixcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uVGFnXG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8vIEdldCB0aGUgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQgcmVsYXRpdmUgdG8gYW5vdGhlciBvbmUgKGRlZmF1bHQgaXNcbiAgICAvLyBkb2N1bWVudCBib2R5KS5cbiAgICBnZXRQb3NpdGlvbjogZnVuY3Rpb24gKGVsZW1lbnQsIHJlbGF0aXZlRWxlbWVudCkge1xuICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHJlbGF0aXZlRWxlbWVudCA9IHJlbGF0aXZlRWxlbWVudCB8fCBkb2N1bWVudC5ib2R5O1xuICAgICAgICB2YXIgcmVsYXRpdmVSZWN0ID0gcmVsYXRpdmVFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcmVjdC5sZWZ0IC0gcmVsYXRpdmVSZWN0LmxlZnQsXG4gICAgICAgICAgICB5OiByZWN0LnRvcCAtIHJlbGF0aXZlUmVjdC50b3BcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VsZWN0aW9uU3RhcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKS5hbmNob3JOb2RlO1xuICAgICAgICByZXR1cm4gKCAobm9kZSAhPT0gbnVsbCAmJiBub2RlLm5vZGVUeXBlID09PSAzKSA/IG5vZGUucGFyZW50Tm9kZSA6IG5vZGUgKTtcbiAgICB9XG5cbn07XG51dGlscy5kb20gPSBkb207XG5cbi8vIFVzZWZ1bGwgZm9yIG11bHRpbGluZSBzdHJpbmcgZGVmaW5pdGlvbiB3aXRob3V0ICdcXCcgb3IgbXVsdGlsaW5lXG4vLyBjb25jYXRlbmF0aW9uIHdpdGggJysnLlxudXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBmdW5jLnRvU3RyaW5nKCkubWF0Y2goL1teXSpcXC9cXCooW15dKilcXCpcXC9cXHMqXFx9JC8pWzFdO1xufTtcblxudXRpbHMuY3JlYXRlS2V5c0dlbmVyYXRvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBSZXR1cm5zIGEga2V5cyBnZW5lcmF0b3IgZm9yIGEgc2VxdWVuY2UgdGhhdCBpcyBidWlsZCBsaWtlIHRoYXQ6XG4gICAgLy8gICBiLCBjLCBkLi4uXG4gICAgLy8gICBhYiwgYWMsIGFkLi4uXG4gICAgLy8gICBhYWIsIGFhYywgYWFkLi4uXG4gICAgLy8gVGhlIGlkZWEgaXMgdG8gaGF2ZSBhIHNlcXVlbmNlIHdoZXJlIGVhY2ggdmFsdWUgaXMgbm90IHRoZSBiZWdpbm5pbmdcbiAgICAvLyBvZiBhbnkgb3RoZXIgdmFsdWUgKHNvIHNpbmdsZSAnYScgY2FuJ3QgYmUgcGFydCBvZiB0aGUgc2VxdWVuY2UpLlxuICAgIC8vXG4gICAgLy8gT25lIGdvYWwgaXMgdG8gaGF2ZSBzaG9ydGVzdCBwb3NzaWJsZSBrZXlzLiBTbyBtYXliZSB3ZSBzaG91bGQgdXNlXG4gICAgLy8gYWRkaXRpb25uYWwgcHJlZml4IGNoYXJzIGFsb25nIHdpdGggJ2EnLiBBbmQgYmVjYXVzZSBpdCB3aWxsIGJlIHVzZWRcbiAgICAvLyBmb3Igc2hvcnRjdXRzLCBtYXliZSB3ZSBjYW4gY2hvb3NlIGNoYXJzIGJhc2VkIG9uIHRoZWlyIHBvc2l0aW9uIG9uXG4gICAgLy8gdGhlIGtleWJvYXJkLlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIGNoYXJDb2RlcyA9IF8ucmFuZ2UoJ2InLmNoYXJDb2RlQXQoMCksICd6Jy5jaGFyQ29kZUF0KDApICsgMSk7XG4gICAgdmFyIGlkU3RyaW5ncyA9IF8ubWFwKGNoYXJDb2RlcywgZnVuY3Rpb24gKGNoYXJDb2RlKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJDb2RlKTtcbiAgICB9KTtcbiAgICB2YXIgZ2VuZXJhdG9yID0ge307XG4gICAgZ2VuZXJhdG9yLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBrZXkgPSAnJztcbiAgICAgICAgdmFyIGkgPSBpbmRleDtcbiAgICAgICAgaWYgKGkgPj0gY2hhckNvZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIHIgPSBNYXRoLmZsb29yKGkgLyBjaGFyQ29kZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGkgPSBpICUgY2hhckNvZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChyID4gMCkge1xuICAgICAgICAgICAgICAgIGtleSArPSAnYSc7XG4gICAgICAgICAgICAgICAgci0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGtleSArPSBpZFN0cmluZ3NbaV07XG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfTtcblxuICAgIHJldHVybiBnZW5lcmF0b3I7XG59O1xuXG51dGlscy5nZXRTY3JpcFN0cmluZ3RXaXRoTmV3bGluZXMgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIC8vIFRoZSBuZXdsaW5lcyBhcmUgbG9zdCB3aGVuIHVzaW5nIHJhdyBpbm5lckhUTUwgZm9yIHNjcmlwdCB0YWdzXG4gICAgLy8gKGF0IGxlYXN0IG9uIGZpcmVmb3gpLiBTbyB3ZSBwYXJzZSBlYWNoIGNoaWxkIHRvIGFkZCBhIG5ld2xpbmVcbiAgICAvLyB3aGVuIEJSIGFyZSBlbmNvdW50ZXJlZC5cbiAgICB2YXIgdmFsdWUgPSAnJztcbiAgICBbXS5mb3JFYWNoLmNhbGwoZWxlbWVudC5jaGlsZE5vZGVzLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS50YWdOYW1lID09PSAnQlInKSB7XG4gICAgICAgICAgICB2YWx1ZSArPSAnXFxuJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlICs9IG5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5cbndpbmRvdy51dGlscyA9IHV0aWxzO1xubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgd2luZG93ICovXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuXG4vKmdsb2JhbCBfICovXG4vKmdsb2JhbCBNb3VzZXRyYXAgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG5cbnZhciB2aWV3ID0ge307XG5cbnZhciBpc0Rlc2NlbmRhbnQgPSBmdW5jdGlvbiAoY2hpbGQsIHBhcmVudCkge1xuICAgICB2YXIgbm9kZSA9IGNoaWxkLnBhcmVudE5vZGU7XG4gICAgIHdoaWxlIChub2RlICE9PSBudWxsKSB7XG4gICAgICAgICBpZiAobm9kZSA9PT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICB9XG4gICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICB9XG4gICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBnZXRQcmVzZW50YXRpb25FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpO1xufTtcblxudmFyIGNyZWF0ZVBoYW50b21MaW5rID0gZnVuY3Rpb24gKHBoYW50b21lZCwgcGhhbnRvbSkge1xuICAgIHBoYW50b20ucGhhbnRvbU9mID0gcGhhbnRvbWVkO1xuICAgIHBoYW50b20uY2xhc3NMaXN0LmFkZCgncGhhbnRvbScpO1xuICAgIHBoYW50b21lZC5waGFudG9tZWRCeSA9IHBoYW50b207XG4gICAgcGhhbnRvbWVkLmNsYXNzTGlzdC5hZGQoJ3BoYW50b21lZCcpO1xufTtcbnZpZXcuY3JlYXRlUGhhbnRvbUxpbmsgPSBjcmVhdGVQaGFudG9tTGluaztcblxudmFyIGNyZWF0ZVBoYW50b20gPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgcGhhbnRvbSA9IGVsZW1lbnQuY2xvbmVOb2RlKHRydWUpO1xuICBwaGFudG9tLmRpc2FibGVkID0gdHJ1ZTtcbiAgcGhhbnRvbS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRFZGl0YWJsZScsIGZhbHNlKTtcbiAgLy8gTGluayB0aGUgdHdvIGZvciBsYXRlciB1c2UgKGluIHBhcnRpY3VsYXJ5IHdoZW4gd2Ugd2lsbCBzd2l0Y2hcbiAgLy8gZGlzcGxheSBtb2RlKS5cbiAgY3JlYXRlUGhhbnRvbUxpbmsoZWxlbWVudCwgcGhhbnRvbSk7XG5cbiAgcmV0dXJuIHBoYW50b207XG59O1xuXG52YXIgaXNDdXJyZW50U2VsZWN0aW9uSW5QcmVzZW50YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCB0aGUgc2VsZWN0aW9uIHJhbmdlIChvciBjdXJzb3IgcG9zaXRpb24pXG4gIHZhciByYW5nZSA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICB2YXIgemVQcmVzZW50YXRpb24gPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gIC8vIEJlIHN1cmUgdGhlIHNlbGVjdGlvbiBpcyBpbiB0aGUgcHJlc2VudGF0aW9uLlxuICByZXR1cm4gaXNEZXNjZW5kYW50KHJhbmdlLnN0YXJ0Q29udGFpbmVyLCB6ZVByZXNlbnRhdGlvbik7XG59O1xuXG52YXIgaW5zZXJ0SW5QbGFjZU9mU2VsZWN0aW9uID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgLy8gR2V0IHRoZSBzZWxlY3Rpb24gcmFuZ2UgKG9yIGN1cnNvciBwb3NpdGlvbilcbiAgdmFyIHJhbmdlID0gd2luZG93LmdldFNlbGVjdGlvbigpLmdldFJhbmdlQXQoMCk7XG4gIC8vIERlbGV0ZSB3aGF0ZXZlciBpcyBvbiB0aGUgcmFuZ2VcbiAgcmFuZ2UuZGVsZXRlQ29udGVudHMoKTtcbiAgcmFuZ2UuaW5zZXJ0Tm9kZShlbGVtZW50KTtcbn07XG5cbi8vIEluc2VydCBhIHNlbGVjdGVkIGJsb2NrIGluIHRoZSBET00gc2VsZWN0aW9uIGluIHByZXNlbnRhdGlvbiB3aW5kb3cuXG52YXIgaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBibG9jayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCcpO1xuICBpZiAoYmxvY2sgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE5vdGhpbmcgaXMgc2VsZWN0ZWQuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYoaXNDdXJyZW50U2VsZWN0aW9uSW5QcmVzZW50YXRpb24oKSkge1xuICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICB2YXIgcGhhbnRvbSA9IGNyZWF0ZVBoYW50b20oY29udGVudCk7XG4gICAgaW5zZXJ0SW5QbGFjZU9mU2VsZWN0aW9uKHBoYW50b20pO1xuXG4gICAgLy8gVE9ETyBldmVudHVhbGx5IHN3aXRjaCB0aGUgdHdvIGlmIHdlIGFyZSBpbiBwcmVzZW50YXRpb24gbW9kZS5cbiAgfVxufTtcbnZpZXcuaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb24gPSBpbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbjtcblxudmFyIGdldFBoYW50b21zID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgcmV0dXJuIGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbn07XG5cbnZhciBnZXRXaW5kb3dGb3JNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcbiAgdmFyIGlkID0gbW9kZTtcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbn07XG5cbnZhciBzd2FwRWxlbWVudHMgPSBmdW5jdGlvbiAob2JqMSwgb2JqMikge1xuICAgIC8vIGNyZWF0ZSBtYXJrZXIgZWxlbWVudCBhbmQgaW5zZXJ0IGl0IHdoZXJlIG9iajEgaXNcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG9iajEucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGVtcCwgb2JqMSk7XG5cbiAgICAvLyBtb3ZlIG9iajEgdG8gcmlnaHQgYmVmb3JlIG9iajJcbiAgICBvYmoyLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG9iajEsIG9iajIpO1xuXG4gICAgLy8gbW92ZSBvYmoyIHRvIHJpZ2h0IGJlZm9yZSB3aGVyZSBvYmoxIHVzZWQgdG8gYmVcbiAgICB0ZW1wLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG9iajIsIHRlbXApO1xuXG4gICAgLy8gcmVtb3ZlIHRlbXBvcmFyeSBtYXJrZXIgbm9kZVxuICAgIHRlbXAucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0ZW1wKTtcbn07XG5cbnZhciBjdXJyZW50TW9kZSA9ICcnO1xuXG4vLyBEbyBhbGwgdGhlIHN0dWZmIG5lZWRlZCB0byBzd2l0Y2ggbW9kZSBiZXR3ZWVuICdlZGl0JyBhbmQgJ3ByZXNlbnRhdGlvbicuXG4vLyBNYWlubHkgc3dhcCAncGhhbnRvbScgYW5kICdwaGFudG9tZWQnIG9iamVjdHMgcGFpcnMuXG52YXIgc3dpdGNoTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG4gICAgaWYgKG1vZGUgPT09IGN1cnJlbnRNb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY3VycmVudE1vZGUgPSBtb2RlO1xuICAvLyBCeSBjb252ZW50aW9uLCB0aGUgJ3BoYW50b20nIGVsZW1lbnRzIGFjdHVhbGx5IGFyZSBpbiB0aGUgd2luZG93XG4gIC8vIGFzc29jaWF0ZWQgdG8gdGhlIG1vZGUgd2Ugd2FudCB0byBzd2l0Y2ggdG8uIFRoZSBwaGFudG9tZWQgb25lIGFyZSBpbiB0aGVcbiAgLy8gd2luZG93IG9mIHRoZSBvdGhlciBtb2RlLlxuXG4gIHZhciBwaGFudG9tcyA9IGdldFBoYW50b21zKGdldFdpbmRvd0Zvck1vZGUobW9kZSkpO1xuICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgLy8gV2hhdCB0aGlzIG9iamVjdCBpcyB0aGUgcGhhbnRvbSBvZj9cbiAgICB2YXIgcGhhbnRvbWVkID0gcGhhbnRvbS5waGFudG9tT2Y7XG4gICAgLy8gU2ltcGx5IHN3YXAgdGhlc2UgRE9NIG9iamVjdHMuXG4gICAgc3dhcEVsZW1lbnRzKHBoYW50b21lZCwgcGhhbnRvbSk7XG4gIH0pO1xufTtcbnZpZXcuc3dpdGNoTW9kZSA9IHN3aXRjaE1vZGU7XG5cbnZhciBwcmVzZW50YXRpb24gPSB7fTtcblxuLy8gVE9ETyBub3QgdXNlZD9cbnZhciBzZWxlY3RFbGVtZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHByZXNlbnRhdGlvbi5zZWxlY3RlZCA9IGV2ZW50LnRhcmdldDtcbn07XG52aWV3LnNlbGVjdEVsZW1lbnQgPSBzZWxlY3RFbGVtZW50O1xuXG52YXIgbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLmNvbnRlbnRFZGl0YWJsZSA9IGZhbHNlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNsb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdW5sb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gZmFsc2U7XG59O1xudmlldy5sb2NrID0gbG9jaztcblxudmFyIHVubG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLmNvbnRlbnRFZGl0YWJsZSA9IHRydWU7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xvY2stYnV0dG9uJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdW5sb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gdHJ1ZTtcbn07XG52aWV3LnVubG9jayA9IHVubG9jaztcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLm9uZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIH07XG4gICAgcC5vbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbW1hbmRzLmJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9O1xufTtcbnZpZXcuaW5pdCA9IGluaXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gdmlldztcbmdsb2JhbC52aWV3ID0gdmlldztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuLypnbG9iYWwgcmVzdHlsZSAqL1xuLypnbG9iYWwgRHJhZ2dhYmlsbHkgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LWJsb2NrJztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8ZGl2IGlkPVwibWFpblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicG9ydHMtY29udGFpbmVyIGlucHV0c1wiPlxuICAgICAgICAgICAgPGNvbnRlbnQgc2VsZWN0PVwiei1wb3J0LmlucHV0XCI+PC9jb250ZW50PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJibG9jay1rZXlcIj5hPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudC1jb250YWluZXJcIj5cbiAgICAgICAgICAgIDxjb250ZW50PjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwb3J0cy1jb250YWluZXIgb3V0cHV0c1wiPlxuICAgICAgICAgICAgPGNvbnRlbnQgc2VsZWN0PVwiei1wb3J0Lm91dHB1dFwiPjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgIC8vIEJ5IGRlZmF1bHQgY3VzdG9tIGVsZW1lbnRzIGFyZSBpbmxpbmUgZWxlbWVudHMuIEN1cnJlbnQgZWxlbWVudFxuICAgICAgICAvLyBoYXMgaXRzIG93biBoZWlnaHQgYW5kIHdpZHRoIGFuZCBjYW4gYmUgaW5zdGVydGVkIGluIGEgdGV4dFxuICAgICAgICAvLyBmbG93LiBTbyB3ZSBuZWVkIGEgJ2Rpc3BsYXk6IGlubGluZS1ibG9jaycgc3R5bGUuIE1vcmVvdmVyLCB0aGlzXG4gICAgICAgIC8vIGlzIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgZm9yIGEgYnVnIGluIERyYWdnYWJpbGx5ICh3aGljaCBvbmx5XG4gICAgICAgIC8vIHdvcmtzIG9uIGJsb2NrIGVsZW1lbnRzLCBub3Qgb24gaW5saW5lIG9uZXMpLlxuICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnXG4gICAgfSxcbiAgICAnPiBkaXYnOiB7XG4gICAgICAgICdiYWNrZ3JvdW5kJzogJ3doaXRlJyxcbiAgICAgICAgJ2JvcmRlci1sZWZ0JzogJzNweCBzb2xpZCcsXG4gICAgICAgICdib3JkZXItbGVmdC1jb2xvcic6ICd3aGl0ZScsXG4gICAgICAgICdib3JkZXItcmlnaHQnOiAnM3B4IHNvbGlkJyxcbiAgICAgICAgJ2JvcmRlci1yaWdodC1jb2xvcic6ICd3aGl0ZScsXG4gICAgICAgICdib3hTaGFkb3cnOiAnMnB4IDJweCAzcHggMHB4ICNkZmRmZGYnXG4gICAgfSxcbiAgICAnLmNvbnRlbnQtY29udGFpbmVyJzoge1xuICAgICAgICAncGFkZGluZyc6ICc4cHggMTVweCA4cHggMTVweCdcbiAgICB9LFxuICAgICcucG9ydHMtY29udGFpbmVyJzoge1xuICAgICAgICAncGFkZGluZyc6IDAsXG4gICAgICAgICdtaW5IZWlnaHQnOiAzLFxuICAgICAgICAnb3ZlcmZsb3cnOiAndmlzaWJsZSdcbiAgICB9LFxuICAgICcucG9ydHMtY29udGFpbmVyIHotcG9ydCc6IHtcbiAgICAgICAgJ2Zsb2F0JzogJ2xlZnQnLFxuICAgICAgICAnbWFyZ2luTGVmdCc6IDgsXG4gICAgICAgICdtYXJnaW5SaWdodCc6IDhcbiAgICB9LFxuICAgICdzcGFuLmJsb2NrLWtleSc6IHtcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6ICdzbWFsbGVyJyxcbiAgICAgICAgJ2NvbG9yJzogJyM0NDQnLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnYm90dG9tJzogMCxcbiAgICAgICAgJ3JpZ2h0JzogMCxcbiAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiAzLFxuICAgICAgICAncGFkZGluZy1sZWZ0JzogMyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2ZmZidcbiAgICB9LFxuICAgICd6LXBvcnQuaW5wdXQgLnBvcnQta2V5Jzoge1xuICAgICAgICAndG9wJzogM1xuICAgIH0sXG4gICAgJ3otcG9ydC5vdXRwdXQgLnBvcnQta2V5Jzoge1xuICAgICAgICAnYm90dG9tJzogM1xuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgIHBvcnQucmVkcmF3KCk7XG4gICAgfSk7XG59O1xuXG52YXIgbWFrZUl0RHJhZ2dhYmxlID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIGRyYWdnaWUgPSBuZXcgRHJhZ2dhYmlsbHkoYmxvY2ssIHtcbiAgICAgICAgY29udGFpbm1lbnQ6IHRydWVcbiAgICB9KTtcbiAgICBkcmFnZ2llLmV4dGVybmFsQW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVkcmF3KGJsb2NrKTtcbiAgICB9O1xufTtcblxudmFyIHByb3BlcnRpZXMgPSB7XG4gICAgY3JlYXRlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBBdCB0aGUgYmVnaW5uaW5nIHRoZSBsaWdodCBET00gaXMgc3RvcmVkIGluIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgICAgIHZhciBsaWdodERvbSA9IHRoaXM7XG4gICAgICAgIC8vIFN0YXJ0IGNvbXBvc2VkIERPTSB3aXRoIGEgY29weSBvZiB0aGUgdGVtcGxhdGVcbiAgICAgICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAvLyBUaGVuIHByb2dyZXNzaXZlbHkgbW92ZSBlbGVtZW50cyBmcm9tIGxpZ2h0IHRvIGNvbXBvc2VkIERPTSBiYXNlZCBvblxuICAgICAgICAvLyBzZWxlY3RvcnMgb24gbGlnaHQgRE9NIGFuZCBmaWxsIDxjb250ZW50PiB0YWdzIGluIGNvbXBvc2VkIERPTSB3aXRoXG4gICAgICAgIC8vIHRoZW0uXG4gICAgICAgIFsnei1wb3J0LmlucHV0JywgJ3otcG9ydC5vdXRwdXQnLCAnJ10uZm9yRWFjaChmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgICAgdXRpbHMuZG9tLm1vdmUoe1xuICAgICAgICAgICAgICAgIGZyb206IGxpZ2h0RG9tLCB3aXRoU2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgIHRvOiBjb21wb3NlZERvbSwgb25UYWc6ICdjb250ZW50J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBBdCB0aGlzIHN0YWdlIGNvbXBvc2VkIERPTSBpcyBjb21wbGV0ZWQgYW5kIGxpZ2h0IERPTSBpcyBlbXB0eSAoaS5lLlxuICAgICAgICAvLyAndGhpcycgaGFzIG5vIGNoaWxkcmVuKS4gQ29tcG9zZWQgRE9NIGlzIHNldCBhcyB0aGUgY29udGVudCBvZiB0aGVcbiAgICAgICAgLy8gY3VycmVudCBlbGVtZW50LlxuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgICAgICB0aGlzLmhpZGVLZXkoKTtcblxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciBwb3J0cyA9IHRoYXQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24ocG9ydCkge1xuICAgICAgICAgICAgcG9ydC5ibG9jayA9IHRoYXQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMucXVlcnlTZWxlY3RvcignLnplLWNvbnRlbnQnKTtcblxuICAgICAgICAvLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG4gICAgICAgIHRoaXMub25jbGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHdpbmRvdy5zZXRDdXJyZW50QmxvY2sodGhhdCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG4gICAgfX0sXG5cbiAgICBhdHRhY2hlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBUT0RPIGJ1ZyBpbiBjaHJvbWUgb3IgaW4gd2VicmVmbGVjdGlvbiBwb2x5ZmlsbC4gSWYgbWFrZUl0RHJhZ2dhYmxlXG4gICAgICAgIC8vIGlzIGNhbGxlZCBpbiBjcmVhdGVkQ2FsbGJhY2sgdGhlbiBEcmFnZ2FiaWx5IGFkZHMgYVxuICAgICAgICAvLyAncG9zaXRpb246cmVsYXRpdmUnIGJlY2F1c2UgdGhlIGNzcyBzdHlsZSBvZiBibG9jayB0aGF0IHNldFxuICAgICAgICAvLyBwb3NpdGlvbiB0byBhYnNvbHV0ZSBoYXMgbm90IGJlZW4gYXBwbGllZCB5ZXQgKHdpdGggY2hyb21lKS4gV2l0aFxuICAgICAgICAvLyBXZWJSZWZsZWN0aW9uJ3MgcG9seWZpbGwgdGhlIHN0eWxlIGlzIGFwcGxpZWQgc28gRHJhZ2dhYmlsbHkgZG9lc24ndFxuICAgICAgICAvLyBjaGFuZ2UgcG9zaXRpb24uIFdoeSBhIGRpZmZlcmVudCBiZWhhdmlvdXI/IFdoaWNoIGlzIHdyb25nID8gQ2hyb21lLFxuICAgICAgICAvLyB3ZWJyZWZsZWN0aW9uIG9yIHRoZSBzcGVjPyBNYXliZSB3ZSBjYW4gdHJ5IHdpdGggcG9seW1lciBwb2x5ZmlsbC5cbiAgICAgICAgbWFrZUl0RHJhZ2dhYmxlKHRoaXMpO1xuICAgIH19LFxuXG4gICAgdW5wbHVnOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcG9ydHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgICAgICBwb3J0LnVucGx1ZygpO1xuICAgICAgICB9KTtcbiAgICB9fSxcblxuICAgIGFkZFBvcnQ6IHt2YWx1ZTogZnVuY3Rpb24gKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxTdHJpbmcpO1xuICAgICAgICB2YXIgcG9ydCA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgIHBvcnQuYmxvY2sgPSB0aGlzO1xuICAgICAgICBpZiAocG9ydC5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JykpIHtcbiAgICAgICAgICAgIHZhciBwb3J0Q29udGFpbmVyID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcucG9ydHMtY29udGFpbmVyLmlucHV0cycpO1xuICAgICAgICAgICAgcG9ydENvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAocG9ydC5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKSB7XG4gICAgICAgICAgICB2YXIgcG9ydENvbnRhaW5lciA9IHRoaXMucXVlcnlTZWxlY3RvcignLnBvcnRzLWNvbnRhaW5lci5vdXRwdXRzJyk7XG4gICAgICAgICAgICBwb3J0Q29udGFpbmVyLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcG9ydDtcbiAgICB9fSxcblxuICAgIGtleUVsZW1lbnQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKCdzcGFuLmJsb2NrLWtleScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleToge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5rZXlFbGVtZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNob3dLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICB9fSxcblxuICAgIGhpZGVLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIH19LFxuXG4gICAgcG9ydHM6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdvdXQnOiB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3otcG9ydC5vdXRwdXQnKSxcbiAgICAgICAgICAgICAgICAnaW5wdXRzJzogdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKSxcbiAgICAgICAgICAgICAgICAnb3V0cHV0cyc6IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsIHByb3BlcnRpZXMpO1xucHJvdG8uY3NzID0gc3R5bGU7XG5kb2N1bWVudC5yZWdpc3RlckVsZW1lbnQodGFnTmFtZSwge3Byb3RvdHlwZTogcHJvdG99KTtcblxuLy8gVE9ETyBjbGVhbiBnbG9iYWxzXG53aW5kb3cuZ2V0RWxlbWVudEJsb2NrID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBUT0RPIGRvIGEgc2VhcmNoIHRvIGZpbmQgdGhlIGZpcnN0IHBhcmVudCBibG9jayBmb3IgY2FzZXMgd2hlcmVcbiAgICAvLyBlbGVtZW50IGlzIGRvd24gaW4gdGhlIGVsZW1lbnQgaGllYXJjaHkuXG4gICAgdmFyIG1heWJlQmxvY2sgPSBlbGVtZW50LnBhcmVudE5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIHZhciBibG9jaztcbiAgICBpZiAobWF5YmVCbG9jay50YWdOYW1lID09PSAnWi1CTE9DSycpIHtcbiAgICAgICAgYmxvY2sgPSBtYXliZUJsb2NrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGJsb2NrID0gZWxlbWVudC5waGFudG9tZWRCeS5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGJsb2NrO1xufTtcbiIsIi8vIEN1c3RvbSBlbGVtZW50IHRvIGRyYXcgYSBsaW5rIGJldHdlZW4gdHdvIHBvcnRzLlxuXG4vLyBXZSBpbXBsZW1lbnQgdGhpcyBhcyBhIGRpdiB3aXRoIHplcm8gaGVpZ2h0IHdoaWNoIHdpZHRoIGlzIHRoZSBsZW5ndGggb2YgdGhlXG4vLyBsaW5lIGFuZCB1c2UgdHJhbnNmb3JtcyB0byBzZXQgaXRzIGVuZHMgdG8gdGhlIHBvcnRzIHBvc2l0aW9ucy4gUmVmZXJlbmNlXG4vLyBvcmlnaW4gcG9zaXRpb24gaXMgcmVsYXRpdmUgY29vcmRpbmF0ZXMgKDAsMCkgYW5kIG90aGVyIGVuZCBpcyAod2lkdGgsMCkuXG4vLyBTbyBiZSBzdXJlIHRoYXQgQ1NTIHN0eWxpbmcgaXMgZG9uZSBhY2NvcmRpbmdseS5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuLypnbG9iYWwgSFRNTEVsZW1lbnQgKi9cblxuLypnbG9iYWwgZ2V0U3R5bGVQcm9wZXJ0eSAqL1xuXG4vKmdsb2JhbCBfICovXG4vKmdsb2JhbCByZXN0eWxlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1saW5rJztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8ZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj5cbiAgICA8L2Rpdj5cbiovfSk7XG52YXIgdGVtcGxhdGUgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFRlbXBsYXRlKTtcblxuLy8gVE9ETyBVc2UgYSBjdXN0b20gZWxlbWVudCBmb3IgbGluZSB3aWR0aC5cbnZhciBsaW5lV2lkdGggPSAzLjA7XG52YXIgcmFkaXVzID0gbGluZVdpZHRoIC8gMjtcbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdoZWlnaHQnOiAwLFxuICAgICAgICAnbWFyZ2luLWxlZnQnOiAtcmFkaXVzLFxuICAgICAgICAnbWFyZ2luLXRvcCc6IC1yYWRpdXMsXG4gICAgICAgICdib3JkZXJXaWR0aCc6IHJhZGl1cyxcbiAgICAgICAgJ2JvcmRlclJhZGl1cyc6IHJhZGl1cyxcbiAgICAgICAgJ2JvcmRlclN0eWxlJzogJ3NvbGlkJyxcbiAgICAgICAgJ2JveFNoYWRvdyc6ICcwcHggMHB4IDNweCAwcHggI2RmZGZkZicsXG4gICAgICAgICdib3JkZXJDb2xvcic6ICcjY2NjJ1xuICAgIH0sXG4gICAgJ2Rpdi5zZWxlY3Rvcic6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAnMTAlJyxcbiAgICAgICAgJ3dpZHRoJzogJzgwJScsXG4gICAgICAgICd0b3AnOiAtNyxcbiAgICAgICAgJ2hlaWdodCc6IDE0LFxuICAgICAgICAnekluZGV4JzogMCxcbiAgICAgICAgJ2JvcmRlckNvbG9yJzogJyMzMzMnXG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIGdldFBvbGFyQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbihwb3NpdGlvbjEsIHBvc2l0aW9uMikge1xuICAgIHZhciB4RGlmZiA9IHBvc2l0aW9uMS54IC0gcG9zaXRpb24yLng7XG4gICAgdmFyIHlEaWZmID0gcG9zaXRpb24xLnkgLSBwb3NpdGlvbjIueTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1vZDogTWF0aC5zcXJ0KHhEaWZmICogeERpZmYgKyB5RGlmZiAqIHlEaWZmKSxcbiAgICAgICAgYXJnOiBNYXRoLmF0YW4oeURpZmYgLyB4RGlmZilcbiAgICB9O1xufTtcblxuLy8gU2V0IHRoZSBzdHlsZSBvZiBhIGdpdmVuIGVsZW1lbnQgc28gdGhhdDpcbi8vICogSXRzIG9yaWdpbiAoaS5lLiAwLDAgcmVsYXRpdmUgY29vcmRpbmF0ZXMpIGlzIHBsYWNlZCBhdCBvbmUgcG9zaXRpb24uXG4vLyAqIEl0cyB3aWR0aCBpcyBzZXQgdG8gdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBwb3NpdGlvbnMuXG4vLyAqIEl0IGlzIHJvdGF0ZWQgc28gdGhhdCBpdHMgZW5kIHBvaW50ICh4ID0gd2lkdGggYW5kIHkgPSAwKSBpcyBwbGFjZWQgYXRcbi8vIHRoZSBvdGhlciBwb3NpdGlvbi5cbnZhciB0cmFuc2Zvcm1Qcm9wZXJ0eSA9IGdldFN0eWxlUHJvcGVydHkoJ3RyYW5zZm9ybScpO1xudmFyIHNldEVsZW1lbnRFbmRzID0gZnVuY3Rpb24oZWxlbWVudCwgZW5kMSwgZW5kMikge1xuICAgIHZhciBvcmlnaW47XG4gICAgaWYgKGVuZDEueCA8IGVuZDIueCkge1xuICAgICAgICBvcmlnaW4gPSBlbmQxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9yaWdpbiA9IGVuZDI7XG4gICAgfVxuXG4gICAgdmFyIHBvbGFyID0gZ2V0UG9sYXJDb29yZGluYXRlcyhlbmQxLCBlbmQyKTtcbiAgICB2YXIgbGVuZ3RoID0gcG9sYXIubW9kO1xuICAgIHZhciBhbmdsZSA9IHBvbGFyLmFyZztcblxuICAgIHZhciB0b3AgPSBvcmlnaW4ueSArIDAuNSAqIGxlbmd0aCAqIE1hdGguc2luKGFuZ2xlKTtcbiAgICB2YXIgbGVmdCA9IG9yaWdpbi54IC0gMC41ICogbGVuZ3RoICogKDEgLSBNYXRoLmNvcyhhbmdsZSkpO1xuICAgIHZhciBwYXJlbnRQb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihlbGVtZW50LnBhcmVudE5vZGUpO1xuICAgIGxlZnQgLT0gcGFyZW50UG9zaXRpb24ueDtcbiAgICB0b3AgLT0gcGFyZW50UG9zaXRpb24ueTtcblxuICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSBsZW5ndGggKyAncHgnO1xuICAgIGVsZW1lbnQuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlW3RyYW5zZm9ybVByb3BlcnR5XSA9ICdyb3RhdGUoJyArIGFuZ2xlICsgJ3JhZCknO1xufTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uICh6bGluaykge1xuICAgIHZhciBlbmQxID0gemxpbmsuYmVnaW4ucG9ydDtcbiAgICB2YXIgZW5kMiA9IHpsaW5rLmVuZC5wb3J0O1xuICAgIGlmIChlbmQxICE9PSB1bmRlZmluZWQgJiYgZW5kMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNldEVsZW1lbnRFbmRzKHpsaW5rLCBlbmQxLmNvbm5lY3Rpb25Qb3NpdGlvbiwgZW5kMi5jb25uZWN0aW9uUG9zaXRpb24pO1xuICAgIH1cbn07XG5cbnZhciBjb25uZWN0ID0gZnVuY3Rpb24oemxpbmssIHBsdWcsIHBvcnQpIHtcbiAgICBpZiAodHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHBvcnQpO1xuICAgIH1cbiAgICBwbHVnLnBvcnQgPSBwb3J0O1xuICAgIHBsdWcucG9ydC5saW5rcy5wdXNoKHpsaW5rKTtcbn07XG5cbnZhciB1bmNvbm5lY3QgPSBmdW5jdGlvbiAoemxpbmspIHtcbiAgICB6bGluay5iZWdpbi5wb3J0LmxpbmtzID0gXy53aXRob3V0KHpsaW5rLmJlZ2luLnBvcnQubGlua3MsIHpsaW5rKTtcbiAgICB6bGluay5lbmQucG9ydC5saW5rcyA9IF8ud2l0aG91dCh6bGluay5lbmQucG9ydC5saW5rcywgemxpbmspO1xuICAgIGlmICh6bGluay5wYXJlbnROb2RlICE9PSBudWxsKSB7XG4gICAgICAgIHpsaW5rLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoemxpbmspO1xuICAgIH1cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcbnByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgIC8vIEN1cnJpZWQgdmVyc2lvbiBvZiAncmVkcmF3JyB3aXRoIGN1cnJlbnQgb2JqZWN0IGluc3RhbmNlLlxuICAgIC8vIFVzZWQgZm9yIGV2ZW50IGxpc3RlbmVycy5cbiAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgIHRoaXMuY29ubmVjdCA9IGNvbm5lY3QuYmluZChudWxsLCB0aGlzKTtcbiAgICB0aGlzLnVuY29ubmVjdCA9IHVuY29ubmVjdC5iaW5kKG51bGwsIHRoaXMpO1xuXG4gICAgdGhpcy5iZWdpbiA9IHt9O1xuICAgIHRoaXMuZW5kID0ge307XG4gICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKCdiZWdpbicpICYmIHRoaXMuaGFzQXR0cmlidXRlKCdlbmQnKSkge1xuICAgICAgICAvLyBUT0RPIGRvIHRoZSBzYW1lIHN0dWZmIG9uIGF0dHJpYnV0ZXMnIGNoYW5nZXMuXG4gICAgICAgIGNvbm5lY3QodGhpcywgdGhpcy5iZWdpbiwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2JlZ2luJykpO1xuICAgICAgICBjb25uZWN0KHRoaXMsIHRoaXMuZW5kLCB0aGlzLmdldEF0dHJpYnV0ZSgnZW5kJykpO1xuXG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgfVxuXG4gICAgc2VsZWN0b3Iuc2V0U2VsZWN0YWJsZSh0aGlzLCB0cnVlKTtcbn07XG5cbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG5cbi8qZ2xvYmFsIHJlc3R5bGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LXBvcnQnO1xuXG52YXIgaHRtbFRlbXBsYXRlID0gdXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uKGZ1bmN0aW9uICgpIHsvKlxuICAgIDxzcGFuIGNsYXNzPVwicG9ydC1rZXlcIj5hPC9zcGFuPlxuICAgIDxkaXYgY2xhc3M9XCJzZWxlY3RvclwiPjwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAnd2lkdGgnOiAxOCxcbiAgICAgICAgJ2hlaWdodCc6IDMsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNjY2MnLFxuICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAncG9zaXRpb24nOiAncmVsYXRpdmUnLFxuICAgICAgICAnb3ZlcmZsb3cnOiAndmlzaWJsZScsXG4gICAgICAgICd6SW5kZXgnOiAnNSdcbiAgICB9LFxuICAgICcucG9ydC1rZXknOiB7XG4gICAgICAgICdmb250LXNpemUnOiAnMC43ZW0nLFxuICAgICAgICAnY29sb3InOiAnIzQ0NCcsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdwYWRkaW5nLWxlZnQnOiAzLFxuICAgICAgICAncGFkZGluZy1yaWdodCc6IDMsXG4gICAgICAgICd6SW5kZXgnOiAnMTAnLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICcjZmZmJ1xuICAgIH0sXG4gICAgJy5zZWxlY3Rvcic6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAtOCxcbiAgICAgICAgJ3RvcCc6IC04LFxuICAgICAgICAnd2lkdGgnOiAyNCxcbiAgICAgICAgJ2hlaWdodCc6IDE0XG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgW10uZm9yRWFjaC5jYWxsKHBvcnQubGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgIGxpbmsucmVkcmF3KCk7XG4gICAgfSk7XG59O1xuXG5cbnZhciBwcm9wZXJ0aWVzID0ge1xuXG4gICAgY3JlYXRlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpbmtzID0gW107XG4gICAgICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG5cbiAgICAgICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgICAgICB0aGlzLmhpZGVLZXkoKTtcbiAgICB9fSxcblxuICAgIHVucGx1Zzoge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubGlua3MuZm9yRWFjaChmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgbGluay51bmNvbm5lY3QoKTtcbiAgICAgICAgfSk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0YWJsZToge3ZhbHVlOiBmdW5jdGlvbiAocG9ydDEsIHBvcnQyKSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpXG4gICAgICAgICAgICAmJiBwb3J0Mi5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKVxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpXG4gICAgICAgICAgICAmJiBwb3J0Mi5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JykpXG4gICAgICAgICAgICApO1xuICAgIH19LFxuXG4gICAgY29ubmVjdDoge3ZhbHVlOiBmdW5jdGlvbiAocG9ydDEsIHBvcnQyKSB7XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnei1saW5rJyk7XG4gICAgICAgIGlmIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKSB7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5iZWdpbiwgcG9ydDEpO1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuZW5kLCBwb3J0Mik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5lbmQsIHBvcnQxKTtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmJlZ2luLCBwb3J0Mik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyB1c2UgYW5vdGhlciB3YXkgdG8gZmluZCB3aGVyZSB0byBhZGQgbmV3IGxpbmtzLlxuICAgICAgICB2YXIgcGF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF0Y2gnKTtcbiAgICAgICAgcGF0Y2guYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICAgIGxpbmsucmVkcmF3KCk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0aW9uUG9zaXRpb246IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgY2VudGVyID0ge1xuICAgICAgICAgICAgICAgIHg6IHBvc2l0aW9uLnggKyByZWN0LndpZHRoIC8gMixcbiAgICAgICAgICAgICAgICB5OiBwb3NpdGlvbi55ICsgcmVjdC5oZWlnaHQgLyAyXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGNlbnRlcjtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXlFbGVtZW50OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3Rvcignc3Bhbi5wb3J0LWtleScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleToge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5rZXlFbGVtZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNob3dLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICB9fSxcblxuICAgIGhpZGVLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIH19XG5cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlLCBwcm9wZXJ0aWVzKTtcbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG5cbiJdfQ==
