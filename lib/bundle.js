(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/zed/lib/app.js":[function(require,module,exports){
(function (global){
var commands = require('./commands');
var engine = require('./engine');
var editor = require('./editor');
var storage = require('./storage');
var http = require('./http');
// import view module so that its globals are defined.
var view = require('./view');

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

},{"./commands":"/home/zed/lib/commands.js","./editor":"/home/zed/lib/editor.js","./engine":"/home/zed/lib/engine.js","./http":"/home/zed/lib/http.js","./storage":"/home/zed/lib/storage.js","./view":"/home/zed/lib/view.js"}],"/home/zed/lib/commands.js":[function(require,module,exports){
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
var engine = {};

engine.compileScript = function (element) {
    var string = element.text;
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
            script = element.text;
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
        try {
            result = theScript.apply(null, args);
        } catch (e) {
            target.classList.toggle('has-execution-error');
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
            // The newlines are lost when using raw innerHTML for script tags
            // (at least on firefox). So we parse each child to add a newline
            // when BR are encountered.
            value = '';
            [].forEach.call(content.childNodes, function (node) {
                if (node.tagName === 'BR') {
                    value += '\n';
                } else {
                    value += node.textContent;
                }
            });
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

},{"./editor":"/home/zed/lib/editor.js","./view":"/home/zed/lib/view.js"}],"/home/zed/lib/terminal.js":[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvaHR0cC5qcyIsImxpYi9zZWxlY3Rvci5qcyIsImxpYi9zdG9yYWdlLmpzIiwibGliL3Rlcm1pbmFsLmpzIiwibGliL3V0aWxzLmpzIiwibGliL3ZpZXcuanMiLCJ3ZWJjb21wb25lbnRzL3otYmxvY2suanMiLCJ3ZWJjb21wb25lbnRzL3otbGluay5qcyIsIndlYmNvbXBvbmVudHMvei1wb3J0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG52YXIgZW5naW5lID0gcmVxdWlyZSgnLi9lbmdpbmUnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBodHRwID0gcmVxdWlyZSgnLi9odHRwJyk7XG4vLyBpbXBvcnQgdmlldyBtb2R1bGUgc28gdGhhdCBpdHMgZ2xvYmFscyBhcmUgZGVmaW5lZC5cbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbnZhciBleHBvcnRzID0ge307XG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb21tYW5kcy5pbml0KCk7XG4gICAgZW5naW5lLmluaXQoKTtcbiAgICBlZGl0b3IuaW5pdCgpO1xuICAgIHZpZXcuaW5pdCgpO1xuICAgIGdsb2JhbC5odHRwID0gaHR0cDtcbiAgICAvLyBMb2FkIGEgcGF0Y2ggYXMgYW4gZXhhbXBsZS5cbiAgICBzdG9yYWdlLmxvYWRQYXRjaCgnaHR0cCcsICdwYXRjaGVzL21haW4uemVkJyk7XG59O1xuZXhwb3J0cy52aWV3ID0gdmlldztcbmV4cG9ydHMuY29tbWFuZHMgPSBjb21tYW5kcztcblxuLy8gVGhpcyBtb2R1bGUgaXMgdG8gYmUgdXNlZCBmcm9tIHRoZSBnbG9iYWwgbmFtZXNwYWNlIChpLmUuIGZyb20gYXBwLmh0bWwpLlxuZ2xvYmFsLmFwcCA9IGV4cG9ydHM7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIE1vdXNldHJhcCAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdG9yYWdlID0gcmVxdWlyZSgnLi9zdG9yYWdlJyk7XG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3InKTtcbnZhciB0ZXJtaW5hbCA9IHJlcXVpcmUoJy4vdGVybWluYWwnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGNvbW1hbmRzID0ge307XG5cbmNvbW1hbmRzLnByZXYgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIC0xKTtcbmNvbW1hbmRzLm5leHQgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIDEpO1xuY29tbWFuZHMuYWRkID0gZWRpdG9yLmFkZDtcbmNvbW1hbmRzLnJlbW92ZSA9IGVkaXRvci5yZW1vdmU7XG5jb21tYW5kcy5pbnB1dHMgPSBlZGl0b3IucG9ydC5iaW5kKG51bGwsICdpbnB1dCcpO1xuY29tbWFuZHMub3V0cHV0cyA9IGVkaXRvci5wb3J0LmJpbmQobnVsbCwgJ291dHB1dCcpO1xuY29tbWFuZHMuYmxvY2sgPSBlZGl0b3IuYmxvY2s7XG5jb21tYW5kcy5maXJlID0gZWRpdG9yLmZpcmU7XG5jb21tYW5kcy5zZXQgPSBlZGl0b3Iuc2V0O1xuY29tbWFuZHMubW92ZSA9IGVkaXRvci5tb3ZlO1xuY29tbWFuZHMub2Zmc2V0ID0gZWRpdG9yLm1vdmVCeTtcbmNvbW1hbmRzLmNsZWFyID0gZWRpdG9yLmNsZWFyQWxsO1xuXG5cbnZhciBlZGl0QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgY29tbWFuZHMuZXNjYXBlKTtcbiAgICBibG9jay5jb250ZW50LmZvY3VzKCk7XG59O1xuY29tbWFuZHMuZWRpdEJsb2NrID0gZWRpdEJsb2NrO1xuXG5jb21tYW5kcy5lZGl0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIGVkaXRCbG9jayhibG9jayk7XG4gICAgICAgIGVkaXRvci5zdG9wQmxpbmtpbmcoKTtcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IHdoZW4gdGhpcyBmdW5jdGlvbiBpcyB1c2VkIHdpdGggTW91c3RyYXAuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5jb21tYW5kcy5hZGRCdXR0b24gPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdidXR0b24nLCAnZ28nLCAwLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGRTY3JpcHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzY3JpcHQnLCAnaW4xICsgMicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZFRleHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzcGFuJywgJ2VtcHR5JywgMSwgMSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuY29tbWFuZHMuYWRkTnVtYmVyID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ3plZCcsICdudW1iZXInLCAnNDInLCAxLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGRDb21tZW50ID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ2h0bWwnLCAnY29tbWVudCcsICdDb21tZW50JywgMCwgMCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xudmFyIGJpbmRLZXlzRm9yTWFpbk1vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ0snLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAwLCAtMTApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSicsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDAsIDEwKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ0gnLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAtMTAsIDApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnTCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDEwLCAwKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2snLCBjb21tYW5kcy5wcmV2KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaicsIGNvbW1hbmRzLm5leHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIG4nLCBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnTmV3JykpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggYicsIGNvbW1hbmRzLmFkZEJ1dHRvbik7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBzJywgY29tbWFuZHMuYWRkU2NyaXB0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHQnLCBjb21tYW5kcy5hZGRUZXh0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIG4nLCBjb21tYW5kcy5hZGROdW1iZXIpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggYycsIGNvbW1hbmRzLmFkZENvbW1lbnQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdyJywgY29tbWFuZHMucmVtb3ZlKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaScsIGNvbW1hbmRzLmlucHV0cyk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ28nLCBjb21tYW5kcy5vdXRwdXRzKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYicsIGNvbW1hbmRzLmJsb2NrKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYycsIGNvbW1hbmRzLmdvVG9Db21tYW5kTGluZSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2wnLCBjb21tYW5kcy5saW5rKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZycsIGNvbW1hbmRzLmdvVG9CbG9jayk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2UnLCBjb21tYW5kcy5lZGl0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnc3BhY2UnLCBjb21tYW5kcy5maXJlKTtcbn07XG5jb21tYW5kcy5iaW5kS2V5c0Zvck1haW5Nb2RlID0gYmluZEtleXNGb3JNYWluTW9kZTtcblxuY29tbWFuZHMuZXNjYXBlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgY3VycmVudGx5RWRpdGluZ0VsZW1lbnQgPSB1dGlscy5kb20uZ2V0U2VsZWN0aW9uU3RhcnQoKTtcbiAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRpbmdFbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjdXJyZW50bHlFZGl0aW5nRWxlbWVudC5ibHVyKCk7XG4gICAgICAgICAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xuICAgICAgICB9XG4gICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9XG59O1xuXG52YXIgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIFtdLmZvckVhY2guY2FsbChibG9ja3MsIGZ1bmN0aW9uIChiKSB7XG4gICAgICAgIGIuY2xhc3NMaXN0LnRvZ2dsZSgnZGUtZW1waGFzaXMnKTtcbiAgICB9KTtcbn07XG5cbnZhciBoaWRlQWxsS2V5cyA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIFtdLmZvckVhY2guY2FsbChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5oaWRlS2V5KCk7XG4gICAgfSk7XG4gICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xufTtcblxudmFyIGZpcnN0UG9ydDtcbnZhciBzZWxlY3RQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICBpZiAoZmlyc3RQb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZmlyc3RQb3J0ID0gcG9ydDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocG9ydC5jb25uZWN0YWJsZShwb3J0LCBmaXJzdFBvcnQpKSB7XG4gICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgZmlyc3RQb3J0KTtcbiAgICAgICAgICAgIGZpcnN0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LXBvcnQnKTtcbiAgICAgICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBwb3J0VG9MaW5rVG87XG5jb21tYW5kcy5saW5rID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICAgICAgZmlyc3RQb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICAgICAgdmFyIHBvcnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzLm5leHQoKTtcbiAgICAgICAgICAgIHBvcnQua2V5ID0ga2V5O1xuICAgICAgICAgICAgcG9ydC5zaG93S2V5KCk7XG4gICAgICAgICAgICAvLyBDb252ZXJ0ICdhYWUnIGludG8gJ2EgYSBlJy5cbiAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZWxlY3RQb3J0LmJpbmQobnVsbCwgcG9ydCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LXBvcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcG9ydCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgICAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHBvcnRUb0xpbmtUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gcG9ydDtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LmNvbm5lY3RhYmxlKHBvcnQsIHBvcnRUb0xpbmtUbykpIHtcbiAgICAgICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgcG9ydFRvTGlua1RvKTtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8gPSBwb3J0O1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgc2V0Q3VycmVudEJsb2NrQW5kQmFja1RvTWFpbk1vZGUgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICBoaWRlQWxsS2V5cygnei1ibG9jaycpO1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbn07XG5cbmNvbW1hbmRzLmdvVG9CbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIGtleXMgPSB1dGlscy5jcmVhdGVLZXlzR2VuZXJhdG9yKCk7XG4gICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzLm5leHQoKTtcbiAgICAgICAgYmxvY2sua2V5ID0ga2V5O1xuICAgICAgICBibG9jay5zaG93S2V5KCk7XG4gICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJycpLmpvaW4oJyAnKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZS5iaW5kKG51bGwsIGJsb2NrKSk7XG4gICAgICAgIGluZGV4Kys7XG4gICAgfSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGlkZUFsbEtleXMoJ3otYmxvY2snKTtcbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH0pO1xuICAgIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MoKTtcbn07XG5cbi8vIFNldCBhIG5ldyBzdG9wQ2FsbGJhY2sgZm9yIE1vdXN0cmFwIHRvIGF2b2lkIHN0b3BwaW5nIHdoZW4gd2Ugc3RhcnRcbi8vIGVkaXRpbmcgYSBjb250ZW50ZWRpdGFibGUsIHNvIHRoYXQgd2UgY2FuIHVzZSBlc2NhcGUgdG8gbGVhdmUgZWRpdGluZy5cbk1vdXNldHJhcC5zdG9wQ2FsbGJhY2sgPSBmdW5jdGlvbihlLCBlbGVtZW50LCBjb21ibykge1xuICAgIC8vIGlmIHRoZSBlbGVtZW50IGhhcyB0aGUgY2xhc3MgXCJtb3VzZXRyYXBcIiB0aGVuIG5vIG5lZWQgdG8gc3RvcFxuICAgIGlmICgoJyAnICsgZWxlbWVudC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyBtb3VzZXRyYXAgJykgPiAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgIC8vIHN0b3AgZm9yIGlucHV0LCBzZWxlY3QsIGFuZCB0ZXh0YXJlYVxuICAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lID09ICdJTlBVVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdTRUxFQ1QnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnO1xuIH07XG5cbmNvbW1hbmRzLnNhdmUgPSBzdG9yYWdlLnNhdmVQYXRjaDtcbmNvbW1hbmRzLmxvYWQgPSBzdG9yYWdlLmxvYWRQYXRjaDtcbmNvbW1hbmRzLnJtID0gc3RvcmFnZS5yZW1vdmVQYXRjaDtcbmNvbW1hbmRzLmxpc3QgPSBzdG9yYWdlLmdldFBhdGNoTmFtZXM7XG5jb21tYW5kcy5scyA9IHN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcztcblxudmFyIHRlcm1pbmFsT25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xufTtcblxudmFyIHRlcm07XG52YXIgaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgdGVybSA9IHRlcm1pbmFsLmNyZWF0ZShjb21tYW5kcywgdGVybWluYWxPbmJsdXIpO1xuICAgIC8vIFVucGx1ZyB0aGUgaW5pdCBmdW5jdGlvbiBzbyB0aGF0IGl0IHdvbid0IGJlIHVzZWQgYXMgYSBjb21tYW5kIGZyb20gdGhlXG4gICAgLy8gdGVybWluYWwuXG4gICAgZGVsZXRlIGNvbW1hbmRzLmluaXQ7XG59O1xuY29tbWFuZHMuaW5pdCA9IGluaXQ7XG5cbmNvbW1hbmRzLmdvVG9Db21tYW5kTGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0ZXJtLmZvY3VzKCk7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgZWRpdG9yLnN0b3BCbGlua2luZygpO1xufTtcblxuLy8gVE9ETyBjcmVhdGUgYSB0ZXJtLndyaXRlKG11bHRpTGluZVN0cmluZykgYW5kIHVzZSBpdC5cbmNvbW1hbmRzLmhlbHAgPSBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIGlmIChzdWJqZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdQcmVzcyBFc2MgdG8gbGVhdmUgdGhlIGNvbW1hbmQgbGluZSBhbmQgZ28gYmFjayB0byBub3JtYWwgbW9kZS4nKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdDb21tYW5kczogbmV4dCwgcHJldiwgcmVtb3ZlLCBhZGQsIHNldCBjb250ZW50LCBtb3ZlLCBvZmZzZXQnKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdscywgbG9hZCwgc2F2ZSwgY2xlYXIgYW5kIHJtLicpO1xuICAgIH0gZWxzZSBpZiAoc3ViamVjdCA9PT0gJ2FkZCcpIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdBZGQgYSBuZXcgYmxvY2sganVzdCBiZWxvdyB0aGUgY3VycmVudCBibG9jay4nKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdhZGQgaHRtbCA8d2hhdD4gPGNvbnRlbnQ+IDxuYiBpbnB1dHM+IDxuYiBvdXRwdXRzPicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPHdoYXQ+ICAgIGlzIGVpdGhlciBcImJ1dHRvblwiLCBcInNjcmlwdFwiLCBcInRleHRcIiwgXCJudW1iZXJcIiBvciBhIEhUTUwgdGFnLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPGNvbnRlbnQ+IGlzIHRoZSBjb250ZW50IG9mIHRoZSBibG9jayAoaS5lLiB0aGUgYnV0dG9uIG5hbWUsIHRoZScpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgICAgICAgICAgIHNjcmlwdCBjb2RlLCB0aGUgdGV4dCBvciBudW1iZXIgdmFsdWUsIGV0Yy4pLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnTm8gaGVscCBmb3IgXCInICsgc3ViamVjdCArICdcIi4nKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVuZ2luZSA9IHJlcXVpcmUoJy4vZW5naW5lJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlZGl0b3IgPSB7fTtcblxuZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuXG5lZGl0b3IuZ2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5nZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1wb3J0LmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5zZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgfVxufTtcbi8vIFRPRE8gbm90IGluIHRoZSB3aW5kb3cgbmFtZXNwYWNlXG53aW5kb3cuc2V0Q3VycmVudEJsb2NrID0gZWRpdG9yLnNldEN1cnJlbnRCbG9jaztcblxuZWRpdG9yLnNldEN1cnJlbnRQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgIHBvcnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoZWxlbWVudHMubGVuZ3RoICsgaSArIG9mZnNldCkgJSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICB2YXIgZWxlbWVudHMgPSBjdXJyZW50LmJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC4nICsgZWRpdG9yLmNvbnRleHQpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoZWxlbWVudHMubGVuZ3RoICsgaSArIG9mZnNldCkgJSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQoZWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrKG9mZnNldCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0JyB8fCBlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0KG9mZnNldCk7XG4gICAgfVxufTtcblxuZWRpdG9yLmNyZWF0ZUJsb2NrRWxlbWVudCA9IGZ1bmN0aW9uIChjb250ZW50LCBuSW5wdXRzLCBuT3V0cHV0cywgdG9wLCBsZWZ0KSB7XG4gICAgdmFyIHBhdGNoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhdGNoJyk7XG4gICAgY29udGVudCA9IFtcbiAgICAgICAgJzx6LXBvcnQgY2xhc3M9XCJpbnB1dFwiPjwvei1wb3J0PicucmVwZWF0KG5JbnB1dHMpLFxuICAgICAgICBjb250ZW50LFxuICAgICAgICAnPHotcG9ydCBjbGFzcz1cIm91dHB1dFwiPjwvei1wb3J0PicucmVwZWF0KG5PdXRwdXRzKVxuICAgIF0uam9pbignJyk7XG4gICAgdmFyIGh0bWxTdHJpbmcgPSAnPHotYmxvY2s+JyArIGNvbnRlbnQgKyAnPC96LWJsb2NrPic7XG4gICAgdmFyIGZyYWdtZW50ID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxTdHJpbmcpO1xuICAgIHZhciBibG9jayA9IGZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2snKTtcblxuICAgIHZhciBkZWZhdWx0VG9wID0gMDtcbiAgICB2YXIgZGVmYXVsdExlZnQgPSAwO1xuICAgIHZhciBjdXJyZW50QmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGN1cnJlbnRCbG9jayAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oY3VycmVudEJsb2NrLCBjdXJyZW50QmxvY2sucGFyZW50Tm9kZSk7XG4gICAgICAgIGRlZmF1bHRUb3AgPSBwb3NpdGlvbi55ICsgY3VycmVudEJsb2NrLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCArIDIzO1xuICAgICAgICBkZWZhdWx0TGVmdCA9IHBvc2l0aW9uLng7XG4gICAgfVxuICAgIGJsb2NrLnN0eWxlLnRvcCA9IHRvcCB8fCBkZWZhdWx0VG9wICsgJ3B4JztcbiAgICBibG9jay5zdHlsZS5sZWZ0ID0gbGVmdCB8fCBkZWZhdWx0TGVmdCArICdweCc7XG5cbiAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICBwYXRjaC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgcmV0dXJuIGJsb2NrO1xufTtcblxuZWRpdG9yLmFkZEJsb2NrID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgemVDbGFzcyA9ICcnO1xuICAgIGlmIChhcmdzWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICB0eXBlID0gJ2h0bWwnO1xuICAgICAgICBhcmdzWzFdID0gJ3NwYW4nO1xuICAgICAgICB6ZUNsYXNzID0gJ3plZC1udW1iZXInO1xuICAgIH1cbiAgICB2YXIgYmxvY2tDbGFzcyA9IGFyZ3NbMV07XG4gICAgaWYgKHR5cGUgPT09ICdodG1sJykge1xuICAgICAgICB2YXIgdGFnTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgIGlmIChhcmdzWzFdID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSAnc3Bhbic7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnRlbnQgPSBhcmdzWzJdO1xuICAgICAgICB2YXIgbmV3Q29udGVudCA9ICc8JyArIHRhZ05hbWUgKyAnIGNsYXNzPVwiemUtY29udGVudCAnICsgemVDbGFzcyArICdcIiBjb250ZW50ZWRpdGFibGU+JyArIGNvbnRlbnQgKyAnPC8nICsgdGFnTmFtZSArICc+JztcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAgICAgICBuZXdDb250ZW50ID0gJzxzY3JpcHQgY2xhc3M9XCJ6ZS1jb250ZW50XCIgdHlwZT1cImFwcGxpY2F0aW9uL3gtcHJldmVudC1zY3JpcHQtZXhlY3V0aW9uLW9ubG9hZFwiIHN0eWxlPVwiZGlzcGxheTogYmxvY2s7d2hpdGUtc3BhY2U6IHByZS13cmFwO1wiIGNvbnRlbnRlZGl0YWJsZSBvbmlucHV0PVwiY29tcGlsZVNjcmlwdCh0aGlzKVwiPicgKyBjb250ZW50ICsgJzwvc2NyaXB0Pic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICBuZXdDb250ZW50ID0gJzxidXR0b24gb25jbGljaz1cInNlbmRFdmVudFRvT3V0cHV0UG9ydCh0aGlzKVwiIGNsYXNzPVwiemUtY29udGVudFwiIGNvbnRlbnRlZGl0YWJsZT4nICsgY29udGVudCArICc8L2J1dHRvbj4nO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YWdOYW1lWzBdID09PSAnPCcpIHtcbiAgICAgICAgICAgIC8vIEFjdHVhbGx5IHRhZ05hbWUgY29udGFpbnMgYSBIVE1MIHN0cmluZy5cbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSB0YWdOYW1lO1xuICAgICAgICAgICAgYmxvY2tDbGFzcyA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzLCAyKTtcbiAgICAgICAgYXJnc1swXSA9IG5ld0NvbnRlbnQ7XG4gICAgfVxuICAgIHZhciBibG9jayA9IGVkaXRvci5jcmVhdGVCbG9ja0VsZW1lbnQuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgaWYgKGJsb2NrQ2xhc3MgIT09ICcnKSB7XG4gICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoYmxvY2tDbGFzcyk7XG4gICAgfVxufTtcblxuZWRpdG9yLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VycmVudDtcbiAgICB2YXIgcG9ydDtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgZWRpdG9yLmFkZEJsb2NrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0Jykge1xuICAgICAgICBjdXJyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgICAgIHBvcnQgPSBjdXJyZW50LmFkZFBvcnQoJzx6LXBvcnQgY2xhc3M9XCJpbnB1dFwiPjwvei1wb3J0PicpO1xuICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQocG9ydCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgY3VycmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgICAgICBwb3J0ID0gY3VycmVudC5hZGRQb3J0KCc8ei1wb3J0IGNsYXNzPVwib3V0cHV0XCI+PC96LXBvcnQ+Jyk7XG4gICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChwb3J0KTtcbiAgICB9XG59O1xuXG5lZGl0b3IucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxlY3RlZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3RlZCcpO1xuICAgIGlmIChzZWxlY3RlZCAhPT0gbnVsbCAmJiBzZWxlY3RlZC50YWdOYW1lID09PSAnWi1MSU5LJykge1xuICAgICAgICB2YXIgbGluayA9IHNlbGVjdGVkO1xuICAgICAgICBsaW5rLnVuY29ubmVjdCgpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrKDEpO1xuICAgICAgICBibG9jay51bnBsdWcoKTtcbiAgICAgICAgYmxvY2sucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChibG9jayk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0JyB8fCBlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgdmFyIHBvcnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0KDEpO1xuICAgICAgICBwb3J0LnVucGx1ZygpO1xuICAgICAgICBwb3J0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocG9ydCk7XG4gICAgfVxufTtcblxudmFyIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQgPSBmdW5jdGlvbiAoZWxlbWVudFRhZ05hbWUsIG9uT3JPZmYpIHtcbiAgICB2YXIgY2xhc3NOYW1lID0gJ2N1cnJlbnQnO1xuICAgIGlmIChvbk9yT2ZmID09PSAnb24nKSB7XG4gICAgICAgIGNsYXNzTmFtZSArPSAnLW9mZi1jb250ZXh0JztcbiAgICB9XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnRUYWdOYW1lICsgJy4nICsgY2xhc3NOYW1lKTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5wb3J0ID0gZnVuY3Rpb24gKGlucHV0T3JPdXRwdXQpIHtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgIT09ICdibG9jaycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrLmN1cnJlbnQgKiB6LXBvcnQuJyArIGlucHV0T3JPdXRwdXQsICdvbicpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdmFyIHBvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQgKiB6LXBvcnQuJyArIGlucHV0T3JPdXRwdXQpO1xuICAgICAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcG9ydC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jaycsICdvZmYnKTtcbiAgICBlZGl0b3IuY29udGV4dCA9IGlucHV0T3JPdXRwdXQ7XG59O1xuXG5lZGl0b3IuYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2snLCAnb24nKTtcbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LXBvcnQuaW5wdXQnLCAnb2ZmJyk7XG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otcG9ydC5vdXRwdXQnLCAnb2ZmJyk7XG4gICAgfSBjYXRjaChlKSB7fVxufTtcblxuZWRpdG9yLmZpcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgICAgICBpZiAoY29udGVudC50YWdOYW1lID09PSAnQlVUVE9OJykge1xuICAgICAgICAgICAgZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIGlmIChjb250ZW50LnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgICBlbmdpbmUuZmlyZUV2ZW50MihibG9jayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iuc2V0ID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0ID09PSAnY29udGVudCcpIHtcbiAgICAgICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgICAgICBibG9jay5jb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm1vdmUgPSBmdW5jdGlvbiAobGVmdCwgdG9wKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgY3VycmVudC5zdHlsZS50b3AgPSB0b3AgKyAncHgnO1xuICAgIGN1cnJlbnQuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICAgIGN1cnJlbnQucmVkcmF3KCk7XG59O1xuXG5lZGl0b3IubW92ZUJ5ID0gZnVuY3Rpb24gKGxlZnRPZmZzZXQsIHRvcE9mZnNldCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIHZhciB0b3AgPSBOdW1iZXIoY3VycmVudC5zdHlsZS50b3Auc2xpY2UoMCwgLTIpKSArIE51bWJlcih0b3BPZmZzZXQpO1xuICAgIHZhciBsZWZ0ID0gTnVtYmVyKGN1cnJlbnQuc3R5bGUubGVmdC5zbGljZSgwLCAtMikpICsgTnVtYmVyKGxlZnRPZmZzZXQpO1xuICAgIGVkaXRvci5tb3ZlKGxlZnQsIHRvcCk7XG59O1xuXG5lZGl0b3Iuc3RhcnRCbGlua2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGJsb2NrICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChibG9jay5jbGFzc0xpc3QuY29udGFpbnMoJ3N0b3AtYmxpbmtpbmcnKSkge1xuICAgICAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnc3RvcC1ibGlua2luZycpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLnN0b3BCbGlua2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKCFibG9jay5jbGFzc0xpc3QuY29udGFpbnMoJ3N0b3AtYmxpbmtpbmcnKSkge1xuICAgICAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdzdG9wLWJsaW5raW5nJyk7XG4gICAgfVxufTtcblxudmFyIGJsaW5rQ3Vyc29yID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3Vyc29yLWRpc3BsYXllZCcpO1xuICAgIH1cbiAgICB3aW5kb3cuc2V0VGltZW91dChibGlua0N1cnNvciwgMTAwMCk7XG59O1xuXG5lZGl0b3IuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBibGlua0N1cnNvcigpO1xufTtcblxuZWRpdG9yLmNsZWFyQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgXy5lYWNoKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIGJsb2NrLnVucGx1ZygpO1xuICAgICAgICBibG9jay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGJsb2NrKTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykuaW5uZXJIVE1MID0gJyc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRvcjtcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgd2luZG93ICovXG5cbi8qZ2xvYmFsIF8gKi9cblxuLypnbG9iYWwgZ2V0RWxlbWVudEJsb2NrICovXG5cbid1c2Ugc3RyaWN0JztcbnZhciBlbmdpbmUgPSB7fTtcblxuZW5naW5lLmNvbXBpbGVTY3JpcHQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciBzdHJpbmcgPSBlbGVtZW50LnRleHQ7XG4gICAgdmFyIHNjcmlwdDtcbiAgICB2YXIgY29tcGlsZWQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gSW4gY2FzZSBzY3JpcHQgaXMgYW4gZXhwcmVzc2lvbi5cbiAgICAgICAgdmFyIG1heWJlRXhwcmVzc2lvbiA9IHN0cmluZztcbiAgICAgICAgc2NyaXB0ID0gJ3JldHVybiAoJyArIG1heWJlRXhwcmVzc2lvbiArICcpOyc7XG4gICAgICAgIGNvbXBpbGVkID0gbmV3IEZ1bmN0aW9uKCdzZW5kVG9PdXRwdXQnLCAnZGVzdDEnLCAnaW4xJywgJ2luMicsICdpbjMnLCAnaW40JywgJ2luNScsIHNjcmlwdCk7XG4gICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICB9IGNhdGNoIChlMSkge1xuICAgICAgICAvLyBDb21waWxhdGlvbiBmYWlsZWQgdGhlbiBpdCBpc24ndCBhbiBleHByZXNzaW9uLiBUcnkgYXMgYVxuICAgICAgICAvLyBmdW5jdGlvbiBib2R5LlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2NyaXB0ID0gZWxlbWVudC50ZXh0O1xuICAgICAgICAgICAgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24oJ3NlbmRUb091dHB1dCcsICdkZXN0MScsICdpbjEnLCAnaW4yJywgJ2luMycsICdpbjQnLCAnaW41Jywgc2NyaXB0KTtcbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gTm90IGEgZnVuY3Rpb24gYm9keSwgc3RyaW5nIGlzIG5vdCB2YWxpZC5cbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZSkge1xuICAgIHZhciBibG9jayA9IGdldEVsZW1lbnRCbG9jayhlbGVtZW50KTtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5wb3J0cy5vdXRwdXRzO1xuICAgIGlmIChwb3J0cykge1xuICAgICAgICBpZiAocG9ydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgcG9ydCA9IHBvcnRzWzBdO1xuICAgICAgICAgICAgcG9ydC5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB2YWx1ZSBpcyBhbiBhcnJheSBvZiB2YWx1ZXMuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWU7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciB6ZVZhbHVlID0gdmFsdWVzW2luZGV4XTtcbiAgICAgICAgICAgICAgICBwb3J0LmxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgemVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgYmxvY2sgPSBnZXRFbGVtZW50QmxvY2soZWxlbWVudCk7XG4gICAgdmFyIHBvcnQgPSBibG9jay5wb3J0cy5vdXRwdXRzWzBdO1xuICAgIHZhciBjb250ZW50O1xuICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBsaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgIHZhciBsaW5rID0gbGlua3NbMF07XG4gICAgICAgIGlmIChsaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xufTtcblxuLy8gVE9ETyBjaGFuZ2UgbmFtZS5cbmVuZ2luZS5maXJlRXZlbnQyID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnaGFzLWV4ZWN1dGlvbi1lcnJvcicpKSB7XG4gICAgICAgIHRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCdoYXMtZXhlY3V0aW9uLWVycm9yJyk7XG4gICAgfVxuICAgIHZhciBjb250ZW50ID0gdGFyZ2V0LmNvbnRlbnQ7XG4gICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWU7XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgdmFyIGRhdGFQb3J0cyA9IHRhcmdldC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKTtcbiAgICAgICAgdmFyIGlucHV0cyA9IFtdO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwoZGF0YVBvcnRzLCBmdW5jdGlvbiAoZGF0YVBvcnQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhTGlua3MgPSBkYXRhUG9ydCA9PT0gbnVsbCA/IFtdIDogZGF0YVBvcnQubGlua3M7XG5cbiAgICAgICAgICAgIGlmIChkYXRhTGlua3MubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGFMaW5rID0gXy5maW5kKGRhdGFMaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSBsaW5rLmJlZ2luLnBvcnQuYmxvY2suY29udGVudC50YWdOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhZyAhPT0gJ0JVVFRPTic7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YUxpbms7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFMaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBkYXRhTGluay5iZWdpbi5wb3J0LmJsb2NrLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai52YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnU1BBTicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5pbm5lckhUTUw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jbGFzc0xpc3QuY29udGFpbnMoJ3plZC1udW1iZXInKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvYmoudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iai5leGVjdXRpb25SZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5wdXRzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbmV4dEFjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBhcmd1bWVudHNbMF0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZmlyc3REZXN0aW5hdGlvbkNvbnRlbnQgPSBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50KGNvbnRlbnQpO1xuXG4gICAgICAgIHZhciB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICBpZiAodGhlU2NyaXB0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBpbGVTY3JpcHQoY29udGVudCk7XG4gICAgICAgICAgICB0aGVTY3JpcHQgPSBjb250ZW50LmNvbXBpbGVkU2NyaXB0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGVTY3JpcHQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0Vycm9yIGluIHNjcmlwdC4gQWJvcnRpbmcuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBhcmdzLnB1c2gobmV4dEFjdGlvbik7XG4gICAgICAgIGFyZ3MucHVzaChmaXJzdERlc3RpbmF0aW9uQ29udGVudCk7XG4gICAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChpbnB1dHMpO1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhlU2NyaXB0LmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLWV4ZWN1dGlvbi1lcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBTdG9yZSByZXN1bHQgZm9yIGZ1dHVyZSB1c2UuXG4gICAgICAgICAgICBjb250ZW50LmV4ZWN1dGlvblJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdOVU1CRVInKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdESVYnIHx8IHRhZ05hbWUgPT09ICdTUEFOJykge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gY29udGVudC5pbm5lckhUTUw7XG4gICAgICAgIH1cbiAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ0lOUFVUJykge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGVudC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRhcmdldC5yZWRyYXcoKTtcbn07XG5cbmVuZ2luZS5maXJlRXZlbnQgPSBmdW5jdGlvbiAobGluaywgdmFsdWUpIHtcbiAgICB2YXIgdGFyZ2V0ID0gbGluay5lbmQucG9ydC5ibG9jaztcbiAgICBpZiAodGFyZ2V0LnBvcnRzLmlucHV0c1swXSA9PT0gbGluay5lbmQucG9ydCkge1xuICAgICAgICAvLyBPbmx5IGFjdHVhbGx5IGZpcmUgdGhlIGJsb2NrIG9uIGl0cyBmaXJzdCBpbnB1dCBwb3J0LlxuICAgICAgICBmaXJlRXZlbnQyKHRhcmdldCwgdmFsdWUpO1xuICAgIH1cbn07XG5cbmVuZ2luZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIHdpbmRvdy5jb21waWxlU2NyaXB0ID0gZW5naW5lLmNvbXBpbGVTY3JpcHQ7XG4gICAgd2luZG93LnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGVuZ2luZS5zZW5kRXZlbnRUb091dHB1dFBvcnQ7XG4gICAgd2luZG93LmZpcmVFdmVudDIgPSBlbmdpbmUuZmlyZUV2ZW50MjtcbiAgICB3aW5kb3cuZmlyZUV2ZW50ID0gZW5naW5lLmZpcmVFdmVudDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZW5naW5lO1xuIiwidmFyIGh0dHAgPSB7fTtcblxuaHR0cC5nZXQgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCk7XG5cbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVxdWVzdC5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QocmVxdWVzdC5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcignTmV0d29yayBlcnJvcicpKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaHR0cDtcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzZWxlY3RvciA9IHtcbiAgICBzZXRTZWxlY3RhYmxlOiBmdW5jdGlvbiAoZWxlbWVudCwgd2l0aFN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzO1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBzZWxlY3Rvci5hY3Rpb24oZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAod2l0aFN0b3BQcm9wYWdhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHdpdGhTdG9wUHJvcGFnYXRpb24gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGNvbm5lY3RhYmxlOiBmdW5jdGlvbiAoZWxlbWVudDEsIGVsZW1lbnQyKSB7XG4gICAgICAgIGlmIChlbGVtZW50MS5jb25uZWN0YWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDEuY29ubmVjdGFibGUoZWxlbWVudDEsIGVsZW1lbnQyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIGFjdGlvbjogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGFibGUodGhpcy5zZWxlY3RlZCwgZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNvbm5lY3QodGhpcy5zZWxlY3RlZCwgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5zZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3Rvcjtcbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbmdsb2JhbC5zZWxlY3RvciA9IHNlbGVjdG9yO1xuIiwiXG4vKmdsb2JhbCB3aW5kb3cgKi9cbi8qZ2xvYmFsIGRvY3VtZW50ICovXG5cbi8qZ2xvYmFsIF8gKi9cblxuLypnbG9iYWwgY29tbWFuZHMgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3InKTtcbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbnZhciBzdG9yYWdlID0ge307XG5cbmZ1bmN0aW9uIGV4cG9ydFBhdGNoICgpIHtcbiAgICB2aWV3LnN3aXRjaE1vZGUoJ2VkaXQnKTtcbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIHBhdGNoID0ge307XG4gICAgcGF0Y2guYmxvY2tzID0gW107XG4gICAgcGF0Y2gubGlua3MgPSBbXTtcbiAgICBfLmVhY2goZWxlbWVudHMsIGZ1bmN0aW9uIChlbGVtZW50LCBpbmRleCkge1xuICAgICAgICB2YXIgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQtY29udGFpbmVyJykuaW5uZXJIVE1MLnRyaW0oKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBlbGVtZW50LmNvbnRlbnQ7XG4gICAgICAgIHZhciB0YWdOYW1lID0gY29udGVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnY29tbWVudCcpKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gJ2NvbW1lbnQnO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YWx1ZSA9IGNvbnRlbnQudmFsdWUgfHwgY29udGVudC5pbm5lckhUTUwgfHwgJyc7XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnYnV0dG9uJykge1xuICAgICAgICAgICAgdmFsdWUgPSBjb250ZW50LmlubmVySFRNTDtcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXJJbm5lckhUTUwgPSAnJztcbiAgICAgICAgfSBlbHNlIGlmICh0YWdOYW1lID09PSAnc2NyaXB0Jykge1xuICAgICAgICAgICAgLy8gVGhlIG5ld2xpbmVzIGFyZSBsb3N0IHdoZW4gdXNpbmcgcmF3IGlubmVySFRNTCBmb3Igc2NyaXB0IHRhZ3NcbiAgICAgICAgICAgIC8vIChhdCBsZWFzdCBvbiBmaXJlZm94KS4gU28gd2UgcGFyc2UgZWFjaCBjaGlsZCB0byBhZGQgYSBuZXdsaW5lXG4gICAgICAgICAgICAvLyB3aGVuIEJSIGFyZSBlbmNvdW50ZXJlZC5cbiAgICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwoY29udGVudC5jaGlsZE5vZGVzLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT09ICdCUicpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gbm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXJJbm5lckhUTUwgPSAnJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5wdXRQb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0Jyk7XG4gICAgICAgIHZhciBvdXRwdXRQb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpO1xuICAgICAgICBwYXRjaC5ibG9ja3MucHVzaCh7XG4gICAgICAgICAgICBpZDogaW5kZXgsXG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgICAgICAgICAgbklucHV0czogaW5wdXRQb3J0cy5sZW5ndGgsXG4gICAgICAgICAgICBuT3V0cHV0czogb3V0cHV0UG9ydHMubGVuZ3RoLFxuICAgICAgICAgICAgdG9wOiBlbGVtZW50LnN0eWxlLnRvcCxcbiAgICAgICAgICAgIGxlZnQ6IGVsZW1lbnQuc3R5bGUubGVmdCxcbiAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgaW5uZXJIVE1MOiBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcGhhbnRvbSA9IGNvbnRlbnQucGhhbnRvbWVkQnk7XG4gICAgICAgIGlmIChwaGFudG9tICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBoYW50b20uc2V0QXR0cmlidXRlKCdkYXRhLWluZGV4LXRvLXBoYW50b20nLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKGlucHV0UG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBwb3J0SW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBpbkxpbmtzID0gcG9ydC5saW5rcztcbiAgICAgICAgICAgIF8uZWFjaChpbkxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclBvcnQgPSBsaW5rLmJlZ2luLnBvcnQ7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2sgPSBvdGhlclBvcnQuYmxvY2s7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tJbmRleCA9IF8uaW5kZXhPZihlbGVtZW50cywgb3RoZXJCbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tQb3J0cyA9IG90aGVyQmxvY2sucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrUG9ydEluZGV4ID0gXy5pbmRleE9mKG90aGVyQmxvY2tQb3J0cywgb3RoZXJQb3J0KTtcbiAgICAgICAgICAgICAgICBwYXRjaC5saW5rcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrOiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHBvcnRJbmRleFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrOiBvdGhlckJsb2NrSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBvdGhlckJsb2NrUG9ydEluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBwYXRjaC5wcmVzZW50YXRpb24gPSB7fTtcbiAgICBwYXRjaC5wcmVzZW50YXRpb24uaW5uZXJIVE1MID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLmlubmVySFRNTDtcbiAgICB2YXIgcGhhbnRvbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbiAgICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgICAgIC8vIEZJWE1FIGRhdGEtaW5kZXgtdG8tcGhhbnRvbSBpbnN0ZWFkP1xuICAgICAgICBwaGFudG9tLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1waGFudG9tZWQtYmxvY2staWQnKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcGF0Y2g7XG59O1xuXG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG52YXIgY29ubmVjdEJsb2NrcyA9IGZ1bmN0aW9uKGVuZCwgc3RhcnQsIGlucHV0UG9ydFBvc2l0aW9uLCBvdXRwdXRQb3J0UG9zaXRpb24pIHtcbiAgICB2YXIgc3RhcnRQb3J0ID0gKHN0YXJ0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKSlbb3V0cHV0UG9ydFBvc2l0aW9uXTtcbiAgICB2YXIgZW5kUG9ydCA9IChlbmQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0JykpW2lucHV0UG9ydFBvc2l0aW9uXTtcbiAgICBpZiAoc3RhcnRQb3J0LmNvbm5lY3RhYmxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVE9ETyBjb25uZWN0YWJsZSB0YWtlcyBzb21lIHRpbWUgdG8gYmUgZGVmaW5lZC4gV2FpdCBmb3IgaXQuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3RCbG9ja3MsIDEsIGVuZCwgc3RhcnQsIGlucHV0UG9ydFBvc2l0aW9uLCBvdXRwdXRQb3J0UG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAoc3RhcnRQb3J0LmNvbm5lY3RhYmxlKHN0YXJ0UG9ydCwgZW5kUG9ydCkpIHtcbiAgICAgICAgc3RhcnRQb3J0LmNvbm5lY3Qoc3RhcnRQb3J0LCBlbmRQb3J0KTtcbiAgICB9XG59O1xuXG4vLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG52YXIgY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jayA9IGZ1bmN0aW9uIChibG9jaywgcGhhbnRvbSkge1xuICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICBpZiAoY29udGVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEZJWCBNRSB3YWl0IHRoYXQgY29udGVudCBhY3R1YWxseSBleGlzdHMuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2ssIDEsIGJsb2NrLCBwaGFudG9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3LmNyZWF0ZVBoYW50b21MaW5rKGNvbnRlbnQsIHBoYW50b20pO1xuICAgIH1cbn07XG5cbnZhciBpbXBvcnRQYXRjaCA9IGZ1bmN0aW9uIChwYXRjaCkge1xuICAgIHZhciBlbGVtZW50cyA9IFtdO1xuICAgIF8uZWFjaChwYXRjaC5ibG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBibG9jay5uSW5wdXRzID0gYmxvY2subklucHV0cyB8fCAwO1xuICAgICAgICBibG9jay5uT3V0cHV0cyA9IGJsb2NrLm5PdXRwdXRzIHx8IDA7XG4gICAgICAgIGlmIChibG9jay50YWdOYW1lID09PSAnc2NyaXB0JyB8fMKgYmxvY2sudGFnTmFtZSA9PT0gJ2J1dHRvbicgfHwgYmxvY2sudGFnTmFtZSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQmxvY2soJ2h0bWwnLCBibG9jay50YWdOYW1lLCBibG9jay52YWx1ZSwgYmxvY2subklucHV0cywgYmxvY2subk91dHB1dHMsIGJsb2NrLnRvcCwgYmxvY2subGVmdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQmxvY2soJ2h0bWwnLCBibG9jay5pbm5lckhUTUwsICcnLCBibG9jay5uSW5wdXRzLCBibG9jay5uT3V0cHV0cywgYmxvY2sudG9wLCBibG9jay5sZWZ0KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCcpO1xuICAgICAgICBlbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgIH0pO1xuICAgIF8uZWFjaChwYXRjaC5saW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IGVsZW1lbnRzW2xpbmsub3V0cHV0LmJsb2NrXTtcbiAgICAgICAgdmFyIGlucHV0ID0gZWxlbWVudHNbbGluay5pbnB1dC5ibG9ja107XG4gICAgICAgIGNvbm5lY3RCbG9ja3MoaW5wdXQsIG91dHB1dCwgbGluay5pbnB1dC5wb3J0LCBsaW5rLm91dHB1dC5wb3J0KTtcbiAgICB9KTtcbiAgICB2YXIgcHJlc2VudGF0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpO1xuICAgIHByZXNlbnRhdGlvbi5pbm5lckhUTUwgPSBwYXRjaC5wcmVzZW50YXRpb24uaW5uZXJIVE1MO1xuICAgIHZhciBwaGFudG9tcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xuICAgIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcGhhbnRvbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgtdG8tcGhhbnRvbScpO1xuICAgICAgICB2YXIgYmxvY2sgPSBlbGVtZW50c1tpbmRleF07XG4gICAgICAgIGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2soYmxvY2ssIHBoYW50b20pO1xuICAgIH0pO1xufTtcblxuc3RvcmFnZS5zYXZlUGF0Y2ggPSBmdW5jdGlvbiAod2hlcmUsIG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE9ubHkgb25lIGFyZ3VtZW50IG1lYW5zIGl0IGlzIGFjdHVhbGx5IHRoZSBuYW1lIGFuZCB3ZSBsb2FkIGZyb21cbiAgICAgICAgLy8gbG9jYWxzdG9yYWdlLlxuICAgICAgICBuYW1lID0gd2hlcmU7XG4gICAgICAgIHdoZXJlID0gJ2xvY2FsJztcbiAgICB9XG4gICAgdmFyIHBhdGNoID0gZXhwb3J0UGF0Y2goKTtcbiAgICBpZiAod2hlcmUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICAgICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgICAgIHBhdGNoZXNbbmFtZV0gPSBwYXRjaDtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwYXRjaGVzJywgSlNPTi5zdHJpbmdpZnkocGF0Y2hlcykpO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdmaWxlJykge1xuICAgICAgICB2YXIgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhdGNoLCBudWxsLCAnICAgICcpO1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtjb250ZW50XSwgeyB0eXBlIDogXCJ0ZXh0L3BsYWluXCIsIGVuZGluZ3M6IFwidHJhbnNwYXJlbnRcIn0pO1xuICAgICAgICB3aW5kb3cuc2F2ZUFzKGJsb2IsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKCdiYWQgc2F2ZSBsb2NhdGlvbiAoXCInICsgd2hlcmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiKSwgbXVzdCBiZSBcImxvY2FsXCIgb3IgXCJmaWxlXCInKTtcbiAgICB9XG59O1xuXG5zdG9yYWdlLmxvYWRQYXRjaCA9IGZ1bmN0aW9uICh3aGVyZSwgd2hhdCkge1xuICAgIGlmICh3aGF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgd2hhdCA9IHdoZXJlO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdoYXQpID09PSAnW29iamVjdCBGaWxlXScpIHtcbiAgICAgICAgICAgIHdoZXJlID0gJ2ZpbGUgb2JqZWN0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoZXJlID0gJ2xvY2FsJztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgcHJvbWlzZTtcbiAgICBpZiAod2hlcmUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICAgICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgICAgIHZhciBwYXRjaCA9IHBhdGNoZXNbd2hhdF07XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAocGF0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGF0Y2gpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoJ05vIHBhdGNoIHdpdGggbmFtZSBcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hhdCArICdcIiBpbiBsb2NhbCBzdG9yYWdlLicpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2h0dHAnKSB7XG4gICAgICAgIHZhciB1cmwgPSB3aGF0O1xuICAgICAgICBwcm9taXNlID0gaHR0cC5nZXQodXJsKTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnZmlsZSBvYmplY3QnKSB7XG4gICAgICAgIHZhciBmaWxlID0gd2hhdDtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgIGZpbGVSZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGV2ZW50LnRhcmdldC5yZXN1bHQpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmaWxlUmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ2JhZCBsb2FkIGxvY2F0aW9uIChcIicgKyB3aGVyZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIpLCBtdXN0IGJlIFwibG9jYWxcIiBvciBcImh0dHBcIicpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICAgIGVkaXRvci5jbGVhckFsbCgpO1xuICAgICAgICBpbXBvcnRQYXRjaChwYXRjaCk7XG4gICAgfSk7XG59O1xuXG5zdG9yYWdlLnJlbW92ZVBhdGNoID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgIHZhciB0cmFzaCA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0cmFzaCcpKTtcbiAgICB0cmFzaCA9IHRyYXNoIHx8IHt9O1xuICAgIHZhciBwYXRjaCA9IHBhdGNoZXNbbmFtZV07XG4gICAgaWYgKHBhdGNoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgJ05vIHBhdGNoIHdpdGggbmFtZSBcIicgKyBuYW1lICsgJ1wiIGluIGxvY2FsIHN0b3JhZ2UuJztcbiAgICB9XG4gICAgdHJhc2hbbmFtZV0gPSBwYXRjaDtcbiAgICBkZWxldGUgcGF0Y2hlc1tuYW1lXTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3BhdGNoZXMnLCBKU09OLnN0cmluZ2lmeShwYXRjaGVzKSk7XG4gICAgZWRpdG9yLmNsZWFyQWxsKCk7XG59O1xuXG5zdG9yYWdlLmdldFBhdGNoTmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICByZXR1cm4gXy5rZXlzKHBhdGNoZXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdG9yYWdlO1xuIiwiLy8gVXNlIG9mIHRlcm1saWIuanMgZm9yIHRoZSB0ZXJtaW5hbCBmcmFtZS5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbi8vIGdsb2JhbHMgZnJvbSB0ZXJtbGliLmpzXG4vKmdsb2JhbCBUZXJtR2xvYmFscyAqL1xuLypnbG9iYWwgdGVybUtleSAqL1xuLypnbG9iYWwgUGFyc2VyICovXG4vKmdsb2JhbCBUZXJtaW5hbCAqL1xuXG52YXIgdGVybWluYWwgPSB7fTtcblxudGVybWluYWwuY3JlYXRlID0gZnVuY3Rpb24gKGNvbW1hbmRzLCBvbmJsdXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgdGVybURpdklkID0gJ2NvbW1hbmQtbGluZS1mcmFtZSc7XG5cbiAgICB2YXIgZ2V0VGVybURpdiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgdGVybURpdklkKTtcbiAgICB9O1xuXG4gICAgdmFyIGJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFRlcm1HbG9iYWxzLmtleWxvY2sgPSB0cnVlO1xuICAgICAgICBUZXJtR2xvYmFscy5hY3RpdmVUZXJtLmN1cnNvck9mZigpO1xuICAgICAgICB2YXIgdGVybURpdiA9IGdldFRlcm1EaXYoKTtcbiAgICAgICAgdGVybURpdi5jbGFzc0xpc3QudG9nZ2xlKCdmb2N1c2VkJyk7XG4gICAgICAgIG9uYmx1cigpO1xuICAgIH07XG5cbiAgICB2YXIgY3RybEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0Q2hhciA9PT0gdGVybUtleS5FU0MpIHtcbiAgICAgICAgICAgIGJsdXIoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgdGVybUhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhhdC5uZXdMaW5lKCk7XG4gICAgICAgIHZhciBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG4gICAgICAgIHBhcnNlci5wYXJzZUxpbmUodGhhdCk7XG4gICAgICAgIHZhciBjb21tYW5kTmFtZSA9IHRoYXQuYXJndlswXTtcbiAgICAgICAgaWYgKGNvbW1hbmRzLmhhc093blByb3BlcnR5KGNvbW1hbmROYW1lKSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGF0LmFyZ3Yuc2xpY2UoMSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBjb21tYW5kc1tjb21tYW5kTmFtZV0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudGhlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoJ0Vycm9yOiAnICsgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC53cml0ZSgndW5rbm93biBjb21tYW5kIFwiJyArIGNvbW1hbmROYW1lICsgJ1wiLicpO1xuICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaW5pdEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfTtcblxuICAgIC8vIFRoZSB0ZXJtbGliLmpzIG9iamVjdFxuICAgIHZhciB0ZXJtID0gbmV3IFRlcm1pbmFsKCB7XG4gICAgICAgIHRlcm1EaXY6IHRlcm1EaXZJZCxcbiAgICAgICAgaGFuZGxlcjogdGVybUhhbmRsZXIsXG4gICAgICAgIGJnQ29sb3I6ICcjZjBmMGYwJyxcbiAgICAgICAgY3JzckJsaW5rTW9kZTogdHJ1ZSxcbiAgICAgICAgY3JzckJsb2NrTW9kZTogZmFsc2UsXG4gICAgICAgIHJvd3M6IDEwLFxuICAgICAgICBmcmFtZVdpZHRoOiAwLFxuICAgICAgICBjbG9zZU9uRVNDOiBmYWxzZSxcbiAgICAgICAgY3RybEhhbmRsZXI6IGN0cmxIYW5kbGVyLFxuICAgICAgICBpbml0SGFuZGxlcjogaW5pdEhhbmRsZXJcblxuICAgIH0gKTtcbiAgICB0ZXJtLm9wZW4oKTtcblxuICAgIHZhciBmb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFRlcm1HbG9iYWxzLmtleWxvY2sgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgVGVybUdsb2JhbHMua2V5bG9jayA9IGZhbHNlO1xuICAgICAgICBUZXJtR2xvYmFscy5hY3RpdmVUZXJtLmN1cnNvck9uKCk7XG4gICAgICAgIHZhciB0ZXJtRGl2ID0gZ2V0VGVybURpdigpO1xuICAgICAgICB0ZXJtRGl2LmNsYXNzTGlzdC50b2dnbGUoJ2ZvY3VzZWQnKTtcbiAgICB9O1xuXG4gICAgYmx1cigpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZm9jdXM6IGZvY3VzLFxuICAgICAgICB0ZXJtOiB0ZXJtXG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdGVybWluYWw7XG4iLCIvLyBTeW50YWN0aWMgc3VnYXIgYW5kIHNpbXBsZSB1dGlsaXRpZXMuXG5cbi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cblxuLypnbG9iYWwgXyAqL1xuXG52YXIgdXRpbHMgPSB7fTtcblxudmFyIGRvbTtcbmRvbSA9IHtcbiAgICAvLyBDcmVhdGUgYSBkb20gZnJhZ21lbnQgZnJvbSBhIEhUTUwgc3RyaW5nLlxuICAgIGNyZWF0ZUZyYWdtZW50OiBmdW5jdGlvbihodG1sU3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgaWYgKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBkaXYgPSBmcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XG4gICAgICAgICAgICBkaXYuaW5uZXJIVE1MID0gaHRtbFN0cmluZztcbiAgICAgICAgICAgIHZhciBjaGlsZDtcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICAgICAgICAgIHdoaWxlIChjaGlsZCA9IGRpdi5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgLyplc2xpbnQtZW5hYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgICAgICAgICAgICAgZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBkaXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhZ21lbnQucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfSxcblxuICAgIC8vIE1vdmUgRE9NIG5vZGVzIGZyb20gYSBzb3VyY2UgdG8gYSB0YXJnZXQuIFRoZSBub2RlcyBhcmVzIHNlbGVjdGVkXG4gICAgLy8gYmFzZWQgb24gYSBzZWxlY3RvciBhbmQgdGhlIHBsYWNlIHRoZXkgYXJlIGluc3RlcnRlZCBpcyBhIGdpdmVuIHRhZ1xuICAgIC8vIHdpdGggYSBcInNlbGVjdFwiIGF0dHJpYnV0ZSB3aGljaCBjb250YWlucyB0aGUgZ2l2ZW4gc2VsZWN0b3IuIElmXG4gICAgLy8gICAgc291cmNlIGlzICdhYWEgPHNwYW4gY2xhc3M9XCJzb21ldGhpbmdcIj56eno8L3NwYW4+J1xuICAgIC8vIGFuZFxuICAgIC8vICAgIHRhcmdldCBpcyAncnJyIDxjb250ZW50IHNlbGVjdD1cIi5zb21ldGhpbmdcIj48L2NvbnRlbnQ+IHR0dCdcbiAgICAvLyBBZnRlciBtb3ZlQ29udGVudEJhc2VkT25TZWxlY3Rvcihzb3VyY2UsIHRhcmdldCwgJy5zb21ldGhpbmcnKTpcbiAgICAvLyAgICBzb3VyY2UgaXMgJ2FhYSdcbiAgICAvLyBhbmRcbiAgICAvLyAgICB0YXJnZXQgaXMgJ3JyciA8c3BhbiBjbGFzcz1cInNvbWV0aGluZ1wiPnp6ejwvc3Bhbj4gdHR0J1xuICAgIG1vdmVDb250ZW50QmFzZWRPblNlbGVjdG9yOiBmdW5jdGlvbihzb3VyY2UsIHRhcmdldCwgc2VsZWN0b3IsIHRhcmdldFRhZykge1xuICAgICAgICB2YXIgY29udGVudDtcbiAgICAgICAgdmFyIGVsZW1lbnRzO1xuICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0VGFnKTtcbiAgICAgICAgICAgIGVsZW1lbnRzID0gc291cmNlLmNoaWxkTm9kZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0VGFnICsgJ1tzZWxlY3Q9XCInICsgc2VsZWN0b3IgKyAnXCJdJyk7XG4gICAgICAgICAgICBlbGVtZW50cyA9IHNvdXJjZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXYXJuaW5nOiBpdCBpcyBpbXBvcnRhbnQgdG8gbG9vcCBlbGVtZW50cyBiYWNrd2FyZCBzaW5jZSBjdXJyZW50XG4gICAgICAgIC8vIGVsZW1lbnQgaXMgcmVtb3ZlZCBhdCBlYWNoIHN0ZXAuXG4gICAgICAgIGZvciAodmFyIGkgPSBlbGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIC8vIFRPRE8uIExlIFwiaW5zZXJ0XCIgY2ktZGVzc291cyBzdXIgbGVzIHotcG9ydCBmYWl0IHF1ZSBsZVxuICAgICAgICAgICAgLy8gZGV0YWNoZWRDYWxsYmFjayBlc3QgYXBwZWzDqSBhdmVjIGwnaW1wbGVtZW50YXRpb24gZGUgY3VzdG9tXG4gICAgICAgICAgICAvLyBlbG1lbnRzIHBhciB3ZWJyZWZsZWN0aW9ucyBtYWlzIHBhcyBwYXIgbCdpbXBsw6ltZW50YXRpb24gZGVcbiAgICAgICAgICAgIC8vIFBvbHltZXIgKGVuIHV0aWxpc2FudCBsZSBwb2x5ZmlsbCBkZSBCb3NvbmljKSBuaSBhdmVjXG4gICAgICAgICAgICAvLyBsJ2ltcGzDqW1lbnRhdGlvbiBuYXRpdmUgZGUgY2hyb21lLlxuICAgICAgICAgICAgY29udGVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5uZXh0U2libGluZ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIFRPRE8gbW92ZSB0aGlzIGVsc2V3aGVyZS5cbiAgICAgICAgICAgIGlmIChlbGVtZW50Lm9uY2xpY2sgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBnbG9iYWwgdG8gYWNjZXNzIHRoaXMgZnVuY3Rpb24gYmVjYXVzZSB1c2luZyByZXF1aXJlXG4gICAgICAgICAgICAgICAgICAgIC8vIG9uIGNvbW1hbmRzIGhhcyBhIGN5Y2xpYyBkZXBlbmRlbmN5LlxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuYXBwLmNvbW1hbmRzLmVkaXRCbG9jayhzb3VyY2UpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNvbnRlbnQpO1xuICAgIH0sXG5cbiAgICBtb3ZlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBkb20ubW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5mcm9tLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMudG8sXG4gICAgICAgICAgICAgICAgb3B0aW9ucy53aXRoU2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vblRhZ1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvLyBHZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50IHJlbGF0aXZlIHRvIGFub3RoZXIgb25lIChkZWZhdWx0IGlzXG4gICAgLy8gZG9jdW1lbnQgYm9keSkuXG4gICAgZ2V0UG9zaXRpb246IGZ1bmN0aW9uIChlbGVtZW50LCByZWxhdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZWxhdGl2ZUVsZW1lbnQgPSByZWxhdGl2ZUVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keTtcbiAgICAgICAgdmFyIHJlbGF0aXZlUmVjdCA9IHJlbGF0aXZlRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHJlY3QubGVmdCAtIHJlbGF0aXZlUmVjdC5sZWZ0LFxuICAgICAgICAgICAgeTogcmVjdC50b3AgLSByZWxhdGl2ZVJlY3QudG9wXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGdldFNlbGVjdGlvblN0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCkuYW5jaG9yTm9kZTtcbiAgICAgICAgcmV0dXJuICggKG5vZGUgIT09IG51bGwgJiYgbm9kZS5ub2RlVHlwZSA9PT0gMykgPyBub2RlLnBhcmVudE5vZGUgOiBub2RlICk7XG4gICAgfVxuXG59O1xudXRpbHMuZG9tID0gZG9tO1xuXG4vLyBVc2VmdWxsIGZvciBtdWx0aWxpbmUgc3RyaW5nIGRlZmluaXRpb24gd2l0aG91dCAnXFwnIG9yIG11bHRpbGluZVxuLy8gY29uY2F0ZW5hdGlvbiB3aXRoICcrJy5cbnV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbiA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuYy50b1N0cmluZygpLm1hdGNoKC9bXl0qXFwvXFwqKFteXSopXFwqXFwvXFxzKlxcfSQvKVsxXTtcbn07XG5cbnV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gUmV0dXJucyBhIGtleXMgZ2VuZXJhdG9yIGZvciBhIHNlcXVlbmNlIHRoYXQgaXMgYnVpbGQgbGlrZSB0aGF0OlxuICAgIC8vICAgYiwgYywgZC4uLlxuICAgIC8vICAgYWIsIGFjLCBhZC4uLlxuICAgIC8vICAgYWFiLCBhYWMsIGFhZC4uLlxuICAgIC8vIFRoZSBpZGVhIGlzIHRvIGhhdmUgYSBzZXF1ZW5jZSB3aGVyZSBlYWNoIHZhbHVlIGlzIG5vdCB0aGUgYmVnaW5uaW5nXG4gICAgLy8gb2YgYW55IG90aGVyIHZhbHVlIChzbyBzaW5nbGUgJ2EnIGNhbid0IGJlIHBhcnQgb2YgdGhlIHNlcXVlbmNlKS5cbiAgICAvL1xuICAgIC8vIE9uZSBnb2FsIGlzIHRvIGhhdmUgc2hvcnRlc3QgcG9zc2libGUga2V5cy4gU28gbWF5YmUgd2Ugc2hvdWxkIHVzZVxuICAgIC8vIGFkZGl0aW9ubmFsIHByZWZpeCBjaGFycyBhbG9uZyB3aXRoICdhJy4gQW5kIGJlY2F1c2UgaXQgd2lsbCBiZSB1c2VkXG4gICAgLy8gZm9yIHNob3J0Y3V0cywgbWF5YmUgd2UgY2FuIGNob29zZSBjaGFycyBiYXNlZCBvbiB0aGVpciBwb3NpdGlvbiBvblxuICAgIC8vIHRoZSBrZXlib2FyZC5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBjaGFyQ29kZXMgPSBfLnJhbmdlKCdiJy5jaGFyQ29kZUF0KDApLCAneicuY2hhckNvZGVBdCgwKSArIDEpO1xuICAgIHZhciBpZFN0cmluZ3MgPSBfLm1hcChjaGFyQ29kZXMsIGZ1bmN0aW9uIChjaGFyQ29kZSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZSk7XG4gICAgfSk7XG4gICAgdmFyIGdlbmVyYXRvciA9IHt9O1xuICAgIGdlbmVyYXRvci5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIga2V5ID0gJyc7XG4gICAgICAgIHZhciBpID0gaW5kZXg7XG4gICAgICAgIGlmIChpID49IGNoYXJDb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciByID0gTWF0aC5mbG9vcihpIC8gY2hhckNvZGVzLmxlbmd0aCk7XG4gICAgICAgICAgICBpID0gaSAlIGNoYXJDb2Rlcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAociA+IDApIHtcbiAgICAgICAgICAgICAgICBrZXkgKz0gJ2EnO1xuICAgICAgICAgICAgICAgIHItLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBrZXkgKz0gaWRTdHJpbmdzW2ldO1xuICAgICAgICBpbmRleCsrO1xuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH07XG5cbiAgICByZXR1cm4gZ2VuZXJhdG9yO1xufTtcblxud2luZG93LnV0aWxzID0gdXRpbHM7XG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCB3aW5kb3cgKi9cbi8qZ2xvYmFsIGRvY3VtZW50ICovXG5cbi8qZ2xvYmFsIF8gKi9cbi8qZ2xvYmFsIE1vdXNldHJhcCAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMnKTtcblxudmFyIHZpZXcgPSB7fTtcblxudmFyIGlzRGVzY2VuZGFudCA9IGZ1bmN0aW9uIChjaGlsZCwgcGFyZW50KSB7XG4gICAgIHZhciBub2RlID0gY2hpbGQucGFyZW50Tm9kZTtcbiAgICAgd2hpbGUgKG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgIGlmIChub2RlID09PSBwYXJlbnQpIHtcbiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgIH1cbiAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgIH1cbiAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGdldFByZXNlbnRhdGlvbkVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJyk7XG59O1xuXG52YXIgY3JlYXRlUGhhbnRvbUxpbmsgPSBmdW5jdGlvbiAocGhhbnRvbWVkLCBwaGFudG9tKSB7XG4gICAgcGhhbnRvbS5waGFudG9tT2YgPSBwaGFudG9tZWQ7XG4gICAgcGhhbnRvbS5jbGFzc0xpc3QuYWRkKCdwaGFudG9tJyk7XG4gICAgcGhhbnRvbWVkLnBoYW50b21lZEJ5ID0gcGhhbnRvbTtcbiAgICBwaGFudG9tZWQuY2xhc3NMaXN0LmFkZCgncGhhbnRvbWVkJyk7XG59O1xudmlldy5jcmVhdGVQaGFudG9tTGluayA9IGNyZWF0ZVBoYW50b21MaW5rO1xuXG52YXIgY3JlYXRlUGhhbnRvbSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciBwaGFudG9tID0gZWxlbWVudC5jbG9uZU5vZGUodHJ1ZSk7XG4gIHBoYW50b20uZGlzYWJsZWQgPSB0cnVlO1xuICBwaGFudG9tLnNldEF0dHJpYnV0ZSgnY29udGVudEVkaXRhYmxlJywgZmFsc2UpO1xuICAvLyBMaW5rIHRoZSB0d28gZm9yIGxhdGVyIHVzZSAoaW4gcGFydGljdWxhcnkgd2hlbiB3ZSB3aWxsIHN3aXRjaFxuICAvLyBkaXNwbGF5IG1vZGUpLlxuICBjcmVhdGVQaGFudG9tTGluayhlbGVtZW50LCBwaGFudG9tKTtcblxuICByZXR1cm4gcGhhbnRvbTtcbn07XG5cbnZhciBpc0N1cnJlbnRTZWxlY3Rpb25JblByZXNlbnRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHRoZSBzZWxlY3Rpb24gcmFuZ2UgKG9yIGN1cnNvciBwb3NpdGlvbilcbiAgdmFyIHJhbmdlID0gd2luZG93LmdldFNlbGVjdGlvbigpLmdldFJhbmdlQXQoMCk7XG4gIHZhciB6ZVByZXNlbnRhdGlvbiA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgLy8gQmUgc3VyZSB0aGUgc2VsZWN0aW9uIGlzIGluIHRoZSBwcmVzZW50YXRpb24uXG4gIHJldHVybiBpc0Rlc2NlbmRhbnQocmFuZ2Uuc3RhcnRDb250YWluZXIsIHplUHJlc2VudGF0aW9uKTtcbn07XG5cbnZhciBpbnNlcnRJblBsYWNlT2ZTZWxlY3Rpb24gPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAvLyBHZXQgdGhlIHNlbGVjdGlvbiByYW5nZSAob3IgY3Vyc29yIHBvc2l0aW9uKVxuICB2YXIgcmFuZ2UgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCkuZ2V0UmFuZ2VBdCgwKTtcbiAgLy8gRGVsZXRlIHdoYXRldmVyIGlzIG9uIHRoZSByYW5nZVxuICByYW5nZS5kZWxldGVDb250ZW50cygpO1xuICByYW5nZS5pbnNlcnROb2RlKGVsZW1lbnQpO1xufTtcblxuLy8gSW5zZXJ0IGEgc2VsZWN0ZWQgYmxvY2sgaW4gdGhlIERPTSBzZWxlY3Rpb24gaW4gcHJlc2VudGF0aW9uIHdpbmRvdy5cbnZhciBpbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGJsb2NrID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50Jyk7XG4gIGlmIChibG9jayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gTm90aGluZyBpcyBzZWxlY3RlZC5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZihpc0N1cnJlbnRTZWxlY3Rpb25JblByZXNlbnRhdGlvbigpKSB7XG4gICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgIHZhciBwaGFudG9tID0gY3JlYXRlUGhhbnRvbShjb250ZW50KTtcbiAgICBpbnNlcnRJblBsYWNlT2ZTZWxlY3Rpb24ocGhhbnRvbSk7XG5cbiAgICAvLyBUT0RPIGV2ZW50dWFsbHkgc3dpdGNoIHRoZSB0d28gaWYgd2UgYXJlIGluIHByZXNlbnRhdGlvbiBtb2RlLlxuICB9XG59O1xudmlldy5pbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbiA9IGluc2VydEJsb2NrQ29udGVudEluU2VsZWN0aW9uO1xuXG52YXIgZ2V0UGhhbnRvbXMgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICByZXR1cm4gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xufTtcblxudmFyIGdldFdpbmRvd0Zvck1vZGUgPSBmdW5jdGlvbiAobW9kZSkge1xuICB2YXIgaWQgPSBtb2RlO1xuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xufTtcblxudmFyIHN3YXBFbGVtZW50cyA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gICAgLy8gY3JlYXRlIG1hcmtlciBlbGVtZW50IGFuZCBpbnNlcnQgaXQgd2hlcmUgb2JqMSBpc1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb2JqMS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0ZW1wLCBvYmoxKTtcblxuICAgIC8vIG1vdmUgb2JqMSB0byByaWdodCBiZWZvcmUgb2JqMlxuICAgIG9iajIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUob2JqMSwgb2JqMik7XG5cbiAgICAvLyBtb3ZlIG9iajIgdG8gcmlnaHQgYmVmb3JlIHdoZXJlIG9iajEgdXNlZCB0byBiZVxuICAgIHRlbXAucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUob2JqMiwgdGVtcCk7XG5cbiAgICAvLyByZW1vdmUgdGVtcG9yYXJ5IG1hcmtlciBub2RlXG4gICAgdGVtcC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRlbXApO1xufTtcblxudmFyIGN1cnJlbnRNb2RlID0gJyc7XG5cbi8vIERvIGFsbCB0aGUgc3R1ZmYgbmVlZGVkIHRvIHN3aXRjaCBtb2RlIGJldHdlZW4gJ2VkaXQnIGFuZCAncHJlc2VudGF0aW9uJy5cbi8vIE1haW5seSBzd2FwICdwaGFudG9tJyBhbmQgJ3BoYW50b21lZCcgb2JqZWN0cyBwYWlycy5cbnZhciBzd2l0Y2hNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcbiAgICBpZiAobW9kZSA9PT0gY3VycmVudE1vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjdXJyZW50TW9kZSA9IG1vZGU7XG4gIC8vIEJ5IGNvbnZlbnRpb24sIHRoZSAncGhhbnRvbScgZWxlbWVudHMgYWN0dWFsbHkgYXJlIGluIHRoZSB3aW5kb3dcbiAgLy8gYXNzb2NpYXRlZCB0byB0aGUgbW9kZSB3ZSB3YW50IHRvIHN3aXRjaCB0by4gVGhlIHBoYW50b21lZCBvbmUgYXJlIGluIHRoZVxuICAvLyB3aW5kb3cgb2YgdGhlIG90aGVyIG1vZGUuXG5cbiAgdmFyIHBoYW50b21zID0gZ2V0UGhhbnRvbXMoZ2V0V2luZG93Rm9yTW9kZShtb2RlKSk7XG4gIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAvLyBXaGF0IHRoaXMgb2JqZWN0IGlzIHRoZSBwaGFudG9tIG9mP1xuICAgIHZhciBwaGFudG9tZWQgPSBwaGFudG9tLnBoYW50b21PZjtcbiAgICAvLyBTaW1wbHkgc3dhcCB0aGVzZSBET00gb2JqZWN0cy5cbiAgICBzd2FwRWxlbWVudHMocGhhbnRvbWVkLCBwaGFudG9tKTtcbiAgfSk7XG59O1xudmlldy5zd2l0Y2hNb2RlID0gc3dpdGNoTW9kZTtcblxudmFyIHByZXNlbnRhdGlvbiA9IHt9O1xuXG4vLyBUT0RPIG5vdCB1c2VkP1xudmFyIHNlbGVjdEVsZW1lbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgcHJlc2VudGF0aW9uLnNlbGVjdGVkID0gZXZlbnQudGFyZ2V0O1xufTtcbnZpZXcuc2VsZWN0RWxlbWVudCA9IHNlbGVjdEVsZW1lbnQ7XG5cbnZhciBsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAgIHAuY29udGVudEVkaXRhYmxlID0gZmFsc2U7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xvY2stYnV0dG9uJykuZGlzYWJsZWQgPSB0cnVlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN1bmxvY2stYnV0dG9uJykuZGlzYWJsZWQgPSBmYWxzZTtcbn07XG52aWV3LmxvY2sgPSBsb2NrO1xuXG52YXIgdW5sb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAgIHAuY29udGVudEVkaXRhYmxlID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjbG9jay1idXR0b24nKS5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN1bmxvY2stYnV0dG9uJykuZGlzYWJsZWQgPSB0cnVlO1xufTtcbnZpZXcudW5sb2NrID0gdW5sb2NrO1xuXG52YXIgaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAgIHAub25mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgfTtcbiAgICBwLm9uYmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29tbWFuZHMuYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH07XG59O1xudmlldy5pbml0ID0gaW5pdDtcblxubW9kdWxlLmV4cG9ydHMgPSB2aWV3O1xuZ2xvYmFsLnZpZXcgPSB2aWV3O1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuLypnbG9iYWwgSFRNTEVsZW1lbnQgKi9cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG4vKmdsb2JhbCByZXN0eWxlICovXG4vKmdsb2JhbCBEcmFnZ2FiaWxseSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi4vbGliL3NlbGVjdG9yJyk7XG5cbnZhciB0YWdOYW1lID0gJ3otYmxvY2snO1xuXG52YXIgaHRtbFRlbXBsYXRlID0gdXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uKGZ1bmN0aW9uICgpIHsvKlxuICAgIDxkaXYgaWQ9XCJtYWluXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwb3J0cy1jb250YWluZXIgaW5wdXRzXCI+XG4gICAgICAgICAgICA8Y29udGVudCBzZWxlY3Q9XCJ6LXBvcnQuaW5wdXRcIj48L2NvbnRlbnQ+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8c3BhbiBjbGFzcz1cImJsb2NrLWtleVwiPmE8L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50LWNvbnRhaW5lclwiPlxuICAgICAgICAgICAgPGNvbnRlbnQ+PC9jb250ZW50PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBvcnRzLWNvbnRhaW5lciBvdXRwdXRzXCI+XG4gICAgICAgICAgICA8Y29udGVudCBzZWxlY3Q9XCJ6LXBvcnQub3V0cHV0XCI+PC9jb250ZW50PlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiovfSk7XG52YXIgdGVtcGxhdGUgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFRlbXBsYXRlKTtcblxudmFyIGNzc0FzSnNvbiA9IHtcbiAgICAvLyBUaGUgZm9sbG93aW5nIHdpbGwgYXBwbHkgdG8gdGhlIHJvb3QgRE9NIGVsZW1lbnQgb2YgdGhlIGN1c3RvbVxuICAgIC8vIGVsZW1lbnQuXG4gICAgJyc6IHtcbiAgICAgICAgLy8gQnkgZGVmYXVsdCBjdXN0b20gZWxlbWVudHMgYXJlIGlubGluZSBlbGVtZW50cy4gQ3VycmVudCBlbGVtZW50XG4gICAgICAgIC8vIGhhcyBpdHMgb3duIGhlaWdodCBhbmQgd2lkdGggYW5kIGNhbiBiZSBpbnN0ZXJ0ZWQgaW4gYSB0ZXh0XG4gICAgICAgIC8vIGZsb3cuIFNvIHdlIG5lZWQgYSAnZGlzcGxheTogaW5saW5lLWJsb2NrJyBzdHlsZS4gTW9yZW92ZXIsIHRoaXNcbiAgICAgICAgLy8gaXMgbmVlZGVkIGFzIGEgd29ya2Fyb3VuZCBmb3IgYSBidWcgaW4gRHJhZ2dhYmlsbHkgKHdoaWNoIG9ubHlcbiAgICAgICAgLy8gd29ya3Mgb24gYmxvY2sgZWxlbWVudHMsIG5vdCBvbiBpbmxpbmUgb25lcykuXG4gICAgICAgICdkaXNwbGF5JzogJ2lubGluZS1ibG9jaycsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZSdcbiAgICB9LFxuICAgICc+IGRpdic6IHtcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnd2hpdGUnLFxuICAgICAgICAnYm9yZGVyLWxlZnQnOiAnM3B4IHNvbGlkJyxcbiAgICAgICAgJ2JvcmRlci1sZWZ0LWNvbG9yJzogJ3doaXRlJyxcbiAgICAgICAgJ2JvcmRlci1yaWdodCc6ICczcHggc29saWQnLFxuICAgICAgICAnYm9yZGVyLXJpZ2h0LWNvbG9yJzogJ3doaXRlJyxcbiAgICAgICAgJ2JveFNoYWRvdyc6ICcycHggMnB4IDNweCAwcHggI2RmZGZkZidcbiAgICB9LFxuICAgICcuY29udGVudC1jb250YWluZXInOiB7XG4gICAgICAgICdwYWRkaW5nJzogJzhweCAxNXB4IDhweCAxNXB4J1xuICAgIH0sXG4gICAgJy5wb3J0cy1jb250YWluZXInOiB7XG4gICAgICAgICdwYWRkaW5nJzogMCxcbiAgICAgICAgJ21pbkhlaWdodCc6IDMsXG4gICAgICAgICdvdmVyZmxvdyc6ICd2aXNpYmxlJ1xuICAgIH0sXG4gICAgJy5wb3J0cy1jb250YWluZXIgei1wb3J0Jzoge1xuICAgICAgICAnZmxvYXQnOiAnbGVmdCcsXG4gICAgICAgICdtYXJnaW5MZWZ0JzogOCxcbiAgICAgICAgJ21hcmdpblJpZ2h0JzogOFxuICAgIH0sXG4gICAgJ3NwYW4uYmxvY2sta2V5Jzoge1xuICAgICAgICAnZm9udC1zaXplJzogJ3NtYWxsZXInLFxuICAgICAgICAnY29sb3InOiAnIzQ0NCcsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdib3R0b20nOiAwLFxuICAgICAgICAncmlnaHQnOiAwLFxuICAgICAgICAncGFkZGluZy1yaWdodCc6IDMsXG4gICAgICAgICdwYWRkaW5nLWxlZnQnOiAzLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICcjZmZmJ1xuICAgIH0sXG4gICAgJ3otcG9ydC5pbnB1dCAucG9ydC1rZXknOiB7XG4gICAgICAgICd0b3AnOiAzXG4gICAgfSxcbiAgICAnei1wb3J0Lm91dHB1dCAucG9ydC1rZXknOiB7XG4gICAgICAgICdib3R0b20nOiAzXG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgIHZhciBwb3J0cyA9IGJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgcG9ydC5yZWRyYXcoKTtcbiAgICB9KTtcbn07XG5cbnZhciBtYWtlSXREcmFnZ2FibGUgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgZHJhZ2dpZSA9IG5ldyBEcmFnZ2FiaWxseShibG9jaywge1xuICAgICAgICBjb250YWlubWVudDogdHJ1ZVxuICAgIH0pO1xuICAgIGRyYWdnaWUuZXh0ZXJuYWxBbmltYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZWRyYXcoYmxvY2spO1xuICAgIH07XG59O1xuXG52YXIgcHJvcGVydGllcyA9IHtcbiAgICBjcmVhdGVkQ2FsbGJhY2s6IHt2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEF0IHRoZSBiZWdpbm5pbmcgdGhlIGxpZ2h0IERPTSBpcyBzdG9yZWQgaW4gdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgICAgdmFyIGxpZ2h0RG9tID0gdGhpcztcbiAgICAgICAgLy8gU3RhcnQgY29tcG9zZWQgRE9NIHdpdGggYSBjb3B5IG9mIHRoZSB0ZW1wbGF0ZVxuICAgICAgICB2YXIgY29tcG9zZWREb20gPSB0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgIC8vIFRoZW4gcHJvZ3Jlc3NpdmVseSBtb3ZlIGVsZW1lbnRzIGZyb20gbGlnaHQgdG8gY29tcG9zZWQgRE9NIGJhc2VkIG9uXG4gICAgICAgIC8vIHNlbGVjdG9ycyBvbiBsaWdodCBET00gYW5kIGZpbGwgPGNvbnRlbnQ+IHRhZ3MgaW4gY29tcG9zZWQgRE9NIHdpdGhcbiAgICAgICAgLy8gdGhlbS5cbiAgICAgICAgWyd6LXBvcnQuaW5wdXQnLCAnei1wb3J0Lm91dHB1dCcsICcnXS5mb3JFYWNoKGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICB1dGlscy5kb20ubW92ZSh7XG4gICAgICAgICAgICAgICAgZnJvbTogbGlnaHREb20sIHdpdGhTZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgdG86IGNvbXBvc2VkRG9tLCBvblRhZzogJ2NvbnRlbnQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEF0IHRoaXMgc3RhZ2UgY29tcG9zZWQgRE9NIGlzIGNvbXBsZXRlZCBhbmQgbGlnaHQgRE9NIGlzIGVtcHR5IChpLmUuXG4gICAgICAgIC8vICd0aGlzJyBoYXMgbm8gY2hpbGRyZW4pLiBDb21wb3NlZCBET00gaXMgc2V0IGFzIHRoZSBjb250ZW50IG9mIHRoZVxuICAgICAgICAvLyBjdXJyZW50IGVsZW1lbnQuXG4gICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQoY29tcG9zZWREb20pO1xuXG4gICAgICAgIHRoaXMuaGlkZUtleSgpO1xuXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIHBvcnRzID0gdGhhdC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbihwb3J0KSB7XG4gICAgICAgICAgICBwb3J0LmJsb2NrID0gdGhhdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuemUtY29udGVudCcpO1xuXG4gICAgICAgIC8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbiAgICAgICAgdGhpcy5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgd2luZG93LnNldEN1cnJlbnRCbG9jayh0aGF0KTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5yZWRyYXcgPSByZWRyYXcuYmluZChudWxsLCB0aGlzKTtcbiAgICAgICAgc2VsZWN0b3Iuc2V0U2VsZWN0YWJsZSh0aGlzLCB0cnVlKTtcbiAgICB9fSxcblxuICAgIGF0dGFjaGVkQ2FsbGJhY2s6IHt2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFRPRE8gYnVnIGluIGNocm9tZSBvciBpbiB3ZWJyZWZsZWN0aW9uIHBvbHlmaWxsLiBJZiBtYWtlSXREcmFnZ2FibGVcbiAgICAgICAgLy8gaXMgY2FsbGVkIGluIGNyZWF0ZWRDYWxsYmFjayB0aGVuIERyYWdnYWJpbHkgYWRkcyBhXG4gICAgICAgIC8vICdwb3NpdGlvbjpyZWxhdGl2ZScgYmVjYXVzZSB0aGUgY3NzIHN0eWxlIG9mIGJsb2NrIHRoYXQgc2V0XG4gICAgICAgIC8vIHBvc2l0aW9uIHRvIGFic29sdXRlIGhhcyBub3QgYmVlbiBhcHBsaWVkIHlldCAod2l0aCBjaHJvbWUpLiBXaXRoXG4gICAgICAgIC8vIFdlYlJlZmxlY3Rpb24ncyBwb2x5ZmlsbCB0aGUgc3R5bGUgaXMgYXBwbGllZCBzbyBEcmFnZ2FiaWxseSBkb2Vzbid0XG4gICAgICAgIC8vIGNoYW5nZSBwb3NpdGlvbi4gV2h5IGEgZGlmZmVyZW50IGJlaGF2aW91cj8gV2hpY2ggaXMgd3JvbmcgPyBDaHJvbWUsXG4gICAgICAgIC8vIHdlYnJlZmxlY3Rpb24gb3IgdGhlIHNwZWM/IE1heWJlIHdlIGNhbiB0cnkgd2l0aCBwb2x5bWVyIHBvbHlmaWxsLlxuICAgICAgICBtYWtlSXREcmFnZ2FibGUodGhpcyk7XG4gICAgfX0sXG5cbiAgICB1bnBsdWc6IHt2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBwb3J0cyA9IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgICAgIHBvcnQudW5wbHVnKCk7XG4gICAgICAgIH0pO1xuICAgIH19LFxuXG4gICAgYWRkUG9ydDoge3ZhbHVlOiBmdW5jdGlvbiAoaHRtbFN0cmluZykge1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFN0cmluZyk7XG4gICAgICAgIHZhciBwb3J0ID0gZnJhZ21lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgcG9ydC5ibG9jayA9IHRoaXM7XG4gICAgICAgIGlmIChwb3J0LmNsYXNzTGlzdC5jb250YWlucygnaW5wdXQnKSkge1xuICAgICAgICAgICAgdmFyIHBvcnRDb250YWluZXIgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5wb3J0cy1jb250YWluZXIuaW5wdXRzJyk7XG4gICAgICAgICAgICBwb3J0Q29udGFpbmVyLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICAgICAgfSBlbHNlIGlmIChwb3J0LmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JykpIHtcbiAgICAgICAgICAgIHZhciBwb3J0Q29udGFpbmVyID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcucG9ydHMtY29udGFpbmVyLm91dHB1dHMnKTtcbiAgICAgICAgICAgIHBvcnRDb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwb3J0O1xuICAgIH19LFxuXG4gICAga2V5RWxlbWVudDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3NwYW4uYmxvY2sta2V5Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAga2V5OiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmtleUVsZW1lbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2hvd0tleToge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMua2V5RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgIH19LFxuXG4gICAgaGlkZUtleToge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMua2V5RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgfX0sXG5cbiAgICBwb3J0czoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ291dCc6IHRoaXMucXVlcnlTZWxlY3Rvcignei1wb3J0Lm91dHB1dCcpLFxuICAgICAgICAgICAgICAgICdpbnB1dHMnOiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpLFxuICAgICAgICAgICAgICAgICdvdXRwdXRzJzogdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0JylcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSwgcHJvcGVydGllcyk7XG5wcm90by5jc3MgPSBzdHlsZTtcbmRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCh0YWdOYW1lLCB7cHJvdG90eXBlOiBwcm90b30pO1xuXG4vLyBUT0RPIGNsZWFuIGdsb2JhbHNcbndpbmRvdy5nZXRFbGVtZW50QmxvY2sgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIC8vIFRPRE8gZG8gYSBzZWFyY2ggdG8gZmluZCB0aGUgZmlyc3QgcGFyZW50IGJsb2NrIGZvciBjYXNlcyB3aGVyZVxuICAgIC8vIGVsZW1lbnQgaXMgZG93biBpbiB0aGUgZWxlbWVudCBoaWVhcmNoeS5cbiAgICB2YXIgbWF5YmVCbG9jayA9IGVsZW1lbnQucGFyZW50Tm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgdmFyIGJsb2NrO1xuICAgIGlmIChtYXliZUJsb2NrLnRhZ05hbWUgPT09ICdaLUJMT0NLJykge1xuICAgICAgICBibG9jayA9IG1heWJlQmxvY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYmxvY2sgPSBlbGVtZW50LnBoYW50b21lZEJ5LnBhcmVudE5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gYmxvY2s7XG59O1xuIiwiLy8gQ3VzdG9tIGVsZW1lbnQgdG8gZHJhdyBhIGxpbmsgYmV0d2VlbiB0d28gcG9ydHMuXG5cbi8vIFdlIGltcGxlbWVudCB0aGlzIGFzIGEgZGl2IHdpdGggemVybyBoZWlnaHQgd2hpY2ggd2lkdGggaXMgdGhlIGxlbmd0aCBvZiB0aGVcbi8vIGxpbmUgYW5kIHVzZSB0cmFuc2Zvcm1zIHRvIHNldCBpdHMgZW5kcyB0byB0aGUgcG9ydHMgcG9zaXRpb25zLiBSZWZlcmVuY2Vcbi8vIG9yaWdpbiBwb3NpdGlvbiBpcyByZWxhdGl2ZSBjb29yZGluYXRlcyAoMCwwKSBhbmQgb3RoZXIgZW5kIGlzICh3aWR0aCwwKS5cbi8vIFNvIGJlIHN1cmUgdGhhdCBDU1Mgc3R5bGluZyBpcyBkb25lIGFjY29yZGluZ2x5LlxuXG4vKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50ICovXG4vKmdsb2JhbCBIVE1MRWxlbWVudCAqL1xuXG4vKmdsb2JhbCBnZXRTdHlsZVByb3BlcnR5ICovXG5cbi8qZ2xvYmFsIF8gKi9cbi8qZ2xvYmFsIHJlc3R5bGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LWxpbmsnO1xuXG52YXIgaHRtbFRlbXBsYXRlID0gdXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uKGZ1bmN0aW9uICgpIHsvKlxuICAgIDxkaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzZWxlY3RvclwiPjwvZGl2PlxuICAgIDwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG4vLyBUT0RPIFVzZSBhIGN1c3RvbSBlbGVtZW50IGZvciBsaW5lIHdpZHRoLlxudmFyIGxpbmVXaWR0aCA9IDMuMDtcbnZhciByYWRpdXMgPSBsaW5lV2lkdGggLyAyO1xudmFyIGNzc0FzSnNvbiA9IHtcbiAgICAvLyBUaGUgZm9sbG93aW5nIHdpbGwgYXBwbHkgdG8gdGhlIHJvb3QgRE9NIGVsZW1lbnQgb2YgdGhlIGN1c3RvbVxuICAgIC8vIGVsZW1lbnQuXG4gICAgJyc6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2hlaWdodCc6IDAsXG4gICAgICAgICdtYXJnaW4tbGVmdCc6IC1yYWRpdXMsXG4gICAgICAgICdtYXJnaW4tdG9wJzogLXJhZGl1cyxcbiAgICAgICAgJ2JvcmRlcldpZHRoJzogcmFkaXVzLFxuICAgICAgICAnYm9yZGVyUmFkaXVzJzogcmFkaXVzLFxuICAgICAgICAnYm9yZGVyU3R5bGUnOiAnc29saWQnLFxuICAgICAgICAnYm94U2hhZG93JzogJzBweCAwcHggM3B4IDBweCAjZGZkZmRmJyxcbiAgICAgICAgJ2JvcmRlckNvbG9yJzogJyNjY2MnXG4gICAgfSxcbiAgICAnZGl2LnNlbGVjdG9yJzoge1xuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnbGVmdCc6ICcxMCUnLFxuICAgICAgICAnd2lkdGgnOiAnODAlJyxcbiAgICAgICAgJ3RvcCc6IC03LFxuICAgICAgICAnaGVpZ2h0JzogMTQsXG4gICAgICAgICd6SW5kZXgnOiAwLFxuICAgICAgICAnYm9yZGVyQ29sb3InOiAnIzMzMydcbiAgICB9XG59O1xuLy8gQXBwbHkgdGhlIGNzcyBkZWZpbml0aW9uIGFuZCBwcmVwZW5kaW5nIHRoZSBjdXN0b20gZWxlbWVudCB0YWcgdG8gYWxsXG4vLyBDU1Mgc2VsZWN0b3JzLlxudmFyIHN0eWxlID0gcmVzdHlsZSh0YWdOYW1lLCBjc3NBc0pzb24pO1xuXG52YXIgZ2V0UG9sYXJDb29yZGluYXRlcyA9IGZ1bmN0aW9uKHBvc2l0aW9uMSwgcG9zaXRpb24yKSB7XG4gICAgdmFyIHhEaWZmID0gcG9zaXRpb24xLnggLSBwb3NpdGlvbjIueDtcbiAgICB2YXIgeURpZmYgPSBwb3NpdGlvbjEueSAtIHBvc2l0aW9uMi55O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbW9kOiBNYXRoLnNxcnQoeERpZmYgKiB4RGlmZiArIHlEaWZmICogeURpZmYpLFxuICAgICAgICBhcmc6IE1hdGguYXRhbih5RGlmZiAvIHhEaWZmKVxuICAgIH07XG59O1xuXG4vLyBTZXQgdGhlIHN0eWxlIG9mIGEgZ2l2ZW4gZWxlbWVudCBzbyB0aGF0OlxuLy8gKiBJdHMgb3JpZ2luIChpLmUuIDAsMCByZWxhdGl2ZSBjb29yZGluYXRlcykgaXMgcGxhY2VkIGF0IG9uZSBwb3NpdGlvbi5cbi8vICogSXRzIHdpZHRoIGlzIHNldCB0byB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIHBvc2l0aW9ucy5cbi8vICogSXQgaXMgcm90YXRlZCBzbyB0aGF0IGl0cyBlbmQgcG9pbnQgKHggPSB3aWR0aCBhbmQgeSA9IDApIGlzIHBsYWNlZCBhdFxuLy8gdGhlIG90aGVyIHBvc2l0aW9uLlxudmFyIHRyYW5zZm9ybVByb3BlcnR5ID0gZ2V0U3R5bGVQcm9wZXJ0eSgndHJhbnNmb3JtJyk7XG52YXIgc2V0RWxlbWVudEVuZHMgPSBmdW5jdGlvbihlbGVtZW50LCBlbmQxLCBlbmQyKSB7XG4gICAgdmFyIG9yaWdpbjtcbiAgICBpZiAoZW5kMS54IDwgZW5kMi54KSB7XG4gICAgICAgIG9yaWdpbiA9IGVuZDE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgb3JpZ2luID0gZW5kMjtcbiAgICB9XG5cbiAgICB2YXIgcG9sYXIgPSBnZXRQb2xhckNvb3JkaW5hdGVzKGVuZDEsIGVuZDIpO1xuICAgIHZhciBsZW5ndGggPSBwb2xhci5tb2Q7XG4gICAgdmFyIGFuZ2xlID0gcG9sYXIuYXJnO1xuXG4gICAgdmFyIHRvcCA9IG9yaWdpbi55ICsgMC41ICogbGVuZ3RoICogTWF0aC5zaW4oYW5nbGUpO1xuICAgIHZhciBsZWZ0ID0gb3JpZ2luLnggLSAwLjUgKiBsZW5ndGggKiAoMSAtIE1hdGguY29zKGFuZ2xlKSk7XG4gICAgdmFyIHBhcmVudFBvc2l0aW9uID0gdXRpbHMuZG9tLmdldFBvc2l0aW9uKGVsZW1lbnQucGFyZW50Tm9kZSk7XG4gICAgbGVmdCAtPSBwYXJlbnRQb3NpdGlvbi54O1xuICAgIHRvcCAtPSBwYXJlbnRQb3NpdGlvbi55O1xuXG4gICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IGxlbmd0aCArICdweCc7XG4gICAgZWxlbWVudC5zdHlsZS50b3AgPSB0b3AgKyAncHgnO1xuICAgIGVsZW1lbnQuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICAgIGVsZW1lbnQuc3R5bGVbdHJhbnNmb3JtUHJvcGVydHldID0gJ3JvdGF0ZSgnICsgYW5nbGUgKyAncmFkKSc7XG59O1xuXG52YXIgcmVkcmF3ID0gZnVuY3Rpb24gKHpsaW5rKSB7XG4gICAgdmFyIGVuZDEgPSB6bGluay5iZWdpbi5wb3J0O1xuICAgIHZhciBlbmQyID0gemxpbmsuZW5kLnBvcnQ7XG4gICAgaWYgKGVuZDEgIT09IHVuZGVmaW5lZCAmJiBlbmQyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2V0RWxlbWVudEVuZHMoemxpbmssIGVuZDEuY29ubmVjdGlvblBvc2l0aW9uLCBlbmQyLmNvbm5lY3Rpb25Qb3NpdGlvbik7XG4gICAgfVxufTtcblxudmFyIGNvbm5lY3QgPSBmdW5jdGlvbih6bGluaywgcGx1ZywgcG9ydCkge1xuICAgIGlmICh0eXBlb2YgcG9ydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcG9ydCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocG9ydCk7XG4gICAgfVxuICAgIHBsdWcucG9ydCA9IHBvcnQ7XG4gICAgcGx1Zy5wb3J0LmxpbmtzLnB1c2goemxpbmspO1xufTtcblxudmFyIHVuY29ubmVjdCA9IGZ1bmN0aW9uICh6bGluaykge1xuICAgIHpsaW5rLmJlZ2luLnBvcnQubGlua3MgPSBfLndpdGhvdXQoemxpbmsuYmVnaW4ucG9ydC5saW5rcywgemxpbmspO1xuICAgIHpsaW5rLmVuZC5wb3J0LmxpbmtzID0gXy53aXRob3V0KHpsaW5rLmVuZC5wb3J0LmxpbmtzLCB6bGluayk7XG4gICAgaWYgKHpsaW5rLnBhcmVudE5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgemxpbmsucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh6bGluayk7XG4gICAgfVxufTtcblxudmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xucHJvdG8uY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgIHRoaXMuYXBwZW5kQ2hpbGQoY29tcG9zZWREb20pO1xuXG4gICAgLy8gQ3VycmllZCB2ZXJzaW9uIG9mICdyZWRyYXcnIHdpdGggY3VycmVudCBvYmplY3QgaW5zdGFuY2UuXG4gICAgLy8gVXNlZCBmb3IgZXZlbnQgbGlzdGVuZXJzLlxuICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgdGhpcy5jb25uZWN0ID0gY29ubmVjdC5iaW5kKG51bGwsIHRoaXMpO1xuICAgIHRoaXMudW5jb25uZWN0ID0gdW5jb25uZWN0LmJpbmQobnVsbCwgdGhpcyk7XG5cbiAgICB0aGlzLmJlZ2luID0ge307XG4gICAgdGhpcy5lbmQgPSB7fTtcbiAgICBpZiAodGhpcy5oYXNBdHRyaWJ1dGUoJ2JlZ2luJykgJiYgdGhpcy5oYXNBdHRyaWJ1dGUoJ2VuZCcpKSB7XG4gICAgICAgIC8vIFRPRE8gZG8gdGhlIHNhbWUgc3R1ZmYgb24gYXR0cmlidXRlcycgY2hhbmdlcy5cbiAgICAgICAgY29ubmVjdCh0aGlzLCB0aGlzLmJlZ2luLCB0aGlzLmdldEF0dHJpYnV0ZSgnYmVnaW4nKSk7XG4gICAgICAgIGNvbm5lY3QodGhpcywgdGhpcy5lbmQsIHRoaXMuZ2V0QXR0cmlidXRlKCdlbmQnKSk7XG5cbiAgICAgICAgdGhpcy5yZWRyYXcoKTtcbiAgICB9XG5cbiAgICBzZWxlY3Rvci5zZXRTZWxlY3RhYmxlKHRoaXMsIHRydWUpO1xufTtcblxucHJvdG8uY3NzID0gc3R5bGU7XG5kb2N1bWVudC5yZWdpc3RlckVsZW1lbnQodGFnTmFtZSwge3Byb3RvdHlwZTogcHJvdG99KTtcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQsIHdpbmRvdyAqL1xuLypnbG9iYWwgSFRNTEVsZW1lbnQgKi9cblxuLypnbG9iYWwgcmVzdHlsZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi4vbGliL3NlbGVjdG9yJyk7XG5cbnZhciB0YWdOYW1lID0gJ3otcG9ydCc7XG5cbnZhciBodG1sVGVtcGxhdGUgPSB1dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24oZnVuY3Rpb24gKCkgey8qXG4gICAgPHNwYW4gY2xhc3M9XCJwb3J0LWtleVwiPmE8L3NwYW4+XG4gICAgPGRpdiBjbGFzcz1cInNlbGVjdG9yXCI+PC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgICd3aWR0aCc6IDE4LFxuICAgICAgICAnaGVpZ2h0JzogMyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2NjYycsXG4gICAgICAgICdkaXNwbGF5JzogJ2lubGluZS1ibG9jaycsXG4gICAgICAgICdwb3NpdGlvbic6ICdyZWxhdGl2ZScsXG4gICAgICAgICdvdmVyZmxvdyc6ICd2aXNpYmxlJyxcbiAgICAgICAgJ3pJbmRleCc6ICc1J1xuICAgIH0sXG4gICAgJy5wb3J0LWtleSc6IHtcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6ICcwLjdlbScsXG4gICAgICAgICdjb2xvcic6ICcjNDQ0JyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ3BhZGRpbmctbGVmdCc6IDMsXG4gICAgICAgICdwYWRkaW5nLXJpZ2h0JzogMyxcbiAgICAgICAgJ3pJbmRleCc6ICcxMCcsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNmZmYnXG4gICAgfSxcbiAgICAnLnNlbGVjdG9yJzoge1xuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnbGVmdCc6IC04LFxuICAgICAgICAndG9wJzogLTgsXG4gICAgICAgICd3aWR0aCc6IDI0LFxuICAgICAgICAnaGVpZ2h0JzogMTRcbiAgICB9XG59O1xuLy8gQXBwbHkgdGhlIGNzcyBkZWZpbml0aW9uIGFuZCBwcmVwZW5kaW5nIHRoZSBjdXN0b20gZWxlbWVudCB0YWcgdG8gYWxsXG4vLyBDU1Mgc2VsZWN0b3JzLlxudmFyIHN0eWxlID0gcmVzdHlsZSh0YWdOYW1lLCBjc3NBc0pzb24pO1xuXG52YXIgcmVkcmF3ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICBbXS5mb3JFYWNoLmNhbGwocG9ydC5saW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgbGluay5yZWRyYXcoKTtcbiAgICB9KTtcbn07XG5cblxudmFyIHByb3BlcnRpZXMgPSB7XG5cbiAgICBjcmVhdGVkQ2FsbGJhY2s6IHt2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlua3MgPSBbXTtcbiAgICAgICAgdGhpcy5yZWRyYXcgPSByZWRyYXcuYmluZChudWxsLCB0aGlzKTtcbiAgICAgICAgc2VsZWN0b3Iuc2V0U2VsZWN0YWJsZSh0aGlzLCB0cnVlKTtcblxuICAgICAgICB2YXIgY29tcG9zZWREb20gPSB0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQoY29tcG9zZWREb20pO1xuXG4gICAgICAgIHRoaXMuaGlkZUtleSgpO1xuICAgIH19LFxuXG4gICAgdW5wbHVnOiB7dmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgICAgICBsaW5rLnVuY29ubmVjdCgpO1xuICAgICAgICB9KTtcbiAgICB9fSxcblxuICAgIGNvbm5lY3RhYmxlOiB7dmFsdWU6IGZ1bmN0aW9uIChwb3J0MSwgcG9ydDIpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JylcbiAgICAgICAgICAgICYmIHBvcnQyLmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JykpXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgKHBvcnQxLmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JylcbiAgICAgICAgICAgICYmIHBvcnQyLmNsYXNzTGlzdC5jb250YWlucygnaW5wdXQnKSlcbiAgICAgICAgICAgICk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0OiB7dmFsdWU6IGZ1bmN0aW9uIChwb3J0MSwgcG9ydDIpIHtcbiAgICAgICAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd6LWxpbmsnKTtcbiAgICAgICAgaWYgKHBvcnQxLmNsYXNzTGlzdC5jb250YWlucygnb3V0cHV0JykpIHtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmJlZ2luLCBwb3J0MSk7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5lbmQsIHBvcnQyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmVuZCwgcG9ydDEpO1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuYmVnaW4sIHBvcnQyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIHVzZSBhbm90aGVyIHdheSB0byBmaW5kIHdoZXJlIHRvIGFkZCBuZXcgbGlua3MuXG4gICAgICAgIHZhciBwYXRjaCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwYXRjaCcpO1xuICAgICAgICBwYXRjaC5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgICAgbGluay5yZWRyYXcoKTtcbiAgICB9fSxcblxuICAgIGNvbm5lY3Rpb25Qb3NpdGlvbjoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gdGhpcztcbiAgICAgICAgICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSB7XG4gICAgICAgICAgICAgICAgeDogcG9zaXRpb24ueCArIHJlY3Qud2lkdGggLyAyLFxuICAgICAgICAgICAgICAgIHk6IHBvc2l0aW9uLnkgKyByZWN0LmhlaWdodCAvIDJcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gY2VudGVyO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleUVsZW1lbnQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKCdzcGFuLnBvcnQta2V5Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAga2V5OiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmtleUVsZW1lbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2hvd0tleToge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMua2V5RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgIH19LFxuXG4gICAgaGlkZUtleToge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMua2V5RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgfX1cblxufTtcblxudmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsIHByb3BlcnRpZXMpO1xucHJvdG8uY3NzID0gc3R5bGU7XG5kb2N1bWVudC5yZWdpc3RlckVsZW1lbnQodGFnTmFtZSwge3Byb3RvdHlwZTogcHJvdG99KTtcblxuIl19
