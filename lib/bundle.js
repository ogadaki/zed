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
    block.content.editing = true;
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
/*global _*/

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
            newContent = '<button onclick="if (!this.editing) {sendEventToOutputPort(this);}" class="ze-content" contenteditable>' + content + '</button>';
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
/*global _ */

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvZ2xvYmFscy5qcyIsImxpYi9odHRwLmpzIiwibGliL3NlbGVjdG9yLmpzIiwibGliL3N0b3JhZ2UuanMiLCJsaWIvdGVybWluYWwuanMiLCJsaWIvdXRpbHMuanMiLCJsaWIvdmlldy5qcyIsIndlYmNvbXBvbmVudHMvei1ibG9jay5qcyIsIndlYmNvbXBvbmVudHMvei1saW5rLmpzIiwid2ViY29tcG9uZW50cy96LXBvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMnKTtcbnZhciBlbmdpbmUgPSByZXF1aXJlKCcuL2VuZ2luZScpO1xudmFyIGVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9yJyk7XG52YXIgc3RvcmFnZSA9IHJlcXVpcmUoJy4vc3RvcmFnZScpO1xudmFyIGh0dHAgPSByZXF1aXJlKCcuL2h0dHAnKTtcbi8vIGltcG9ydCB2aWV3IG1vZHVsZSBzbyB0aGF0IGl0cyBnbG9iYWxzIGFyZSBkZWZpbmVkLlxudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcblxudmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcblxudmFyIGV4cG9ydHMgPSB7fTtcblxuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbW1hbmRzLmluaXQoKTtcbiAgICBlbmdpbmUuaW5pdCgpO1xuICAgIGVkaXRvci5pbml0KCk7XG4gICAgdmlldy5pbml0KCk7XG4gICAgZ2xvYmFsLmh0dHAgPSBodHRwO1xuICAgIC8vIExvYWQgYSBwYXRjaCBhcyBhbiBleGFtcGxlLlxuICAgIHN0b3JhZ2UubG9hZFBhdGNoKCdodHRwJywgJ3BhdGNoZXMvbWFpbi56ZWQnKTtcbn07XG5leHBvcnRzLnZpZXcgPSB2aWV3O1xuZXhwb3J0cy5jb21tYW5kcyA9IGNvbW1hbmRzO1xuXG4vLyBUaGlzIG1vZHVsZSBpcyB0byBiZSB1c2VkIGZyb20gdGhlIGdsb2JhbCBuYW1lc3BhY2UgKGkuZS4gZnJvbSBhcHAuaHRtbCkuXG5nbG9iYWwuYXBwID0gZXhwb3J0cztcbiIsIi8qZ2xvYmFsIE1vdXNldHJhcCAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdG9yYWdlID0gcmVxdWlyZSgnLi9zdG9yYWdlJyk7XG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3InKTtcbnZhciB0ZXJtaW5hbCA9IHJlcXVpcmUoJy4vdGVybWluYWwnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGNvbW1hbmRzID0ge307XG5cbmNvbW1hbmRzLnByZXYgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIC0xKTtcbmNvbW1hbmRzLm5leHQgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIDEpO1xuY29tbWFuZHMuYWRkID0gZWRpdG9yLmFkZDtcbmNvbW1hbmRzLnJlbW92ZSA9IGVkaXRvci5yZW1vdmU7XG5jb21tYW5kcy5pbnB1dHMgPSBlZGl0b3IucG9ydC5iaW5kKG51bGwsICdpbnB1dCcpO1xuY29tbWFuZHMub3V0cHV0cyA9IGVkaXRvci5wb3J0LmJpbmQobnVsbCwgJ291dHB1dCcpO1xuY29tbWFuZHMuYmxvY2sgPSBlZGl0b3IuYmxvY2s7XG5jb21tYW5kcy5maXJlID0gZWRpdG9yLmZpcmU7XG5jb21tYW5kcy5zZXQgPSBlZGl0b3Iuc2V0O1xuY29tbWFuZHMubW92ZSA9IGVkaXRvci5tb3ZlO1xuY29tbWFuZHMub2Zmc2V0ID0gZWRpdG9yLm1vdmVCeTtcbmNvbW1hbmRzLmNsZWFyID0gZWRpdG9yLmNsZWFyQWxsO1xuXG5cbnZhciBlZGl0QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgY29tbWFuZHMuZXNjYXBlKTtcbiAgICBibG9jay5jb250ZW50LmZvY3VzKCk7XG4gICAgYmxvY2suY29udGVudC5lZGl0aW5nID0gdHJ1ZTtcbn07XG5jb21tYW5kcy5lZGl0QmxvY2sgPSBlZGl0QmxvY2s7XG5cbmNvbW1hbmRzLmVkaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgZWRpdEJsb2NrKGJsb2NrKTtcbiAgICAgICAgZWRpdG9yLnN0b3BCbGlua2luZygpO1xuICAgICAgICAvLyBQcmV2ZW50IGRlZmF1bHQgd2hlbiB0aGlzIGZ1bmN0aW9uIGlzIHVzZWQgd2l0aCBNb3VzdHJhcC5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmNvbW1hbmRzLmFkZEJ1dHRvbiA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ2J1dHRvbicsICdnbycsIDAsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZFNjcmlwdCA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ3NjcmlwdCcsICdpbjEgKyAyJywgMSwgMSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuY29tbWFuZHMuYWRkVGV4dCA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ3NwYW4nLCAnZW1wdHknLCAxLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGROdW1iZXIgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnemVkJywgJ251bWJlcicsICc0MicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZENvbW1lbnQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdjb21tZW50JywgJ0NvbW1lbnQnLCAwLCAwLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG52YXIgYmluZEtleXNGb3JNYWluTW9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSycsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDAsIC0xMCkpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdKJywgY29tbWFuZHMub2Zmc2V0LmJpbmQobnVsbCwgMCwgMTApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIC0xMCwgMCkpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdMJywgY29tbWFuZHMub2Zmc2V0LmJpbmQobnVsbCwgMTAsIDApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaycsIGNvbW1hbmRzLnByZXYpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdqJywgY29tbWFuZHMubmV4dCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgbicsIGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdOZXcnKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBiJywgY29tbWFuZHMuYWRkQnV0dG9uKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHMnLCBjb21tYW5kcy5hZGRTY3JpcHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggdCcsIGNvbW1hbmRzLmFkZFRleHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggbicsIGNvbW1hbmRzLmFkZE51bWJlcik7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBjJywgY29tbWFuZHMuYWRkQ29tbWVudCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ3InLCBjb21tYW5kcy5yZW1vdmUpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdpJywgY29tbWFuZHMuaW5wdXRzKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnbycsIGNvbW1hbmRzLm91dHB1dHMpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdiJywgY29tbWFuZHMuYmxvY2spO1xuICAgIE1vdXNldHJhcC5iaW5kKCdjJywgY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnbCcsIGNvbW1hbmRzLmxpbmspO1xuICAgIE1vdXNldHJhcC5iaW5kKCdnJywgY29tbWFuZHMuZ29Ub0Jsb2NrKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZScsIGNvbW1hbmRzLmVkaXQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdzcGFjZScsIGNvbW1hbmRzLmZpcmUpO1xufTtcbmNvbW1hbmRzLmJpbmRLZXlzRm9yTWFpbk1vZGUgPSBiaW5kS2V5c0Zvck1haW5Nb2RlO1xuXG5jb21tYW5kcy5lc2NhcGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBjdXJyZW50bHlFZGl0aW5nRWxlbWVudCA9IHV0aWxzLmRvbS5nZXRTZWxlY3Rpb25TdGFydCgpO1xuICAgICAgICBpZiAoY3VycmVudGx5RWRpdGluZ0VsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGN1cnJlbnRseUVkaXRpbmdFbGVtZW50LmJsdXIoKTtcbiAgICAgICAgICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG4gICAgICAgICAgICBjdXJyZW50bHlFZGl0aW5nRWxlbWVudC5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH1cbn07XG5cbnZhciBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGIpIHtcbiAgICAgICAgYi5jbGFzc0xpc3QudG9nZ2xlKCdkZS1lbXBoYXNpcycpO1xuICAgIH0pO1xufTtcblxudmFyIGhpZGVBbGxLZXlzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgW10uZm9yRWFjaC5jYWxsKGVsZW1lbnRzLCBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBlbGVtZW50LmhpZGVLZXkoKTtcbiAgICB9KTtcbiAgICBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzKCk7XG59O1xuXG52YXIgZmlyc3RQb3J0O1xudmFyIHNlbGVjdFBvcnQgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIGlmIChmaXJzdFBvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaXJzdFBvcnQgPSBwb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwb3J0LmNvbm5lY3RhYmxlKHBvcnQsIGZpcnN0UG9ydCkpIHtcbiAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBmaXJzdFBvcnQpO1xuICAgICAgICAgICAgZmlyc3RQb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHBvcnRUb0xpbmtUbztcbmNvbW1hbmRzLmxpbmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBrZXlzID0gdXRpbHMuY3JlYXRlS2V5c0dlbmVyYXRvcigpO1xuICAgICAgICBmaXJzdFBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgICAgICB2YXIgcG9ydHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICAgICAgcG9ydC5rZXkgPSBrZXk7XG4gICAgICAgICAgICBwb3J0LnNob3dLZXkoKTtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCcnKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBNb3VzZXRyYXAuYmluZChrZXksIHNlbGVjdFBvcnQuYmluZChudWxsLCBwb3J0KSk7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwb3J0ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAocG9ydFRvTGlua1RvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8gPSBwb3J0O1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY29ubmVjdGFibGUocG9ydCwgcG9ydFRvTGlua1RvKSkge1xuICAgICAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBwb3J0VG9MaW5rVG8pO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHBvcnQ7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soYmxvY2spO1xuICAgIGhpZGVBbGxLZXlzKCd6LWJsb2NrJyk7XG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xufTtcblxuY29tbWFuZHMuZ29Ub0Jsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwoYmxvY2tzLCBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICBibG9jay5rZXkgPSBrZXk7XG4gICAgICAgIGJsb2NrLnNob3dLZXkoKTtcbiAgICAgICAgLy8gQ29udmVydCAnYWFlJyBpbnRvICdhIGEgZScuXG4gICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZChrZXksIHNldEN1cnJlbnRCbG9ja0FuZEJhY2tUb01haW5Nb2RlLmJpbmQobnVsbCwgYmxvY2spKTtcbiAgICAgICAgaW5kZXgrKztcbiAgICB9KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBoaWRlQWxsS2V5cygnei1ibG9jaycpO1xuICAgICAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgfSk7XG4gICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xufTtcblxuLy8gU2V0IGEgbmV3IHN0b3BDYWxsYmFjayBmb3IgTW91c3RyYXAgdG8gYXZvaWQgc3RvcHBpbmcgd2hlbiB3ZSBzdGFydFxuLy8gZWRpdGluZyBhIGNvbnRlbnRlZGl0YWJsZSwgc28gdGhhdCB3ZSBjYW4gdXNlIGVzY2FwZSB0byBsZWF2ZSBlZGl0aW5nLlxuTW91c2V0cmFwLnN0b3BDYWxsYmFjayA9IGZ1bmN0aW9uKGUsIGVsZW1lbnQsIGNvbWJvKSB7XG4gICAgLy8gaWYgdGhlIGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBcIm1vdXNldHJhcFwiIHRoZW4gbm8gbmVlZCB0byBzdG9wXG4gICAgaWYgKCgnICcgKyBlbGVtZW50LmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignIG1vdXNldHJhcCAnKSA+IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAgLy8gc3RvcCBmb3IgaW5wdXQsIHNlbGVjdCwgYW5kIHRleHRhcmVhXG4gICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQSc7XG4gfTtcblxuY29tbWFuZHMuc2F2ZSA9IHN0b3JhZ2Uuc2F2ZVBhdGNoO1xuY29tbWFuZHMubG9hZCA9IHN0b3JhZ2UubG9hZFBhdGNoO1xuY29tbWFuZHMucm0gPSBzdG9yYWdlLnJlbW92ZVBhdGNoO1xuY29tbWFuZHMubGlzdCA9IHN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcztcbmNvbW1hbmRzLmxzID0gc3RvcmFnZS5nZXRQYXRjaE5hbWVzO1xuXG52YXIgdGVybWluYWxPbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG59O1xuXG52YXIgdGVybTtcbnZhciBpbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB0ZXJtID0gdGVybWluYWwuY3JlYXRlKGNvbW1hbmRzLCB0ZXJtaW5hbE9uYmx1cik7XG4gICAgLy8gVW5wbHVnIHRoZSBpbml0IGZ1bmN0aW9uIHNvIHRoYXQgaXQgd29uJ3QgYmUgdXNlZCBhcyBhIGNvbW1hbmQgZnJvbSB0aGVcbiAgICAvLyB0ZXJtaW5hbC5cbiAgICBkZWxldGUgY29tbWFuZHMuaW5pdDtcbn07XG5jb21tYW5kcy5pbml0ID0gaW5pdDtcblxuY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHRlcm0uZm9jdXMoKTtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBlZGl0b3Iuc3RvcEJsaW5raW5nKCk7XG59O1xuXG4vLyBUT0RPIGNyZWF0ZSBhIHRlcm0ud3JpdGUobXVsdGlMaW5lU3RyaW5nKSBhbmQgdXNlIGl0LlxuY29tbWFuZHMuaGVscCA9IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgaWYgKHN1YmplY3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ1ByZXNzIEVzYyB0byBsZWF2ZSB0aGUgY29tbWFuZCBsaW5lIGFuZCBnbyBiYWNrIHRvIG5vcm1hbCBtb2RlLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0NvbW1hbmRzOiBuZXh0LCBwcmV2LCByZW1vdmUsIGFkZCwgc2V0IGNvbnRlbnQsIG1vdmUsIG9mZnNldCcpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2xzLCBsb2FkLCBzYXZlLCBjbGVhciBhbmQgcm0uJyk7XG4gICAgfSBlbHNlIGlmIChzdWJqZWN0ID09PSAnYWRkJykge1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0FkZCBhIG5ldyBibG9jayBqdXN0IGJlbG93IHRoZSBjdXJyZW50IGJsb2NrLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2FkZCBodG1sIDx3aGF0PiA8Y29udGVudD4gPG5iIGlucHV0cz4gPG5iIG91dHB1dHM+Jyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICA8d2hhdD4gICAgaXMgZWl0aGVyIFwiYnV0dG9uXCIsIFwic2NyaXB0XCIsIFwidGV4dFwiLCBcIm51bWJlclwiIG9yIGEgSFRNTCB0YWcuJyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICA8Y29udGVudD4gaXMgdGhlIGNvbnRlbnQgb2YgdGhlIGJsb2NrIChpLmUuIHRoZSBidXR0b24gbmFtZSwgdGhlJyk7XG4gICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnICAgICAgICAgICAgc2NyaXB0IGNvZGUsIHRoZSB0ZXh0IG9yIG51bWJlciB2YWx1ZSwgZXRjLikuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdObyBoZWxwIGZvciBcIicgKyBzdWJqZWN0ICsgJ1wiLicpO1xuICAgIH1cbn07XG5cbmNvbW1hbmRzLm1lc3NhZ2UgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI21lc3NhZ2UnKS5pbm5lckhUTUwgPSBzdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuIiwiLypnbG9iYWwgXyovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVuZ2luZSA9IHJlcXVpcmUoJy4vZW5naW5lJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlZGl0b3IgPSB7fTtcblxuZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuXG5lZGl0b3IuZ2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5nZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1wb3J0LmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5zZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgdmFyIG1lc3NhZ2UgPSAnJztcbiAgICBpZiAoYmxvY2suZXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtZXNzYWdlID0gYmxvY2suZXJyb3IubWVzc2FnZTtcbiAgICB9XG4gICAgLy8gVE9ETyBIZXJlIHdlIHVzZSBnbG9iYWwgaW5zdGVhZCBvZiByZXF1aXJlKCdjb21tYW5kcycpIGJlY2F1c2Ugb2YgY3ljbGljXG4gICAgLy8gZGVwZW5kZW5jaWVzLlxuICAgIHdpbmRvdy5hcHAuY29tbWFuZHMubWVzc2FnZShtZXNzYWdlKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICB9XG59O1xuLy8gVE9ETyBub3QgaW4gdGhlIHdpbmRvdyBuYW1lc3BhY2VcbndpbmRvdy5zZXRDdXJyZW50QmxvY2sgPSBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrO1xuXG5lZGl0b3Iuc2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgcG9ydC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnRCbG9jayA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWxlbWVudHNbaV0gPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IChlbGVtZW50cy5sZW5ndGggKyBpICsgb2Zmc2V0KSAlIGVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soZWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgIHZhciBlbGVtZW50cyA9IGN1cnJlbnQuYmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LicgKyBlZGl0b3IuY29udGV4dCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZWxlbWVudHNbaV0gPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IChlbGVtZW50cy5sZW5ndGggKyBpICsgb2Zmc2V0KSAlIGVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChlbGVtZW50c1tpbmRleF0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2sob2Zmc2V0KTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnaW5wdXQnIHx8IGVkaXRvci5jb250ZXh0ID09PSAnb3V0cHV0Jykge1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQob2Zmc2V0KTtcbiAgICB9XG59O1xuXG5lZGl0b3IuY3JlYXRlQmxvY2tFbGVtZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQsIG5JbnB1dHMsIG5PdXRwdXRzLCB0b3AsIGxlZnQpIHtcbiAgICB2YXIgcGF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF0Y2gnKTtcbiAgICBjb250ZW50ID0gW1xuICAgICAgICAnPHotcG9ydCBjbGFzcz1cImlucHV0XCI+PC96LXBvcnQ+Jy5yZXBlYXQobklucHV0cyksXG4gICAgICAgIGNvbnRlbnQsXG4gICAgICAgICc8ei1wb3J0IGNsYXNzPVwib3V0cHV0XCI+PC96LXBvcnQ+Jy5yZXBlYXQobk91dHB1dHMpXG4gICAgXS5qb2luKCcnKTtcbiAgICB2YXIgaHRtbFN0cmluZyA9ICc8ei1ibG9jaz4nICsgY29udGVudCArICc8L3otYmxvY2s+JztcbiAgICB2YXIgZnJhZ21lbnQgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFN0cmluZyk7XG4gICAgdmFyIGJsb2NrID0gZnJhZ21lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jaycpO1xuXG4gICAgdmFyIGRlZmF1bHRUb3AgPSAwO1xuICAgIHZhciBkZWZhdWx0TGVmdCA9IDA7XG4gICAgdmFyIGN1cnJlbnRCbG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoY3VycmVudEJsb2NrICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihjdXJyZW50QmxvY2ssIGN1cnJlbnRCbG9jay5wYXJlbnROb2RlKTtcbiAgICAgICAgZGVmYXVsdFRvcCA9IHBvc2l0aW9uLnkgKyBjdXJyZW50QmxvY2suZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgMjM7XG4gICAgICAgIGRlZmF1bHRMZWZ0ID0gcG9zaXRpb24ueDtcbiAgICB9XG4gICAgYmxvY2suc3R5bGUudG9wID0gdG9wIHx8IGRlZmF1bHRUb3AgKyAncHgnO1xuICAgIGJsb2NrLnN0eWxlLmxlZnQgPSBsZWZ0IHx8IGRlZmF1bHRMZWZ0ICsgJ3B4JztcblxuICAgIGVkaXRvci5zZXRDdXJyZW50QmxvY2soYmxvY2spO1xuICAgIHBhdGNoLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICByZXR1cm4gYmxvY2s7XG59O1xuXG5lZGl0b3IuYWRkQmxvY2sgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciB6ZUNsYXNzID0gJyc7XG4gICAgaWYgKGFyZ3NbMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHR5cGUgPSAnaHRtbCc7XG4gICAgICAgIGFyZ3NbMV0gPSAnc3Bhbic7XG4gICAgICAgIHplQ2xhc3MgPSAnemVkLW51bWJlcic7XG4gICAgfVxuICAgIHZhciBibG9ja0NsYXNzID0gYXJnc1sxXTtcbiAgICBpZiAodHlwZSA9PT0gJ2h0bWwnKSB7XG4gICAgICAgIHZhciB0YWdOYW1lID0gYXJnc1sxXTtcbiAgICAgICAgaWYgKGFyZ3NbMV0gPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgdGFnTmFtZSA9ICdzcGFuJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29udGVudCA9IGFyZ3NbMl07XG4gICAgICAgIHZhciBuZXdDb250ZW50ID0gJzwnICsgdGFnTmFtZSArICcgY2xhc3M9XCJ6ZS1jb250ZW50ICcgKyB6ZUNsYXNzICsgJ1wiIGNvbnRlbnRlZGl0YWJsZT4nICsgY29udGVudCArICc8LycgKyB0YWdOYW1lICsgJz4nO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSAnPHNjcmlwdCBjbGFzcz1cInplLWNvbnRlbnRcIiB0eXBlPVwiYXBwbGljYXRpb24veC1wcmV2ZW50LXNjcmlwdC1leGVjdXRpb24tb25sb2FkXCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazt3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XCIgY29udGVudGVkaXRhYmxlIG9uaW5wdXQ9XCJjb21waWxlU2NyaXB0KHRoaXMpXCI+JyArIGNvbnRlbnQgKyAnPC9zY3JpcHQ+JztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSAnPGJ1dHRvbiBvbmNsaWNrPVwiaWYgKCF0aGlzLmVkaXRpbmcpIHtzZW5kRXZlbnRUb091dHB1dFBvcnQodGhpcyk7fVwiIGNsYXNzPVwiemUtY29udGVudFwiIGNvbnRlbnRlZGl0YWJsZT4nICsgY29udGVudCArICc8L2J1dHRvbj4nO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YWdOYW1lWzBdID09PSAnPCcpIHtcbiAgICAgICAgICAgIC8vIEFjdHVhbGx5IHRhZ05hbWUgY29udGFpbnMgYSBIVE1MIHN0cmluZy5cbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSB0YWdOYW1lO1xuICAgICAgICAgICAgYmxvY2tDbGFzcyA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzLCAyKTtcbiAgICAgICAgYXJnc1swXSA9IG5ld0NvbnRlbnQ7XG4gICAgfVxuICAgIHZhciBibG9jayA9IGVkaXRvci5jcmVhdGVCbG9ja0VsZW1lbnQuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgaWYgKGJsb2NrQ2xhc3MgIT09ICcnKSB7XG4gICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoYmxvY2tDbGFzcyk7XG4gICAgfVxufTtcblxuZWRpdG9yLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VycmVudDtcbiAgICB2YXIgcG9ydDtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgZWRpdG9yLmFkZEJsb2NrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0Jykge1xuICAgICAgICBjdXJyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgICAgIHBvcnQgPSBjdXJyZW50LmFkZFBvcnQoJzx6LXBvcnQgY2xhc3M9XCJpbnB1dFwiPjwvei1wb3J0PicpO1xuICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQocG9ydCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgY3VycmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgICAgICBwb3J0ID0gY3VycmVudC5hZGRQb3J0KCc8ei1wb3J0IGNsYXNzPVwib3V0cHV0XCI+PC96LXBvcnQ+Jyk7XG4gICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChwb3J0KTtcbiAgICB9XG59O1xuXG5lZGl0b3IucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxlY3RlZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3RlZCcpO1xuICAgIGlmIChzZWxlY3RlZCAhPT0gbnVsbCAmJiBzZWxlY3RlZC50YWdOYW1lID09PSAnWi1MSU5LJykge1xuICAgICAgICB2YXIgbGluayA9IHNlbGVjdGVkO1xuICAgICAgICBsaW5rLnVuY29ubmVjdCgpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrKDEpO1xuICAgICAgICBibG9jay51bnBsdWcoKTtcbiAgICAgICAgYmxvY2sucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChibG9jayk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0JyB8fCBlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgdmFyIHBvcnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0KDEpO1xuICAgICAgICBwb3J0LnVucGx1ZygpO1xuICAgICAgICBwb3J0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocG9ydCk7XG4gICAgfVxufTtcblxudmFyIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQgPSBmdW5jdGlvbiAoZWxlbWVudFRhZ05hbWUsIG9uT3JPZmYpIHtcbiAgICB2YXIgY2xhc3NOYW1lID0gJ2N1cnJlbnQnO1xuICAgIGlmIChvbk9yT2ZmID09PSAnb24nKSB7XG4gICAgICAgIGNsYXNzTmFtZSArPSAnLW9mZi1jb250ZXh0JztcbiAgICB9XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnRUYWdOYW1lICsgJy4nICsgY2xhc3NOYW1lKTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5wb3J0ID0gZnVuY3Rpb24gKGlucHV0T3JPdXRwdXQpIHtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgIT09ICdibG9jaycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrLmN1cnJlbnQgKiB6LXBvcnQuJyArIGlucHV0T3JPdXRwdXQsICdvbicpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdmFyIHBvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQgKiB6LXBvcnQuJyArIGlucHV0T3JPdXRwdXQpO1xuICAgICAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcG9ydC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jaycsICdvZmYnKTtcbiAgICBlZGl0b3IuY29udGV4dCA9IGlucHV0T3JPdXRwdXQ7XG59O1xuXG5lZGl0b3IuYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2snLCAnb24nKTtcbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LXBvcnQuaW5wdXQnLCAnb2ZmJyk7XG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otcG9ydC5vdXRwdXQnLCAnb2ZmJyk7XG4gICAgfSBjYXRjaChlKSB7fVxufTtcblxuZWRpdG9yLmZpcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgICAgICBpZiAoY29udGVudC50YWdOYW1lID09PSAnQlVUVE9OJykge1xuICAgICAgICAgICAgZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIGlmIChjb250ZW50LnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgICBlbmdpbmUuZmlyZUV2ZW50MihibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSW4gY2FzZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBhcyBhIHJlc3VsdCBvZiBhbiBldmVudCAoc2F5LCBzcGFjZVxuICAgICAgICAvLyBrZXkgcHJlc3MpIHdlIHByZXZlbnQgZGVmYXVsdCBldmVudCBiZWhhdmlvdXIgKHNheSBzY3JvbGwgZG93biBmb3JcbiAgICAgICAgLy8gc3BhY2UgYmFyKS5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmVkaXRvci5zZXQgPSBmdW5jdGlvbiAodGFyZ2V0LCB2YWx1ZSkge1xuICAgIGlmICh0YXJnZXQgPT09ICdjb250ZW50Jykge1xuICAgICAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgICAgIGJsb2NrLmNvbnRlbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3IubW92ZSA9IGZ1bmN0aW9uIChsZWZ0LCB0b3ApIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBjdXJyZW50LnN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgY3VycmVudC5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG4gICAgY3VycmVudC5yZWRyYXcoKTtcbn07XG5cbmVkaXRvci5tb3ZlQnkgPSBmdW5jdGlvbiAobGVmdE9mZnNldCwgdG9wT2Zmc2V0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgdmFyIHRvcCA9IE51bWJlcihjdXJyZW50LnN0eWxlLnRvcC5zbGljZSgwLCAtMikpICsgTnVtYmVyKHRvcE9mZnNldCk7XG4gICAgdmFyIGxlZnQgPSBOdW1iZXIoY3VycmVudC5zdHlsZS5sZWZ0LnNsaWNlKDAsIC0yKSkgKyBOdW1iZXIobGVmdE9mZnNldCk7XG4gICAgZWRpdG9yLm1vdmUobGVmdCwgdG9wKTtcbn07XG5cbmVkaXRvci5zdGFydEJsaW5raW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoYmxvY2sgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGJsb2NrLmNsYXNzTGlzdC5jb250YWlucygnc3RvcC1ibGlua2luZycpKSB7XG4gICAgICAgICAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdzdG9wLWJsaW5raW5nJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iuc3RvcEJsaW5raW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoIWJsb2NrLmNsYXNzTGlzdC5jb250YWlucygnc3RvcC1ibGlua2luZycpKSB7XG4gICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoJ3N0b3AtYmxpbmtpbmcnKTtcbiAgICB9XG59O1xuXG52YXIgYmxpbmtDdXJzb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJzb3ItZGlzcGxheWVkJyk7XG4gICAgfVxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGJsaW5rQ3Vyc29yLCAxMDAwKTtcbn07XG5cbmVkaXRvci5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGJsaW5rQ3Vyc29yKCk7XG59O1xuXG5lZGl0b3IuY2xlYXJBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otYmxvY2snKTtcbiAgICBfLmVhY2goYmxvY2tzLCBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgYmxvY2sudW5wbHVnKCk7XG4gICAgICAgIGJsb2NrLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYmxvY2spO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5pbm5lckhUTUwgPSAnJztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZWRpdG9yO1xuIiwiLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgZ2V0RWxlbWVudEJsb2NrICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZW5naW5lID0ge307XG5cbmVuZ2luZS5jb21waWxlU2NyaXB0ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgc3RyaW5nID0gZWxlbWVudC50ZXh0O1xuICAgIHN0cmluZyA9IHV0aWxzLmdldFNjcmlwU3RyaW5ndFdpdGhOZXdsaW5lcyhlbGVtZW50KTtcbiAgICB2YXIgc2NyaXB0O1xuICAgIHZhciBjb21waWxlZDtcbiAgICB0cnkge1xuICAgICAgICAvLyBJbiBjYXNlIHNjcmlwdCBpcyBhbiBleHByZXNzaW9uLlxuICAgICAgICB2YXIgbWF5YmVFeHByZXNzaW9uID0gc3RyaW5nO1xuICAgICAgICBzY3JpcHQgPSAncmV0dXJuICgnICsgbWF5YmVFeHByZXNzaW9uICsgJyk7JztcbiAgICAgICAgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24oJ3NlbmRUb091dHB1dCcsICdkZXN0MScsICdpbjEnLCAnaW4yJywgJ2luMycsICdpbjQnLCAnaW41Jywgc2NyaXB0KTtcbiAgICAgICAgZWxlbWVudC5jb21waWxlZFNjcmlwdCA9IGNvbXBpbGVkO1xuICAgIH0gY2F0Y2ggKGUxKSB7XG4gICAgICAgIC8vIENvbXBpbGF0aW9uIGZhaWxlZCB0aGVuIGl0IGlzbid0IGFuIGV4cHJlc3Npb24uIFRyeSBhcyBhXG4gICAgICAgIC8vIGZ1bmN0aW9uIGJvZHkuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzdHJpbmc7XG4gICAgICAgICAgICBjb21waWxlZCA9IG5ldyBGdW5jdGlvbignc2VuZFRvT3V0cHV0JywgJ2Rlc3QxJywgJ2luMScsICdpbjInLCAnaW4zJywgJ2luNCcsICdpbjUnLCBzY3JpcHQpO1xuICAgICAgICAgICAgZWxlbWVudC5jb21waWxlZFNjcmlwdCA9IGNvbXBpbGVkO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBOb3QgYSBmdW5jdGlvbiBib2R5LCBzdHJpbmcgaXMgbm90IHZhbGlkLlxuICAgICAgICAgICAgZWxlbWVudC5jb21waWxlZFNjcmlwdCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lbmdpbmUuc2VuZEV2ZW50VG9PdXRwdXRQb3J0ID0gZnVuY3Rpb24gKGVsZW1lbnQsIHZhbHVlKSB7XG4gICAgdmFyIGJsb2NrID0gZ2V0RWxlbWVudEJsb2NrKGVsZW1lbnQpO1xuICAgIHZhciBwb3J0cyA9IGJsb2NrLnBvcnRzLm91dHB1dHM7XG4gICAgaWYgKHBvcnRzKSB7XG4gICAgICAgIGlmIChwb3J0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBwb3J0ID0gcG9ydHNbMF07XG4gICAgICAgICAgICBwb3J0LmxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgICAgICAgIGZpcmVFdmVudChsaW5rLCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFjdHVhbGx5IHZhbHVlIGlzIGFuIGFycmF5IG9mIHZhbHVlcy5cbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZTtcbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24gKHBvcnQsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdmFyIHplVmFsdWUgPSB2YWx1ZXNbaW5kZXhdO1xuICAgICAgICAgICAgICAgIHBvcnQubGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcmVFdmVudChsaW5rLCB6ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGdldE91dHB1dExpbmtzRmlyc3REZXN0aW5hdGlvbkNvbnRlbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciBibG9jayA9IGdldEVsZW1lbnRCbG9jayhlbGVtZW50KTtcbiAgICB2YXIgcG9ydCA9IGJsb2NrLnBvcnRzLm91dHB1dHNbMF07XG4gICAgdmFyIGNvbnRlbnQ7XG4gICAgaWYgKHBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGxpbmtzID0gcG9ydC5saW5rcztcbiAgICAgICAgdmFyIGxpbmsgPSBsaW5rc1swXTtcbiAgICAgICAgaWYgKGxpbmsgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIHRhcmdldCA9IGxpbmsuZW5kLnBvcnQuYmxvY2s7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LmNvbnRlbnQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG59O1xuXG4vLyBUT0RPIGNoYW5nZSBuYW1lLlxuZW5naW5lLmZpcmVFdmVudDIgPSBmdW5jdGlvbiAodGFyZ2V0LCB2YWx1ZSkge1xuICAgIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoYXMtZXhlY3V0aW9uLWVycm9yJykpIHtcbiAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUoJ2hhcy1leGVjdXRpb24tZXJyb3InKTtcbiAgICB9XG4gICAgdmFyIGNvbnRlbnQgPSB0YXJnZXQuY29udGVudDtcbiAgICB2YXIgdGFnTmFtZSA9IGNvbnRlbnQudGFnTmFtZTtcblxuICAgIGlmICh0YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICB2YXIgZGF0YVBvcnRzID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpO1xuICAgICAgICB2YXIgaW5wdXRzID0gW107XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChkYXRhUG9ydHMsIGZ1bmN0aW9uIChkYXRhUG9ydCkge1xuICAgICAgICAgICAgdmFyIGRhdGFMaW5rcyA9IGRhdGFQb3J0ID09PSBudWxsID8gW10gOiBkYXRhUG9ydC5saW5rcztcblxuICAgICAgICAgICAgaWYgKGRhdGFMaW5rcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YUxpbmsgPSBfLmZpbmQoZGF0YUxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IGxpbmsuYmVnaW4ucG9ydC5ibG9jay5jb250ZW50LnRhZ05hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFnICE9PSAnQlVUVE9OJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhTGluaztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YUxpbmsgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IGRhdGFMaW5rLmJlZ2luLnBvcnQuYmxvY2suY29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdTUEFOJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqLmlubmVySFRNTDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmNsYXNzTGlzdC5jb250YWlucygnemVkLW51bWJlcicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9iai50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqLmV4ZWN1dGlvblJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iajtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnB1dHMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBuZXh0QWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBmaXJzdERlc3RpbmF0aW9uQ29udGVudCA9IGdldE91dHB1dExpbmtzRmlyc3REZXN0aW5hdGlvbkNvbnRlbnQoY29udGVudCk7XG5cbiAgICAgICAgdmFyIHRoZVNjcmlwdCA9IGNvbnRlbnQuY29tcGlsZWRTY3JpcHQ7XG4gICAgICAgIGlmICh0aGVTY3JpcHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29tcGlsZVNjcmlwdChjb250ZW50KTtcbiAgICAgICAgICAgIHRoZVNjcmlwdCA9IGNvbnRlbnQuY29tcGlsZWRTY3JpcHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoZVNjcmlwdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnRXJyb3IgaW4gc2NyaXB0LiBBYm9ydGluZy4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgIGFyZ3MucHVzaChuZXh0QWN0aW9uKTtcbiAgICAgICAgYXJncy5wdXNoKGZpcnN0RGVzdGluYXRpb25Db250ZW50KTtcbiAgICAgICAgYXJncyA9IGFyZ3MuY29uY2F0KGlucHV0cyk7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRhcmdldC5lcnJvciA9IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICcnXG4gICAgICAgIH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGVTY3JpcHQuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCdoYXMtZXhlY3V0aW9uLWVycm9yJyk7XG4gICAgICAgICAgICBtZXNzYWdlID0gJ2V4ZWN1dGlvbiBlcnJvciBvbiBsaW5lICcgKyBlLmxpbmVOdW1iZXIgKyAnOiAnICsgZS5tZXNzYWdlO1xuICAgICAgICAgICAgdGFyZ2V0LmVycm9yLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICAgICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2N1cnJlbnQnKSkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hcHAuY29tbWFuZHMubWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU3RvcmUgcmVzdWx0IGZvciBmdXR1cmUgdXNlLlxuICAgICAgICAgICAgY29udGVudC5leGVjdXRpb25SZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3VsdC50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnTlVNQkVSJykge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnRElWJyB8fCB0YWdOYW1lID09PSAnU1BBTicpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRlbnQuaW5uZXJIVE1MO1xuICAgICAgICB9XG4gICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdJTlBVVCcpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0YXJnZXQucmVkcmF3KCk7XG59O1xuXG5lbmdpbmUuZmlyZUV2ZW50ID0gZnVuY3Rpb24gKGxpbmssIHZhbHVlKSB7XG4gICAgdmFyIHRhcmdldCA9IGxpbmsuZW5kLnBvcnQuYmxvY2s7XG4gICAgaWYgKHRhcmdldC5wb3J0cy5pbnB1dHNbMF0gPT09IGxpbmsuZW5kLnBvcnQpIHtcbiAgICAgICAgLy8gT25seSBhY3R1YWxseSBmaXJlIHRoZSBibG9jayBvbiBpdHMgZmlyc3QgaW5wdXQgcG9ydC5cbiAgICAgICAgZmlyZUV2ZW50Mih0YXJnZXQsIHZhbHVlKTtcbiAgICB9XG59O1xuXG5lbmdpbmUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB3aW5kb3cuY29tcGlsZVNjcmlwdCA9IGVuZ2luZS5jb21waWxlU2NyaXB0O1xuICAgIHdpbmRvdy5zZW5kRXZlbnRUb091dHB1dFBvcnQgPSBlbmdpbmUuc2VuZEV2ZW50VG9PdXRwdXRQb3J0O1xuICAgIHdpbmRvdy5maXJlRXZlbnQyID0gZW5naW5lLmZpcmVFdmVudDI7XG4gICAgd2luZG93LmZpcmVFdmVudCA9IGVuZ2luZS5maXJlRXZlbnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVuZ2luZTtcbiIsIi8vIFRoZSBwbGFjZSB0byBwb2xsdXRlIGdsb2JhbCBuYW1lc3BhY2UuXG5cbid1c2Ugc3RyaWN0Jztcblxud2luZG93LmxvYWRTY3JpcHQgPSBmdW5jdGlvbiAodXJsKVxue1xuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQuc2V0QXR0cmlidXRlKCd0eXBlJywndGV4dC9qYXZhc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnNldEF0dHJpYnV0ZSgnc3JjJywgdXJsKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChzY3JpcHQpO1xufTtcbiIsInZhciBodHRwID0ge307XG5cbmh0dHAuZ2V0ID0gZnVuY3Rpb24gKHVybCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwpO1xuXG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcXVlc3QucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3Quc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ05ldHdvcmsgZXJyb3InKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGh0dHA7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzZWxlY3RvciA9IHtcbiAgICBzZXRTZWxlY3RhYmxlOiBmdW5jdGlvbiAoZWxlbWVudCwgd2l0aFN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzO1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBzZWxlY3Rvci5hY3Rpb24oZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAod2l0aFN0b3BQcm9wYWdhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHdpdGhTdG9wUHJvcGFnYXRpb24gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGNvbm5lY3RhYmxlOiBmdW5jdGlvbiAoZWxlbWVudDEsIGVsZW1lbnQyKSB7XG4gICAgICAgIGlmIChlbGVtZW50MS5jb25uZWN0YWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDEuY29ubmVjdGFibGUoZWxlbWVudDEsIGVsZW1lbnQyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIGFjdGlvbjogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGFibGUodGhpcy5zZWxlY3RlZCwgZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNvbm5lY3QodGhpcy5zZWxlY3RlZCwgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5zZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3Rvcjtcbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbmdsb2JhbC5zZWxlY3RvciA9IHNlbGVjdG9yO1xuIiwiLypnbG9iYWwgXyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHN0b3JhZ2UgPSB7fTtcblxuZnVuY3Rpb24gZXhwb3J0UGF0Y2ggKCkge1xuICAgIHZpZXcuc3dpdGNoTW9kZSgnZWRpdCcpO1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otYmxvY2snKTtcbiAgICB2YXIgcGF0Y2ggPSB7fTtcbiAgICBwYXRjaC5ibG9ja3MgPSBbXTtcbiAgICBwYXRjaC5saW5rcyA9IFtdO1xuICAgIF8uZWFjaChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQsIGluZGV4KSB7XG4gICAgICAgIHZhciBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudC1jb250YWluZXInKS5pbm5lckhUTUwudHJpbSgpO1xuICAgICAgICB2YXIgY29udGVudCA9IGVsZW1lbnQuY29udGVudDtcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjb21tZW50JykpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSAnY29tbWVudCc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlID0gY29udGVudC52YWx1ZSB8fCBjb250ZW50LmlubmVySFRNTCB8fCAnJztcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRlbnQuaW5uZXJIVE1MO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHV0aWxzLmdldFNjcmlwU3RyaW5ndFdpdGhOZXdsaW5lcyhjb250ZW50KTtcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXJJbm5lckhUTUwgPSAnJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5wdXRQb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0Jyk7XG4gICAgICAgIHZhciBvdXRwdXRQb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpO1xuICAgICAgICBwYXRjaC5ibG9ja3MucHVzaCh7XG4gICAgICAgICAgICBpZDogaW5kZXgsXG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgICAgICAgICAgbklucHV0czogaW5wdXRQb3J0cy5sZW5ndGgsXG4gICAgICAgICAgICBuT3V0cHV0czogb3V0cHV0UG9ydHMubGVuZ3RoLFxuICAgICAgICAgICAgdG9wOiBlbGVtZW50LnN0eWxlLnRvcCxcbiAgICAgICAgICAgIGxlZnQ6IGVsZW1lbnQuc3R5bGUubGVmdCxcbiAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgaW5uZXJIVE1MOiBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcGhhbnRvbSA9IGNvbnRlbnQucGhhbnRvbWVkQnk7XG4gICAgICAgIGlmIChwaGFudG9tICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBoYW50b20uc2V0QXR0cmlidXRlKCdkYXRhLWluZGV4LXRvLXBoYW50b20nLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKGlucHV0UG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBwb3J0SW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBpbkxpbmtzID0gcG9ydC5saW5rcztcbiAgICAgICAgICAgIF8uZWFjaChpbkxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclBvcnQgPSBsaW5rLmJlZ2luLnBvcnQ7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2sgPSBvdGhlclBvcnQuYmxvY2s7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tJbmRleCA9IF8uaW5kZXhPZihlbGVtZW50cywgb3RoZXJCbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tQb3J0cyA9IG90aGVyQmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrUG9ydEluZGV4ID0gXy5pbmRleE9mKG90aGVyQmxvY2tQb3J0cywgb3RoZXJQb3J0KTtcbiAgICAgICAgICAgICAgICBwYXRjaC5saW5rcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrOiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHBvcnRJbmRleFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrOiBvdGhlckJsb2NrSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBvdGhlckJsb2NrUG9ydEluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBwYXRjaC5wcmVzZW50YXRpb24gPSB7fTtcbiAgICBwYXRjaC5wcmVzZW50YXRpb24uaW5uZXJIVE1MID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLmlubmVySFRNTDtcbiAgICB2YXIgcGhhbnRvbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbiAgICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgICAgIC8vIEZJWE1FIGRhdGEtaW5kZXgtdG8tcGhhbnRvbSBpbnN0ZWFkP1xuICAgICAgICBwaGFudG9tLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1waGFudG9tZWQtYmxvY2staWQnKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcGF0Y2g7XG59O1xuXG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG52YXIgY29ubmVjdEJsb2NrcyA9IGZ1bmN0aW9uKGVuZCwgc3RhcnQsIGlucHV0UG9ydFBvc2l0aW9uLCBvdXRwdXRQb3J0UG9zaXRpb24pIHtcbiAgICB2YXIgc3RhcnRQb3J0ID0gKHN0YXJ0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKSlbb3V0cHV0UG9ydFBvc2l0aW9uXTtcbiAgICB2YXIgZW5kUG9ydCA9IChlbmQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0JykpW2lucHV0UG9ydFBvc2l0aW9uXTtcbiAgICBpZiAoc3RhcnRQb3J0LmNvbm5lY3RhYmxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVE9ETyBjb25uZWN0YWJsZSB0YWtlcyBzb21lIHRpbWUgdG8gYmUgZGVmaW5lZC4gV2FpdCBmb3IgaXQuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3RCbG9ja3MsIDEsIGVuZCwgc3RhcnQsIGlucHV0UG9ydFBvc2l0aW9uLCBvdXRwdXRQb3J0UG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAoc3RhcnRQb3J0LmNvbm5lY3RhYmxlKHN0YXJ0UG9ydCwgZW5kUG9ydCkpIHtcbiAgICAgICAgc3RhcnRQb3J0LmNvbm5lY3Qoc3RhcnRQb3J0LCBlbmRQb3J0KTtcbiAgICB9XG59O1xuXG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG52YXIgY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jayA9IGZ1bmN0aW9uIChibG9jaywgcGhhbnRvbSkge1xuICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICBpZiAoY29udGVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEZJWCBNRSB3YWl0IHRoYXQgY29udGVudCBhY3R1YWxseSBleGlzdHMuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2ssIDEsIGJsb2NrLCBwaGFudG9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3LmNyZWF0ZVBoYW50b21MaW5rKGNvbnRlbnQsIHBoYW50b20pO1xuICAgIH1cbn07XG5cbnZhciBpbXBvcnRQYXRjaCA9IGZ1bmN0aW9uIChwYXRjaCkge1xuICAgIHZhciBlbGVtZW50cyA9IFtdO1xuICAgIF8uZWFjaChwYXRjaC5ibG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBibG9jay5uSW5wdXRzID0gYmxvY2subklucHV0cyB8fCAwO1xuICAgICAgICBibG9jay5uT3V0cHV0cyA9IGJsb2NrLm5PdXRwdXRzIHx8IDA7XG4gICAgICAgIGlmIChibG9jay50YWdOYW1lID09PSAnc2NyaXB0JyB8fMKgYmxvY2sudGFnTmFtZSA9PT0gJ2J1dHRvbicgfHwgYmxvY2sudGFnTmFtZSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQmxvY2soJ2h0bWwnLCBibG9jay50YWdOYW1lLCBibG9jay52YWx1ZSwgYmxvY2subklucHV0cywgYmxvY2subk91dHB1dHMsIGJsb2NrLnRvcCwgYmxvY2subGVmdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQmxvY2soJ2h0bWwnLCBibG9jay5pbm5lckhUTUwsICcnLCBibG9jay5uSW5wdXRzLCBibG9jay5uT3V0cHV0cywgYmxvY2sudG9wLCBibG9jay5sZWZ0KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCcpO1xuICAgICAgICBlbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgIH0pO1xuICAgIF8uZWFjaChwYXRjaC5saW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IGVsZW1lbnRzW2xpbmsub3V0cHV0LmJsb2NrXTtcbiAgICAgICAgdmFyIGlucHV0ID0gZWxlbWVudHNbbGluay5pbnB1dC5ibG9ja107XG4gICAgICAgIGNvbm5lY3RCbG9ja3MoaW5wdXQsIG91dHB1dCwgbGluay5pbnB1dC5wb3J0LCBsaW5rLm91dHB1dC5wb3J0KTtcbiAgICB9KTtcbiAgICB2YXIgcHJlc2VudGF0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpO1xuICAgIHByZXNlbnRhdGlvbi5pbm5lckhUTUwgPSBwYXRjaC5wcmVzZW50YXRpb24uaW5uZXJIVE1MO1xuICAgIHZhciBwaGFudG9tcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xuICAgIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcGhhbnRvbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgtdG8tcGhhbnRvbScpO1xuICAgICAgICB2YXIgYmxvY2sgPSBlbGVtZW50c1tpbmRleF07XG4gICAgICAgIGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2soYmxvY2ssIHBoYW50b20pO1xuICAgIH0pO1xufTtcblxuc3RvcmFnZS5zYXZlUGF0Y2ggPSBmdW5jdGlvbiAod2hlcmUsIG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE9ubHkgb25lIGFyZ3VtZW50IG1lYW5zIGl0IGlzIGFjdHVhbGx5IHRoZSBuYW1lIGFuZCB3ZSBsb2FkIGZyb21cbiAgICAgICAgLy8gbG9jYWxzdG9yYWdlLlxuICAgICAgICBuYW1lID0gd2hlcmU7XG4gICAgICAgIHdoZXJlID0gJ2xvY2FsJztcbiAgICB9XG4gICAgdmFyIHBhdGNoID0gZXhwb3J0UGF0Y2goKTtcbiAgICBpZiAod2hlcmUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICAgICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgICAgIHBhdGNoZXNbbmFtZV0gPSBwYXRjaDtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwYXRjaGVzJywgSlNPTi5zdHJpbmdpZnkocGF0Y2hlcykpO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdmaWxlJykge1xuICAgICAgICB2YXIgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhdGNoLCBudWxsLCAnICAgICcpO1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtjb250ZW50XSwgeyB0eXBlIDogXCJ0ZXh0L3BsYWluXCIsIGVuZGluZ3M6IFwidHJhbnNwYXJlbnRcIn0pO1xuICAgICAgICB3aW5kb3cuc2F2ZUFzKGJsb2IsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKCdiYWQgc2F2ZSBsb2NhdGlvbiAoXCInICsgd2hlcmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiKSwgbXVzdCBiZSBcImxvY2FsXCIgb3IgXCJmaWxlXCInKTtcbiAgICB9XG59O1xuXG5zdG9yYWdlLmxvYWRQYXRjaCA9IGZ1bmN0aW9uICh3aGVyZSwgd2hhdCkge1xuICAgIGlmICh3aGF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgd2hhdCA9IHdoZXJlO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdoYXQpID09PSAnW29iamVjdCBGaWxlXScpIHtcbiAgICAgICAgICAgIHdoZXJlID0gJ2ZpbGUgb2JqZWN0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoZXJlID0gJ2xvY2FsJztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgcHJvbWlzZTtcbiAgICBpZiAod2hlcmUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICAgICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgICAgIHZhciBwYXRjaCA9IHBhdGNoZXNbd2hhdF07XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAocGF0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGF0Y2gpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoJ05vIHBhdGNoIHdpdGggbmFtZSBcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hhdCArICdcIiBpbiBsb2NhbCBzdG9yYWdlLicpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2h0dHAnKSB7XG4gICAgICAgIHZhciB1cmwgPSB3aGF0O1xuICAgICAgICBwcm9taXNlID0gaHR0cC5nZXQodXJsKTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnZmlsZSBvYmplY3QnKSB7XG4gICAgICAgIHZhciBmaWxlID0gd2hhdDtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgIGZpbGVSZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGV2ZW50LnRhcmdldC5yZXN1bHQpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmaWxlUmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ2JhZCBsb2FkIGxvY2F0aW9uIChcIicgKyB3aGVyZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIpLCBtdXN0IGJlIFwibG9jYWxcIiBvciBcImh0dHBcIicpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICAgIGVkaXRvci5jbGVhckFsbCgpO1xuICAgICAgICBpbXBvcnRQYXRjaChwYXRjaCk7XG4gICAgfSk7XG59O1xuXG5zdG9yYWdlLnJlbW92ZVBhdGNoID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgIHZhciB0cmFzaCA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0cmFzaCcpKTtcbiAgICB0cmFzaCA9IHRyYXNoIHx8IHt9O1xuICAgIHZhciBwYXRjaCA9IHBhdGNoZXNbbmFtZV07XG4gICAgaWYgKHBhdGNoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgJ05vIHBhdGNoIHdpdGggbmFtZSBcIicgKyBuYW1lICsgJ1wiIGluIGxvY2FsIHN0b3JhZ2UuJztcbiAgICB9XG4gICAgdHJhc2hbbmFtZV0gPSBwYXRjaDtcbiAgICBkZWxldGUgcGF0Y2hlc1tuYW1lXTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3BhdGNoZXMnLCBKU09OLnN0cmluZ2lmeShwYXRjaGVzKSk7XG4gICAgZWRpdG9yLmNsZWFyQWxsKCk7XG59O1xuXG5zdG9yYWdlLmdldFBhdGNoTmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICByZXR1cm4gXy5rZXlzKHBhdGNoZXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdG9yYWdlO1xuIiwiLy8gVXNlIG9mIHRlcm1saWIuanMgZm9yIHRoZSB0ZXJtaW5hbCBmcmFtZS5cblxuLy8gZ2xvYmFscyBmcm9tIHRlcm1saWIuanNcbi8qZ2xvYmFsIFRlcm1HbG9iYWxzICovXG4vKmdsb2JhbCB0ZXJtS2V5ICovXG4vKmdsb2JhbCBQYXJzZXIgKi9cbi8qZ2xvYmFsIFRlcm1pbmFsICovXG5cbnZhciB0ZXJtaW5hbCA9IHt9O1xuXG50ZXJtaW5hbC5jcmVhdGUgPSBmdW5jdGlvbiAoY29tbWFuZHMsIG9uYmx1cikge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciB0ZXJtRGl2SWQgPSAnY29tbWFuZC1saW5lLWZyYW1lJztcblxuICAgIHZhciBnZXRUZXJtRGl2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycgKyB0ZXJtRGl2SWQpO1xuICAgIH07XG5cbiAgICB2YXIgYmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgVGVybUdsb2JhbHMua2V5bG9jayA9IHRydWU7XG4gICAgICAgIFRlcm1HbG9iYWxzLmFjdGl2ZVRlcm0uY3Vyc29yT2ZmKCk7XG4gICAgICAgIHZhciB0ZXJtRGl2ID0gZ2V0VGVybURpdigpO1xuICAgICAgICB0ZXJtRGl2LmNsYXNzTGlzdC50b2dnbGUoJ2ZvY3VzZWQnKTtcbiAgICAgICAgb25ibHVyKCk7XG4gICAgfTtcblxuICAgIHZhciBjdHJsSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRDaGFyID09PSB0ZXJtS2V5LkVTQykge1xuICAgICAgICAgICAgYmx1cigpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciB0ZXJtSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGF0Lm5ld0xpbmUoKTtcbiAgICAgICAgdmFyIHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbiAgICAgICAgcGFyc2VyLnBhcnNlTGluZSh0aGF0KTtcbiAgICAgICAgdmFyIGNvbW1hbmROYW1lID0gdGhhdC5hcmd2WzBdO1xuICAgICAgICBpZiAoY29tbWFuZHMuaGFzT3duUHJvcGVydHkoY29tbWFuZE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHRoYXQuYXJndi5zbGljZSgxKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNvbW1hbmRzW2NvbW1hbmROYW1lXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC50aGVuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZSgnRXJyb3I6ICcgKyBlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhhdC53cml0ZShlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0LndyaXRlKCd1bmtub3duIGNvbW1hbmQgXCInICsgY29tbWFuZE5hbWUgKyAnXCIuJyk7XG4gICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBpbml0SGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wcm9tcHQoKTtcbiAgICB9O1xuXG4gICAgLy8gVGhlIHRlcm1saWIuanMgb2JqZWN0XG4gICAgdmFyIHRlcm0gPSBuZXcgVGVybWluYWwoIHtcbiAgICAgICAgdGVybURpdjogdGVybURpdklkLFxuICAgICAgICBoYW5kbGVyOiB0ZXJtSGFuZGxlcixcbiAgICAgICAgYmdDb2xvcjogJyNmMGYwZjAnLFxuICAgICAgICBjcnNyQmxpbmtNb2RlOiB0cnVlLFxuICAgICAgICBjcnNyQmxvY2tNb2RlOiBmYWxzZSxcbiAgICAgICAgcm93czogMTAsXG4gICAgICAgIGZyYW1lV2lkdGg6IDAsXG4gICAgICAgIGNsb3NlT25FU0M6IGZhbHNlLFxuICAgICAgICBjdHJsSGFuZGxlcjogY3RybEhhbmRsZXIsXG4gICAgICAgIGluaXRIYW5kbGVyOiBpbml0SGFuZGxlclxuXG4gICAgfSApO1xuICAgIHRlcm0ub3BlbigpO1xuXG4gICAgdmFyIGZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoVGVybUdsb2JhbHMua2V5bG9jayA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBUZXJtR2xvYmFscy5rZXlsb2NrID0gZmFsc2U7XG4gICAgICAgIFRlcm1HbG9iYWxzLmFjdGl2ZVRlcm0uY3Vyc29yT24oKTtcbiAgICAgICAgdmFyIHRlcm1EaXYgPSBnZXRUZXJtRGl2KCk7XG4gICAgICAgIHRlcm1EaXYuY2xhc3NMaXN0LnRvZ2dsZSgnZm9jdXNlZCcpO1xuICAgIH07XG5cbiAgICBibHVyKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBmb2N1czogZm9jdXMsXG4gICAgICAgIHRlcm06IHRlcm1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB0ZXJtaW5hbDtcbiIsIi8vIFN5bnRhY3RpYyBzdWdhciBhbmQgc2ltcGxlIHV0aWxpdGllcy5cblxuLypnbG9iYWwgXyAqL1xuXG52YXIgdXRpbHMgPSB7fTtcblxudmFyIGRvbTtcbmRvbSA9IHtcbiAgICAvLyBDcmVhdGUgYSBkb20gZnJhZ21lbnQgZnJvbSBhIEhUTUwgc3RyaW5nLlxuICAgIGNyZWF0ZUZyYWdtZW50OiBmdW5jdGlvbihodG1sU3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgaWYgKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBkaXYgPSBmcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XG4gICAgICAgICAgICBkaXYuaW5uZXJIVE1MID0gaHRtbFN0cmluZztcbiAgICAgICAgICAgIHZhciBjaGlsZDtcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICAgICAgICAgIHdoaWxlIChjaGlsZCA9IGRpdi5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgLyplc2xpbnQtZW5hYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgICAgICAgICAgICAgZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBkaXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhZ21lbnQucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfSxcblxuICAgIC8vIE1vdmUgRE9NIG5vZGVzIGZyb20gYSBzb3VyY2UgdG8gYSB0YXJnZXQuIFRoZSBub2RlcyBhcmVzIHNlbGVjdGVkXG4gICAgLy8gYmFzZWQgb24gYSBzZWxlY3RvciBhbmQgdGhlIHBsYWNlIHRoZXkgYXJlIGluc3RlcnRlZCBpcyBhIGdpdmVuIHRhZ1xuICAgIC8vIHdpdGggYSBcInNlbGVjdFwiIGF0dHJpYnV0ZSB3aGljaCBjb250YWlucyB0aGUgZ2l2ZW4gc2VsZWN0b3IuIElmXG4gICAgLy8gICAgc291cmNlIGlzICdhYWEgPHNwYW4gY2xhc3M9XCJzb21ldGhpbmdcIj56eno8L3NwYW4+J1xuICAgIC8vIGFuZFxuICAgIC8vICAgIHRhcmdldCBpcyAncnJyIDxjb250ZW50IHNlbGVjdD1cIi5zb21ldGhpbmdcIj48L2NvbnRlbnQ+IHR0dCdcbiAgICAvLyBBZnRlciBtb3ZlQ29udGVudEJhc2VkT25TZWxlY3Rvcihzb3VyY2UsIHRhcmdldCwgJy5zb21ldGhpbmcnKTpcbiAgICAvLyAgICBzb3VyY2UgaXMgJ2FhYSdcbiAgICAvLyBhbmRcbiAgICAvLyAgICB0YXJnZXQgaXMgJ3JyciA8c3BhbiBjbGFzcz1cInNvbWV0aGluZ1wiPnp6ejwvc3Bhbj4gdHR0J1xuICAgIG1vdmVDb250ZW50QmFzZWRPblNlbGVjdG9yOiBmdW5jdGlvbihzb3VyY2UsIHRhcmdldCwgc2VsZWN0b3IsIHRhcmdldFRhZykge1xuICAgICAgICB2YXIgY29udGVudDtcbiAgICAgICAgdmFyIGVsZW1lbnRzO1xuICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0VGFnKTtcbiAgICAgICAgICAgIGVsZW1lbnRzID0gc291cmNlLmNoaWxkTm9kZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0VGFnICsgJ1tzZWxlY3Q9XCInICsgc2VsZWN0b3IgKyAnXCJdJyk7XG4gICAgICAgICAgICBlbGVtZW50cyA9IHNvdXJjZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXYXJuaW5nOiBpdCBpcyBpbXBvcnRhbnQgdG8gbG9vcCBlbGVtZW50cyBiYWNrd2FyZCBzaW5jZSBjdXJyZW50XG4gICAgICAgIC8vIGVsZW1lbnQgaXMgcmVtb3ZlZCBhdCBlYWNoIHN0ZXAuXG4gICAgICAgIGZvciAodmFyIGkgPSBlbGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIC8vIFRPRE8uIExlIFwiaW5zZXJ0XCIgY2ktZGVzc291cyBzdXIgbGVzIHotcG9ydCBmYWl0IHF1ZSBsZVxuICAgICAgICAgICAgLy8gZGV0YWNoZWRDYWxsYmFjayBlc3QgYXBwZWzDqSBhdmVjIGwnaW1wbGVtZW50YXRpb24gZGUgY3VzdG9tXG4gICAgICAgICAgICAvLyBlbG1lbnRzIHBhciB3ZWJyZWZsZWN0aW9ucyBtYWlzIHBhcyBwYXIgbCdpbXBsw6ltZW50YXRpb24gZGVcbiAgICAgICAgICAgIC8vIFBvbHltZXIgKGVuIHV0aWxpc2FudCBsZSBwb2x5ZmlsbCBkZSBCb3NvbmljKSBuaSBhdmVjXG4gICAgICAgICAgICAvLyBsJ2ltcGzDqW1lbnRhdGlvbiBuYXRpdmUgZGUgY2hyb21lLlxuICAgICAgICAgICAgY29udGVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5uZXh0U2libGluZ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIFRPRE8gbW92ZSB0aGlzIGVsc2V3aGVyZS5cbiAgICAgICAgICAgIGlmIChlbGVtZW50Lm9uY2xpY2sgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBnbG9iYWwgdG8gYWNjZXNzIHRoaXMgZnVuY3Rpb24gYmVjYXVzZSB1c2luZyByZXF1aXJlXG4gICAgICAgICAgICAgICAgICAgIC8vIG9uIGNvbW1hbmRzIGhhcyBhIGN5Y2xpYyBkZXBlbmRlbmN5LlxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuYXBwLmNvbW1hbmRzLmVkaXRCbG9jayhzb3VyY2UpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNvbnRlbnQpO1xuICAgIH0sXG5cbiAgICBtb3ZlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBkb20ubW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5mcm9tLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMudG8sXG4gICAgICAgICAgICAgICAgb3B0aW9ucy53aXRoU2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vblRhZ1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvLyBHZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50IHJlbGF0aXZlIHRvIGFub3RoZXIgb25lIChkZWZhdWx0IGlzXG4gICAgLy8gZG9jdW1lbnQgYm9keSkuXG4gICAgZ2V0UG9zaXRpb246IGZ1bmN0aW9uIChlbGVtZW50LCByZWxhdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZWxhdGl2ZUVsZW1lbnQgPSByZWxhdGl2ZUVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keTtcbiAgICAgICAgdmFyIHJlbGF0aXZlUmVjdCA9IHJlbGF0aXZlRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHJlY3QubGVmdCAtIHJlbGF0aXZlUmVjdC5sZWZ0LFxuICAgICAgICAgICAgeTogcmVjdC50b3AgLSByZWxhdGl2ZVJlY3QudG9wXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGdldFNlbGVjdGlvblN0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCkuYW5jaG9yTm9kZTtcbiAgICAgICAgcmV0dXJuICggKG5vZGUgIT09IG51bGwgJiYgbm9kZS5ub2RlVHlwZSA9PT0gMykgPyBub2RlLnBhcmVudE5vZGUgOiBub2RlICk7XG4gICAgfVxuXG59O1xudXRpbHMuZG9tID0gZG9tO1xuXG4vLyBVc2VmdWxsIGZvciBtdWx0aWxpbmUgc3RyaW5nIGRlZmluaXRpb24gd2l0aG91dCAnXFwnIG9yIG11bHRpbGluZVxuLy8gY29uY2F0ZW5hdGlvbiB3aXRoICcrJy5cbnV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbiA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuYy50b1N0cmluZygpLm1hdGNoKC9bXl0qXFwvXFwqKFteXSopXFwqXFwvXFxzKlxcfSQvKVsxXTtcbn07XG5cbnV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gUmV0dXJucyBhIGtleXMgZ2VuZXJhdG9yIGZvciBhIHNlcXVlbmNlIHRoYXQgaXMgYnVpbGQgbGlrZSB0aGF0OlxuICAgIC8vICAgYiwgYywgZC4uLlxuICAgIC8vICAgYWIsIGFjLCBhZC4uLlxuICAgIC8vICAgYWFiLCBhYWMsIGFhZC4uLlxuICAgIC8vIFRoZSBpZGVhIGlzIHRvIGhhdmUgYSBzZXF1ZW5jZSB3aGVyZSBlYWNoIHZhbHVlIGlzIG5vdCB0aGUgYmVnaW5uaW5nXG4gICAgLy8gb2YgYW55IG90aGVyIHZhbHVlIChzbyBzaW5nbGUgJ2EnIGNhbid0IGJlIHBhcnQgb2YgdGhlIHNlcXVlbmNlKS5cbiAgICAvL1xuICAgIC8vIE9uZSBnb2FsIGlzIHRvIGhhdmUgc2hvcnRlc3QgcG9zc2libGUga2V5cy4gU28gbWF5YmUgd2Ugc2hvdWxkIHVzZVxuICAgIC8vIGFkZGl0aW9ubmFsIHByZWZpeCBjaGFycyBhbG9uZyB3aXRoICdhJy4gQW5kIGJlY2F1c2UgaXQgd2lsbCBiZSB1c2VkXG4gICAgLy8gZm9yIHNob3J0Y3V0cywgbWF5YmUgd2UgY2FuIGNob29zZSBjaGFycyBiYXNlZCBvbiB0aGVpciBwb3NpdGlvbiBvblxuICAgIC8vIHRoZSBrZXlib2FyZC5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBjaGFyQ29kZXMgPSBfLnJhbmdlKCdiJy5jaGFyQ29kZUF0KDApLCAneicuY2hhckNvZGVBdCgwKSArIDEpO1xuICAgIHZhciBpZFN0cmluZ3MgPSBfLm1hcChjaGFyQ29kZXMsIGZ1bmN0aW9uIChjaGFyQ29kZSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZSk7XG4gICAgfSk7XG4gICAgdmFyIGdlbmVyYXRvciA9IHt9O1xuICAgIGdlbmVyYXRvci5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIga2V5ID0gJyc7XG4gICAgICAgIHZhciBpID0gaW5kZXg7XG4gICAgICAgIGlmIChpID49IGNoYXJDb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciByID0gTWF0aC5mbG9vcihpIC8gY2hhckNvZGVzLmxlbmd0aCk7XG4gICAgICAgICAgICBpID0gaSAlIGNoYXJDb2Rlcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAociA+IDApIHtcbiAgICAgICAgICAgICAgICBrZXkgKz0gJ2EnO1xuICAgICAgICAgICAgICAgIHItLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBrZXkgKz0gaWRTdHJpbmdzW2ldO1xuICAgICAgICBpbmRleCsrO1xuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH07XG5cbiAgICByZXR1cm4gZ2VuZXJhdG9yO1xufTtcblxudXRpbHMuZ2V0U2NyaXBTdHJpbmd0V2l0aE5ld2xpbmVzID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBUaGUgbmV3bGluZXMgYXJlIGxvc3Qgd2hlbiB1c2luZyByYXcgaW5uZXJIVE1MIGZvciBzY3JpcHQgdGFnc1xuICAgIC8vIChhdCBsZWFzdCBvbiBmaXJlZm94KS4gU28gd2UgcGFyc2UgZWFjaCBjaGlsZCB0byBhZGQgYSBuZXdsaW5lXG4gICAgLy8gd2hlbiBCUiBhcmUgZW5jb3VudGVyZWQuXG4gICAgdmFyIHZhbHVlID0gJyc7XG4gICAgW10uZm9yRWFjaC5jYWxsKGVsZW1lbnQuY2hpbGROb2RlcywgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ0JSJykge1xuICAgICAgICAgICAgdmFsdWUgKz0gJ1xcbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSArPSBub2RlLnRleHRDb250ZW50O1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuXG53aW5kb3cudXRpbHMgPSB1dGlscztcbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iLCIvKmdsb2JhbCBfICovXG4vKmdsb2JhbCBNb3VzZXRyYXAgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG5cbnZhciB2aWV3ID0ge307XG5cbnZhciBpc0Rlc2NlbmRhbnQgPSBmdW5jdGlvbiAoY2hpbGQsIHBhcmVudCkge1xuICAgICB2YXIgbm9kZSA9IGNoaWxkLnBhcmVudE5vZGU7XG4gICAgIHdoaWxlIChub2RlICE9PSBudWxsKSB7XG4gICAgICAgICBpZiAobm9kZSA9PT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICB9XG4gICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICB9XG4gICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBnZXRQcmVzZW50YXRpb25FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpO1xufTtcblxudmFyIGNyZWF0ZVBoYW50b21MaW5rID0gZnVuY3Rpb24gKHBoYW50b21lZCwgcGhhbnRvbSkge1xuICAgIHBoYW50b20ucGhhbnRvbU9mID0gcGhhbnRvbWVkO1xuICAgIHBoYW50b20uY2xhc3NMaXN0LmFkZCgncGhhbnRvbScpO1xuICAgIHBoYW50b21lZC5waGFudG9tZWRCeSA9IHBoYW50b207XG4gICAgcGhhbnRvbWVkLmNsYXNzTGlzdC5hZGQoJ3BoYW50b21lZCcpO1xufTtcbnZpZXcuY3JlYXRlUGhhbnRvbUxpbmsgPSBjcmVhdGVQaGFudG9tTGluaztcblxudmFyIGNyZWF0ZVBoYW50b20gPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgcGhhbnRvbSA9IGVsZW1lbnQuY2xvbmVOb2RlKHRydWUpO1xuICBwaGFudG9tLmRpc2FibGVkID0gdHJ1ZTtcbiAgcGhhbnRvbS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRFZGl0YWJsZScsIGZhbHNlKTtcbiAgLy8gTGluayB0aGUgdHdvIGZvciBsYXRlciB1c2UgKGluIHBhcnRpY3VsYXJ5IHdoZW4gd2Ugd2lsbCBzd2l0Y2hcbiAgLy8gZGlzcGxheSBtb2RlKS5cbiAgY3JlYXRlUGhhbnRvbUxpbmsoZWxlbWVudCwgcGhhbnRvbSk7XG5cbiAgcmV0dXJuIHBoYW50b207XG59O1xuXG52YXIgaXNDdXJyZW50U2VsZWN0aW9uSW5QcmVzZW50YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCB0aGUgc2VsZWN0aW9uIHJhbmdlIChvciBjdXJzb3IgcG9zaXRpb24pXG4gIHZhciByYW5nZSA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICB2YXIgemVQcmVzZW50YXRpb24gPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gIC8vIEJlIHN1cmUgdGhlIHNlbGVjdGlvbiBpcyBpbiB0aGUgcHJlc2VudGF0aW9uLlxuICByZXR1cm4gaXNEZXNjZW5kYW50KHJhbmdlLnN0YXJ0Q29udGFpbmVyLCB6ZVByZXNlbnRhdGlvbik7XG59O1xuXG52YXIgaW5zZXJ0SW5QbGFjZU9mU2VsZWN0aW9uID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgLy8gR2V0IHRoZSBzZWxlY3Rpb24gcmFuZ2UgKG9yIGN1cnNvciBwb3NpdGlvbilcbiAgdmFyIHJhbmdlID0gd2luZG93LmdldFNlbGVjdGlvbigpLmdldFJhbmdlQXQoMCk7XG4gIC8vIERlbGV0ZSB3aGF0ZXZlciBpcyBvbiB0aGUgcmFuZ2VcbiAgcmFuZ2UuZGVsZXRlQ29udGVudHMoKTtcbiAgcmFuZ2UuaW5zZXJ0Tm9kZShlbGVtZW50KTtcbn07XG5cbi8vIEluc2VydCBhIHNlbGVjdGVkIGJsb2NrIGluIHRoZSBET00gc2VsZWN0aW9uIGluIHByZXNlbnRhdGlvbiB3aW5kb3cuXG52YXIgaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBibG9jayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCcpO1xuICBpZiAoYmxvY2sgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE5vdGhpbmcgaXMgc2VsZWN0ZWQuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYoaXNDdXJyZW50U2VsZWN0aW9uSW5QcmVzZW50YXRpb24oKSkge1xuICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICB2YXIgcGhhbnRvbSA9IGNyZWF0ZVBoYW50b20oY29udGVudCk7XG4gICAgaW5zZXJ0SW5QbGFjZU9mU2VsZWN0aW9uKHBoYW50b20pO1xuXG4gICAgLy8gVE9ETyBldmVudHVhbGx5IHN3aXRjaCB0aGUgdHdvIGlmIHdlIGFyZSBpbiBwcmVzZW50YXRpb24gbW9kZS5cbiAgfVxufTtcbnZpZXcuaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb24gPSBpbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbjtcblxudmFyIGdldFBoYW50b21zID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgcmV0dXJuIGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbn07XG5cbnZhciBnZXRXaW5kb3dGb3JNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcbiAgdmFyIGlkID0gbW9kZTtcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbn07XG5cbnZhciBzd2FwRWxlbWVudHMgPSBmdW5jdGlvbiAob2JqMSwgb2JqMikge1xuICAgIC8vIGNyZWF0ZSBtYXJrZXIgZWxlbWVudCBhbmQgaW5zZXJ0IGl0IHdoZXJlIG9iajEgaXNcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG9iajEucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGVtcCwgb2JqMSk7XG5cbiAgICAvLyBtb3ZlIG9iajEgdG8gcmlnaHQgYmVmb3JlIG9iajJcbiAgICBvYmoyLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG9iajEsIG9iajIpO1xuXG4gICAgLy8gbW92ZSBvYmoyIHRvIHJpZ2h0IGJlZm9yZSB3aGVyZSBvYmoxIHVzZWQgdG8gYmVcbiAgICB0ZW1wLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG9iajIsIHRlbXApO1xuXG4gICAgLy8gcmVtb3ZlIHRlbXBvcmFyeSBtYXJrZXIgbm9kZVxuICAgIHRlbXAucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0ZW1wKTtcbn07XG5cbnZhciBjdXJyZW50TW9kZSA9ICcnO1xuXG4vLyBEbyBhbGwgdGhlIHN0dWZmIG5lZWRlZCB0byBzd2l0Y2ggbW9kZSBiZXR3ZWVuICdlZGl0JyBhbmQgJ3ByZXNlbnRhdGlvbicuXG4vLyBNYWlubHkgc3dhcCAncGhhbnRvbScgYW5kICdwaGFudG9tZWQnIG9iamVjdHMgcGFpcnMuXG52YXIgc3dpdGNoTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG4gICAgaWYgKG1vZGUgPT09IGN1cnJlbnRNb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY3VycmVudE1vZGUgPSBtb2RlO1xuICAvLyBCeSBjb252ZW50aW9uLCB0aGUgJ3BoYW50b20nIGVsZW1lbnRzIGFjdHVhbGx5IGFyZSBpbiB0aGUgd2luZG93XG4gIC8vIGFzc29jaWF0ZWQgdG8gdGhlIG1vZGUgd2Ugd2FudCB0byBzd2l0Y2ggdG8uIFRoZSBwaGFudG9tZWQgb25lIGFyZSBpbiB0aGVcbiAgLy8gd2luZG93IG9mIHRoZSBvdGhlciBtb2RlLlxuXG4gIHZhciBwaGFudG9tcyA9IGdldFBoYW50b21zKGdldFdpbmRvd0Zvck1vZGUobW9kZSkpO1xuICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgLy8gV2hhdCB0aGlzIG9iamVjdCBpcyB0aGUgcGhhbnRvbSBvZj9cbiAgICB2YXIgcGhhbnRvbWVkID0gcGhhbnRvbS5waGFudG9tT2Y7XG4gICAgLy8gU2ltcGx5IHN3YXAgdGhlc2UgRE9NIG9iamVjdHMuXG4gICAgc3dhcEVsZW1lbnRzKHBoYW50b21lZCwgcGhhbnRvbSk7XG4gIH0pO1xufTtcbnZpZXcuc3dpdGNoTW9kZSA9IHN3aXRjaE1vZGU7XG5cbnZhciBwcmVzZW50YXRpb24gPSB7fTtcblxuLy8gVE9ETyBub3QgdXNlZD9cbnZhciBzZWxlY3RFbGVtZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHByZXNlbnRhdGlvbi5zZWxlY3RlZCA9IGV2ZW50LnRhcmdldDtcbn07XG52aWV3LnNlbGVjdEVsZW1lbnQgPSBzZWxlY3RFbGVtZW50O1xuXG52YXIgbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLmNvbnRlbnRFZGl0YWJsZSA9IGZhbHNlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNsb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdW5sb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gZmFsc2U7XG59O1xudmlldy5sb2NrID0gbG9jaztcblxudmFyIHVubG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLmNvbnRlbnRFZGl0YWJsZSA9IHRydWU7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xvY2stYnV0dG9uJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdW5sb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gdHJ1ZTtcbn07XG52aWV3LnVubG9jayA9IHVubG9jaztcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLm9uZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIH07XG4gICAgcC5vbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbW1hbmRzLmJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9O1xufTtcbnZpZXcuaW5pdCA9IGluaXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gdmlldztcbmdsb2JhbC52aWV3ID0gdmlldztcbiIsIi8qZ2xvYmFsIHJlc3R5bGUgKi9cbi8qZ2xvYmFsIERyYWdnYWJpbGx5ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1ibG9jayc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPGRpdiBpZD1cIm1haW5cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBvcnRzLWNvbnRhaW5lciBpbnB1dHNcIj5cbiAgICAgICAgICAgIDxjb250ZW50IHNlbGVjdD1cInotcG9ydC5pbnB1dFwiPjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwiYmxvY2sta2V5XCI+YTwvc3Bhbj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnQtY29udGFpbmVyXCI+XG4gICAgICAgICAgICA8Y29udGVudD48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwicG9ydHMtY29udGFpbmVyIG91dHB1dHNcIj5cbiAgICAgICAgICAgIDxjb250ZW50IHNlbGVjdD1cInotcG9ydC5vdXRwdXRcIj48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAvLyBCeSBkZWZhdWx0IGN1c3RvbSBlbGVtZW50cyBhcmUgaW5saW5lIGVsZW1lbnRzLiBDdXJyZW50IGVsZW1lbnRcbiAgICAgICAgLy8gaGFzIGl0cyBvd24gaGVpZ2h0IGFuZCB3aWR0aCBhbmQgY2FuIGJlIGluc3RlcnRlZCBpbiBhIHRleHRcbiAgICAgICAgLy8gZmxvdy4gU28gd2UgbmVlZCBhICdkaXNwbGF5OiBpbmxpbmUtYmxvY2snIHN0eWxlLiBNb3Jlb3ZlciwgdGhpc1xuICAgICAgICAvLyBpcyBuZWVkZWQgYXMgYSB3b3JrYXJvdW5kIGZvciBhIGJ1ZyBpbiBEcmFnZ2FiaWxseSAod2hpY2ggb25seVxuICAgICAgICAvLyB3b3JrcyBvbiBibG9jayBlbGVtZW50cywgbm90IG9uIGlubGluZSBvbmVzKS5cbiAgICAgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJ1xuICAgIH0sXG4gICAgJz4gZGl2Jzoge1xuICAgICAgICAnYmFja2dyb3VuZCc6ICd3aGl0ZScsXG4gICAgICAgICdib3JkZXItbGVmdCc6ICczcHggc29saWQnLFxuICAgICAgICAnYm9yZGVyLWxlZnQtY29sb3InOiAnd2hpdGUnLFxuICAgICAgICAnYm9yZGVyLXJpZ2h0JzogJzNweCBzb2xpZCcsXG4gICAgICAgICdib3JkZXItcmlnaHQtY29sb3InOiAnd2hpdGUnLFxuICAgICAgICAnYm94U2hhZG93JzogJzJweCAycHggM3B4IDBweCAjZGZkZmRmJ1xuICAgIH0sXG4gICAgJy5jb250ZW50LWNvbnRhaW5lcic6IHtcbiAgICAgICAgJ3BhZGRpbmcnOiAnOHB4IDE1cHggOHB4IDE1cHgnXG4gICAgfSxcbiAgICAnLnBvcnRzLWNvbnRhaW5lcic6IHtcbiAgICAgICAgJ3BhZGRpbmcnOiAwLFxuICAgICAgICAnbWluSGVpZ2h0JzogMyxcbiAgICAgICAgJ292ZXJmbG93JzogJ3Zpc2libGUnXG4gICAgfSxcbiAgICAnLnBvcnRzLWNvbnRhaW5lciB6LXBvcnQnOiB7XG4gICAgICAgICdmbG9hdCc6ICdsZWZ0JyxcbiAgICAgICAgJ21hcmdpbkxlZnQnOiA4LFxuICAgICAgICAnbWFyZ2luUmlnaHQnOiA4XG4gICAgfSxcbiAgICAnc3Bhbi5ibG9jay1rZXknOiB7XG4gICAgICAgICdmb250LXNpemUnOiAnc21hbGxlcicsXG4gICAgICAgICdjb2xvcic6ICcjNDQ0JyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2JvdHRvbSc6IDAsXG4gICAgICAgICdyaWdodCc6IDAsXG4gICAgICAgICdwYWRkaW5nLXJpZ2h0JzogMyxcbiAgICAgICAgJ3BhZGRpbmctbGVmdCc6IDMsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNmZmYnXG4gICAgfSxcbiAgICAnei1wb3J0LmlucHV0IC5wb3J0LWtleSc6IHtcbiAgICAgICAgJ3RvcCc6IDNcbiAgICB9LFxuICAgICd6LXBvcnQub3V0cHV0IC5wb3J0LWtleSc6IHtcbiAgICAgICAgJ2JvdHRvbSc6IDNcbiAgICB9XG59O1xuLy8gQXBwbHkgdGhlIGNzcyBkZWZpbml0aW9uIGFuZCBwcmVwZW5kaW5nIHRoZSBjdXN0b20gZWxlbWVudCB0YWcgdG8gYWxsXG4vLyBDU1Mgc2VsZWN0b3JzLlxudmFyIHN0eWxlID0gcmVzdHlsZSh0YWdOYW1lLCBjc3NBc0pzb24pO1xuXG52YXIgcmVkcmF3ID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIHBvcnRzID0gYmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICBwb3J0LnJlZHJhdygpO1xuICAgIH0pO1xufTtcblxudmFyIG1ha2VJdERyYWdnYWJsZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIHZhciBkcmFnZ2llID0gbmV3IERyYWdnYWJpbGx5KGJsb2NrLCB7XG4gICAgICAgIGNvbnRhaW5tZW50OiB0cnVlXG4gICAgfSk7XG4gICAgZHJhZ2dpZS5leHRlcm5hbEFuaW1hdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlZHJhdyhibG9jayk7XG4gICAgfTtcbn07XG5cbnZhciBwcm9wZXJ0aWVzID0ge1xuICAgIGNyZWF0ZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQXQgdGhlIGJlZ2lubmluZyB0aGUgbGlnaHQgRE9NIGlzIHN0b3JlZCBpbiB0aGUgY3VycmVudCBlbGVtZW50LlxuICAgICAgICB2YXIgbGlnaHREb20gPSB0aGlzO1xuICAgICAgICAvLyBTdGFydCBjb21wb3NlZCBET00gd2l0aCBhIGNvcHkgb2YgdGhlIHRlbXBsYXRlXG4gICAgICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgLy8gVGhlbiBwcm9ncmVzc2l2ZWx5IG1vdmUgZWxlbWVudHMgZnJvbSBsaWdodCB0byBjb21wb3NlZCBET00gYmFzZWQgb25cbiAgICAgICAgLy8gc2VsZWN0b3JzIG9uIGxpZ2h0IERPTSBhbmQgZmlsbCA8Y29udGVudD4gdGFncyBpbiBjb21wb3NlZCBET00gd2l0aFxuICAgICAgICAvLyB0aGVtLlxuICAgICAgICBbJ3otcG9ydC5pbnB1dCcsICd6LXBvcnQub3V0cHV0JywgJyddLmZvckVhY2goZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHV0aWxzLmRvbS5tb3ZlKHtcbiAgICAgICAgICAgICAgICBmcm9tOiBsaWdodERvbSwgd2l0aFNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICB0bzogY29tcG9zZWREb20sIG9uVGFnOiAnY29udGVudCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gQXQgdGhpcyBzdGFnZSBjb21wb3NlZCBET00gaXMgY29tcGxldGVkIGFuZCBsaWdodCBET00gaXMgZW1wdHkgKGkuZS5cbiAgICAgICAgLy8gJ3RoaXMnIGhhcyBubyBjaGlsZHJlbikuIENvbXBvc2VkIERPTSBpcyBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgdGhlXG4gICAgICAgIC8vIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAgICAgdGhpcy5oaWRlS2V5KCk7XG5cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcG9ydHMgPSB0aGF0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uKHBvcnQpIHtcbiAgICAgICAgICAgIHBvcnQuYmxvY2sgPSB0aGF0O1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy56ZS1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxuICAgICAgICB0aGlzLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB3aW5kb3cuc2V0Q3VycmVudEJsb2NrKHRoYXQpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgICAgICBzZWxlY3Rvci5zZXRTZWxlY3RhYmxlKHRoaXMsIHRydWUpO1xuICAgIH19LFxuXG4gICAgYXR0YWNoZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gVE9ETyBidWcgaW4gY2hyb21lIG9yIGluIHdlYnJlZmxlY3Rpb24gcG9seWZpbGwuIElmIG1ha2VJdERyYWdnYWJsZVxuICAgICAgICAvLyBpcyBjYWxsZWQgaW4gY3JlYXRlZENhbGxiYWNrIHRoZW4gRHJhZ2dhYmlseSBhZGRzIGFcbiAgICAgICAgLy8gJ3Bvc2l0aW9uOnJlbGF0aXZlJyBiZWNhdXNlIHRoZSBjc3Mgc3R5bGUgb2YgYmxvY2sgdGhhdCBzZXRcbiAgICAgICAgLy8gcG9zaXRpb24gdG8gYWJzb2x1dGUgaGFzIG5vdCBiZWVuIGFwcGxpZWQgeWV0ICh3aXRoIGNocm9tZSkuIFdpdGhcbiAgICAgICAgLy8gV2ViUmVmbGVjdGlvbidzIHBvbHlmaWxsIHRoZSBzdHlsZSBpcyBhcHBsaWVkIHNvIERyYWdnYWJpbGx5IGRvZXNuJ3RcbiAgICAgICAgLy8gY2hhbmdlIHBvc2l0aW9uLiBXaHkgYSBkaWZmZXJlbnQgYmVoYXZpb3VyPyBXaGljaCBpcyB3cm9uZyA/IENocm9tZSxcbiAgICAgICAgLy8gd2VicmVmbGVjdGlvbiBvciB0aGUgc3BlYz8gTWF5YmUgd2UgY2FuIHRyeSB3aXRoIHBvbHltZXIgcG9seWZpbGwuXG4gICAgICAgIG1ha2VJdERyYWdnYWJsZSh0aGlzKTtcbiAgICB9fSxcblxuICAgIHVucGx1Zzoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBvcnRzID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICAgICAgcG9ydC51bnBsdWcoKTtcbiAgICAgICAgfSk7XG4gICAgfX0sXG5cbiAgICBhZGRQb3J0OiB7dmFsdWU6IGZ1bmN0aW9uIChodG1sU3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sU3RyaW5nKTtcbiAgICAgICAgdmFyIHBvcnQgPSBmcmFnbWVudC5maXJzdENoaWxkO1xuICAgICAgICBwb3J0LmJsb2NrID0gdGhpcztcbiAgICAgICAgaWYgKHBvcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpKSB7XG4gICAgICAgICAgICB2YXIgcG9ydENvbnRhaW5lciA9IHRoaXMucXVlcnlTZWxlY3RvcignLnBvcnRzLWNvbnRhaW5lci5pbnB1dHMnKTtcbiAgICAgICAgICAgIHBvcnRDb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSkge1xuICAgICAgICAgICAgdmFyIHBvcnRDb250YWluZXIgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5wb3J0cy1jb250YWluZXIub3V0cHV0cycpO1xuICAgICAgICAgICAgcG9ydENvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBvcnQ7XG4gICAgfX0sXG5cbiAgICBrZXlFbGVtZW50OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3Rvcignc3Bhbi5ibG9jay1rZXknKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXk6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMua2V5RWxlbWVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzaG93S2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfX0sXG5cbiAgICBoaWRlS2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICB9fSxcblxuICAgIHBvcnRzOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnb3V0JzogdGhpcy5xdWVyeVNlbGVjdG9yKCd6LXBvcnQub3V0cHV0JyksXG4gICAgICAgICAgICAgICAgJ2lucHV0cyc6IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0JyksXG4gICAgICAgICAgICAgICAgJ291dHB1dHMnOiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlLCBwcm9wZXJ0aWVzKTtcbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG5cbi8vIFRPRE8gY2xlYW4gZ2xvYmFsc1xud2luZG93LmdldEVsZW1lbnRCbG9jayA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgLy8gVE9ETyBkbyBhIHNlYXJjaCB0byBmaW5kIHRoZSBmaXJzdCBwYXJlbnQgYmxvY2sgZm9yIGNhc2VzIHdoZXJlXG4gICAgLy8gZWxlbWVudCBpcyBkb3duIGluIHRoZSBlbGVtZW50IGhpZWFyY2h5LlxuICAgIHZhciBtYXliZUJsb2NrID0gZWxlbWVudC5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICB2YXIgYmxvY2s7XG4gICAgaWYgKG1heWJlQmxvY2sudGFnTmFtZSA9PT0gJ1otQkxPQ0snKSB7XG4gICAgICAgIGJsb2NrID0gbWF5YmVCbG9jaztcbiAgICB9IGVsc2Uge1xuICAgICAgICBibG9jayA9IGVsZW1lbnQucGhhbnRvbWVkQnkucGFyZW50Tm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBibG9jaztcbn07XG4iLCIvLyBDdXN0b20gZWxlbWVudCB0byBkcmF3IGEgbGluayBiZXR3ZWVuIHR3byBwb3J0cy5cblxuLy8gV2UgaW1wbGVtZW50IHRoaXMgYXMgYSBkaXYgd2l0aCB6ZXJvIGhlaWdodCB3aGljaCB3aWR0aCBpcyB0aGUgbGVuZ3RoIG9mIHRoZVxuLy8gbGluZSBhbmQgdXNlIHRyYW5zZm9ybXMgdG8gc2V0IGl0cyBlbmRzIHRvIHRoZSBwb3J0cyBwb3NpdGlvbnMuIFJlZmVyZW5jZVxuLy8gb3JpZ2luIHBvc2l0aW9uIGlzIHJlbGF0aXZlIGNvb3JkaW5hdGVzICgwLDApIGFuZCBvdGhlciBlbmQgaXMgKHdpZHRoLDApLlxuLy8gU28gYmUgc3VyZSB0aGF0IENTUyBzdHlsaW5nIGlzIGRvbmUgYWNjb3JkaW5nbHkuXG5cbi8qZ2xvYmFsIGdldFN0eWxlUHJvcGVydHkgKi9cblxuLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgcmVzdHlsZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi4vbGliL3NlbGVjdG9yJyk7XG5cbnZhciB0YWdOYW1lID0gJ3otbGluayc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPGRpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+XG4gICAgPC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbi8vIFRPRE8gVXNlIGEgY3VzdG9tIGVsZW1lbnQgZm9yIGxpbmUgd2lkdGguXG52YXIgbGluZVdpZHRoID0gMy4wO1xudmFyIHJhZGl1cyA9IGxpbmVXaWR0aCAvIDI7XG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnaGVpZ2h0JzogMCxcbiAgICAgICAgJ21hcmdpbi1sZWZ0JzogLXJhZGl1cyxcbiAgICAgICAgJ21hcmdpbi10b3AnOiAtcmFkaXVzLFxuICAgICAgICAnYm9yZGVyV2lkdGgnOiByYWRpdXMsXG4gICAgICAgICdib3JkZXJSYWRpdXMnOiByYWRpdXMsXG4gICAgICAgICdib3JkZXJTdHlsZSc6ICdzb2xpZCcsXG4gICAgICAgICdib3hTaGFkb3cnOiAnMHB4IDBweCAzcHggMHB4ICNkZmRmZGYnLFxuICAgICAgICAnYm9yZGVyQ29sb3InOiAnI2NjYydcbiAgICB9LFxuICAgICdkaXYuc2VsZWN0b3InOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdsZWZ0JzogJzEwJScsXG4gICAgICAgICd3aWR0aCc6ICc4MCUnLFxuICAgICAgICAndG9wJzogLTcsXG4gICAgICAgICdoZWlnaHQnOiAxNCxcbiAgICAgICAgJ3pJbmRleCc6IDAsXG4gICAgICAgICdib3JkZXJDb2xvcic6ICcjMzMzJ1xuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciBnZXRQb2xhckNvb3JkaW5hdGVzID0gZnVuY3Rpb24ocG9zaXRpb24xLCBwb3NpdGlvbjIpIHtcbiAgICB2YXIgeERpZmYgPSBwb3NpdGlvbjEueCAtIHBvc2l0aW9uMi54O1xuICAgIHZhciB5RGlmZiA9IHBvc2l0aW9uMS55IC0gcG9zaXRpb24yLnk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBtb2Q6IE1hdGguc3FydCh4RGlmZiAqIHhEaWZmICsgeURpZmYgKiB5RGlmZiksXG4gICAgICAgIGFyZzogTWF0aC5hdGFuKHlEaWZmIC8geERpZmYpXG4gICAgfTtcbn07XG5cbi8vIFNldCB0aGUgc3R5bGUgb2YgYSBnaXZlbiBlbGVtZW50IHNvIHRoYXQ6XG4vLyAqIEl0cyBvcmlnaW4gKGkuZS4gMCwwIHJlbGF0aXZlIGNvb3JkaW5hdGVzKSBpcyBwbGFjZWQgYXQgb25lIHBvc2l0aW9uLlxuLy8gKiBJdHMgd2lkdGggaXMgc2V0IHRvIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gcG9zaXRpb25zLlxuLy8gKiBJdCBpcyByb3RhdGVkIHNvIHRoYXQgaXRzIGVuZCBwb2ludCAoeCA9IHdpZHRoIGFuZCB5ID0gMCkgaXMgcGxhY2VkIGF0XG4vLyB0aGUgb3RoZXIgcG9zaXRpb24uXG52YXIgdHJhbnNmb3JtUHJvcGVydHkgPSBnZXRTdHlsZVByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbnZhciBzZXRFbGVtZW50RW5kcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGVuZDEsIGVuZDIpIHtcbiAgICB2YXIgb3JpZ2luO1xuICAgIGlmIChlbmQxLnggPCBlbmQyLngpIHtcbiAgICAgICAgb3JpZ2luID0gZW5kMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvcmlnaW4gPSBlbmQyO1xuICAgIH1cblxuICAgIHZhciBwb2xhciA9IGdldFBvbGFyQ29vcmRpbmF0ZXMoZW5kMSwgZW5kMik7XG4gICAgdmFyIGxlbmd0aCA9IHBvbGFyLm1vZDtcbiAgICB2YXIgYW5nbGUgPSBwb2xhci5hcmc7XG5cbiAgICB2YXIgdG9wID0gb3JpZ2luLnkgKyAwLjUgKiBsZW5ndGggKiBNYXRoLnNpbihhbmdsZSk7XG4gICAgdmFyIGxlZnQgPSBvcmlnaW4ueCAtIDAuNSAqIGxlbmd0aCAqICgxIC0gTWF0aC5jb3MoYW5nbGUpKTtcbiAgICB2YXIgcGFyZW50UG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICBsZWZ0IC09IHBhcmVudFBvc2l0aW9uLng7XG4gICAgdG9wIC09IHBhcmVudFBvc2l0aW9uLnk7XG5cbiAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gbGVuZ3RoICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZVt0cmFuc2Zvcm1Qcm9wZXJ0eV0gPSAncm90YXRlKCcgKyBhbmdsZSArICdyYWQpJztcbn07XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAoemxpbmspIHtcbiAgICB2YXIgZW5kMSA9IHpsaW5rLmJlZ2luLnBvcnQ7XG4gICAgdmFyIGVuZDIgPSB6bGluay5lbmQucG9ydDtcbiAgICBpZiAoZW5kMSAhPT0gdW5kZWZpbmVkICYmIGVuZDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZXRFbGVtZW50RW5kcyh6bGluaywgZW5kMS5jb25uZWN0aW9uUG9zaXRpb24sIGVuZDIuY29ubmVjdGlvblBvc2l0aW9uKTtcbiAgICB9XG59O1xuXG52YXIgY29ubmVjdCA9IGZ1bmN0aW9uKHpsaW5rLCBwbHVnLCBwb3J0KSB7XG4gICAgaWYgKHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJykge1xuICAgICAgICBwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihwb3J0KTtcbiAgICB9XG4gICAgcGx1Zy5wb3J0ID0gcG9ydDtcbiAgICBwbHVnLnBvcnQubGlua3MucHVzaCh6bGluayk7XG59O1xuXG52YXIgdW5jb25uZWN0ID0gZnVuY3Rpb24gKHpsaW5rKSB7XG4gICAgemxpbmsuYmVnaW4ucG9ydC5saW5rcyA9IF8ud2l0aG91dCh6bGluay5iZWdpbi5wb3J0LmxpbmtzLCB6bGluayk7XG4gICAgemxpbmsuZW5kLnBvcnQubGlua3MgPSBfLndpdGhvdXQoemxpbmsuZW5kLnBvcnQubGlua3MsIHpsaW5rKTtcbiAgICBpZiAoemxpbmsucGFyZW50Tm9kZSAhPT0gbnVsbCkge1xuICAgICAgICB6bGluay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHpsaW5rKTtcbiAgICB9XG59O1xuXG52YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG5wcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29tcG9zZWREb20gPSB0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAvLyBDdXJyaWVkIHZlcnNpb24gb2YgJ3JlZHJhdycgd2l0aCBjdXJyZW50IG9iamVjdCBpbnN0YW5jZS5cbiAgICAvLyBVc2VkIGZvciBldmVudCBsaXN0ZW5lcnMuXG4gICAgdGhpcy5yZWRyYXcgPSByZWRyYXcuYmluZChudWxsLCB0aGlzKTtcbiAgICB0aGlzLmNvbm5lY3QgPSBjb25uZWN0LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgdGhpcy51bmNvbm5lY3QgPSB1bmNvbm5lY3QuYmluZChudWxsLCB0aGlzKTtcblxuICAgIHRoaXMuYmVnaW4gPSB7fTtcbiAgICB0aGlzLmVuZCA9IHt9O1xuICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZSgnYmVnaW4nKSAmJiB0aGlzLmhhc0F0dHJpYnV0ZSgnZW5kJykpIHtcbiAgICAgICAgLy8gVE9ETyBkbyB0aGUgc2FtZSBzdHVmZiBvbiBhdHRyaWJ1dGVzJyBjaGFuZ2VzLlxuICAgICAgICBjb25uZWN0KHRoaXMsIHRoaXMuYmVnaW4sIHRoaXMuZ2V0QXR0cmlidXRlKCdiZWdpbicpKTtcbiAgICAgICAgY29ubmVjdCh0aGlzLCB0aGlzLmVuZCwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2VuZCcpKTtcblxuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG59O1xuXG5wcm90by5jc3MgPSBzdHlsZTtcbmRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCh0YWdOYW1lLCB7cHJvdG90eXBlOiBwcm90b30pO1xuIiwiLypnbG9iYWwgcmVzdHlsZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi4vbGliL3NlbGVjdG9yJyk7XG5cbnZhciB0YWdOYW1lID0gJ3otcG9ydCc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPHNwYW4gY2xhc3M9XCJwb3J0LWtleVwiPmE8L3NwYW4+XG4gICAgPGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgICd3aWR0aCc6IDE4LFxuICAgICAgICAnaGVpZ2h0JzogMyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2NjYycsXG4gICAgICAgICdkaXNwbGF5JzogJ2lubGluZS1ibG9jaycsXG4gICAgICAgICdwb3NpdGlvbic6ICdyZWxhdGl2ZScsXG4gICAgICAgICdvdmVyZmxvdyc6ICd2aXNpYmxlJyxcbiAgICAgICAgJ3pJbmRleCc6ICc1J1xuICAgIH0sXG4gICAgJy5wb3J0LWtleSc6IHtcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6ICcwLjdlbScsXG4gICAgICAgICdjb2xvcic6ICcjNDQ0JyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ3BhZGRpbmctbGVmdCc6IDMsXG4gICAgICAgICdwYWRkaW5nLXJpZ2h0JzogMyxcbiAgICAgICAgJ3pJbmRleCc6ICcxMCcsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNmZmYnXG4gICAgfSxcbiAgICAnLnNlbGVjdG9yJzoge1xuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnbGVmdCc6IC04LFxuICAgICAgICAndG9wJzogLTgsXG4gICAgICAgICd3aWR0aCc6IDI0LFxuICAgICAgICAnaGVpZ2h0JzogMTRcbiAgICB9XG59O1xuLy8gQXBwbHkgdGhlIGNzcyBkZWZpbml0aW9uIGFuZCBwcmVwZW5kaW5nIHRoZSBjdXN0b20gZWxlbWVudCB0YWcgdG8gYWxsXG4vLyBDU1Mgc2VsZWN0b3JzLlxudmFyIHN0eWxlID0gcmVzdHlsZSh0YWdOYW1lLCBjc3NBc0pzb24pO1xuXG52YXIgcmVkcmF3ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICBbXS5mb3JFYWNoLmNhbGwocG9ydC5saW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgbGluay5yZWRyYXcoKTtcbiAgICB9KTtcbn07XG5cblxudmFyIHByb3BlcnRpZXMgPSB7XG5cbiAgICBjcmVhdGVkQ2FsbGJhY2s6IHt2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlua3MgPSBbXTtcbiAgICAgICAgdGhpcy5yZWRyYXcgPSByZWRyYXcuYmluZChudWxsLCB0aGlzKTtcbiAgICAgICAgc2VsZWN0b3Iuc2V0U2VsZWN0YWJsZSh0aGlzLCB0cnVlKTtcblxuICAgICAgICB2YXIgY29tcG9zZWREb20gPSB0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQoY29tcG9zZWREb20pO1xuXG4gICAgICAgIHRoaXMuaGlkZUtleSgpO1xuICAgIH19LFxuXG4gICAgdW5wbHVnOiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgICAgICBsaW5rLnVuY29ubmVjdCgpO1xuICAgICAgICB9KTtcbiAgICB9fSxcblxuICAgIGNvbm5lY3RhYmxlOiB7dmFsdWU6IGZ1bmN0aW9uIChwb3J0MSwgcG9ydDIpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JylcbiAgICAgICAgICAgICYmIHBvcnQyLmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JykpXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgKHBvcnQxLmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JylcbiAgICAgICAgICAgICYmIHBvcnQyLmNsYXNzTGlzdC5jb250YWlucygnaW5wdXQnKSlcbiAgICAgICAgICAgICk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0OiB7dmFsdWU6IGZ1bmN0aW9uIChwb3J0MSwgcG9ydDIpIHtcbiAgICAgICAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd6LWxpbmsnKTtcbiAgICAgICAgaWYgKHBvcnQxLmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JykpIHtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmJlZ2luLCBwb3J0MSk7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5lbmQsIHBvcnQyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmVuZCwgcG9ydDEpO1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuYmVnaW4sIHBvcnQyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIHVzZSBhbm90aGVyIHdheSB0byBmaW5kIHdoZXJlIHRvIGFkZCBuZXcgbGlua3MuXG4gICAgICAgIHZhciBwYXRjaCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwYXRjaCcpO1xuICAgICAgICBwYXRjaC5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgICAgbGluay5yZWRyYXcoKTtcbiAgICB9fSxcblxuICAgIGNvbm5lY3Rpb25Qb3NpdGlvbjoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gdGhpcztcbiAgICAgICAgICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSB7XG4gICAgICAgICAgICAgICAgeDogcG9zaXRpb24ueCArIHJlY3Qud2lkdGggLyAyLFxuICAgICAgICAgICAgICAgIHk6IHBvc2l0aW9uLnkgKyByZWN0LmhlaWdodCAvIDJcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gY2VudGVyO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleUVsZW1lbnQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKCdzcGFuLnBvcnQta2V5Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAga2V5OiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmtleUVsZW1lbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2hvd0tleToge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMua2V5RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgIH19LFxuXG4gICAgaGlkZUtleToge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMua2V5RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgfX1cblxufTtcblxudmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsIHByb3BlcnRpZXMpO1xucHJvdG8uY3NzID0gc3R5bGU7XG5kb2N1bWVudC5yZWdpc3RlckVsZW1lbnQodGFnTmFtZSwge3Byb3RvdHlwZTogcHJvdG99KTtcbiJdfQ==
