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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvZ2xvYmFscy5qcyIsImxpYi9odHRwLmpzIiwibGliL3NlbGVjdG9yLmpzIiwibGliL3N0b3JhZ2UuanMiLCJsaWIvdGVybWluYWwuanMiLCJsaWIvdXRpbHMuanMiLCJsaWIvdmlldy5qcyIsIndlYmNvbXBvbmVudHMvei1ibG9jay5qcyIsIndlYmNvbXBvbmVudHMvei1saW5rLmpzIiwid2ViY29tcG9uZW50cy96LXBvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG52YXIgZW5naW5lID0gcmVxdWlyZSgnLi9lbmdpbmUnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBodHRwID0gcmVxdWlyZSgnLi9odHRwJyk7XG4vLyBpbXBvcnQgdmlldyBtb2R1bGUgc28gdGhhdCBpdHMgZ2xvYmFscyBhcmUgZGVmaW5lZC5cbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbnZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5cbnZhciBleHBvcnRzID0ge307XG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb21tYW5kcy5pbml0KCk7XG4gICAgZW5naW5lLmluaXQoKTtcbiAgICBlZGl0b3IuaW5pdCgpO1xuICAgIHZpZXcuaW5pdCgpO1xuICAgIGdsb2JhbC5odHRwID0gaHR0cDtcbiAgICAvLyBMb2FkIGEgcGF0Y2ggYXMgYW4gZXhhbXBsZS5cbiAgICBzdG9yYWdlLmxvYWRQYXRjaCgnaHR0cCcsICdwYXRjaGVzL21haW4uemVkJyk7XG59O1xuZXhwb3J0cy52aWV3ID0gdmlldztcbmV4cG9ydHMuY29tbWFuZHMgPSBjb21tYW5kcztcblxuLy8gVGhpcyBtb2R1bGUgaXMgdG8gYmUgdXNlZCBmcm9tIHRoZSBnbG9iYWwgbmFtZXNwYWNlIChpLmUuIGZyb20gYXBwLmh0bWwpLlxuZ2xvYmFsLmFwcCA9IGV4cG9ydHM7XG4iLCIvKmdsb2JhbCBNb3VzZXRyYXAgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RvcmFnZSA9IHJlcXVpcmUoJy4vc3RvcmFnZScpO1xudmFyIGVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9yJyk7XG52YXIgdGVybWluYWwgPSByZXF1aXJlKCcuL3Rlcm1pbmFsJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBjb21tYW5kcyA9IHt9O1xuXG5jb21tYW5kcy5wcmV2ID0gZWRpdG9yLm9mZnNldEN1cnJlbnQuYmluZChudWxsLCAtMSk7XG5jb21tYW5kcy5uZXh0ID0gZWRpdG9yLm9mZnNldEN1cnJlbnQuYmluZChudWxsLCAxKTtcbmNvbW1hbmRzLmFkZCA9IGVkaXRvci5hZGQ7XG5jb21tYW5kcy5yZW1vdmUgPSBlZGl0b3IucmVtb3ZlO1xuY29tbWFuZHMuaW5wdXRzID0gZWRpdG9yLnBvcnQuYmluZChudWxsLCAnaW5wdXQnKTtcbmNvbW1hbmRzLm91dHB1dHMgPSBlZGl0b3IucG9ydC5iaW5kKG51bGwsICdvdXRwdXQnKTtcbmNvbW1hbmRzLmJsb2NrID0gZWRpdG9yLmJsb2NrO1xuY29tbWFuZHMuZmlyZSA9IGVkaXRvci5maXJlO1xuY29tbWFuZHMuc2V0ID0gZWRpdG9yLnNldDtcbmNvbW1hbmRzLm1vdmUgPSBlZGl0b3IubW92ZTtcbmNvbW1hbmRzLm9mZnNldCA9IGVkaXRvci5tb3ZlQnk7XG5jb21tYW5kcy5jbGVhciA9IGVkaXRvci5jbGVhckFsbDtcblxuXG52YXIgZWRpdEJsb2NrID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGNvbW1hbmRzLmVzY2FwZSk7XG4gICAgYmxvY2suY29udGVudC5mb2N1cygpO1xuICAgIGJsb2NrLmNvbnRlbnQuZWRpdGluZyA9IHRydWU7XG59O1xuY29tbWFuZHMuZWRpdEJsb2NrID0gZWRpdEJsb2NrO1xuXG5jb21tYW5kcy5lZGl0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIGVkaXRCbG9jayhibG9jayk7XG4gICAgICAgIGVkaXRvci5zdG9wQmxpbmtpbmcoKTtcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IHdoZW4gdGhpcyBmdW5jdGlvbiBpcyB1c2VkIHdpdGggTW91c3RyYXAuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5jb21tYW5kcy5hZGRCdXR0b24gPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdidXR0b24nLCAnZ28nLCAwLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGRTY3JpcHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzY3JpcHQnLCAnaW4xICsgMicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZFRleHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzcGFuJywgJ2VtcHR5JywgMSwgMSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuY29tbWFuZHMuYWRkTnVtYmVyID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ3plZCcsICdudW1iZXInLCAnNDInLCAxLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGRDb21tZW50ID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ2h0bWwnLCAnY29tbWVudCcsICdDb21tZW50JywgMCwgMCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xudmFyIGJpbmRLZXlzRm9yTWFpbk1vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ0snLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAwLCAtMTApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSicsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDAsIDEwKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ0gnLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAtMTAsIDApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnTCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDEwLCAwKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2snLCBjb21tYW5kcy5wcmV2KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaicsIGNvbW1hbmRzLm5leHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIG4nLCBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnTmV3JykpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggYicsIGNvbW1hbmRzLmFkZEJ1dHRvbik7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBzJywgY29tbWFuZHMuYWRkU2NyaXB0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHQnLCBjb21tYW5kcy5hZGRUZXh0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIG4nLCBjb21tYW5kcy5hZGROdW1iZXIpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggYycsIGNvbW1hbmRzLmFkZENvbW1lbnQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdyJywgY29tbWFuZHMucmVtb3ZlKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaScsIGNvbW1hbmRzLmlucHV0cyk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ28nLCBjb21tYW5kcy5vdXRwdXRzKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYicsIGNvbW1hbmRzLmJsb2NrKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYycsIGNvbW1hbmRzLmdvVG9Db21tYW5kTGluZSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2wnLCBjb21tYW5kcy5saW5rKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZycsIGNvbW1hbmRzLmdvVG9CbG9jayk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2UnLCBjb21tYW5kcy5lZGl0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnc3BhY2UnLCBjb21tYW5kcy5maXJlKTtcbn07XG5jb21tYW5kcy5iaW5kS2V5c0Zvck1haW5Nb2RlID0gYmluZEtleXNGb3JNYWluTW9kZTtcblxuY29tbWFuZHMuZXNjYXBlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgY3VycmVudGx5RWRpdGluZ0VsZW1lbnQgPSB1dGlscy5kb20uZ2V0U2VsZWN0aW9uU3RhcnQoKTtcbiAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRpbmdFbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjdXJyZW50bHlFZGl0aW5nRWxlbWVudC5ibHVyKCk7XG4gICAgICAgICAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xuICAgICAgICAgICAgY3VycmVudGx5RWRpdGluZ0VsZW1lbnQuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9XG59O1xuXG52YXIgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIFtdLmZvckVhY2guY2FsbChibG9ja3MsIGZ1bmN0aW9uIChiKSB7XG4gICAgICAgIGIuY2xhc3NMaXN0LnRvZ2dsZSgnZGUtZW1waGFzaXMnKTtcbiAgICB9KTtcbn07XG5cbnZhciBoaWRlQWxsS2V5cyA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIFtdLmZvckVhY2guY2FsbChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5oaWRlS2V5KCk7XG4gICAgfSk7XG4gICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xufTtcblxudmFyIGZpcnN0UG9ydDtcbnZhciBzZWxlY3RQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICBpZiAoZmlyc3RQb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZmlyc3RQb3J0ID0gcG9ydDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocG9ydC5jb25uZWN0YWJsZShwb3J0LCBmaXJzdFBvcnQpKSB7XG4gICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgZmlyc3RQb3J0KTtcbiAgICAgICAgICAgIGZpcnN0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LXBvcnQnKTtcbiAgICAgICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBwb3J0VG9MaW5rVG87XG5jb21tYW5kcy5saW5rID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICAgICAgZmlyc3RQb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICAgICAgdmFyIHBvcnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzLm5leHQoKTtcbiAgICAgICAgICAgIHBvcnQua2V5ID0ga2V5O1xuICAgICAgICAgICAgcG9ydC5zaG93S2V5KCk7XG4gICAgICAgICAgICAvLyBDb252ZXJ0ICdhYWUnIGludG8gJ2EgYSBlJy5cbiAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZWxlY3RQb3J0LmJpbmQobnVsbCwgcG9ydCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LXBvcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcG9ydCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgICAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHBvcnRUb0xpbmtUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gcG9ydDtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LmNvbm5lY3RhYmxlKHBvcnQsIHBvcnRUb0xpbmtUbykpIHtcbiAgICAgICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgcG9ydFRvTGlua1RvKTtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8gPSBwb3J0O1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgc2V0Q3VycmVudEJsb2NrQW5kQmFja1RvTWFpbk1vZGUgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICBoaWRlQWxsS2V5cygnei1ibG9jaycpO1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbn07XG5cbmNvbW1hbmRzLmdvVG9CbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIGtleXMgPSB1dGlscy5jcmVhdGVLZXlzR2VuZXJhdG9yKCk7XG4gICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzLm5leHQoKTtcbiAgICAgICAgYmxvY2sua2V5ID0ga2V5O1xuICAgICAgICBibG9jay5zaG93S2V5KCk7XG4gICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJycpLmpvaW4oJyAnKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZS5iaW5kKG51bGwsIGJsb2NrKSk7XG4gICAgICAgIGluZGV4Kys7XG4gICAgfSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGlkZUFsbEtleXMoJ3otYmxvY2snKTtcbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH0pO1xuICAgIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MoKTtcbn07XG5cbi8vIFNldCBhIG5ldyBzdG9wQ2FsbGJhY2sgZm9yIE1vdXN0cmFwIHRvIGF2b2lkIHN0b3BwaW5nIHdoZW4gd2Ugc3RhcnRcbi8vIGVkaXRpbmcgYSBjb250ZW50ZWRpdGFibGUsIHNvIHRoYXQgd2UgY2FuIHVzZSBlc2NhcGUgdG8gbGVhdmUgZWRpdGluZy5cbk1vdXNldHJhcC5zdG9wQ2FsbGJhY2sgPSBmdW5jdGlvbihlLCBlbGVtZW50LCBjb21ibykge1xuICAgIC8vIGlmIHRoZSBlbGVtZW50IGhhcyB0aGUgY2xhc3MgXCJtb3VzZXRyYXBcIiB0aGVuIG5vIG5lZWQgdG8gc3RvcFxuICAgIGlmICgoJyAnICsgZWxlbWVudC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyBtb3VzZXRyYXAgJykgPiAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgIC8vIHN0b3AgZm9yIGlucHV0LCBzZWxlY3QsIGFuZCB0ZXh0YXJlYVxuICAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lID09ICdJTlBVVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdTRUxFQ1QnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnO1xuIH07XG5cbmNvbW1hbmRzLnNhdmUgPSBzdG9yYWdlLnNhdmVQYXRjaDtcbmNvbW1hbmRzLmxvYWQgPSBzdG9yYWdlLmxvYWRQYXRjaDtcbmNvbW1hbmRzLnJtID0gc3RvcmFnZS5yZW1vdmVQYXRjaDtcbmNvbW1hbmRzLmxpc3QgPSBzdG9yYWdlLmdldFBhdGNoTmFtZXM7XG5jb21tYW5kcy5scyA9IHN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcztcblxudmFyIHRlcm1pbmFsT25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xufTtcblxudmFyIHRlcm07XG52YXIgaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgdGVybSA9IHRlcm1pbmFsLmNyZWF0ZShjb21tYW5kcywgdGVybWluYWxPbmJsdXIpO1xuICAgIC8vIFVucGx1ZyB0aGUgaW5pdCBmdW5jdGlvbiBzbyB0aGF0IGl0IHdvbid0IGJlIHVzZWQgYXMgYSBjb21tYW5kIGZyb20gdGhlXG4gICAgLy8gdGVybWluYWwuXG4gICAgZGVsZXRlIGNvbW1hbmRzLmluaXQ7XG59O1xuY29tbWFuZHMuaW5pdCA9IGluaXQ7XG5cbmNvbW1hbmRzLmdvVG9Db21tYW5kTGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0ZXJtLmZvY3VzKCk7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgZWRpdG9yLnN0b3BCbGlua2luZygpO1xufTtcblxuLy8gVE9ETyBjcmVhdGUgYSB0ZXJtLndyaXRlKG11bHRpTGluZVN0cmluZykgYW5kIHVzZSBpdC5cbmNvbW1hbmRzLmhlbHAgPSBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIGlmIChzdWJqZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdQcmVzcyBFc2MgdG8gbGVhdmUgdGhlIGNvbW1hbmQgbGluZSBhbmQgZ28gYmFjayB0byBub3JtYWwgbW9kZS4nKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdDb21tYW5kczogbmV4dCwgcHJldiwgcmVtb3ZlLCBhZGQsIHNldCBjb250ZW50LCBtb3ZlLCBvZmZzZXQnKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdscywgbG9hZCwgc2F2ZSwgY2xlYXIgYW5kIHJtLicpO1xuICAgIH0gZWxzZSBpZiAoc3ViamVjdCA9PT0gJ2FkZCcpIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdBZGQgYSBuZXcgYmxvY2sganVzdCBiZWxvdyB0aGUgY3VycmVudCBibG9jay4nKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdhZGQgaHRtbCA8d2hhdD4gPGNvbnRlbnQ+IDxuYiBpbnB1dHM+IDxuYiBvdXRwdXRzPicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPHdoYXQ+ICAgIGlzIGVpdGhlciBcImJ1dHRvblwiLCBcInNjcmlwdFwiLCBcInRleHRcIiwgXCJudW1iZXJcIiBvciBhIEhUTUwgdGFnLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPGNvbnRlbnQ+IGlzIHRoZSBjb250ZW50IG9mIHRoZSBibG9jayAoaS5lLiB0aGUgYnV0dG9uIG5hbWUsIHRoZScpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgICAgICAgICAgIHNjcmlwdCBjb2RlLCB0aGUgdGV4dCBvciBudW1iZXIgdmFsdWUsIGV0Yy4pLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnTm8gaGVscCBmb3IgXCInICsgc3ViamVjdCArICdcIi4nKTtcbiAgICB9XG59O1xuXG5jb21tYW5kcy5tZXNzYWdlID0gZnVuY3Rpb24gKHN0cmluZykge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNtZXNzYWdlJykuaW5uZXJIVE1MID0gc3RyaW5nO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcbiIsIi8qZ2xvYmFsIF8qL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbmdpbmUgPSByZXF1aXJlKCcuL2VuZ2luZScpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZWRpdG9yID0ge307XG5cbmVkaXRvci5jb250ZXh0ID0gJ2Jsb2NrJztcblxuZWRpdG9yLmdldEN1cnJlbnRCbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50Jyk7XG59O1xuXG5lZGl0b3IuZ2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otcG9ydC5jdXJyZW50Jyk7XG59O1xuXG5lZGl0b3Iuc2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIHZhciBtZXNzYWdlID0gJyc7XG4gICAgaWYgKGJsb2NrLmVycm9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbWVzc2FnZSA9IGJsb2NrLmVycm9yLm1lc3NhZ2U7XG4gICAgfVxuICAgIC8vIFRPRE8gSGVyZSB3ZSB1c2UgZ2xvYmFsIGluc3RlYWQgb2YgcmVxdWlyZSgnY29tbWFuZHMnKSBiZWNhdXNlIG9mIGN5Y2xpY1xuICAgIC8vIGRlcGVuZGVuY2llcy5cbiAgICB3aW5kb3cuYXBwLmNvbW1hbmRzLm1lc3NhZ2UobWVzc2FnZSk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgfVxufTtcbi8vIFRPRE8gbm90IGluIHRoZSB3aW5kb3cgbmFtZXNwYWNlXG53aW5kb3cuc2V0Q3VycmVudEJsb2NrID0gZWRpdG9yLnNldEN1cnJlbnRCbG9jaztcblxuZWRpdG9yLnNldEN1cnJlbnRQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgIHBvcnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoZWxlbWVudHMubGVuZ3RoICsgaSArIG9mZnNldCkgJSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICB2YXIgZWxlbWVudHMgPSBjdXJyZW50LmJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC4nICsgZWRpdG9yLmNvbnRleHQpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoZWxlbWVudHMubGVuZ3RoICsgaSArIG9mZnNldCkgJSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQoZWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrKG9mZnNldCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0JyB8fCBlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0KG9mZnNldCk7XG4gICAgfVxufTtcblxuZWRpdG9yLmNyZWF0ZUJsb2NrRWxlbWVudCA9IGZ1bmN0aW9uIChjb250ZW50LCBuSW5wdXRzLCBuT3V0cHV0cywgdG9wLCBsZWZ0KSB7XG4gICAgdmFyIHBhdGNoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhdGNoJyk7XG4gICAgY29udGVudCA9IFtcbiAgICAgICAgJzx6LXBvcnQgY2xhc3M9XCJpbnB1dFwiPjwvei1wb3J0PicucmVwZWF0KG5JbnB1dHMpLFxuICAgICAgICBjb250ZW50LFxuICAgICAgICAnPHotcG9ydCBjbGFzcz1cIm91dHB1dFwiPjwvei1wb3J0PicucmVwZWF0KG5PdXRwdXRzKVxuICAgIF0uam9pbignJyk7XG4gICAgdmFyIGh0bWxTdHJpbmcgPSAnPHotYmxvY2s+JyArIGNvbnRlbnQgKyAnPC96LWJsb2NrPic7XG4gICAgdmFyIGZyYWdtZW50ID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxTdHJpbmcpO1xuICAgIHZhciBibG9jayA9IGZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2snKTtcblxuICAgIHZhciBkZWZhdWx0VG9wID0gMDtcbiAgICB2YXIgZGVmYXVsdExlZnQgPSAwO1xuICAgIHZhciBjdXJyZW50QmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGN1cnJlbnRCbG9jayAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oY3VycmVudEJsb2NrLCBjdXJyZW50QmxvY2sucGFyZW50Tm9kZSk7XG4gICAgICAgIGRlZmF1bHRUb3AgPSBwb3NpdGlvbi55ICsgY3VycmVudEJsb2NrLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCArIDIzO1xuICAgICAgICBkZWZhdWx0TGVmdCA9IHBvc2l0aW9uLng7XG4gICAgfVxuICAgIGJsb2NrLnN0eWxlLnRvcCA9IHRvcCB8fCBkZWZhdWx0VG9wICsgJ3B4JztcbiAgICBibG9jay5zdHlsZS5sZWZ0ID0gbGVmdCB8fCBkZWZhdWx0TGVmdCArICdweCc7XG5cbiAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICBwYXRjaC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgcmV0dXJuIGJsb2NrO1xufTtcblxuZWRpdG9yLmFkZEJsb2NrID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgemVDbGFzcyA9ICcnO1xuICAgIGlmIChhcmdzWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICB0eXBlID0gJ2h0bWwnO1xuICAgICAgICBhcmdzWzFdID0gJ3NwYW4nO1xuICAgICAgICB6ZUNsYXNzID0gJ3plZC1udW1iZXInO1xuICAgIH1cbiAgICB2YXIgYmxvY2tDbGFzcyA9IGFyZ3NbMV07XG4gICAgaWYgKHR5cGUgPT09ICdodG1sJykge1xuICAgICAgICB2YXIgdGFnTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgIGlmIChhcmdzWzFdID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSAnc3Bhbic7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnRlbnQgPSBhcmdzWzJdO1xuICAgICAgICB2YXIgbmV3Q29udGVudCA9ICc8JyArIHRhZ05hbWUgKyAnIGNsYXNzPVwiemUtY29udGVudCAnICsgemVDbGFzcyArICdcIiBjb250ZW50ZWRpdGFibGU+JyArIGNvbnRlbnQgKyAnPC8nICsgdGFnTmFtZSArICc+JztcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAgICAgICBuZXdDb250ZW50ID0gJzxzY3JpcHQgY2xhc3M9XCJ6ZS1jb250ZW50XCIgdHlwZT1cImFwcGxpY2F0aW9uL3gtcHJldmVudC1zY3JpcHQtZXhlY3V0aW9uLW9ubG9hZFwiIHN0eWxlPVwiZGlzcGxheTogYmxvY2s7d2hpdGUtc3BhY2U6IHByZS13cmFwO1wiIGNvbnRlbnRlZGl0YWJsZSBvbmlucHV0PVwiY29tcGlsZVNjcmlwdCh0aGlzKVwiPicgKyBjb250ZW50ICsgJzwvc2NyaXB0Pic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICBuZXdDb250ZW50ID0gJzxidXR0b24gb25jbGljaz1cImlmICghdGhpcy5lZGl0aW5nKSB7c2VuZEV2ZW50VG9PdXRwdXRQb3J0KHRoaXMpO31cIiBjbGFzcz1cInplLWNvbnRlbnRcIiBjb250ZW50ZWRpdGFibGU+JyArIGNvbnRlbnQgKyAnPC9idXR0b24+JztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGFnTmFtZVswXSA9PT0gJzwnKSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB0YWdOYW1lIGNvbnRhaW5zIGEgSFRNTCBzdHJpbmcuXG4gICAgICAgICAgICBuZXdDb250ZW50ID0gdGFnTmFtZTtcbiAgICAgICAgICAgIGJsb2NrQ2xhc3MgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMik7XG4gICAgICAgIGFyZ3NbMF0gPSBuZXdDb250ZW50O1xuICAgIH1cbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuY3JlYXRlQmxvY2tFbGVtZW50LmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIGlmIChibG9ja0NsYXNzICE9PSAnJykge1xuICAgICAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKGJsb2NrQ2xhc3MpO1xuICAgIH1cbn07XG5cbmVkaXRvci5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cnJlbnQ7XG4gICAgdmFyIHBvcnQ7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIGVkaXRvci5hZGRCbG9jay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdpbnB1dCcpIHtcbiAgICAgICAgY3VycmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgICAgICBwb3J0ID0gY3VycmVudC5hZGRQb3J0KCc8ei1wb3J0IGNsYXNzPVwiaW5wdXRcIj48L3otcG9ydD4nKTtcbiAgICAgICAgZWRpdG9yLnNldEN1cnJlbnRQb3J0KHBvcnQpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdvdXRwdXQnKSB7XG4gICAgICAgIGN1cnJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICAgICAgcG9ydCA9IGN1cnJlbnQuYWRkUG9ydCgnPHotcG9ydCBjbGFzcz1cIm91dHB1dFwiPjwvei1wb3J0PicpO1xuICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQocG9ydCk7XG4gICAgfVxufTtcblxuZWRpdG9yLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZWN0ZWQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2VsZWN0ZWQnKTtcbiAgICBpZiAoc2VsZWN0ZWQgIT09IG51bGwgJiYgc2VsZWN0ZWQudGFnTmFtZSA9PT0gJ1otTElOSycpIHtcbiAgICAgICAgdmFyIGxpbmsgPSBzZWxlY3RlZDtcbiAgICAgICAgbGluay51bmNvbm5lY3QoKTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRCbG9jaygxKTtcbiAgICAgICAgYmxvY2sudW5wbHVnKCk7XG4gICAgICAgIGJsb2NrLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYmxvY2spO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdpbnB1dCcgfHwgZWRpdG9yLmNvbnRleHQgPT09ICdvdXRwdXQnKSB7XG4gICAgICAgIHZhciBwb3J0ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50UG9ydCgxKTtcbiAgICAgICAgcG9ydC51bnBsdWcoKTtcbiAgICAgICAgcG9ydC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBvcnQpO1xuICAgIH1cbn07XG5cbnZhciBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0ID0gZnVuY3Rpb24gKGVsZW1lbnRUYWdOYW1lLCBvbk9yT2ZmKSB7XG4gICAgdmFyIGNsYXNzTmFtZSA9ICdjdXJyZW50JztcbiAgICBpZiAob25Pck9mZiA9PT0gJ29uJykge1xuICAgICAgICBjbGFzc05hbWUgKz0gJy1vZmYtY29udGV4dCc7XG4gICAgfVxuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50VGFnTmFtZSArICcuJyArIGNsYXNzTmFtZSk7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG59O1xuXG5lZGl0b3IucG9ydCA9IGZ1bmN0aW9uIChpbnB1dE9yT3V0cHV0KSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ICE9PSAnYmxvY2snKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jay5jdXJyZW50ICogei1wb3J0LicgKyBpbnB1dE9yT3V0cHV0LCAnb24nKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhciBwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50ICogei1wb3J0LicgKyBpbnB1dE9yT3V0cHV0KTtcbiAgICAgICAgaWYgKHBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHBvcnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2snLCAnb2ZmJyk7XG4gICAgZWRpdG9yLmNvbnRleHQgPSBpbnB1dE9yT3V0cHV0O1xufTtcblxuZWRpdG9yLmJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIGVkaXRvci5jb250ZXh0ID0gJ2Jsb2NrJztcbiAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrJywgJ29uJyk7XG4gICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1wb3J0LmlucHV0JywgJ29mZicpO1xuICAgIH0gY2F0Y2goZSkge31cbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LXBvcnQub3V0cHV0JywgJ29mZicpO1xuICAgIH0gY2F0Y2goZSkge31cbn07XG5cbmVkaXRvci5maXJlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICAgICAgaWYgKGNvbnRlbnQudGFnTmFtZSA9PT0gJ0JVVFRPTicpIHtcbiAgICAgICAgICAgIGVuZ2luZS5zZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29udGVudC50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgICAgZW5naW5lLmZpcmVFdmVudDIoYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIC8vIEluIGNhc2UgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgYXMgYSByZXN1bHQgb2YgYW4gZXZlbnQgKHNheSwgc3BhY2VcbiAgICAgICAgLy8ga2V5IHByZXNzKSB3ZSBwcmV2ZW50IGRlZmF1bHQgZXZlbnQgYmVoYXZpb3VyIChzYXkgc2Nyb2xsIGRvd24gZm9yXG4gICAgICAgIC8vIHNwYWNlIGJhcikuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5lZGl0b3Iuc2V0ID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0ID09PSAnY29udGVudCcpIHtcbiAgICAgICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgICAgICBibG9jay5jb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm1vdmUgPSBmdW5jdGlvbiAobGVmdCwgdG9wKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgY3VycmVudC5zdHlsZS50b3AgPSB0b3AgKyAncHgnO1xuICAgIGN1cnJlbnQuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICAgIGN1cnJlbnQucmVkcmF3KCk7XG59O1xuXG5lZGl0b3IubW92ZUJ5ID0gZnVuY3Rpb24gKGxlZnRPZmZzZXQsIHRvcE9mZnNldCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIHZhciB0b3AgPSBOdW1iZXIoY3VycmVudC5zdHlsZS50b3Auc2xpY2UoMCwgLTIpKSArIE51bWJlcih0b3BPZmZzZXQpO1xuICAgIHZhciBsZWZ0ID0gTnVtYmVyKGN1cnJlbnQuc3R5bGUubGVmdC5zbGljZSgwLCAtMikpICsgTnVtYmVyKGxlZnRPZmZzZXQpO1xuICAgIGVkaXRvci5tb3ZlKGxlZnQsIHRvcCk7XG59O1xuXG5lZGl0b3Iuc3RhcnRCbGlua2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGJsb2NrICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChibG9jay5jbGFzc0xpc3QuY29udGFpbnMoJ3N0b3AtYmxpbmtpbmcnKSkge1xuICAgICAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnc3RvcC1ibGlua2luZycpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLnN0b3BCbGlua2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKCFibG9jay5jbGFzc0xpc3QuY29udGFpbnMoJ3N0b3AtYmxpbmtpbmcnKSkge1xuICAgICAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdzdG9wLWJsaW5raW5nJyk7XG4gICAgfVxufTtcblxudmFyIGJsaW5rQ3Vyc29yID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3Vyc29yLWRpc3BsYXllZCcpO1xuICAgIH1cbiAgICB3aW5kb3cuc2V0VGltZW91dChibGlua0N1cnNvciwgMTAwMCk7XG59O1xuXG5lZGl0b3IuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBibGlua0N1cnNvcigpO1xufTtcblxuZWRpdG9yLmNsZWFyQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgXy5lYWNoKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIGJsb2NrLnVucGx1ZygpO1xuICAgICAgICBibG9jay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGJsb2NrKTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykuaW5uZXJIVE1MID0gJyc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRvcjtcbiIsIi8qZ2xvYmFsIF8gKi9cbi8qZ2xvYmFsIGdldEVsZW1lbnRCbG9jayAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVuZ2luZSA9IHt9O1xuXG5lbmdpbmUuY29tcGlsZVNjcmlwdCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdmFyIHN0cmluZyA9IGVsZW1lbnQudGV4dDtcbiAgICBzdHJpbmcgPSB1dGlscy5nZXRTY3JpcFN0cmluZ3RXaXRoTmV3bGluZXMoZWxlbWVudCk7XG4gICAgdmFyIHNjcmlwdDtcbiAgICB2YXIgY29tcGlsZWQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gSW4gY2FzZSBzY3JpcHQgaXMgYW4gZXhwcmVzc2lvbi5cbiAgICAgICAgdmFyIG1heWJlRXhwcmVzc2lvbiA9IHN0cmluZztcbiAgICAgICAgc2NyaXB0ID0gJ3JldHVybiAoJyArIG1heWJlRXhwcmVzc2lvbiArICcpOyc7XG4gICAgICAgIGNvbXBpbGVkID0gbmV3IEZ1bmN0aW9uKCdzZW5kVG9PdXRwdXQnLCAnZGVzdDEnLCAnaW4xJywgJ2luMicsICdpbjMnLCAnaW40JywgJ2luNScsIHNjcmlwdCk7XG4gICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICB9IGNhdGNoIChlMSkge1xuICAgICAgICAvLyBDb21waWxhdGlvbiBmYWlsZWQgdGhlbiBpdCBpc24ndCBhbiBleHByZXNzaW9uLiBUcnkgYXMgYVxuICAgICAgICAvLyBmdW5jdGlvbiBib2R5LlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2NyaXB0ID0gc3RyaW5nO1xuICAgICAgICAgICAgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24oJ3NlbmRUb091dHB1dCcsICdkZXN0MScsICdpbjEnLCAnaW4yJywgJ2luMycsICdpbjQnLCAnaW41Jywgc2NyaXB0KTtcbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gTm90IGEgZnVuY3Rpb24gYm9keSwgc3RyaW5nIGlzIG5vdCB2YWxpZC5cbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZSkge1xuICAgIHZhciBibG9jayA9IGdldEVsZW1lbnRCbG9jayhlbGVtZW50KTtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5wb3J0cy5vdXRwdXRzO1xuICAgIGlmIChwb3J0cykge1xuICAgICAgICBpZiAocG9ydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgcG9ydCA9IHBvcnRzWzBdO1xuICAgICAgICAgICAgcG9ydC5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB2YWx1ZSBpcyBhbiBhcnJheSBvZiB2YWx1ZXMuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWU7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciB6ZVZhbHVlID0gdmFsdWVzW2luZGV4XTtcbiAgICAgICAgICAgICAgICBwb3J0LmxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgemVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgYmxvY2sgPSBnZXRFbGVtZW50QmxvY2soZWxlbWVudCk7XG4gICAgdmFyIHBvcnQgPSBibG9jay5wb3J0cy5vdXRwdXRzWzBdO1xuICAgIHZhciBjb250ZW50O1xuICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBsaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgIHZhciBsaW5rID0gbGlua3NbMF07XG4gICAgICAgIGlmIChsaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xufTtcblxuLy8gVE9ETyBjaGFuZ2UgbmFtZS5cbmVuZ2luZS5maXJlRXZlbnQyID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnaGFzLWV4ZWN1dGlvbi1lcnJvcicpKSB7XG4gICAgICAgIHRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCdoYXMtZXhlY3V0aW9uLWVycm9yJyk7XG4gICAgfVxuICAgIHZhciBjb250ZW50ID0gdGFyZ2V0LmNvbnRlbnQ7XG4gICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWU7XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgdmFyIGRhdGFQb3J0cyA9IHRhcmdldC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKTtcbiAgICAgICAgdmFyIGlucHV0cyA9IFtdO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwoZGF0YVBvcnRzLCBmdW5jdGlvbiAoZGF0YVBvcnQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhTGlua3MgPSBkYXRhUG9ydCA9PT0gbnVsbCA/IFtdIDogZGF0YVBvcnQubGlua3M7XG5cbiAgICAgICAgICAgIGlmIChkYXRhTGlua3MubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGFMaW5rID0gXy5maW5kKGRhdGFMaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSBsaW5rLmJlZ2luLnBvcnQuYmxvY2suY29udGVudC50YWdOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhZyAhPT0gJ0JVVFRPTic7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YUxpbms7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFMaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBkYXRhTGluay5iZWdpbi5wb3J0LmJsb2NrLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai52YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnU1BBTicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5pbm5lckhUTUw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jbGFzc0xpc3QuY29udGFpbnMoJ3plZC1udW1iZXInKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvYmoudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5leGVjdXRpb25SZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5wdXRzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbmV4dEFjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBhcmd1bWVudHNbMF0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZmlyc3REZXN0aW5hdGlvbkNvbnRlbnQgPSBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50KGNvbnRlbnQpO1xuXG4gICAgICAgIHZhciB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICBpZiAodGhlU2NyaXB0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBpbGVTY3JpcHQoY29udGVudCk7XG4gICAgICAgICAgICB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGVTY3JpcHQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0Vycm9yIGluIHNjcmlwdC4gQWJvcnRpbmcuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBhcmdzLnB1c2gobmV4dEFjdGlvbik7XG4gICAgICAgIGFyZ3MucHVzaChmaXJzdERlc3RpbmF0aW9uQ29udGVudCk7XG4gICAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChpbnB1dHMpO1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0YXJnZXQuZXJyb3IgPSB7XG4gICAgICAgICAgICBtZXNzYWdlOiAnJ1xuICAgICAgICB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhlU2NyaXB0LmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLWV4ZWN1dGlvbi1lcnJvcicpO1xuICAgICAgICAgICAgbWVzc2FnZSA9ICdleGVjdXRpb24gZXJyb3Igb24gbGluZSAnICsgZS5saW5lTnVtYmVyICsgJzogJyArIGUubWVzc2FnZTtcbiAgICAgICAgICAgIHRhcmdldC5lcnJvci5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjdXJyZW50JykpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYXBwLmNvbW1hbmRzLm1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlc3VsdCBmb3IgZnV0dXJlIHVzZS5cbiAgICAgICAgICAgIGNvbnRlbnQuZXhlY3V0aW9uUmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ05VTUJFUicpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ0RJVicgfHwgdGFnTmFtZSA9PT0gJ1NQQU4nKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSBjb250ZW50LmlubmVySFRNTDtcbiAgICAgICAgfVxuICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgdmFsdWUpO1xuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnSU5QVVQnKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGFyZ2V0LnJlZHJhdygpO1xufTtcblxuZW5naW5lLmZpcmVFdmVudCA9IGZ1bmN0aW9uIChsaW5rLCB2YWx1ZSkge1xuICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgIGlmICh0YXJnZXQucG9ydHMuaW5wdXRzWzBdID09PSBsaW5rLmVuZC5wb3J0KSB7XG4gICAgICAgIC8vIE9ubHkgYWN0dWFsbHkgZmlyZSB0aGUgYmxvY2sgb24gaXRzIGZpcnN0IGlucHV0IHBvcnQuXG4gICAgICAgIGZpcmVFdmVudDIodGFyZ2V0LCB2YWx1ZSk7XG4gICAgfVxufTtcblxuZW5naW5lLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LmNvbXBpbGVTY3JpcHQgPSBlbmdpbmUuY29tcGlsZVNjcmlwdDtcbiAgICB3aW5kb3cuc2VuZEV2ZW50VG9PdXRwdXRQb3J0ID0gZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydDtcbiAgICB3aW5kb3cuZmlyZUV2ZW50MiA9IGVuZ2luZS5maXJlRXZlbnQyO1xuICAgIHdpbmRvdy5maXJlRXZlbnQgPSBlbmdpbmUuZmlyZUV2ZW50O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbmdpbmU7XG4iLCIvLyBUaGUgcGxhY2UgdG8gcG9sbHV0ZSBnbG9iYWwgbmFtZXNwYWNlLlxuXG4ndXNlIHN0cmljdCc7XG5cbndpbmRvdy5sb2FkU2NyaXB0ID0gZnVuY3Rpb24gKHVybClcbntcbiAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnNldEF0dHJpYnV0ZSgndHlwZScsJ3RleHQvamF2YXNjcmlwdCcpO1xuICAgIHNjcmlwdC5zZXRBdHRyaWJ1dGUoJ3NyYycsIHVybCk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbn07XG4iLCJ2YXIgaHR0cCA9IHt9O1xuXG5odHRwLmdldCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsKTtcblxuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0LnN0YXR1c1RleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIGVycm9yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBodHRwO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2VsZWN0b3IgPSB7XG4gICAgc2V0U2VsZWN0YWJsZTogZnVuY3Rpb24gKGVsZW1lbnQsIHdpdGhTdG9wUHJvcGFnYXRpb24pIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcztcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgc2VsZWN0b3IuYWN0aW9uKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHdpdGhTdG9wUHJvcGFnYXRpb24gIT09IHVuZGVmaW5lZCAmJiB3aXRoU3RvcFByb3BhZ2F0aW9uID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBjb25uZWN0YWJsZTogZnVuY3Rpb24gKGVsZW1lbnQxLCBlbGVtZW50Mikge1xuICAgICAgICBpZiAoZWxlbWVudDEuY29ubmVjdGFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQxLmNvbm5lY3RhYmxlKGVsZW1lbnQxLCBlbGVtZW50Mik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICBhY3Rpb246IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3RhYmxlKHRoaXMuc2VsZWN0ZWQsIGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jb25uZWN0KHRoaXMuc2VsZWN0ZWQsIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSBlbGVtZW50O1xuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVuc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2VsZWN0b3I7XG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG5nbG9iYWwuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiIsIi8qZ2xvYmFsIF8gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3InKTtcbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBzdG9yYWdlID0ge307XG5cbmZ1bmN0aW9uIGV4cG9ydFBhdGNoICgpIHtcbiAgICB2aWV3LnN3aXRjaE1vZGUoJ2VkaXQnKTtcbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIHBhdGNoID0ge307XG4gICAgcGF0Y2guYmxvY2tzID0gW107XG4gICAgcGF0Y2gubGlua3MgPSBbXTtcbiAgICBfLmVhY2goZWxlbWVudHMsIGZ1bmN0aW9uIChlbGVtZW50LCBpbmRleCkge1xuICAgICAgICB2YXIgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQtY29udGFpbmVyJykuaW5uZXJIVE1MLnRyaW0oKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBlbGVtZW50LmNvbnRlbnQ7XG4gICAgICAgIHZhciB0YWdOYW1lID0gY29udGVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnY29tbWVudCcpKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gJ2NvbW1lbnQnO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YWx1ZSA9IGNvbnRlbnQudmFsdWUgfHwgY29udGVudC5pbm5lckhUTUwgfHwgJyc7XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnYnV0dG9uJykge1xuICAgICAgICAgICAgdmFsdWUgPSBjb250ZW50LmlubmVySFRNTDtcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXJJbm5lckhUTUwgPSAnJztcbiAgICAgICAgfSBlbHNlIGlmICh0YWdOYW1lID09PSAnc2NyaXB0Jykge1xuICAgICAgICAgICAgdmFsdWUgPSB1dGlscy5nZXRTY3JpcFN0cmluZ3RXaXRoTmV3bGluZXMoY29udGVudCk7XG4gICAgICAgICAgICBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlucHV0UG9ydHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpO1xuICAgICAgICB2YXIgb3V0cHV0UG9ydHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKTtcbiAgICAgICAgcGF0Y2guYmxvY2tzLnB1c2goe1xuICAgICAgICAgICAgaWQ6IGluZGV4LFxuICAgICAgICAgICAgdGFnTmFtZTogdGFnTmFtZSxcbiAgICAgICAgICAgIG5JbnB1dHM6IGlucHV0UG9ydHMubGVuZ3RoLFxuICAgICAgICAgICAgbk91dHB1dHM6IG91dHB1dFBvcnRzLmxlbmd0aCxcbiAgICAgICAgICAgIHRvcDogZWxlbWVudC5zdHlsZS50b3AsXG4gICAgICAgICAgICBsZWZ0OiBlbGVtZW50LnN0eWxlLmxlZnQsXG4gICAgICAgICAgICB3aWR0aDogZWxlbWVudC5zdHlsZS53aWR0aCxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIGlubmVySFRNTDogY29udGVudENvbnRhaW5lcklubmVySFRNTFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHBoYW50b20gPSBjb250ZW50LnBoYW50b21lZEJ5O1xuICAgICAgICBpZiAocGhhbnRvbSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwaGFudG9tLnNldEF0dHJpYnV0ZSgnZGF0YS1pbmRleC10by1waGFudG9tJywgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIF8uZWFjaChpbnB1dFBvcnRzLCBmdW5jdGlvbiAocG9ydCwgcG9ydEluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaW5MaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgICAgICBfLmVhY2goaW5MaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJQb3J0ID0gbGluay5iZWdpbi5wb3J0O1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrID0gb3RoZXJQb3J0LmJsb2NrO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrSW5kZXggPSBfLmluZGV4T2YoZWxlbWVudHMsIG90aGVyQmxvY2spO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrUG9ydHMgPSBvdGhlckJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9ja1BvcnRJbmRleCA9IF8uaW5kZXhPZihvdGhlckJsb2NrUG9ydHMsIG90aGVyUG9ydCk7XG4gICAgICAgICAgICAgICAgcGF0Y2gubGlua3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jazogaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBwb3J0SW5kZXhcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jazogb3RoZXJCbG9ja0luZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogb3RoZXJCbG9ja1BvcnRJbmRleFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGF0Y2gucHJlc2VudGF0aW9uID0ge307XG4gICAgcGF0Y2gucHJlc2VudGF0aW9uLmlubmVySFRNTCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5pbm5lckhUTUw7XG4gICAgdmFyIHBoYW50b21zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLnF1ZXJ5U2VsZWN0b3JBbGwoJy5waGFudG9tJyk7XG4gICAgXy5lYWNoKHBoYW50b21zLCBmdW5jdGlvbiAocGhhbnRvbSkge1xuICAgICAgICAvLyBGSVhNRSBkYXRhLWluZGV4LXRvLXBoYW50b20gaW5zdGVhZD9cbiAgICAgICAgcGhhbnRvbS5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtcGhhbnRvbWVkLWJsb2NrLWlkJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHBhdGNoO1xufTtcblxuLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxudmFyIGNvbm5lY3RCbG9ja3MgPSBmdW5jdGlvbihlbmQsIHN0YXJ0LCBpbnB1dFBvcnRQb3NpdGlvbiwgb3V0cHV0UG9ydFBvc2l0aW9uKSB7XG4gICAgdmFyIHN0YXJ0UG9ydCA9IChzdGFydC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0JykpW291dHB1dFBvcnRQb3NpdGlvbl07XG4gICAgdmFyIGVuZFBvcnQgPSAoZW5kLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpKVtpbnB1dFBvcnRQb3NpdGlvbl07XG4gICAgaWYgKHN0YXJ0UG9ydC5jb25uZWN0YWJsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFRPRE8gY29ubmVjdGFibGUgdGFrZXMgc29tZSB0aW1lIHRvIGJlIGRlZmluZWQuIFdhaXQgZm9yIGl0LlxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChjb25uZWN0QmxvY2tzLCAxLCBlbmQsIHN0YXJ0LCBpbnB1dFBvcnRQb3NpdGlvbiwgb3V0cHV0UG9ydFBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHN0YXJ0UG9ydC5jb25uZWN0YWJsZShzdGFydFBvcnQsIGVuZFBvcnQpKSB7XG4gICAgICAgIHN0YXJ0UG9ydC5jb25uZWN0KHN0YXJ0UG9ydCwgZW5kUG9ydCk7XG4gICAgfVxufTtcblxuLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxudmFyIGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2sgPSBmdW5jdGlvbiAoYmxvY2ssIHBoYW50b20pIHtcbiAgICB2YXIgY29udGVudCA9IGJsb2NrLmNvbnRlbnQ7XG4gICAgaWYgKGNvbnRlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBGSVggTUUgd2FpdCB0aGF0IGNvbnRlbnQgYWN0dWFsbHkgZXhpc3RzLlxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChjcmVhdGVQaGFudG9tTGlua0ZvckJsb2NrLCAxLCBibG9jaywgcGhhbnRvbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy5jcmVhdGVQaGFudG9tTGluayhjb250ZW50LCBwaGFudG9tKTtcbiAgICB9XG59O1xuXG52YXIgaW1wb3J0UGF0Y2ggPSBmdW5jdGlvbiAocGF0Y2gpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBbXTtcbiAgICBfLmVhY2gocGF0Y2guYmxvY2tzLCBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgYmxvY2subklucHV0cyA9IGJsb2NrLm5JbnB1dHMgfHwgMDtcbiAgICAgICAgYmxvY2subk91dHB1dHMgPSBibG9jay5uT3V0cHV0cyB8fCAwO1xuICAgICAgICBpZiAoYmxvY2sudGFnTmFtZSA9PT0gJ3NjcmlwdCcgfHzCoGJsb2NrLnRhZ05hbWUgPT09ICdidXR0b24nIHx8IGJsb2NrLnRhZ05hbWUgPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgZWRpdG9yLmFkZEJsb2NrKCdodG1sJywgYmxvY2sudGFnTmFtZSwgYmxvY2sudmFsdWUsIGJsb2NrLm5JbnB1dHMsIGJsb2NrLm5PdXRwdXRzLCBibG9jay50b3AsIGJsb2NrLmxlZnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWRpdG9yLmFkZEJsb2NrKCdodG1sJywgYmxvY2suaW5uZXJIVE1MLCAnJywgYmxvY2subklucHV0cywgYmxvY2subk91dHB1dHMsIGJsb2NrLnRvcCwgYmxvY2subGVmdCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbiAgICAgICAgZWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICB9KTtcbiAgICBfLmVhY2gocGF0Y2gubGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSBlbGVtZW50c1tsaW5rLm91dHB1dC5ibG9ja107XG4gICAgICAgIHZhciBpbnB1dCA9IGVsZW1lbnRzW2xpbmsuaW5wdXQuYmxvY2tdO1xuICAgICAgICBjb25uZWN0QmxvY2tzKGlucHV0LCBvdXRwdXQsIGxpbmsuaW5wdXQucG9ydCwgbGluay5vdXRwdXQucG9ydCk7XG4gICAgfSk7XG4gICAgdmFyIHByZXNlbnRhdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKTtcbiAgICBwcmVzZW50YXRpb24uaW5uZXJIVE1MID0gcGF0Y2gucHJlc2VudGF0aW9uLmlubmVySFRNTDtcbiAgICB2YXIgcGhhbnRvbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbiAgICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHBoYW50b20uZ2V0QXR0cmlidXRlKCdkYXRhLWluZGV4LXRvLXBoYW50b20nKTtcbiAgICAgICAgdmFyIGJsb2NrID0gZWxlbWVudHNbaW5kZXhdO1xuICAgICAgICBjcmVhdGVQaGFudG9tTGlua0ZvckJsb2NrKGJsb2NrLCBwaGFudG9tKTtcbiAgICB9KTtcbn07XG5cbnN0b3JhZ2Uuc2F2ZVBhdGNoID0gZnVuY3Rpb24gKHdoZXJlLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBPbmx5IG9uZSBhcmd1bWVudCBtZWFucyBpdCBpcyBhY3R1YWxseSB0aGUgbmFtZSBhbmQgd2UgbG9hZCBmcm9tXG4gICAgICAgIC8vIGxvY2Fsc3RvcmFnZS5cbiAgICAgICAgbmFtZSA9IHdoZXJlO1xuICAgICAgICB3aGVyZSA9ICdsb2NhbCc7XG4gICAgfVxuICAgIHZhciBwYXRjaCA9IGV4cG9ydFBhdGNoKCk7XG4gICAgaWYgKHdoZXJlID09PSAnbG9jYWwnKSB7XG4gICAgICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgICAgICBwYXRjaGVzW25hbWVdID0gcGF0Y2g7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGF0Y2hlcycsIEpTT04uc3RyaW5naWZ5KHBhdGNoZXMpKTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnZmlsZScpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShwYXRjaCwgbnVsbCwgJyAgICAnKTtcbiAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbY29udGVudF0sIHsgdHlwZSA6IFwidGV4dC9wbGFpblwiLCBlbmRpbmdzOiBcInRyYW5zcGFyZW50XCJ9KTtcbiAgICAgICAgd2luZG93LnNhdmVBcyhibG9iLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBFcnJvcignYmFkIHNhdmUgbG9jYXRpb24gKFwiJyArIHdoZXJlICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdcIiksIG11c3QgYmUgXCJsb2NhbFwiIG9yIFwiZmlsZVwiJyk7XG4gICAgfVxufTtcblxuc3RvcmFnZS5sb2FkUGF0Y2ggPSBmdW5jdGlvbiAod2hlcmUsIHdoYXQpIHtcbiAgICBpZiAod2hhdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHdoYXQgPSB3aGVyZTtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aGF0KSA9PT0gJ1tvYmplY3QgRmlsZV0nKSB7XG4gICAgICAgICAgICB3aGVyZSA9ICdmaWxlIG9iamVjdCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGVyZSA9ICdsb2NhbCc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHByb21pc2U7XG4gICAgaWYgKHdoZXJlID09PSAnbG9jYWwnKSB7XG4gICAgICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgICAgICB2YXIgcGF0Y2ggPSBwYXRjaGVzW3doYXRdO1xuICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKHBhdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhdGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdObyBwYXRjaCB3aXRoIG5hbWUgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoYXQgKyAnXCIgaW4gbG9jYWwgc3RvcmFnZS4nKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdodHRwJykge1xuICAgICAgICB2YXIgdXJsID0gd2hhdDtcbiAgICAgICAgcHJvbWlzZSA9IGh0dHAuZ2V0KHVybCk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2ZpbGUgb2JqZWN0Jykge1xuICAgICAgICB2YXIgZmlsZSA9IHdoYXQ7XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICBmaWxlUmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShldmVudC50YXJnZXQucmVzdWx0KSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZmlsZVJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdiYWQgbG9hZCBsb2NhdGlvbiAoXCInICsgd2hlcmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiKSwgbXVzdCBiZSBcImxvY2FsXCIgb3IgXCJodHRwXCInKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uIChwYXRjaCkge1xuICAgICAgICBlZGl0b3IuY2xlYXJBbGwoKTtcbiAgICAgICAgaW1wb3J0UGF0Y2gocGF0Y2gpO1xuICAgIH0pO1xufTtcblxuc3RvcmFnZS5yZW1vdmVQYXRjaCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICBwYXRjaGVzID0gcGF0Y2hlcyB8fCB7fTtcbiAgICB2YXIgdHJhc2ggPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndHJhc2gnKSk7XG4gICAgdHJhc2ggPSB0cmFzaCB8fCB7fTtcbiAgICB2YXIgcGF0Y2ggPSBwYXRjaGVzW25hbWVdO1xuICAgIGlmIChwYXRjaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93ICdObyBwYXRjaCB3aXRoIG5hbWUgXCInICsgbmFtZSArICdcIiBpbiBsb2NhbCBzdG9yYWdlLic7XG4gICAgfVxuICAgIHRyYXNoW25hbWVdID0gcGF0Y2g7XG4gICAgZGVsZXRlIHBhdGNoZXNbbmFtZV07XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwYXRjaGVzJywgSlNPTi5zdHJpbmdpZnkocGF0Y2hlcykpO1xuICAgIGVkaXRvci5jbGVhckFsbCgpO1xufTtcblxuc3RvcmFnZS5nZXRQYXRjaE5hbWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgcmV0dXJuIF8ua2V5cyhwYXRjaGVzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RvcmFnZTtcbiIsIi8vIFVzZSBvZiB0ZXJtbGliLmpzIGZvciB0aGUgdGVybWluYWwgZnJhbWUuXG5cbi8vIGdsb2JhbHMgZnJvbSB0ZXJtbGliLmpzXG4vKmdsb2JhbCBUZXJtR2xvYmFscyAqL1xuLypnbG9iYWwgdGVybUtleSAqL1xuLypnbG9iYWwgUGFyc2VyICovXG4vKmdsb2JhbCBUZXJtaW5hbCAqL1xuXG52YXIgdGVybWluYWwgPSB7fTtcblxudGVybWluYWwuY3JlYXRlID0gZnVuY3Rpb24gKGNvbW1hbmRzLCBvbmJsdXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgdGVybURpdklkID0gJ2NvbW1hbmQtbGluZS1mcmFtZSc7XG5cbiAgICB2YXIgZ2V0VGVybURpdiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgdGVybURpdklkKTtcbiAgICB9O1xuXG4gICAgdmFyIGJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFRlcm1HbG9iYWxzLmtleWxvY2sgPSB0cnVlO1xuICAgICAgICBUZXJtR2xvYmFscy5hY3RpdmVUZXJtLmN1cnNvck9mZigpO1xuICAgICAgICB2YXIgdGVybURpdiA9IGdldFRlcm1EaXYoKTtcbiAgICAgICAgdGVybURpdi5jbGFzc0xpc3QudG9nZ2xlKCdmb2N1c2VkJyk7XG4gICAgICAgIG9uYmx1cigpO1xuICAgIH07XG5cbiAgICB2YXIgY3RybEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0Q2hhciA9PT0gdGVybUtleS5FU0MpIHtcbiAgICAgICAgICAgIGJsdXIoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgdGVybUhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhhdC5uZXdMaW5lKCk7XG4gICAgICAgIHZhciBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG4gICAgICAgIHBhcnNlci5wYXJzZUxpbmUodGhhdCk7XG4gICAgICAgIHZhciBjb21tYW5kTmFtZSA9IHRoYXQuYXJndlswXTtcbiAgICAgICAgaWYgKGNvbW1hbmRzLmhhc093blByb3BlcnR5KGNvbW1hbmROYW1lKSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGF0LmFyZ3Yuc2xpY2UoMSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBjb21tYW5kc1tjb21tYW5kTmFtZV0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudGhlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoJ0Vycm9yOiAnICsgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC53cml0ZSgndW5rbm93biBjb21tYW5kIFwiJyArIGNvbW1hbmROYW1lICsgJ1wiLicpO1xuICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaW5pdEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfTtcblxuICAgIC8vIFRoZSB0ZXJtbGliLmpzIG9iamVjdFxuICAgIHZhciB0ZXJtID0gbmV3IFRlcm1pbmFsKCB7XG4gICAgICAgIHRlcm1EaXY6IHRlcm1EaXZJZCxcbiAgICAgICAgaGFuZGxlcjogdGVybUhhbmRsZXIsXG4gICAgICAgIGJnQ29sb3I6ICcjZjBmMGYwJyxcbiAgICAgICAgY3JzckJsaW5rTW9kZTogdHJ1ZSxcbiAgICAgICAgY3JzckJsb2NrTW9kZTogZmFsc2UsXG4gICAgICAgIHJvd3M6IDEwLFxuICAgICAgICBmcmFtZVdpZHRoOiAwLFxuICAgICAgICBjbG9zZU9uRVNDOiBmYWxzZSxcbiAgICAgICAgY3RybEhhbmRsZXI6IGN0cmxIYW5kbGVyLFxuICAgICAgICBpbml0SGFuZGxlcjogaW5pdEhhbmRsZXJcblxuICAgIH0gKTtcbiAgICB0ZXJtLm9wZW4oKTtcblxuICAgIHZhciBmb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFRlcm1HbG9iYWxzLmtleWxvY2sgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgVGVybUdsb2JhbHMua2V5bG9jayA9IGZhbHNlO1xuICAgICAgICBUZXJtR2xvYmFscy5hY3RpdmVUZXJtLmN1cnNvck9uKCk7XG4gICAgICAgIHZhciB0ZXJtRGl2ID0gZ2V0VGVybURpdigpO1xuICAgICAgICB0ZXJtRGl2LmNsYXNzTGlzdC50b2dnbGUoJ2ZvY3VzZWQnKTtcbiAgICB9O1xuXG4gICAgYmx1cigpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZm9jdXM6IGZvY3VzLFxuICAgICAgICB0ZXJtOiB0ZXJtXG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdGVybWluYWw7XG4iLCIvLyBTeW50YWN0aWMgc3VnYXIgYW5kIHNpbXBsZSB1dGlsaXRpZXMuXG5cbi8qZ2xvYmFsIF8gKi9cblxudmFyIHV0aWxzID0ge307XG5cbnZhciBkb207XG5kb20gPSB7XG4gICAgLy8gQ3JlYXRlIGEgZG9tIGZyYWdtZW50IGZyb20gYSBIVE1MIHN0cmluZy5cbiAgICBjcmVhdGVGcmFnbWVudDogZnVuY3Rpb24oaHRtbFN0cmluZykge1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGlmIChodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgZGl2ID0gZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xuICAgICAgICAgICAgZGl2LmlubmVySFRNTCA9IGh0bWxTdHJpbmc7XG4gICAgICAgICAgICB2YXIgY2hpbGQ7XG4gICAgICAgICAgICAvKmVzbGludC1kaXNhYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgICAgICAgICB3aGlsZSAoY2hpbGQgPSBkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIC8qZXNsaW50LWVuYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgICAgICAgICAgICAgIGZyYWdtZW50Lmluc2VydEJlZm9yZShjaGlsZCwgZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWdtZW50LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH0sXG5cbiAgICAvLyBNb3ZlIERPTSBub2RlcyBmcm9tIGEgc291cmNlIHRvIGEgdGFyZ2V0LiBUaGUgbm9kZXMgYXJlcyBzZWxlY3RlZFxuICAgIC8vIGJhc2VkIG9uIGEgc2VsZWN0b3IgYW5kIHRoZSBwbGFjZSB0aGV5IGFyZSBpbnN0ZXJ0ZWQgaXMgYSBnaXZlbiB0YWdcbiAgICAvLyB3aXRoIGEgXCJzZWxlY3RcIiBhdHRyaWJ1dGUgd2hpY2ggY29udGFpbnMgdGhlIGdpdmVuIHNlbGVjdG9yLiBJZlxuICAgIC8vICAgIHNvdXJjZSBpcyAnYWFhIDxzcGFuIGNsYXNzPVwic29tZXRoaW5nXCI+enp6PC9zcGFuPidcbiAgICAvLyBhbmRcbiAgICAvLyAgICB0YXJnZXQgaXMgJ3JyciA8Y29udGVudCBzZWxlY3Q9XCIuc29tZXRoaW5nXCI+PC9jb250ZW50PiB0dHQnXG4gICAgLy8gQWZ0ZXIgbW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3Ioc291cmNlLCB0YXJnZXQsICcuc29tZXRoaW5nJyk6XG4gICAgLy8gICAgc291cmNlIGlzICdhYWEnXG4gICAgLy8gYW5kXG4gICAgLy8gICAgdGFyZ2V0IGlzICdycnIgPHNwYW4gY2xhc3M9XCJzb21ldGhpbmdcIj56eno8L3NwYW4+IHR0dCdcbiAgICBtb3ZlQ29udGVudEJhc2VkT25TZWxlY3RvcjogZnVuY3Rpb24oc291cmNlLCB0YXJnZXQsIHNlbGVjdG9yLCB0YXJnZXRUYWcpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQ7XG4gICAgICAgIHZhciBlbGVtZW50cztcbiAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnJykge1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKHRhcmdldFRhZyk7XG4gICAgICAgICAgICBlbGVtZW50cyA9IHNvdXJjZS5jaGlsZE5vZGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKHRhcmdldFRhZyArICdbc2VsZWN0PVwiJyArIHNlbGVjdG9yICsgJ1wiXScpO1xuICAgICAgICAgICAgZWxlbWVudHMgPSBzb3VyY2UucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2FybmluZzogaXQgaXMgaW1wb3J0YW50IHRvIGxvb3AgZWxlbWVudHMgYmFja3dhcmQgc2luY2UgY3VycmVudFxuICAgICAgICAvLyBlbGVtZW50IGlzIHJlbW92ZWQgYXQgZWFjaCBzdGVwLlxuICAgICAgICBmb3IgKHZhciBpID0gZWxlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICAvLyBUT0RPLiBMZSBcImluc2VydFwiIGNpLWRlc3NvdXMgc3VyIGxlcyB6LXBvcnQgZmFpdCBxdWUgbGVcbiAgICAgICAgICAgIC8vIGRldGFjaGVkQ2FsbGJhY2sgZXN0IGFwcGVsw6kgYXZlYyBsJ2ltcGxlbWVudGF0aW9uIGRlIGN1c3RvbVxuICAgICAgICAgICAgLy8gZWxtZW50cyBwYXIgd2VicmVmbGVjdGlvbnMgbWFpcyBwYXMgcGFyIGwnaW1wbMOpbWVudGF0aW9uIGRlXG4gICAgICAgICAgICAvLyBQb2x5bWVyIChlbiB1dGlsaXNhbnQgbGUgcG9seWZpbGwgZGUgQm9zb25pYykgbmkgYXZlY1xuICAgICAgICAgICAgLy8gbCdpbXBsw6ltZW50YXRpb24gbmF0aXZlIGRlIGNocm9tZS5cbiAgICAgICAgICAgIGNvbnRlbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBUT0RPIG1vdmUgdGhpcyBlbHNld2hlcmUuXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5vbmNsaWNrID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgZ2xvYmFsIHRvIGFjY2VzcyB0aGlzIGZ1bmN0aW9uIGJlY2F1c2UgdXNpbmcgcmVxdWlyZVxuICAgICAgICAgICAgICAgICAgICAvLyBvbiBjb21tYW5kcyBoYXMgYSBjeWNsaWMgZGVwZW5kZW5jeS5cbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmFwcC5jb21tYW5kcy5lZGl0QmxvY2soc291cmNlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjb250ZW50KTtcbiAgICB9LFxuXG4gICAgbW92ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gZG9tLm1vdmVDb250ZW50QmFzZWRPblNlbGVjdG9yKFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZnJvbSxcbiAgICAgICAgICAgICAgICBvcHRpb25zLnRvLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMud2l0aFNlbGVjdG9yLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMub25UYWdcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLy8gR2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCByZWxhdGl2ZSB0byBhbm90aGVyIG9uZSAoZGVmYXVsdCBpc1xuICAgIC8vIGRvY3VtZW50IGJvZHkpLlxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoZWxlbWVudCwgcmVsYXRpdmVFbGVtZW50KSB7XG4gICAgICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmVsYXRpdmVFbGVtZW50ID0gcmVsYXRpdmVFbGVtZW50IHx8IGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHZhciByZWxhdGl2ZVJlY3QgPSByZWxhdGl2ZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiByZWN0LmxlZnQgLSByZWxhdGl2ZVJlY3QubGVmdCxcbiAgICAgICAgICAgIHk6IHJlY3QudG9wIC0gcmVsYXRpdmVSZWN0LnRvcFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBnZXRTZWxlY3Rpb25TdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmdldFNlbGVjdGlvbigpLmFuY2hvck5vZGU7XG4gICAgICAgIHJldHVybiAoIChub2RlICE9PSBudWxsICYmIG5vZGUubm9kZVR5cGUgPT09IDMpID8gbm9kZS5wYXJlbnROb2RlIDogbm9kZSApO1xuICAgIH1cblxufTtcbnV0aWxzLmRvbSA9IGRvbTtcblxuLy8gVXNlZnVsbCBmb3IgbXVsdGlsaW5lIHN0cmluZyBkZWZpbml0aW9uIHdpdGhvdXQgJ1xcJyBvciBtdWx0aWxpbmVcbi8vIGNvbmNhdGVuYXRpb24gd2l0aCAnKycuXG51dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24gPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmMudG9TdHJpbmcoKS5tYXRjaCgvW15dKlxcL1xcKihbXl0qKVxcKlxcL1xccypcXH0kLylbMV07XG59O1xuXG51dGlscy5jcmVhdGVLZXlzR2VuZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFJldHVybnMgYSBrZXlzIGdlbmVyYXRvciBmb3IgYSBzZXF1ZW5jZSB0aGF0IGlzIGJ1aWxkIGxpa2UgdGhhdDpcbiAgICAvLyAgIGIsIGMsIGQuLi5cbiAgICAvLyAgIGFiLCBhYywgYWQuLi5cbiAgICAvLyAgIGFhYiwgYWFjLCBhYWQuLi5cbiAgICAvLyBUaGUgaWRlYSBpcyB0byBoYXZlIGEgc2VxdWVuY2Ugd2hlcmUgZWFjaCB2YWx1ZSBpcyBub3QgdGhlIGJlZ2lubmluZ1xuICAgIC8vIG9mIGFueSBvdGhlciB2YWx1ZSAoc28gc2luZ2xlICdhJyBjYW4ndCBiZSBwYXJ0IG9mIHRoZSBzZXF1ZW5jZSkuXG4gICAgLy9cbiAgICAvLyBPbmUgZ29hbCBpcyB0byBoYXZlIHNob3J0ZXN0IHBvc3NpYmxlIGtleXMuIFNvIG1heWJlIHdlIHNob3VsZCB1c2VcbiAgICAvLyBhZGRpdGlvbm5hbCBwcmVmaXggY2hhcnMgYWxvbmcgd2l0aCAnYScuIEFuZCBiZWNhdXNlIGl0IHdpbGwgYmUgdXNlZFxuICAgIC8vIGZvciBzaG9ydGN1dHMsIG1heWJlIHdlIGNhbiBjaG9vc2UgY2hhcnMgYmFzZWQgb24gdGhlaXIgcG9zaXRpb24gb25cbiAgICAvLyB0aGUga2V5Ym9hcmQuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgY2hhckNvZGVzID0gXy5yYW5nZSgnYicuY2hhckNvZGVBdCgwKSwgJ3onLmNoYXJDb2RlQXQoMCkgKyAxKTtcbiAgICB2YXIgaWRTdHJpbmdzID0gXy5tYXAoY2hhckNvZGVzLCBmdW5jdGlvbiAoY2hhckNvZGUpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUpO1xuICAgIH0pO1xuICAgIHZhciBnZW5lcmF0b3IgPSB7fTtcbiAgICBnZW5lcmF0b3IubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGtleSA9ICcnO1xuICAgICAgICB2YXIgaSA9IGluZGV4O1xuICAgICAgICBpZiAoaSA+PSBjaGFyQ29kZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgciA9IE1hdGguZmxvb3IoaSAvIGNoYXJDb2Rlcy5sZW5ndGgpO1xuICAgICAgICAgICAgaSA9IGkgJSBjaGFyQ29kZXMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKHIgPiAwKSB7XG4gICAgICAgICAgICAgICAga2V5ICs9ICdhJztcbiAgICAgICAgICAgICAgICByLS07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAga2V5ICs9IGlkU3RyaW5nc1tpXTtcbiAgICAgICAgaW5kZXgrKztcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGdlbmVyYXRvcjtcbn07XG5cbnV0aWxzLmdldFNjcmlwU3RyaW5ndFdpdGhOZXdsaW5lcyA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgLy8gVGhlIG5ld2xpbmVzIGFyZSBsb3N0IHdoZW4gdXNpbmcgcmF3IGlubmVySFRNTCBmb3Igc2NyaXB0IHRhZ3NcbiAgICAvLyAoYXQgbGVhc3Qgb24gZmlyZWZveCkuIFNvIHdlIHBhcnNlIGVhY2ggY2hpbGQgdG8gYWRkIGEgbmV3bGluZVxuICAgIC8vIHdoZW4gQlIgYXJlIGVuY291bnRlcmVkLlxuICAgIHZhciB2YWx1ZSA9ICcnO1xuICAgIFtdLmZvckVhY2guY2FsbChlbGVtZW50LmNoaWxkTm9kZXMsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT09ICdCUicpIHtcbiAgICAgICAgICAgIHZhbHVlICs9ICdcXG4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgKz0gbm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cblxud2luZG93LnV0aWxzID0gdXRpbHM7XG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzO1xuIiwiLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgTW91c2V0cmFwICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcycpO1xuXG52YXIgdmlldyA9IHt9O1xuXG52YXIgaXNEZXNjZW5kYW50ID0gZnVuY3Rpb24gKGNoaWxkLCBwYXJlbnQpIHtcbiAgICAgdmFyIG5vZGUgPSBjaGlsZC5wYXJlbnROb2RlO1xuICAgICB3aGlsZSAobm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgaWYgKG5vZGUgPT09IHBhcmVudCkge1xuICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgfVxuICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgfVxuICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgZ2V0UHJlc2VudGF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKTtcbn07XG5cbnZhciBjcmVhdGVQaGFudG9tTGluayA9IGZ1bmN0aW9uIChwaGFudG9tZWQsIHBoYW50b20pIHtcbiAgICBwaGFudG9tLnBoYW50b21PZiA9IHBoYW50b21lZDtcbiAgICBwaGFudG9tLmNsYXNzTGlzdC5hZGQoJ3BoYW50b20nKTtcbiAgICBwaGFudG9tZWQucGhhbnRvbWVkQnkgPSBwaGFudG9tO1xuICAgIHBoYW50b21lZC5jbGFzc0xpc3QuYWRkKCdwaGFudG9tZWQnKTtcbn07XG52aWV3LmNyZWF0ZVBoYW50b21MaW5rID0gY3JlYXRlUGhhbnRvbUxpbms7XG5cbnZhciBjcmVhdGVQaGFudG9tID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyIHBoYW50b20gPSBlbGVtZW50LmNsb25lTm9kZSh0cnVlKTtcbiAgcGhhbnRvbS5kaXNhYmxlZCA9IHRydWU7XG4gIHBoYW50b20uc2V0QXR0cmlidXRlKCdjb250ZW50RWRpdGFibGUnLCBmYWxzZSk7XG4gIC8vIExpbmsgdGhlIHR3byBmb3IgbGF0ZXIgdXNlIChpbiBwYXJ0aWN1bGFyeSB3aGVuIHdlIHdpbGwgc3dpdGNoXG4gIC8vIGRpc3BsYXkgbW9kZSkuXG4gIGNyZWF0ZVBoYW50b21MaW5rKGVsZW1lbnQsIHBoYW50b20pO1xuXG4gIHJldHVybiBwaGFudG9tO1xufTtcblxudmFyIGlzQ3VycmVudFNlbGVjdGlvbkluUHJlc2VudGF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgdGhlIHNlbGVjdGlvbiByYW5nZSAob3IgY3Vyc29yIHBvc2l0aW9uKVxuICB2YXIgcmFuZ2UgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCkuZ2V0UmFuZ2VBdCgwKTtcbiAgdmFyIHplUHJlc2VudGF0aW9uID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAvLyBCZSBzdXJlIHRoZSBzZWxlY3Rpb24gaXMgaW4gdGhlIHByZXNlbnRhdGlvbi5cbiAgcmV0dXJuIGlzRGVzY2VuZGFudChyYW5nZS5zdGFydENvbnRhaW5lciwgemVQcmVzZW50YXRpb24pO1xufTtcblxudmFyIGluc2VydEluUGxhY2VPZlNlbGVjdGlvbiA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIC8vIEdldCB0aGUgc2VsZWN0aW9uIHJhbmdlIChvciBjdXJzb3IgcG9zaXRpb24pXG4gIHZhciByYW5nZSA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICAvLyBEZWxldGUgd2hhdGV2ZXIgaXMgb24gdGhlIHJhbmdlXG4gIHJhbmdlLmRlbGV0ZUNvbnRlbnRzKCk7XG4gIHJhbmdlLmluc2VydE5vZGUoZWxlbWVudCk7XG59O1xuXG4vLyBJbnNlcnQgYSBzZWxlY3RlZCBibG9jayBpbiB0aGUgRE9NIHNlbGVjdGlvbiBpbiBwcmVzZW50YXRpb24gd2luZG93LlxudmFyIGluc2VydEJsb2NrQ29udGVudEluU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYmxvY2sgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbiAgaWYgKGJsb2NrID09PSB1bmRlZmluZWQpIHtcbiAgICAvLyBOb3RoaW5nIGlzIHNlbGVjdGVkLlxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmKGlzQ3VycmVudFNlbGVjdGlvbkluUHJlc2VudGF0aW9uKCkpIHtcbiAgICB2YXIgY29udGVudCA9IGJsb2NrLmNvbnRlbnQ7XG4gICAgdmFyIHBoYW50b20gPSBjcmVhdGVQaGFudG9tKGNvbnRlbnQpO1xuICAgIGluc2VydEluUGxhY2VPZlNlbGVjdGlvbihwaGFudG9tKTtcblxuICAgIC8vIFRPRE8gZXZlbnR1YWxseSBzd2l0Y2ggdGhlIHR3byBpZiB3ZSBhcmUgaW4gcHJlc2VudGF0aW9uIG1vZGUuXG4gIH1cbn07XG52aWV3Lmluc2VydEJsb2NrQ29udGVudEluU2VsZWN0aW9uID0gaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb247XG5cbnZhciBnZXRQaGFudG9tcyA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHJldHVybiBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5waGFudG9tJyk7XG59O1xuXG52YXIgZ2V0V2luZG93Rm9yTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG4gIHZhciBpZCA9IG1vZGU7XG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG59O1xuXG52YXIgc3dhcEVsZW1lbnRzID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHtcbiAgICAvLyBjcmVhdGUgbWFya2VyIGVsZW1lbnQgYW5kIGluc2VydCBpdCB3aGVyZSBvYmoxIGlzXG4gICAgdmFyIHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvYmoxLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRlbXAsIG9iajEpO1xuXG4gICAgLy8gbW92ZSBvYmoxIHRvIHJpZ2h0IGJlZm9yZSBvYmoyXG4gICAgb2JqMi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShvYmoxLCBvYmoyKTtcblxuICAgIC8vIG1vdmUgb2JqMiB0byByaWdodCBiZWZvcmUgd2hlcmUgb2JqMSB1c2VkIHRvIGJlXG4gICAgdGVtcC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShvYmoyLCB0ZW1wKTtcblxuICAgIC8vIHJlbW92ZSB0ZW1wb3JhcnkgbWFya2VyIG5vZGVcbiAgICB0ZW1wLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGVtcCk7XG59O1xuXG52YXIgY3VycmVudE1vZGUgPSAnJztcblxuLy8gRG8gYWxsIHRoZSBzdHVmZiBuZWVkZWQgdG8gc3dpdGNoIG1vZGUgYmV0d2VlbiAnZWRpdCcgYW5kICdwcmVzZW50YXRpb24nLlxuLy8gTWFpbmx5IHN3YXAgJ3BoYW50b20nIGFuZCAncGhhbnRvbWVkJyBvYmplY3RzIHBhaXJzLlxudmFyIHN3aXRjaE1vZGUgPSBmdW5jdGlvbiAobW9kZSkge1xuICAgIGlmIChtb2RlID09PSBjdXJyZW50TW9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGN1cnJlbnRNb2RlID0gbW9kZTtcbiAgLy8gQnkgY29udmVudGlvbiwgdGhlICdwaGFudG9tJyBlbGVtZW50cyBhY3R1YWxseSBhcmUgaW4gdGhlIHdpbmRvd1xuICAvLyBhc3NvY2lhdGVkIHRvIHRoZSBtb2RlIHdlIHdhbnQgdG8gc3dpdGNoIHRvLiBUaGUgcGhhbnRvbWVkIG9uZSBhcmUgaW4gdGhlXG4gIC8vIHdpbmRvdyBvZiB0aGUgb3RoZXIgbW9kZS5cblxuICB2YXIgcGhhbnRvbXMgPSBnZXRQaGFudG9tcyhnZXRXaW5kb3dGb3JNb2RlKG1vZGUpKTtcbiAgXy5lYWNoKHBoYW50b21zLCBmdW5jdGlvbiAocGhhbnRvbSkge1xuICAgIC8vIFdoYXQgdGhpcyBvYmplY3QgaXMgdGhlIHBoYW50b20gb2Y/XG4gICAgdmFyIHBoYW50b21lZCA9IHBoYW50b20ucGhhbnRvbU9mO1xuICAgIC8vIFNpbXBseSBzd2FwIHRoZXNlIERPTSBvYmplY3RzLlxuICAgIHN3YXBFbGVtZW50cyhwaGFudG9tZWQsIHBoYW50b20pO1xuICB9KTtcbn07XG52aWV3LnN3aXRjaE1vZGUgPSBzd2l0Y2hNb2RlO1xuXG52YXIgcHJlc2VudGF0aW9uID0ge307XG5cbi8vIFRPRE8gbm90IHVzZWQ/XG52YXIgc2VsZWN0RWxlbWVudCA9IGZ1bmN0aW9uIChldmVudCkge1xuICBwcmVzZW50YXRpb24uc2VsZWN0ZWQgPSBldmVudC50YXJnZXQ7XG59O1xudmlldy5zZWxlY3RFbGVtZW50ID0gc2VsZWN0RWxlbWVudDtcblxudmFyIGxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHAgPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gICAgcC5jb250ZW50RWRpdGFibGUgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjbG9jay1idXR0b24nKS5kaXNhYmxlZCA9IHRydWU7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3VubG9jay1idXR0b24nKS5kaXNhYmxlZCA9IGZhbHNlO1xufTtcbnZpZXcubG9jayA9IGxvY2s7XG5cbnZhciB1bmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHAgPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gICAgcC5jb250ZW50RWRpdGFibGUgPSB0cnVlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNsb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gZmFsc2U7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3VubG9jay1idXR0b24nKS5kaXNhYmxlZCA9IHRydWU7XG59O1xudmlldy51bmxvY2sgPSB1bmxvY2s7XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHAgPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gICAgcC5vbmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICB9O1xuICAgIHAub25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb21tYW5kcy5iaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgfTtcbn07XG52aWV3LmluaXQgPSBpbml0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXc7XG5nbG9iYWwudmlldyA9IHZpZXc7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50ICovXG4vKmdsb2JhbCBIVE1MRWxlbWVudCAqL1xuLypnbG9iYWwgd2luZG93ICovXG5cbi8qZ2xvYmFsIHJlc3R5bGUgKi9cbi8qZ2xvYmFsIERyYWdnYWJpbGx5ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1ibG9jayc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPGRpdiBpZD1cIm1haW5cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBvcnRzLWNvbnRhaW5lciBpbnB1dHNcIj5cbiAgICAgICAgICAgIDxjb250ZW50IHNlbGVjdD1cInotcG9ydC5pbnB1dFwiPjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwiYmxvY2sta2V5XCI+YTwvc3Bhbj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnQtY29udGFpbmVyXCI+XG4gICAgICAgICAgICA8Y29udGVudD48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwicG9ydHMtY29udGFpbmVyIG91dHB1dHNcIj5cbiAgICAgICAgICAgIDxjb250ZW50IHNlbGVjdD1cInotcG9ydC5vdXRwdXRcIj48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAvLyBCeSBkZWZhdWx0IGN1c3RvbSBlbGVtZW50cyBhcmUgaW5saW5lIGVsZW1lbnRzLiBDdXJyZW50IGVsZW1lbnRcbiAgICAgICAgLy8gaGFzIGl0cyBvd24gaGVpZ2h0IGFuZCB3aWR0aCBhbmQgY2FuIGJlIGluc3RlcnRlZCBpbiBhIHRleHRcbiAgICAgICAgLy8gZmxvdy4gU28gd2UgbmVlZCBhICdkaXNwbGF5OiBpbmxpbmUtYmxvY2snIHN0eWxlLiBNb3Jlb3ZlciwgdGhpc1xuICAgICAgICAvLyBpcyBuZWVkZWQgYXMgYSB3b3JrYXJvdW5kIGZvciBhIGJ1ZyBpbiBEcmFnZ2FiaWxseSAod2hpY2ggb25seVxuICAgICAgICAvLyB3b3JrcyBvbiBibG9jayBlbGVtZW50cywgbm90IG9uIGlubGluZSBvbmVzKS5cbiAgICAgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJ1xuICAgIH0sXG4gICAgJz4gZGl2Jzoge1xuICAgICAgICAnYmFja2dyb3VuZCc6ICd3aGl0ZScsXG4gICAgICAgICdib3JkZXItbGVmdCc6ICczcHggc29saWQnLFxuICAgICAgICAnYm9yZGVyLWxlZnQtY29sb3InOiAnd2hpdGUnLFxuICAgICAgICAnYm9yZGVyLXJpZ2h0JzogJzNweCBzb2xpZCcsXG4gICAgICAgICdib3JkZXItcmlnaHQtY29sb3InOiAnd2hpdGUnLFxuICAgICAgICAnYm94U2hhZG93JzogJzJweCAycHggM3B4IDBweCAjZGZkZmRmJ1xuICAgIH0sXG4gICAgJy5jb250ZW50LWNvbnRhaW5lcic6IHtcbiAgICAgICAgJ3BhZGRpbmcnOiAnOHB4IDE1cHggOHB4IDE1cHgnXG4gICAgfSxcbiAgICAnLnBvcnRzLWNvbnRhaW5lcic6IHtcbiAgICAgICAgJ3BhZGRpbmcnOiAwLFxuICAgICAgICAnbWluSGVpZ2h0JzogMyxcbiAgICAgICAgJ292ZXJmbG93JzogJ3Zpc2libGUnXG4gICAgfSxcbiAgICAnLnBvcnRzLWNvbnRhaW5lciB6LXBvcnQnOiB7XG4gICAgICAgICdmbG9hdCc6ICdsZWZ0JyxcbiAgICAgICAgJ21hcmdpbkxlZnQnOiA4LFxuICAgICAgICAnbWFyZ2luUmlnaHQnOiA4XG4gICAgfSxcbiAgICAnc3Bhbi5ibG9jay1rZXknOiB7XG4gICAgICAgICdmb250LXNpemUnOiAnc21hbGxlcicsXG4gICAgICAgICdjb2xvcic6ICcjNDQ0JyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2JvdHRvbSc6IDAsXG4gICAgICAgICdyaWdodCc6IDAsXG4gICAgICAgICdwYWRkaW5nLXJpZ2h0JzogMyxcbiAgICAgICAgJ3BhZGRpbmctbGVmdCc6IDMsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNmZmYnXG4gICAgfSxcbiAgICAnei1wb3J0LmlucHV0IC5wb3J0LWtleSc6IHtcbiAgICAgICAgJ3RvcCc6IDNcbiAgICB9LFxuICAgICd6LXBvcnQub3V0cHV0IC5wb3J0LWtleSc6IHtcbiAgICAgICAgJ2JvdHRvbSc6IDNcbiAgICB9XG59O1xuLy8gQXBwbHkgdGhlIGNzcyBkZWZpbml0aW9uIGFuZCBwcmVwZW5kaW5nIHRoZSBjdXN0b20gZWxlbWVudCB0YWcgdG8gYWxsXG4vLyBDU1Mgc2VsZWN0b3JzLlxudmFyIHN0eWxlID0gcmVzdHlsZSh0YWdOYW1lLCBjc3NBc0pzb24pO1xuXG52YXIgcmVkcmF3ID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIHBvcnRzID0gYmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICBwb3J0LnJlZHJhdygpO1xuICAgIH0pO1xufTtcblxudmFyIG1ha2VJdERyYWdnYWJsZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIHZhciBkcmFnZ2llID0gbmV3IERyYWdnYWJpbGx5KGJsb2NrLCB7XG4gICAgICAgIGNvbnRhaW5tZW50OiB0cnVlXG4gICAgfSk7XG4gICAgZHJhZ2dpZS5leHRlcm5hbEFuaW1hdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlZHJhdyhibG9jayk7XG4gICAgfTtcbn07XG5cbnZhciBwcm9wZXJ0aWVzID0ge1xuICAgIGNyZWF0ZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQXQgdGhlIGJlZ2lubmluZyB0aGUgbGlnaHQgRE9NIGlzIHN0b3JlZCBpbiB0aGUgY3VycmVudCBlbGVtZW50LlxuICAgICAgICB2YXIgbGlnaHREb20gPSB0aGlzO1xuICAgICAgICAvLyBTdGFydCBjb21wb3NlZCBET00gd2l0aCBhIGNvcHkgb2YgdGhlIHRlbXBsYXRlXG4gICAgICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgLy8gVGhlbiBwcm9ncmVzc2l2ZWx5IG1vdmUgZWxlbWVudHMgZnJvbSBsaWdodCB0byBjb21wb3NlZCBET00gYmFzZWQgb25cbiAgICAgICAgLy8gc2VsZWN0b3JzIG9uIGxpZ2h0IERPTSBhbmQgZmlsbCA8Y29udGVudD4gdGFncyBpbiBjb21wb3NlZCBET00gd2l0aFxuICAgICAgICAvLyB0aGVtLlxuICAgICAgICBbJ3otcG9ydC5pbnB1dCcsICd6LXBvcnQub3V0cHV0JywgJyddLmZvckVhY2goZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHV0aWxzLmRvbS5tb3ZlKHtcbiAgICAgICAgICAgICAgICBmcm9tOiBsaWdodERvbSwgd2l0aFNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICB0bzogY29tcG9zZWREb20sIG9uVGFnOiAnY29udGVudCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gQXQgdGhpcyBzdGFnZSBjb21wb3NlZCBET00gaXMgY29tcGxldGVkIGFuZCBsaWdodCBET00gaXMgZW1wdHkgKGkuZS5cbiAgICAgICAgLy8gJ3RoaXMnIGhhcyBubyBjaGlsZHJlbikuIENvbXBvc2VkIERPTSBpcyBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgdGhlXG4gICAgICAgIC8vIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAgICAgdGhpcy5oaWRlS2V5KCk7XG5cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcG9ydHMgPSB0aGF0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uKHBvcnQpIHtcbiAgICAgICAgICAgIHBvcnQuYmxvY2sgPSB0aGF0O1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy56ZS1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxuICAgICAgICB0aGlzLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB3aW5kb3cuc2V0Q3VycmVudEJsb2NrKHRoYXQpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgICAgICBzZWxlY3Rvci5zZXRTZWxlY3RhYmxlKHRoaXMsIHRydWUpO1xuICAgIH19LFxuXG4gICAgYXR0YWNoZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gVE9ETyBidWcgaW4gY2hyb21lIG9yIGluIHdlYnJlZmxlY3Rpb24gcG9seWZpbGwuIElmIG1ha2VJdERyYWdnYWJsZVxuICAgICAgICAvLyBpcyBjYWxsZWQgaW4gY3JlYXRlZENhbGxiYWNrIHRoZW4gRHJhZ2dhYmlseSBhZGRzIGFcbiAgICAgICAgLy8gJ3Bvc2l0aW9uOnJlbGF0aXZlJyBiZWNhdXNlIHRoZSBjc3Mgc3R5bGUgb2YgYmxvY2sgdGhhdCBzZXRcbiAgICAgICAgLy8gcG9zaXRpb24gdG8gYWJzb2x1dGUgaGFzIG5vdCBiZWVuIGFwcGxpZWQgeWV0ICh3aXRoIGNocm9tZSkuIFdpdGhcbiAgICAgICAgLy8gV2ViUmVmbGVjdGlvbidzIHBvbHlmaWxsIHRoZSBzdHlsZSBpcyBhcHBsaWVkIHNvIERyYWdnYWJpbGx5IGRvZXNuJ3RcbiAgICAgICAgLy8gY2hhbmdlIHBvc2l0aW9uLiBXaHkgYSBkaWZmZXJlbnQgYmVoYXZpb3VyPyBXaGljaCBpcyB3cm9uZyA/IENocm9tZSxcbiAgICAgICAgLy8gd2VicmVmbGVjdGlvbiBvciB0aGUgc3BlYz8gTWF5YmUgd2UgY2FuIHRyeSB3aXRoIHBvbHltZXIgcG9seWZpbGwuXG4gICAgICAgIG1ha2VJdERyYWdnYWJsZSh0aGlzKTtcbiAgICB9fSxcblxuICAgIHVucGx1Zzoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBvcnRzID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCkge1xuICAgICAgICAgICAgcG9ydC51bnBsdWcoKTtcbiAgICAgICAgfSk7XG4gICAgfX0sXG5cbiAgICBhZGRQb3J0OiB7dmFsdWU6IGZ1bmN0aW9uIChodG1sU3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sU3RyaW5nKTtcbiAgICAgICAgdmFyIHBvcnQgPSBmcmFnbWVudC5maXJzdENoaWxkO1xuICAgICAgICBwb3J0LmJsb2NrID0gdGhpcztcbiAgICAgICAgaWYgKHBvcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpKSB7XG4gICAgICAgICAgICB2YXIgcG9ydENvbnRhaW5lciA9IHRoaXMucXVlcnlTZWxlY3RvcignLnBvcnRzLWNvbnRhaW5lci5pbnB1dHMnKTtcbiAgICAgICAgICAgIHBvcnRDb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSkge1xuICAgICAgICAgICAgdmFyIHBvcnRDb250YWluZXIgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5wb3J0cy1jb250YWluZXIub3V0cHV0cycpO1xuICAgICAgICAgICAgcG9ydENvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBvcnQ7XG4gICAgfX0sXG5cbiAgICBrZXlFbGVtZW50OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3Rvcignc3Bhbi5ibG9jay1rZXknKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXk6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMua2V5RWxlbWVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzaG93S2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfX0sXG5cbiAgICBoaWRlS2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICB9fSxcblxuICAgIHBvcnRzOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnb3V0JzogdGhpcy5xdWVyeVNlbGVjdG9yKCd6LXBvcnQub3V0cHV0JyksXG4gICAgICAgICAgICAgICAgJ2lucHV0cyc6IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0JyksXG4gICAgICAgICAgICAgICAgJ291dHB1dHMnOiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlLCBwcm9wZXJ0aWVzKTtcbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG5cbi8vIFRPRE8gY2xlYW4gZ2xvYmFsc1xud2luZG93LmdldEVsZW1lbnRCbG9jayA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgLy8gVE9ETyBkbyBhIHNlYXJjaCB0byBmaW5kIHRoZSBmaXJzdCBwYXJlbnQgYmxvY2sgZm9yIGNhc2VzIHdoZXJlXG4gICAgLy8gZWxlbWVudCBpcyBkb3duIGluIHRoZSBlbGVtZW50IGhpZWFyY2h5LlxuICAgIHZhciBtYXliZUJsb2NrID0gZWxlbWVudC5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICB2YXIgYmxvY2s7XG4gICAgaWYgKG1heWJlQmxvY2sudGFnTmFtZSA9PT0gJ1otQkxPQ0snKSB7XG4gICAgICAgIGJsb2NrID0gbWF5YmVCbG9jaztcbiAgICB9IGVsc2Uge1xuICAgICAgICBibG9jayA9IGVsZW1lbnQucGhhbnRvbWVkQnkucGFyZW50Tm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBibG9jaztcbn07XG4iLCIvLyBDdXN0b20gZWxlbWVudCB0byBkcmF3IGEgbGluayBiZXR3ZWVuIHR3byBwb3J0cy5cblxuLy8gV2UgaW1wbGVtZW50IHRoaXMgYXMgYSBkaXYgd2l0aCB6ZXJvIGhlaWdodCB3aGljaCB3aWR0aCBpcyB0aGUgbGVuZ3RoIG9mIHRoZVxuLy8gbGluZSBhbmQgdXNlIHRyYW5zZm9ybXMgdG8gc2V0IGl0cyBlbmRzIHRvIHRoZSBwb3J0cyBwb3NpdGlvbnMuIFJlZmVyZW5jZVxuLy8gb3JpZ2luIHBvc2l0aW9uIGlzIHJlbGF0aXZlIGNvb3JkaW5hdGVzICgwLDApIGFuZCBvdGhlciBlbmQgaXMgKHdpZHRoLDApLlxuLy8gU28gYmUgc3VyZSB0aGF0IENTUyBzdHlsaW5nIGlzIGRvbmUgYWNjb3JkaW5nbHkuXG5cbi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG5cbi8qZ2xvYmFsIGdldFN0eWxlUHJvcGVydHkgKi9cblxuLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgcmVzdHlsZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi4vbGliL3NlbGVjdG9yJyk7XG5cbnZhciB0YWdOYW1lID0gJ3otbGluayc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPGRpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+XG4gICAgPC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbi8vIFRPRE8gVXNlIGEgY3VzdG9tIGVsZW1lbnQgZm9yIGxpbmUgd2lkdGguXG52YXIgbGluZVdpZHRoID0gMy4wO1xudmFyIHJhZGl1cyA9IGxpbmVXaWR0aCAvIDI7XG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnaGVpZ2h0JzogMCxcbiAgICAgICAgJ21hcmdpbi1sZWZ0JzogLXJhZGl1cyxcbiAgICAgICAgJ21hcmdpbi10b3AnOiAtcmFkaXVzLFxuICAgICAgICAnYm9yZGVyV2lkdGgnOiByYWRpdXMsXG4gICAgICAgICdib3JkZXJSYWRpdXMnOiByYWRpdXMsXG4gICAgICAgICdib3JkZXJTdHlsZSc6ICdzb2xpZCcsXG4gICAgICAgICdib3hTaGFkb3cnOiAnMHB4IDBweCAzcHggMHB4ICNkZmRmZGYnLFxuICAgICAgICAnYm9yZGVyQ29sb3InOiAnI2NjYydcbiAgICB9LFxuICAgICdkaXYuc2VsZWN0b3InOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdsZWZ0JzogJzEwJScsXG4gICAgICAgICd3aWR0aCc6ICc4MCUnLFxuICAgICAgICAndG9wJzogLTcsXG4gICAgICAgICdoZWlnaHQnOiAxNCxcbiAgICAgICAgJ3pJbmRleCc6IDAsXG4gICAgICAgICdib3JkZXJDb2xvcic6ICcjMzMzJ1xuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciBnZXRQb2xhckNvb3JkaW5hdGVzID0gZnVuY3Rpb24ocG9zaXRpb24xLCBwb3NpdGlvbjIpIHtcbiAgICB2YXIgeERpZmYgPSBwb3NpdGlvbjEueCAtIHBvc2l0aW9uMi54O1xuICAgIHZhciB5RGlmZiA9IHBvc2l0aW9uMS55IC0gcG9zaXRpb24yLnk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBtb2Q6IE1hdGguc3FydCh4RGlmZiAqIHhEaWZmICsgeURpZmYgKiB5RGlmZiksXG4gICAgICAgIGFyZzogTWF0aC5hdGFuKHlEaWZmIC8geERpZmYpXG4gICAgfTtcbn07XG5cbi8vIFNldCB0aGUgc3R5bGUgb2YgYSBnaXZlbiBlbGVtZW50IHNvIHRoYXQ6XG4vLyAqIEl0cyBvcmlnaW4gKGkuZS4gMCwwIHJlbGF0aXZlIGNvb3JkaW5hdGVzKSBpcyBwbGFjZWQgYXQgb25lIHBvc2l0aW9uLlxuLy8gKiBJdHMgd2lkdGggaXMgc2V0IHRvIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gcG9zaXRpb25zLlxuLy8gKiBJdCBpcyByb3RhdGVkIHNvIHRoYXQgaXRzIGVuZCBwb2ludCAoeCA9IHdpZHRoIGFuZCB5ID0gMCkgaXMgcGxhY2VkIGF0XG4vLyB0aGUgb3RoZXIgcG9zaXRpb24uXG52YXIgdHJhbnNmb3JtUHJvcGVydHkgPSBnZXRTdHlsZVByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbnZhciBzZXRFbGVtZW50RW5kcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGVuZDEsIGVuZDIpIHtcbiAgICB2YXIgb3JpZ2luO1xuICAgIGlmIChlbmQxLnggPCBlbmQyLngpIHtcbiAgICAgICAgb3JpZ2luID0gZW5kMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvcmlnaW4gPSBlbmQyO1xuICAgIH1cblxuICAgIHZhciBwb2xhciA9IGdldFBvbGFyQ29vcmRpbmF0ZXMoZW5kMSwgZW5kMik7XG4gICAgdmFyIGxlbmd0aCA9IHBvbGFyLm1vZDtcbiAgICB2YXIgYW5nbGUgPSBwb2xhci5hcmc7XG5cbiAgICB2YXIgdG9wID0gb3JpZ2luLnkgKyAwLjUgKiBsZW5ndGggKiBNYXRoLnNpbihhbmdsZSk7XG4gICAgdmFyIGxlZnQgPSBvcmlnaW4ueCAtIDAuNSAqIGxlbmd0aCAqICgxIC0gTWF0aC5jb3MoYW5nbGUpKTtcbiAgICB2YXIgcGFyZW50UG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICBsZWZ0IC09IHBhcmVudFBvc2l0aW9uLng7XG4gICAgdG9wIC09IHBhcmVudFBvc2l0aW9uLnk7XG5cbiAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gbGVuZ3RoICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZVt0cmFuc2Zvcm1Qcm9wZXJ0eV0gPSAncm90YXRlKCcgKyBhbmdsZSArICdyYWQpJztcbn07XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAoemxpbmspIHtcbiAgICB2YXIgZW5kMSA9IHpsaW5rLmJlZ2luLnBvcnQ7XG4gICAgdmFyIGVuZDIgPSB6bGluay5lbmQucG9ydDtcbiAgICBpZiAoZW5kMSAhPT0gdW5kZWZpbmVkICYmIGVuZDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZXRFbGVtZW50RW5kcyh6bGluaywgZW5kMS5jb25uZWN0aW9uUG9zaXRpb24sIGVuZDIuY29ubmVjdGlvblBvc2l0aW9uKTtcbiAgICB9XG59O1xuXG52YXIgY29ubmVjdCA9IGZ1bmN0aW9uKHpsaW5rLCBwbHVnLCBwb3J0KSB7XG4gICAgaWYgKHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJykge1xuICAgICAgICBwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihwb3J0KTtcbiAgICB9XG4gICAgcGx1Zy5wb3J0ID0gcG9ydDtcbiAgICBwbHVnLnBvcnQubGlua3MucHVzaCh6bGluayk7XG59O1xuXG52YXIgdW5jb25uZWN0ID0gZnVuY3Rpb24gKHpsaW5rKSB7XG4gICAgemxpbmsuYmVnaW4ucG9ydC5saW5rcyA9IF8ud2l0aG91dCh6bGluay5iZWdpbi5wb3J0LmxpbmtzLCB6bGluayk7XG4gICAgemxpbmsuZW5kLnBvcnQubGlua3MgPSBfLndpdGhvdXQoemxpbmsuZW5kLnBvcnQubGlua3MsIHpsaW5rKTtcbiAgICBpZiAoemxpbmsucGFyZW50Tm9kZSAhPT0gbnVsbCkge1xuICAgICAgICB6bGluay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHpsaW5rKTtcbiAgICB9XG59O1xuXG52YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG5wcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29tcG9zZWREb20gPSB0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAvLyBDdXJyaWVkIHZlcnNpb24gb2YgJ3JlZHJhdycgd2l0aCBjdXJyZW50IG9iamVjdCBpbnN0YW5jZS5cbiAgICAvLyBVc2VkIGZvciBldmVudCBsaXN0ZW5lcnMuXG4gICAgdGhpcy5yZWRyYXcgPSByZWRyYXcuYmluZChudWxsLCB0aGlzKTtcbiAgICB0aGlzLmNvbm5lY3QgPSBjb25uZWN0LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgdGhpcy51bmNvbm5lY3QgPSB1bmNvbm5lY3QuYmluZChudWxsLCB0aGlzKTtcblxuICAgIHRoaXMuYmVnaW4gPSB7fTtcbiAgICB0aGlzLmVuZCA9IHt9O1xuICAgIGlmICh0aGlzLmhhc0F0dHJpYnV0ZSgnYmVnaW4nKSAmJiB0aGlzLmhhc0F0dHJpYnV0ZSgnZW5kJykpIHtcbiAgICAgICAgLy8gVE9ETyBkbyB0aGUgc2FtZSBzdHVmZiBvbiBhdHRyaWJ1dGVzJyBjaGFuZ2VzLlxuICAgICAgICBjb25uZWN0KHRoaXMsIHRoaXMuYmVnaW4sIHRoaXMuZ2V0QXR0cmlidXRlKCdiZWdpbicpKTtcbiAgICAgICAgY29ubmVjdCh0aGlzLCB0aGlzLmVuZCwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2VuZCcpKTtcblxuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG59O1xuXG5wcm90by5jc3MgPSBzdHlsZTtcbmRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCh0YWdOYW1lLCB7cHJvdG90eXBlOiBwcm90b30pO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG4vKmdsb2JhbCBIVE1MRWxlbWVudCAqL1xuXG4vKmdsb2JhbCByZXN0eWxlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1wb3J0JztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8c3BhbiBjbGFzcz1cInBvcnQta2V5XCI+YTwvc3Bhbj5cbiAgICA8ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj5cbiovfSk7XG52YXIgdGVtcGxhdGUgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFRlbXBsYXRlKTtcblxudmFyIGNzc0FzSnNvbiA9IHtcbiAgICAvLyBUaGUgZm9sbG93aW5nIHdpbGwgYXBwbHkgdG8gdGhlIHJvb3QgRE9NIGVsZW1lbnQgb2YgdGhlIGN1c3RvbVxuICAgIC8vIGVsZW1lbnQuXG4gICAgJyc6IHtcbiAgICAgICAgJ3dpZHRoJzogMTgsXG4gICAgICAgICdoZWlnaHQnOiAzLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICcjY2NjJyxcbiAgICAgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ3JlbGF0aXZlJyxcbiAgICAgICAgJ292ZXJmbG93JzogJ3Zpc2libGUnLFxuICAgICAgICAnekluZGV4JzogJzUnXG4gICAgfSxcbiAgICAnLnBvcnQta2V5Jzoge1xuICAgICAgICAnZm9udC1zaXplJzogJzAuN2VtJyxcbiAgICAgICAgJ2NvbG9yJzogJyM0NDQnLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAncGFkZGluZy1sZWZ0JzogMyxcbiAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiAzLFxuICAgICAgICAnekluZGV4JzogJzEwJyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2ZmZidcbiAgICB9LFxuICAgICcuc2VsZWN0b3InOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdsZWZ0JzogLTgsXG4gICAgICAgICd0b3AnOiAtOCxcbiAgICAgICAgJ3dpZHRoJzogMjQsXG4gICAgICAgICdoZWlnaHQnOiAxNFxuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAocG9ydCkge1xuICAgIFtdLmZvckVhY2guY2FsbChwb3J0LmxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICBsaW5rLnJlZHJhdygpO1xuICAgIH0pO1xufTtcblxuXG52YXIgcHJvcGVydGllcyA9IHtcblxuICAgIGNyZWF0ZWRDYWxsYmFjazoge3ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saW5rcyA9IFtdO1xuICAgICAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgICAgICBzZWxlY3Rvci5zZXRTZWxlY3RhYmxlKHRoaXMsIHRydWUpO1xuXG4gICAgICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChjb21wb3NlZERvbSk7XG5cbiAgICAgICAgdGhpcy5oaWRlS2V5KCk7XG4gICAgfX0sXG5cbiAgICB1bnBsdWc6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxpbmtzLmZvckVhY2goZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgIGxpbmsudW5jb25uZWN0KCk7XG4gICAgICAgIH0pO1xuICAgIH19LFxuXG4gICAgY29ubmVjdGFibGU6IHt2YWx1ZTogZnVuY3Rpb24gKHBvcnQxLCBwb3J0Mikge1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgKHBvcnQxLmNsYXNzTGlzdC5jb250YWlucygnaW5wdXQnKVxuICAgICAgICAgICAgJiYgcG9ydDIuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSlcbiAgICAgICAgICAgIHx8XG4gICAgICAgICAgICAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKVxuICAgICAgICAgICAgJiYgcG9ydDIuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpKVxuICAgICAgICAgICAgKTtcbiAgICB9fSxcblxuICAgIGNvbm5lY3Q6IHt2YWx1ZTogZnVuY3Rpb24gKHBvcnQxLCBwb3J0Mikge1xuICAgICAgICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3otbGluaycpO1xuICAgICAgICBpZiAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdvdXRwdXQnKSkge1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuYmVnaW4sIHBvcnQxKTtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmVuZCwgcG9ydDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuZW5kLCBwb3J0MSk7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5iZWdpbiwgcG9ydDIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gdXNlIGFub3RoZXIgd2F5IHRvIGZpbmQgd2hlcmUgdG8gYWRkIG5ldyBsaW5rcy5cbiAgICAgICAgdmFyIHBhdGNoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhdGNoJyk7XG4gICAgICAgIHBhdGNoLmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICBsaW5rLnJlZHJhdygpO1xuICAgIH19LFxuXG4gICAgY29ubmVjdGlvblBvc2l0aW9uOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gdXRpbHMuZG9tLmdldFBvc2l0aW9uKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyIGNlbnRlciA9IHtcbiAgICAgICAgICAgICAgICB4OiBwb3NpdGlvbi54ICsgcmVjdC53aWR0aCAvIDIsXG4gICAgICAgICAgICAgICAgeTogcG9zaXRpb24ueSArIHJlY3QuaGVpZ2h0IC8gMlxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBjZW50ZXI7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAga2V5RWxlbWVudDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3NwYW4ucG9ydC1rZXknKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXk6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMua2V5RWxlbWVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzaG93S2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfX0sXG5cbiAgICBoaWRlS2V5OiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5rZXlFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICB9fVxuXG59O1xuXG52YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSwgcHJvcGVydGllcyk7XG5wcm90by5jc3MgPSBzdHlsZTtcbmRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCh0YWdOYW1lLCB7cHJvdG90eXBlOiBwcm90b30pO1xuXG4iXX0=
