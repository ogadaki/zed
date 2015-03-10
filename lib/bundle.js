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
        var result = theScript.apply(null, args);

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

var commands = require('./commands');

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
                    commands.editBlock(source);
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

},{"./commands":"/home/zed/lib/commands.js"}],"/home/zed/lib/view.js":[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvaHR0cC5qcyIsImxpYi9zZWxlY3Rvci5qcyIsImxpYi9zdG9yYWdlLmpzIiwibGliL3Rlcm1pbmFsLmpzIiwibGliL3V0aWxzLmpzIiwibGliL3ZpZXcuanMiLCJ3ZWJjb21wb25lbnRzL3otYmxvY2suanMiLCJ3ZWJjb21wb25lbnRzL3otbGluay5qcyIsIndlYmNvbXBvbmVudHMvei1wb3J0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG52YXIgZW5naW5lID0gcmVxdWlyZSgnLi9lbmdpbmUnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBodHRwID0gcmVxdWlyZSgnLi9odHRwJyk7XG4vLyBpbXBvcnQgdmlldyBtb2R1bGUgc28gdGhhdCBpdHMgZ2xvYmFscyBhcmUgZGVmaW5lZC5cbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbnZhciBleHBvcnRzID0ge307XG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb21tYW5kcy5pbml0KCk7XG4gICAgZW5naW5lLmluaXQoKTtcbiAgICBlZGl0b3IuaW5pdCgpO1xuICAgIHZpZXcuaW5pdCgpO1xuICAgIGdsb2JhbC5odHRwID0gaHR0cDtcbiAgICAvLyBMb2FkIGEgcGF0Y2ggYXMgYW4gZXhhbXBsZS5cbiAgICBzdG9yYWdlLmxvYWRQYXRjaCgnaHR0cCcsICdwYXRjaGVzL21haW4uemVkJyk7XG59O1xuZXhwb3J0cy52aWV3ID0gdmlldztcbmV4cG9ydHMuY29tbWFuZHMgPSBjb21tYW5kcztcblxuLy8gVGhpcyBtb2R1bGUgaXMgdG8gYmUgdXNlZCBmcm9tIHRoZSBnbG9iYWwgbmFtZXNwYWNlIChpLmUuIGZyb20gYXBwLmh0bWwpLlxuZ2xvYmFsLmFwcCA9IGV4cG9ydHM7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIE1vdXNldHJhcCAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdG9yYWdlID0gcmVxdWlyZSgnLi9zdG9yYWdlJyk7XG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3InKTtcbnZhciB0ZXJtaW5hbCA9IHJlcXVpcmUoJy4vdGVybWluYWwnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGNvbW1hbmRzID0ge307XG5cbmNvbW1hbmRzLnByZXYgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIC0xKTtcbmNvbW1hbmRzLm5leHQgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIDEpO1xuY29tbWFuZHMuYWRkID0gZWRpdG9yLmFkZDtcbmNvbW1hbmRzLnJlbW92ZSA9IGVkaXRvci5yZW1vdmU7XG5jb21tYW5kcy5pbnB1dHMgPSBlZGl0b3IucG9ydC5iaW5kKG51bGwsICdpbnB1dCcpO1xuY29tbWFuZHMub3V0cHV0cyA9IGVkaXRvci5wb3J0LmJpbmQobnVsbCwgJ291dHB1dCcpO1xuY29tbWFuZHMuYmxvY2sgPSBlZGl0b3IuYmxvY2s7XG5jb21tYW5kcy5maXJlID0gZWRpdG9yLmZpcmU7XG5jb21tYW5kcy5zZXQgPSBlZGl0b3Iuc2V0O1xuY29tbWFuZHMubW92ZSA9IGVkaXRvci5tb3ZlO1xuY29tbWFuZHMub2Zmc2V0ID0gZWRpdG9yLm1vdmVCeTtcbmNvbW1hbmRzLmNsZWFyID0gZWRpdG9yLmNsZWFyQWxsO1xuXG5cbnZhciBlZGl0QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZXNjJywgY29tbWFuZHMuZXNjYXBlKTtcbiAgICBibG9jay5jb250ZW50LmZvY3VzKCk7XG59O1xuY29tbWFuZHMuZWRpdEJsb2NrID0gZWRpdEJsb2NrO1xuXG5jb21tYW5kcy5lZGl0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIGVkaXRCbG9jayhibG9jayk7XG4gICAgICAgIGVkaXRvci5zdG9wQmxpbmtpbmcoKTtcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IHdoZW4gdGhpcyBmdW5jdGlvbiBpcyB1c2VkIHdpdGggTW91c3RyYXAuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5jb21tYW5kcy5hZGRCdXR0b24gPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdidXR0b24nLCAnZ28nLCAwLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGRTY3JpcHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzY3JpcHQnLCAnaW4xICsgMicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbmNvbW1hbmRzLmFkZFRleHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzcGFuJywgJ2VtcHR5JywgMSwgMSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuY29tbWFuZHMuYWRkTnVtYmVyID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ3plZCcsICdudW1iZXInLCAnNDInLCAxLCAxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5jb21tYW5kcy5hZGRDb21tZW50ID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ2h0bWwnLCAnY29tbWVudCcsICdDb21tZW50JywgMCwgMCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xudmFyIGJpbmRLZXlzRm9yTWFpbk1vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ0snLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAwLCAtMTApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnSicsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDAsIDEwKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ0gnLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAtMTAsIDApKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnTCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDEwLCAwKSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2snLCBjb21tYW5kcy5wcmV2KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaicsIGNvbW1hbmRzLm5leHQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIG4nLCBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnTmV3JykpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggYicsIGNvbW1hbmRzLmFkZEJ1dHRvbik7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBzJywgY29tbWFuZHMuYWRkU2NyaXB0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHQnLCBjb21tYW5kcy5hZGRUZXh0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYSBoIG4nLCBjb21tYW5kcy5hZGROdW1iZXIpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdhIGggYycsIGNvbW1hbmRzLmFkZENvbW1lbnQpO1xuICAgIE1vdXNldHJhcC5iaW5kKCdyJywgY29tbWFuZHMucmVtb3ZlKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnaScsIGNvbW1hbmRzLmlucHV0cyk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ28nLCBjb21tYW5kcy5vdXRwdXRzKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYicsIGNvbW1hbmRzLmJsb2NrKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnYycsIGNvbW1hbmRzLmdvVG9Db21tYW5kTGluZSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2wnLCBjb21tYW5kcy5saW5rKTtcbiAgICBNb3VzZXRyYXAuYmluZCgnZycsIGNvbW1hbmRzLmdvVG9CbG9jayk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2UnLCBjb21tYW5kcy5lZGl0KTtcbiAgICBNb3VzZXRyYXAuYmluZCgnc3BhY2UnLCBjb21tYW5kcy5maXJlKTtcbn07XG5jb21tYW5kcy5iaW5kS2V5c0Zvck1haW5Nb2RlID0gYmluZEtleXNGb3JNYWluTW9kZTtcblxuY29tbWFuZHMuZXNjYXBlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgY3VycmVudGx5RWRpdGluZ0VsZW1lbnQgPSB1dGlscy5kb20uZ2V0U2VsZWN0aW9uU3RhcnQoKTtcbiAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRpbmdFbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjdXJyZW50bHlFZGl0aW5nRWxlbWVudC5ibHVyKCk7XG4gICAgICAgICAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xuICAgICAgICB9XG4gICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9XG59O1xuXG52YXIgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIFtdLmZvckVhY2guY2FsbChibG9ja3MsIGZ1bmN0aW9uIChiKSB7XG4gICAgICAgIGIuY2xhc3NMaXN0LnRvZ2dsZSgnZGUtZW1waGFzaXMnKTtcbiAgICB9KTtcbn07XG5cbnZhciBoaWRlQWxsS2V5cyA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIFtdLmZvckVhY2guY2FsbChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5oaWRlS2V5KCk7XG4gICAgfSk7XG4gICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xufTtcblxudmFyIGZpcnN0UG9ydDtcbnZhciBzZWxlY3RQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICBpZiAoZmlyc3RQb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZmlyc3RQb3J0ID0gcG9ydDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocG9ydC5jb25uZWN0YWJsZShwb3J0LCBmaXJzdFBvcnQpKSB7XG4gICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgZmlyc3RQb3J0KTtcbiAgICAgICAgICAgIGZpcnN0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LXBvcnQnKTtcbiAgICAgICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBwb3J0VG9MaW5rVG87XG5jb21tYW5kcy5saW5rID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICAgICAgZmlyc3RQb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICAgICAgdmFyIHBvcnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzLm5leHQoKTtcbiAgICAgICAgICAgIHBvcnQua2V5ID0ga2V5O1xuICAgICAgICAgICAgcG9ydC5zaG93S2V5KCk7XG4gICAgICAgICAgICAvLyBDb252ZXJ0ICdhYWUnIGludG8gJ2EgYSBlJy5cbiAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZWxlY3RQb3J0LmJpbmQobnVsbCwgcG9ydCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LXBvcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcG9ydCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgICAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHBvcnRUb0xpbmtUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gcG9ydDtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LmNvbm5lY3RhYmxlKHBvcnQsIHBvcnRUb0xpbmtUbykpIHtcbiAgICAgICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgcG9ydFRvTGlua1RvKTtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8uY2xhc3NMaXN0LnRvZ2dsZSgndG8tbGluay10bycpO1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgICAgICBwb3J0VG9MaW5rVG8gPSBwb3J0O1xuICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgc2V0Q3VycmVudEJsb2NrQW5kQmFja1RvTWFpbk1vZGUgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICBoaWRlQWxsS2V5cygnei1ibG9jaycpO1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbn07XG5cbmNvbW1hbmRzLmdvVG9CbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIGtleXMgPSB1dGlscy5jcmVhdGVLZXlzR2VuZXJhdG9yKCk7XG4gICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzLm5leHQoKTtcbiAgICAgICAgYmxvY2sua2V5ID0ga2V5O1xuICAgICAgICBibG9jay5zaG93S2V5KCk7XG4gICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJycpLmpvaW4oJyAnKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZS5iaW5kKG51bGwsIGJsb2NrKSk7XG4gICAgICAgIGluZGV4Kys7XG4gICAgfSk7XG4gICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGlkZUFsbEtleXMoJ3otYmxvY2snKTtcbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH0pO1xuICAgIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MoKTtcbn07XG5cbi8vIFNldCBhIG5ldyBzdG9wQ2FsbGJhY2sgZm9yIE1vdXN0cmFwIHRvIGF2b2lkIHN0b3BwaW5nIHdoZW4gd2Ugc3RhcnRcbi8vIGVkaXRpbmcgYSBjb250ZW50ZWRpdGFibGUsIHNvIHRoYXQgd2UgY2FuIHVzZSBlc2NhcGUgdG8gbGVhdmUgZWRpdGluZy5cbk1vdXNldHJhcC5zdG9wQ2FsbGJhY2sgPSBmdW5jdGlvbihlLCBlbGVtZW50LCBjb21ibykge1xuICAgIC8vIGlmIHRoZSBlbGVtZW50IGhhcyB0aGUgY2xhc3MgXCJtb3VzZXRyYXBcIiB0aGVuIG5vIG5lZWQgdG8gc3RvcFxuICAgIGlmICgoJyAnICsgZWxlbWVudC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyBtb3VzZXRyYXAgJykgPiAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgIC8vIHN0b3AgZm9yIGlucHV0LCBzZWxlY3QsIGFuZCB0ZXh0YXJlYVxuICAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lID09ICdJTlBVVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdTRUxFQ1QnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnO1xuIH07XG5cbmNvbW1hbmRzLnNhdmUgPSBzdG9yYWdlLnNhdmVQYXRjaDtcbmNvbW1hbmRzLmxvYWQgPSBzdG9yYWdlLmxvYWRQYXRjaDtcbmNvbW1hbmRzLnJtID0gc3RvcmFnZS5yZW1vdmVQYXRjaDtcbmNvbW1hbmRzLmxpc3QgPSBzdG9yYWdlLmdldFBhdGNoTmFtZXM7XG5jb21tYW5kcy5scyA9IHN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcztcblxudmFyIHRlcm1pbmFsT25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgIGJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xufTtcblxudmFyIHRlcm07XG52YXIgaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgdGVybSA9IHRlcm1pbmFsLmNyZWF0ZShjb21tYW5kcywgdGVybWluYWxPbmJsdXIpO1xuICAgIC8vIFVucGx1ZyB0aGUgaW5pdCBmdW5jdGlvbiBzbyB0aGF0IGl0IHdvbid0IGJlIHVzZWQgYXMgYSBjb21tYW5kIGZyb20gdGhlXG4gICAgLy8gdGVybWluYWwuXG4gICAgZGVsZXRlIGNvbW1hbmRzLmluaXQ7XG59O1xuY29tbWFuZHMuaW5pdCA9IGluaXQ7XG5cbmNvbW1hbmRzLmdvVG9Db21tYW5kTGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0ZXJtLmZvY3VzKCk7XG4gICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgZWRpdG9yLnN0b3BCbGlua2luZygpO1xufTtcblxuLy8gVE9ETyBjcmVhdGUgYSB0ZXJtLndyaXRlKG11bHRpTGluZVN0cmluZykgYW5kIHVzZSBpdC5cbmNvbW1hbmRzLmhlbHAgPSBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIGlmIChzdWJqZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdQcmVzcyBFc2MgdG8gbGVhdmUgdGhlIGNvbW1hbmQgbGluZSBhbmQgZ28gYmFjayB0byBub3JtYWwgbW9kZS4nKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdDb21tYW5kczogbmV4dCwgcHJldiwgcmVtb3ZlLCBhZGQsIHNldCBjb250ZW50LCBtb3ZlLCBvZmZzZXQnKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdscywgbG9hZCwgc2F2ZSwgY2xlYXIgYW5kIHJtLicpO1xuICAgIH0gZWxzZSBpZiAoc3ViamVjdCA9PT0gJ2FkZCcpIHtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdBZGQgYSBuZXcgYmxvY2sganVzdCBiZWxvdyB0aGUgY3VycmVudCBibG9jay4nKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgdGVybS50ZXJtLndyaXRlKCdhZGQgaHRtbCA8d2hhdD4gPGNvbnRlbnQ+IDxuYiBpbnB1dHM+IDxuYiBvdXRwdXRzPicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPHdoYXQ+ICAgIGlzIGVpdGhlciBcImJ1dHRvblwiLCBcInNjcmlwdFwiLCBcInRleHRcIiwgXCJudW1iZXJcIiBvciBhIEhUTUwgdGFnLicpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPGNvbnRlbnQ+IGlzIHRoZSBjb250ZW50IG9mIHRoZSBibG9jayAoaS5lLiB0aGUgYnV0dG9uIG5hbWUsIHRoZScpO1xuICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgICAgICAgICAgIHNjcmlwdCBjb2RlLCB0aGUgdGV4dCBvciBudW1iZXIgdmFsdWUsIGV0Yy4pLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRlcm0udGVybS53cml0ZSgnTm8gaGVscCBmb3IgXCInICsgc3ViamVjdCArICdcIi4nKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVuZ2luZSA9IHJlcXVpcmUoJy4vZW5naW5lJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlZGl0b3IgPSB7fTtcblxuZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuXG5lZGl0b3IuZ2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5nZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1wb3J0LmN1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5zZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgaWYgKGN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgY3VycmVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgfVxufTtcbi8vIFRPRE8gbm90IGluIHRoZSB3aW5kb3cgbmFtZXNwYWNlXG53aW5kb3cuc2V0Q3VycmVudEJsb2NrID0gZWRpdG9yLnNldEN1cnJlbnRCbG9jaztcblxuZWRpdG9yLnNldEN1cnJlbnRQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgIHBvcnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50QmxvY2sgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoZWxlbWVudHMubGVuZ3RoICsgaSArIG9mZnNldCkgJSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iub2Zmc2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICB2YXIgZWxlbWVudHMgPSBjdXJyZW50LmJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC4nICsgZWRpdG9yLmNvbnRleHQpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoZWxlbWVudHMubGVuZ3RoICsgaSArIG9mZnNldCkgJSBlbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQoZWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5vZmZzZXRDdXJyZW50ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrKG9mZnNldCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0JyB8fCBlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0KG9mZnNldCk7XG4gICAgfVxufTtcblxuZWRpdG9yLmNyZWF0ZUJsb2NrRWxlbWVudCA9IGZ1bmN0aW9uIChjb250ZW50LCBuSW5wdXRzLCBuT3V0cHV0cywgdG9wLCBsZWZ0KSB7XG4gICAgdmFyIHBhdGNoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhdGNoJyk7XG4gICAgY29udGVudCA9IFtcbiAgICAgICAgJzx6LXBvcnQgY2xhc3M9XCJpbnB1dFwiPjwvei1wb3J0PicucmVwZWF0KG5JbnB1dHMpLFxuICAgICAgICBjb250ZW50LFxuICAgICAgICAnPHotcG9ydCBjbGFzcz1cIm91dHB1dFwiPjwvei1wb3J0PicucmVwZWF0KG5PdXRwdXRzKVxuICAgIF0uam9pbignJyk7XG4gICAgdmFyIGh0bWxTdHJpbmcgPSAnPHotYmxvY2s+JyArIGNvbnRlbnQgKyAnPC96LWJsb2NrPic7XG4gICAgdmFyIGZyYWdtZW50ID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxTdHJpbmcpO1xuICAgIHZhciBibG9jayA9IGZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2snKTtcblxuICAgIHZhciBkZWZhdWx0VG9wID0gMDtcbiAgICB2YXIgZGVmYXVsdExlZnQgPSAwO1xuICAgIHZhciBjdXJyZW50QmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGN1cnJlbnRCbG9jayAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oY3VycmVudEJsb2NrLCBjdXJyZW50QmxvY2sucGFyZW50Tm9kZSk7XG4gICAgICAgIGRlZmF1bHRUb3AgPSBwb3NpdGlvbi55ICsgY3VycmVudEJsb2NrLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCArIDIzO1xuICAgICAgICBkZWZhdWx0TGVmdCA9IHBvc2l0aW9uLng7XG4gICAgfVxuICAgIGJsb2NrLnN0eWxlLnRvcCA9IHRvcCB8fCBkZWZhdWx0VG9wICsgJ3B4JztcbiAgICBibG9jay5zdHlsZS5sZWZ0ID0gbGVmdCB8fCBkZWZhdWx0TGVmdCArICdweCc7XG5cbiAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICBwYXRjaC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgcmV0dXJuIGJsb2NrO1xufTtcblxuZWRpdG9yLmFkZEJsb2NrID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgemVDbGFzcyA9ICcnO1xuICAgIGlmIChhcmdzWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICB0eXBlID0gJ2h0bWwnO1xuICAgICAgICBhcmdzWzFdID0gJ3NwYW4nO1xuICAgICAgICB6ZUNsYXNzID0gJ3plZC1udW1iZXInO1xuICAgIH1cbiAgICB2YXIgYmxvY2tDbGFzcyA9IGFyZ3NbMV07XG4gICAgaWYgKHR5cGUgPT09ICdodG1sJykge1xuICAgICAgICB2YXIgdGFnTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgIGlmIChhcmdzWzFdID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSAnc3Bhbic7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnRlbnQgPSBhcmdzWzJdO1xuICAgICAgICB2YXIgbmV3Q29udGVudCA9ICc8JyArIHRhZ05hbWUgKyAnIGNsYXNzPVwiemUtY29udGVudCAnICsgemVDbGFzcyArICdcIiBjb250ZW50ZWRpdGFibGU+JyArIGNvbnRlbnQgKyAnPC8nICsgdGFnTmFtZSArICc+JztcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAgICAgICBuZXdDb250ZW50ID0gJzxzY3JpcHQgY2xhc3M9XCJ6ZS1jb250ZW50XCIgdHlwZT1cImFwcGxpY2F0aW9uL3gtcHJldmVudC1zY3JpcHQtZXhlY3V0aW9uLW9ubG9hZFwiIHN0eWxlPVwiZGlzcGxheTogYmxvY2s7d2hpdGUtc3BhY2U6IHByZS13cmFwO1wiIGNvbnRlbnRlZGl0YWJsZSBvbmlucHV0PVwiY29tcGlsZVNjcmlwdCh0aGlzKVwiPicgKyBjb250ZW50ICsgJzwvc2NyaXB0Pic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICBuZXdDb250ZW50ID0gJzxidXR0b24gb25jbGljaz1cInNlbmRFdmVudFRvT3V0cHV0UG9ydCh0aGlzKVwiIGNsYXNzPVwiemUtY29udGVudFwiIGNvbnRlbnRlZGl0YWJsZT4nICsgY29udGVudCArICc8L2J1dHRvbj4nO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YWdOYW1lWzBdID09PSAnPCcpIHtcbiAgICAgICAgICAgIC8vIEFjdHVhbGx5IHRhZ05hbWUgY29udGFpbnMgYSBIVE1MIHN0cmluZy5cbiAgICAgICAgICAgIG5ld0NvbnRlbnQgPSB0YWdOYW1lO1xuICAgICAgICAgICAgYmxvY2tDbGFzcyA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzLCAyKTtcbiAgICAgICAgYXJnc1swXSA9IG5ld0NvbnRlbnQ7XG4gICAgfVxuICAgIHZhciBibG9jayA9IGVkaXRvci5jcmVhdGVCbG9ja0VsZW1lbnQuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgaWYgKGJsb2NrQ2xhc3MgIT09ICcnKSB7XG4gICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoYmxvY2tDbGFzcyk7XG4gICAgfVxufTtcblxuZWRpdG9yLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VycmVudDtcbiAgICB2YXIgcG9ydDtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgZWRpdG9yLmFkZEJsb2NrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0Jykge1xuICAgICAgICBjdXJyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgICAgIHBvcnQgPSBjdXJyZW50LmFkZFBvcnQoJzx6LXBvcnQgY2xhc3M9XCJpbnB1dFwiPjwvei1wb3J0PicpO1xuICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQocG9ydCk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgY3VycmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgICAgICBwb3J0ID0gY3VycmVudC5hZGRQb3J0KCc8ei1wb3J0IGNsYXNzPVwib3V0cHV0XCI+PC96LXBvcnQ+Jyk7XG4gICAgICAgIGVkaXRvci5zZXRDdXJyZW50UG9ydChwb3J0KTtcbiAgICB9XG59O1xuXG5lZGl0b3IucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxlY3RlZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3RlZCcpO1xuICAgIGlmIChzZWxlY3RlZCAhPT0gbnVsbCAmJiBzZWxlY3RlZC50YWdOYW1lID09PSAnWi1MSU5LJykge1xuICAgICAgICB2YXIgbGluayA9IHNlbGVjdGVkO1xuICAgICAgICBsaW5rLnVuY29ubmVjdCgpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICBlZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrKDEpO1xuICAgICAgICBibG9jay51bnBsdWcoKTtcbiAgICAgICAgYmxvY2sucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChibG9jayk7XG4gICAgfSBlbHNlIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2lucHV0JyB8fCBlZGl0b3IuY29udGV4dCA9PT0gJ291dHB1dCcpIHtcbiAgICAgICAgdmFyIHBvcnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0KDEpO1xuICAgICAgICBwb3J0LnVucGx1ZygpO1xuICAgICAgICBwb3J0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocG9ydCk7XG4gICAgfVxufTtcblxudmFyIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQgPSBmdW5jdGlvbiAoZWxlbWVudFRhZ05hbWUsIG9uT3JPZmYpIHtcbiAgICB2YXIgY2xhc3NOYW1lID0gJ2N1cnJlbnQnO1xuICAgIGlmIChvbk9yT2ZmID09PSAnb24nKSB7XG4gICAgICAgIGNsYXNzTmFtZSArPSAnLW9mZi1jb250ZXh0JztcbiAgICB9XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnRUYWdOYW1lICsgJy4nICsgY2xhc3NOYW1lKTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbn07XG5cbmVkaXRvci5wb3J0ID0gZnVuY3Rpb24gKGlucHV0T3JPdXRwdXQpIHtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgIT09ICdibG9jaycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrLmN1cnJlbnQgKiB6LXBvcnQuJyArIGlucHV0T3JPdXRwdXQsICdvbicpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdmFyIHBvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQgKiB6LXBvcnQuJyArIGlucHV0T3JPdXRwdXQpO1xuICAgICAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcG9ydC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jaycsICdvZmYnKTtcbiAgICBlZGl0b3IuY29udGV4dCA9IGlucHV0T3JPdXRwdXQ7XG59O1xuXG5lZGl0b3IuYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgZWRpdG9yLmNvbnRleHQgPSAnYmxvY2snO1xuICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2snLCAnb24nKTtcbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LXBvcnQuaW5wdXQnLCAnb2ZmJyk7XG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otcG9ydC5vdXRwdXQnLCAnb2ZmJyk7XG4gICAgfSBjYXRjaChlKSB7fVxufTtcblxuZWRpdG9yLmZpcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgICAgICBpZiAoY29udGVudC50YWdOYW1lID09PSAnQlVUVE9OJykge1xuICAgICAgICAgICAgZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIGlmIChjb250ZW50LnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgICBlbmdpbmUuZmlyZUV2ZW50MihibG9jayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iuc2V0ID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICBpZiAodGFyZ2V0ID09PSAnY29udGVudCcpIHtcbiAgICAgICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgICAgICBibG9jay5jb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm1vdmUgPSBmdW5jdGlvbiAobGVmdCwgdG9wKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgY3VycmVudC5zdHlsZS50b3AgPSB0b3AgKyAncHgnO1xuICAgIGN1cnJlbnQuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICAgIGN1cnJlbnQucmVkcmF3KCk7XG59O1xuXG5lZGl0b3IubW92ZUJ5ID0gZnVuY3Rpb24gKGxlZnRPZmZzZXQsIHRvcE9mZnNldCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIHZhciB0b3AgPSBOdW1iZXIoY3VycmVudC5zdHlsZS50b3Auc2xpY2UoMCwgLTIpKSArIE51bWJlcih0b3BPZmZzZXQpO1xuICAgIHZhciBsZWZ0ID0gTnVtYmVyKGN1cnJlbnQuc3R5bGUubGVmdC5zbGljZSgwLCAtMikpICsgTnVtYmVyKGxlZnRPZmZzZXQpO1xuICAgIGVkaXRvci5tb3ZlKGxlZnQsIHRvcCk7XG59O1xuXG5lZGl0b3Iuc3RhcnRCbGlua2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKGJsb2NrICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChibG9jay5jbGFzc0xpc3QuY29udGFpbnMoJ3N0b3AtYmxpbmtpbmcnKSkge1xuICAgICAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnc3RvcC1ibGlua2luZycpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLnN0b3BCbGlua2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgaWYgKCFibG9jay5jbGFzc0xpc3QuY29udGFpbnMoJ3N0b3AtYmxpbmtpbmcnKSkge1xuICAgICAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKCdzdG9wLWJsaW5raW5nJyk7XG4gICAgfVxufTtcblxudmFyIGJsaW5rQ3Vyc29yID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3Vyc29yLWRpc3BsYXllZCcpO1xuICAgIH1cbiAgICB3aW5kb3cuc2V0VGltZW91dChibGlua0N1cnNvciwgMTAwMCk7XG59O1xuXG5lZGl0b3IuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBibGlua0N1cnNvcigpO1xufTtcblxuZWRpdG9yLmNsZWFyQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgXy5lYWNoKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIGJsb2NrLnVucGx1ZygpO1xuICAgICAgICBibG9jay5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGJsb2NrKTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykuaW5uZXJIVE1MID0gJyc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRvcjtcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgd2luZG93ICovXG5cbi8qZ2xvYmFsIF8gKi9cblxuLypnbG9iYWwgZ2V0RWxlbWVudEJsb2NrICovXG5cbid1c2Ugc3RyaWN0JztcbnZhciBlbmdpbmUgPSB7fTtcblxuZW5naW5lLmNvbXBpbGVTY3JpcHQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciBzdHJpbmcgPSBlbGVtZW50LnRleHQ7XG4gICAgdmFyIHNjcmlwdDtcbiAgICB2YXIgY29tcGlsZWQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gSW4gY2FzZSBzY3JpcHQgaXMgYW4gZXhwcmVzc2lvbi5cbiAgICAgICAgdmFyIG1heWJlRXhwcmVzc2lvbiA9IHN0cmluZztcbiAgICAgICAgc2NyaXB0ID0gJ3JldHVybiAoJyArIG1heWJlRXhwcmVzc2lvbiArICcpOyc7XG4gICAgICAgIGNvbXBpbGVkID0gbmV3IEZ1bmN0aW9uKCdzZW5kVG9PdXRwdXQnLCAnZGVzdDEnLCAnaW4xJywgJ2luMicsICdpbjMnLCAnaW40JywgJ2luNScsIHNjcmlwdCk7XG4gICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICB9IGNhdGNoIChlMSkge1xuICAgICAgICAvLyBDb21waWxhdGlvbiBmYWlsZWQgdGhlbiBpdCBpc24ndCBhbiBleHByZXNzaW9uLiBUcnkgYXMgYVxuICAgICAgICAvLyBmdW5jdGlvbiBib2R5LlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2NyaXB0ID0gZWxlbWVudC50ZXh0O1xuICAgICAgICAgICAgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24oJ3NlbmRUb091dHB1dCcsICdkZXN0MScsICdpbjEnLCAnaW4yJywgJ2luMycsICdpbjQnLCAnaW41Jywgc2NyaXB0KTtcbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBjb21waWxlZDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gTm90IGEgZnVuY3Rpb24gYm9keSwgc3RyaW5nIGlzIG5vdCB2YWxpZC5cbiAgICAgICAgICAgIGVsZW1lbnQuY29tcGlsZWRTY3JpcHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZSkge1xuICAgIHZhciBibG9jayA9IGdldEVsZW1lbnRCbG9jayhlbGVtZW50KTtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5wb3J0cy5vdXRwdXRzO1xuICAgIGlmIChwb3J0cykge1xuICAgICAgICBpZiAocG9ydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgcG9ydCA9IHBvcnRzWzBdO1xuICAgICAgICAgICAgcG9ydC5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB2YWx1ZSBpcyBhbiBhcnJheSBvZiB2YWx1ZXMuXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWU7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0LCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciB6ZVZhbHVlID0gdmFsdWVzW2luZGV4XTtcbiAgICAgICAgICAgICAgICBwb3J0LmxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgICAgICAgICAgICBmaXJlRXZlbnQobGluaywgemVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBnZXRPdXRwdXRMaW5rc0ZpcnN0RGVzdGluYXRpb25Db250ZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgYmxvY2sgPSBnZXRFbGVtZW50QmxvY2soZWxlbWVudCk7XG4gICAgdmFyIHBvcnQgPSBibG9jay5wb3J0cy5vdXRwdXRzWzBdO1xuICAgIHZhciBjb250ZW50O1xuICAgIGlmIChwb3J0ICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBsaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgIHZhciBsaW5rID0gbGlua3NbMF07XG4gICAgICAgIGlmIChsaW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xufTtcblxuLy8gVE9ETyBjaGFuZ2UgbmFtZS5cbmVuZ2luZS5maXJlRXZlbnQyID0gZnVuY3Rpb24gKHRhcmdldCwgdmFsdWUpIHtcbiAgICB2YXIgY29udGVudCA9IHRhcmdldC5jb250ZW50O1xuICAgIHZhciB0YWdOYW1lID0gY29udGVudC50YWdOYW1lO1xuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgIHZhciBkYXRhUG9ydHMgPSB0YXJnZXQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0LmlucHV0Jyk7XG4gICAgICAgIHZhciBpbnB1dHMgPSBbXTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKGRhdGFQb3J0cywgZnVuY3Rpb24gKGRhdGFQb3J0KSB7XG4gICAgICAgICAgICB2YXIgZGF0YUxpbmtzID0gZGF0YVBvcnQgPT09IG51bGwgPyBbXSA6IGRhdGFQb3J0LmxpbmtzO1xuXG4gICAgICAgICAgICBpZiAoZGF0YUxpbmtzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhTGluayA9IF8uZmluZChkYXRhTGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gbGluay5iZWdpbi5wb3J0LmJsb2NrLmNvbnRlbnQudGFnTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWcgIT09ICdCVVRUT04nO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGFMaW5rO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhTGluayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0gZGF0YUxpbmsuYmVnaW4ucG9ydC5ibG9jay5jb250ZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmoudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmoudGFnTmFtZSA9PT0gJ1NQQU4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmouaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmouY2xhc3NMaXN0LmNvbnRhaW5zKCd6ZWQtbnVtYmVyJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob2JqLnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvYmouZXhlY3V0aW9uUmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlucHV0cy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG5leHRBY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGZpcnN0RGVzdGluYXRpb25Db250ZW50ID0gZ2V0T3V0cHV0TGlua3NGaXJzdERlc3RpbmF0aW9uQ29udGVudChjb250ZW50KTtcblxuICAgICAgICB2YXIgdGhlU2NyaXB0ID0gY29udGVudC5jb21waWxlZFNjcmlwdDtcbiAgICAgICAgaWYgKHRoZVNjcmlwdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb21waWxlU2NyaXB0KGNvbnRlbnQpO1xuICAgICAgICAgICAgdGhlU2NyaXB0ID0gY29udGVudC5jb21waWxlZFNjcmlwdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhlU2NyaXB0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdFcnJvciBpbiBzY3JpcHQuIEFib3J0aW5nLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgYXJncy5wdXNoKG5leHRBY3Rpb24pO1xuICAgICAgICBhcmdzLnB1c2goZmlyc3REZXN0aW5hdGlvbkNvbnRlbnQpO1xuICAgICAgICBhcmdzID0gYXJncy5jb25jYXQoaW5wdXRzKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRoZVNjcmlwdC5hcHBseShudWxsLCBhcmdzKTtcblxuICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlc3VsdCBmb3IgZnV0dXJlIHVzZS5cbiAgICAgICAgICAgIGNvbnRlbnQuZXhlY3V0aW9uUmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ05VTUJFUicpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ0RJVicgfHwgdGFnTmFtZSA9PT0gJ1NQQU4nKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSBjb250ZW50LmlubmVySFRNTDtcbiAgICAgICAgfVxuICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgdmFsdWUpO1xuICAgIH1cblxuICAgIGlmICh0YWdOYW1lID09PSAnSU5QVVQnKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGFyZ2V0LnJlZHJhdygpO1xufTtcblxuZW5naW5lLmZpcmVFdmVudCA9IGZ1bmN0aW9uIChsaW5rLCB2YWx1ZSkge1xuICAgIHZhciB0YXJnZXQgPSBsaW5rLmVuZC5wb3J0LmJsb2NrO1xuICAgIGlmICh0YXJnZXQucG9ydHMuaW5wdXRzWzBdID09PSBsaW5rLmVuZC5wb3J0KSB7XG4gICAgICAgIC8vIE9ubHkgYWN0dWFsbHkgZmlyZSB0aGUgYmxvY2sgb24gaXRzIGZpcnN0IGlucHV0IHBvcnQuXG4gICAgICAgIGZpcmVFdmVudDIodGFyZ2V0LCB2YWx1ZSk7XG4gICAgfVxufTtcblxuZW5naW5lLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LmNvbXBpbGVTY3JpcHQgPSBlbmdpbmUuY29tcGlsZVNjcmlwdDtcbiAgICB3aW5kb3cuc2VuZEV2ZW50VG9PdXRwdXRQb3J0ID0gZW5naW5lLnNlbmRFdmVudFRvT3V0cHV0UG9ydDtcbiAgICB3aW5kb3cuZmlyZUV2ZW50MiA9IGVuZ2luZS5maXJlRXZlbnQyO1xuICAgIHdpbmRvdy5maXJlRXZlbnQgPSBlbmdpbmUuZmlyZUV2ZW50O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbmdpbmU7XG4iLCJ2YXIgaHR0cCA9IHt9O1xuXG5odHRwLmdldCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsKTtcblxuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0LnN0YXR1c1RleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIGVycm9yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBodHRwO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuLypnbG9iYWwgd2luZG93ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHNlbGVjdG9yID0ge1xuICAgIHNldFNlbGVjdGFibGU6IGZ1bmN0aW9uIChlbGVtZW50LCB3aXRoU3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IHRoaXM7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHNlbGVjdG9yLmFjdGlvbihlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICh3aXRoU3RvcFByb3BhZ2F0aW9uICE9PSB1bmRlZmluZWQgJiYgd2l0aFN0b3BQcm9wYWdhdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29ubmVjdGFibGU6IGZ1bmN0aW9uIChlbGVtZW50MSwgZWxlbWVudDIpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQxLmNvbm5lY3RhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50MS5jb25uZWN0YWJsZShlbGVtZW50MSwgZWxlbWVudDIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgYWN0aW9uOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25uZWN0YWJsZSh0aGlzLnNlbGVjdGVkLCBlbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQuY29ubmVjdCh0aGlzLnNlbGVjdGVkLCBlbGVtZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gZWxlbWVudDtcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bnNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdG9yO1xuLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxuZ2xvYmFsLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4iLCJcbi8qZ2xvYmFsIHdpbmRvdyAqL1xuLypnbG9iYWwgZG9jdW1lbnQgKi9cblxuLypnbG9iYWwgXyAqL1xuXG4vKmdsb2JhbCBjb21tYW5kcyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcblxudmFyIHN0b3JhZ2UgPSB7fTtcblxuZnVuY3Rpb24gZXhwb3J0UGF0Y2ggKCkge1xuICAgIHZpZXcuc3dpdGNoTW9kZSgnZWRpdCcpO1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otYmxvY2snKTtcbiAgICB2YXIgcGF0Y2ggPSB7fTtcbiAgICBwYXRjaC5ibG9ja3MgPSBbXTtcbiAgICBwYXRjaC5saW5rcyA9IFtdO1xuICAgIF8uZWFjaChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQsIGluZGV4KSB7XG4gICAgICAgIHZhciBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudC1jb250YWluZXInKS5pbm5lckhUTUwudHJpbSgpO1xuICAgICAgICB2YXIgY29udGVudCA9IGVsZW1lbnQuY29udGVudDtcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBjb250ZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjb21tZW50JykpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSAnY29tbWVudCc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlID0gY29udGVudC52YWx1ZSB8fCBjb250ZW50LmlubmVySFRNTCB8fCAnJztcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRlbnQuaW5uZXJIVE1MO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAgICAgICAvLyBUaGUgbmV3bGluZXMgYXJlIGxvc3Qgd2hlbiB1c2luZyByYXcgaW5uZXJIVE1MIGZvciBzY3JpcHQgdGFnc1xuICAgICAgICAgICAgLy8gKGF0IGxlYXN0IG9uIGZpcmVmb3gpLiBTbyB3ZSBwYXJzZSBlYWNoIGNoaWxkIHRvIGFkZCBhIG5ld2xpbmVcbiAgICAgICAgICAgIC8vIHdoZW4gQlIgYXJlIGVuY291bnRlcmVkLlxuICAgICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChjb250ZW50LmNoaWxkTm9kZXMsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ0JSJykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSAnXFxuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBub2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbnB1dFBvcnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKTtcbiAgICAgICAgdmFyIG91dHB1dFBvcnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0Jyk7XG4gICAgICAgIHBhdGNoLmJsb2Nrcy5wdXNoKHtcbiAgICAgICAgICAgIGlkOiBpbmRleCxcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgICAgICAgICBuSW5wdXRzOiBpbnB1dFBvcnRzLmxlbmd0aCxcbiAgICAgICAgICAgIG5PdXRwdXRzOiBvdXRwdXRQb3J0cy5sZW5ndGgsXG4gICAgICAgICAgICB0b3A6IGVsZW1lbnQuc3R5bGUudG9wLFxuICAgICAgICAgICAgbGVmdDogZWxlbWVudC5zdHlsZS5sZWZ0LFxuICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnQuc3R5bGUud2lkdGgsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBpbm5lckhUTUw6IGNvbnRlbnRDb250YWluZXJJbm5lckhUTUxcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBwaGFudG9tID0gY29udGVudC5waGFudG9tZWRCeTtcbiAgICAgICAgaWYgKHBoYW50b20gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGhhbnRvbS5zZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgtdG8tcGhhbnRvbScsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICBfLmVhY2goaW5wdXRQb3J0cywgZnVuY3Rpb24gKHBvcnQsIHBvcnRJbmRleCkge1xuICAgICAgICAgICAgdmFyIGluTGlua3MgPSBwb3J0LmxpbmtzO1xuICAgICAgICAgICAgXy5lYWNoKGluTGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyUG9ydCA9IGxpbmsuYmVnaW4ucG9ydDtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9jayA9IG90aGVyUG9ydC5ibG9jaztcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9ja0luZGV4ID0gXy5pbmRleE9mKGVsZW1lbnRzLCBvdGhlckJsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9ja1BvcnRzID0gb3RoZXJCbG9jay5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0Jyk7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyQmxvY2tQb3J0SW5kZXggPSBfLmluZGV4T2Yob3RoZXJCbG9ja1BvcnRzLCBvdGhlclBvcnQpO1xuICAgICAgICAgICAgICAgIHBhdGNoLmxpbmtzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2s6IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcG9ydEluZGV4XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2s6IG90aGVyQmxvY2tJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IG90aGVyQmxvY2tQb3J0SW5kZXhcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHBhdGNoLnByZXNlbnRhdGlvbiA9IHt9O1xuICAgIHBhdGNoLnByZXNlbnRhdGlvbi5pbm5lckhUTUwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykuaW5uZXJIVE1MO1xuICAgIHZhciBwaGFudG9tcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xuICAgIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAgICAgLy8gRklYTUUgZGF0YS1pbmRleC10by1waGFudG9tIGluc3RlYWQ/XG4gICAgICAgIHBoYW50b20ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXBoYW50b21lZC1ibG9jay1pZCcpO1xuICAgIH0pO1xuICAgIHJldHVybiBwYXRjaDtcbn07XG5cbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbnZhciBjb25uZWN0QmxvY2tzID0gZnVuY3Rpb24oZW5kLCBzdGFydCwgaW5wdXRQb3J0UG9zaXRpb24sIG91dHB1dFBvcnRQb3NpdGlvbikge1xuICAgIHZhciBzdGFydFBvcnQgPSAoc3RhcnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpKVtvdXRwdXRQb3J0UG9zaXRpb25dO1xuICAgIHZhciBlbmRQb3J0ID0gKGVuZC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKSlbaW5wdXRQb3J0UG9zaXRpb25dO1xuICAgIGlmIChzdGFydFBvcnQuY29ubmVjdGFibGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUT0RPIGNvbm5lY3RhYmxlIHRha2VzIHNvbWUgdGltZSB0byBiZSBkZWZpbmVkLiBXYWl0IGZvciBpdC5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY29ubmVjdEJsb2NrcywgMSwgZW5kLCBzdGFydCwgaW5wdXRQb3J0UG9zaXRpb24sIG91dHB1dFBvcnRQb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChzdGFydFBvcnQuY29ubmVjdGFibGUoc3RhcnRQb3J0LCBlbmRQb3J0KSkge1xuICAgICAgICBzdGFydFBvcnQuY29ubmVjdChzdGFydFBvcnQsIGVuZFBvcnQpO1xuICAgIH1cbn07XG5cbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbnZhciBjcmVhdGVQaGFudG9tTGlua0ZvckJsb2NrID0gZnVuY3Rpb24gKGJsb2NrLCBwaGFudG9tKSB7XG4gICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgIGlmIChjb250ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gRklYIE1FIHdhaXQgdGhhdCBjb250ZW50IGFjdHVhbGx5IGV4aXN0cy5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jaywgMSwgYmxvY2ssIHBoYW50b20pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcuY3JlYXRlUGhhbnRvbUxpbmsoY29udGVudCwgcGhhbnRvbSk7XG4gICAgfVxufTtcblxudmFyIGltcG9ydFBhdGNoID0gZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgdmFyIGVsZW1lbnRzID0gW107XG4gICAgXy5lYWNoKHBhdGNoLmJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgIGJsb2NrLm5JbnB1dHMgPSBibG9jay5uSW5wdXRzIHx8IDA7XG4gICAgICAgIGJsb2NrLm5PdXRwdXRzID0gYmxvY2subk91dHB1dHMgfHwgMDtcbiAgICAgICAgaWYgKGJsb2NrLnRhZ05hbWUgPT09ICdzY3JpcHQnIHx8wqBibG9jay50YWdOYW1lID09PSAnYnV0dG9uJyB8fCBibG9jay50YWdOYW1lID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgIGVkaXRvci5hZGRCbG9jaygnaHRtbCcsIGJsb2NrLnRhZ05hbWUsIGJsb2NrLnZhbHVlLCBibG9jay5uSW5wdXRzLCBibG9jay5uT3V0cHV0cywgYmxvY2sudG9wLCBibG9jay5sZWZ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVkaXRvci5hZGRCbG9jaygnaHRtbCcsIGJsb2NrLmlubmVySFRNTCwgJycsIGJsb2NrLm5JbnB1dHMsIGJsb2NrLm5PdXRwdXRzLCBibG9jay50b3AsIGJsb2NrLmxlZnQpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50Jyk7XG4gICAgICAgIGVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgfSk7XG4gICAgXy5lYWNoKHBhdGNoLmxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICB2YXIgb3V0cHV0ID0gZWxlbWVudHNbbGluay5vdXRwdXQuYmxvY2tdO1xuICAgICAgICB2YXIgaW5wdXQgPSBlbGVtZW50c1tsaW5rLmlucHV0LmJsb2NrXTtcbiAgICAgICAgY29ubmVjdEJsb2NrcyhpbnB1dCwgb3V0cHV0LCBsaW5rLmlucHV0LnBvcnQsIGxpbmsub3V0cHV0LnBvcnQpO1xuICAgIH0pO1xuICAgIHZhciBwcmVzZW50YXRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJyk7XG4gICAgcHJlc2VudGF0aW9uLmlubmVySFRNTCA9IHBhdGNoLnByZXNlbnRhdGlvbi5pbm5lckhUTUw7XG4gICAgdmFyIHBoYW50b21zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLnF1ZXJ5U2VsZWN0b3JBbGwoJy5waGFudG9tJyk7XG4gICAgXy5lYWNoKHBoYW50b21zLCBmdW5jdGlvbiAocGhhbnRvbSkge1xuICAgICAgICB2YXIgaW5kZXggPSBwaGFudG9tLmdldEF0dHJpYnV0ZSgnZGF0YS1pbmRleC10by1waGFudG9tJyk7XG4gICAgICAgIHZhciBibG9jayA9IGVsZW1lbnRzW2luZGV4XTtcbiAgICAgICAgY3JlYXRlUGhhbnRvbUxpbmtGb3JCbG9jayhibG9jaywgcGhhbnRvbSk7XG4gICAgfSk7XG59O1xuXG5zdG9yYWdlLnNhdmVQYXRjaCA9IGZ1bmN0aW9uICh3aGVyZSwgbmFtZSkge1xuICAgIGlmIChuYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gT25seSBvbmUgYXJndW1lbnQgbWVhbnMgaXQgaXMgYWN0dWFsbHkgdGhlIG5hbWUgYW5kIHdlIGxvYWQgZnJvbVxuICAgICAgICAvLyBsb2NhbHN0b3JhZ2UuXG4gICAgICAgIG5hbWUgPSB3aGVyZTtcbiAgICAgICAgd2hlcmUgPSAnbG9jYWwnO1xuICAgIH1cbiAgICB2YXIgcGF0Y2ggPSBleHBvcnRQYXRjaCgpO1xuICAgIGlmICh3aGVyZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgICAgICBwYXRjaGVzID0gcGF0Y2hlcyB8fCB7fTtcbiAgICAgICAgcGF0Y2hlc1tuYW1lXSA9IHBhdGNoO1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3BhdGNoZXMnLCBKU09OLnN0cmluZ2lmeShwYXRjaGVzKSk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2ZpbGUnKSB7XG4gICAgICAgIHZhciBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocGF0Y2gsIG51bGwsICcgICAgJyk7XG4gICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2NvbnRlbnRdLCB7IHR5cGUgOiBcInRleHQvcGxhaW5cIiwgZW5kaW5nczogXCJ0cmFuc3BhcmVudFwifSk7XG4gICAgICAgIHdpbmRvdy5zYXZlQXMoYmxvYiwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2JhZCBzYXZlIGxvY2F0aW9uIChcIicgKyB3aGVyZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIpLCBtdXN0IGJlIFwibG9jYWxcIiBvciBcImZpbGVcIicpO1xuICAgIH1cbn07XG5cbnN0b3JhZ2UubG9hZFBhdGNoID0gZnVuY3Rpb24gKHdoZXJlLCB3aGF0KSB7XG4gICAgaWYgKHdoYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB3aGF0ID0gd2hlcmU7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2hhdCkgPT09ICdbb2JqZWN0IEZpbGVdJykge1xuICAgICAgICAgICAgd2hlcmUgPSAnZmlsZSBvYmplY3QnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hlcmUgPSAnbG9jYWwnO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBwcm9taXNlO1xuICAgIGlmICh3aGVyZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgICAgICBwYXRjaGVzID0gcGF0Y2hlcyB8fCB7fTtcbiAgICAgICAgdmFyIHBhdGNoID0gcGF0Y2hlc1t3aGF0XTtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmIChwYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYXRjaCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChFcnJvcignTm8gcGF0Y2ggd2l0aCBuYW1lIFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGF0ICsgJ1wiIGluIGxvY2FsIHN0b3JhZ2UuJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnaHR0cCcpIHtcbiAgICAgICAgdmFyIHVybCA9IHdoYXQ7XG4gICAgICAgIHByb21pc2UgPSBodHRwLmdldCh1cmwpO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdmaWxlIG9iamVjdCcpIHtcbiAgICAgICAgdmFyIGZpbGUgPSB3aGF0O1xuICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIGZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UoZXZlbnQudGFyZ2V0LnJlc3VsdCkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZpbGVSZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcignYmFkIGxvYWQgbG9jYXRpb24gKFwiJyArIHdoZXJlICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdcIiksIG11c3QgYmUgXCJsb2NhbFwiIG9yIFwiaHR0cFwiJykpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbiAocGF0Y2gpIHtcbiAgICAgICAgZWRpdG9yLmNsZWFyQWxsKCk7XG4gICAgICAgIGltcG9ydFBhdGNoKHBhdGNoKTtcbiAgICB9KTtcbn07XG5cbnN0b3JhZ2UucmVtb3ZlUGF0Y2ggPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgcGF0Y2hlcyA9IHBhdGNoZXMgfHwge307XG4gICAgdmFyIHRyYXNoID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3RyYXNoJykpO1xuICAgIHRyYXNoID0gdHJhc2ggfHwge307XG4gICAgdmFyIHBhdGNoID0gcGF0Y2hlc1tuYW1lXTtcbiAgICBpZiAocGF0Y2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyAnTm8gcGF0Y2ggd2l0aCBuYW1lIFwiJyArIG5hbWUgKyAnXCIgaW4gbG9jYWwgc3RvcmFnZS4nO1xuICAgIH1cbiAgICB0cmFzaFtuYW1lXSA9IHBhdGNoO1xuICAgIGRlbGV0ZSBwYXRjaGVzW25hbWVdO1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGF0Y2hlcycsIEpTT04uc3RyaW5naWZ5KHBhdGNoZXMpKTtcbiAgICBlZGl0b3IuY2xlYXJBbGwoKTtcbn07XG5cbnN0b3JhZ2UuZ2V0UGF0Y2hOYW1lcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGF0Y2hlcyA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwYXRjaGVzJykpO1xuICAgIHJldHVybiBfLmtleXMocGF0Y2hlcyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0b3JhZ2U7XG4iLCIvLyBVc2Ugb2YgdGVybWxpYi5qcyBmb3IgdGhlIHRlcm1pbmFsIGZyYW1lLlxuXG4vKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cblxuLy8gZ2xvYmFscyBmcm9tIHRlcm1saWIuanNcbi8qZ2xvYmFsIFRlcm1HbG9iYWxzICovXG4vKmdsb2JhbCB0ZXJtS2V5ICovXG4vKmdsb2JhbCBQYXJzZXIgKi9cbi8qZ2xvYmFsIFRlcm1pbmFsICovXG5cbnZhciB0ZXJtaW5hbCA9IHt9O1xuXG50ZXJtaW5hbC5jcmVhdGUgPSBmdW5jdGlvbiAoY29tbWFuZHMsIG9uYmx1cikge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciB0ZXJtRGl2SWQgPSAnY29tbWFuZC1saW5lLWZyYW1lJztcblxuICAgIHZhciBnZXRUZXJtRGl2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycgKyB0ZXJtRGl2SWQpO1xuICAgIH07XG5cbiAgICB2YXIgYmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgVGVybUdsb2JhbHMua2V5bG9jayA9IHRydWU7XG4gICAgICAgIFRlcm1HbG9iYWxzLmFjdGl2ZVRlcm0uY3Vyc29yT2ZmKCk7XG4gICAgICAgIHZhciB0ZXJtRGl2ID0gZ2V0VGVybURpdigpO1xuICAgICAgICB0ZXJtRGl2LmNsYXNzTGlzdC50b2dnbGUoJ2ZvY3VzZWQnKTtcbiAgICAgICAgb25ibHVyKCk7XG4gICAgfTtcblxuICAgIHZhciBjdHJsSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRDaGFyID09PSB0ZXJtS2V5LkVTQykge1xuICAgICAgICAgICAgYmx1cigpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciB0ZXJtSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGF0Lm5ld0xpbmUoKTtcbiAgICAgICAgdmFyIHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbiAgICAgICAgcGFyc2VyLnBhcnNlTGluZSh0aGF0KTtcbiAgICAgICAgdmFyIGNvbW1hbmROYW1lID0gdGhhdC5hcmd2WzBdO1xuICAgICAgICBpZiAoY29tbWFuZHMuaGFzT3duUHJvcGVydHkoY29tbWFuZE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHRoYXQuYXJndi5zbGljZSgxKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNvbW1hbmRzW2NvbW1hbmROYW1lXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC50aGVuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53cml0ZSgnRXJyb3I6ICcgKyBlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhhdC53cml0ZShlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0LndyaXRlKCd1bmtub3duIGNvbW1hbmQgXCInICsgY29tbWFuZE5hbWUgKyAnXCIuJyk7XG4gICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBpbml0SGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wcm9tcHQoKTtcbiAgICB9O1xuXG4gICAgLy8gVGhlIHRlcm1saWIuanMgb2JqZWN0XG4gICAgdmFyIHRlcm0gPSBuZXcgVGVybWluYWwoIHtcbiAgICAgICAgdGVybURpdjogdGVybURpdklkLFxuICAgICAgICBoYW5kbGVyOiB0ZXJtSGFuZGxlcixcbiAgICAgICAgYmdDb2xvcjogJyNmMGYwZjAnLFxuICAgICAgICBjcnNyQmxpbmtNb2RlOiB0cnVlLFxuICAgICAgICBjcnNyQmxvY2tNb2RlOiBmYWxzZSxcbiAgICAgICAgcm93czogMTAsXG4gICAgICAgIGZyYW1lV2lkdGg6IDAsXG4gICAgICAgIGNsb3NlT25FU0M6IGZhbHNlLFxuICAgICAgICBjdHJsSGFuZGxlcjogY3RybEhhbmRsZXIsXG4gICAgICAgIGluaXRIYW5kbGVyOiBpbml0SGFuZGxlclxuXG4gICAgfSApO1xuICAgIHRlcm0ub3BlbigpO1xuXG4gICAgdmFyIGZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoVGVybUdsb2JhbHMua2V5bG9jayA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBUZXJtR2xvYmFscy5rZXlsb2NrID0gZmFsc2U7XG4gICAgICAgIFRlcm1HbG9iYWxzLmFjdGl2ZVRlcm0uY3Vyc29yT24oKTtcbiAgICAgICAgdmFyIHRlcm1EaXYgPSBnZXRUZXJtRGl2KCk7XG4gICAgICAgIHRlcm1EaXYuY2xhc3NMaXN0LnRvZ2dsZSgnZm9jdXNlZCcpO1xuICAgIH07XG5cbiAgICBibHVyKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBmb2N1czogZm9jdXMsXG4gICAgICAgIHRlcm06IHRlcm1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB0ZXJtaW5hbDtcbiIsIi8vIFN5bnRhY3RpYyBzdWdhciBhbmQgc2ltcGxlIHV0aWxpdGllcy5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuLypnbG9iYWwgZG9jdW1lbnQsIHdpbmRvdyAqL1xuXG4vKmdsb2JhbCBfICovXG5cbnZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMnKTtcblxudmFyIHV0aWxzID0ge307XG5cbnZhciBkb207XG5kb20gPSB7XG4gICAgLy8gQ3JlYXRlIGEgZG9tIGZyYWdtZW50IGZyb20gYSBIVE1MIHN0cmluZy5cbiAgICBjcmVhdGVGcmFnbWVudDogZnVuY3Rpb24oaHRtbFN0cmluZykge1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGlmIChodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgZGl2ID0gZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xuICAgICAgICAgICAgZGl2LmlubmVySFRNTCA9IGh0bWxTdHJpbmc7XG4gICAgICAgICAgICB2YXIgY2hpbGQ7XG4gICAgICAgICAgICAvKmVzbGludC1kaXNhYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgICAgICAgICB3aGlsZSAoY2hpbGQgPSBkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIC8qZXNsaW50LWVuYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgICAgICAgICAgICAgIGZyYWdtZW50Lmluc2VydEJlZm9yZShjaGlsZCwgZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWdtZW50LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH0sXG5cbiAgICAvLyBNb3ZlIERPTSBub2RlcyBmcm9tIGEgc291cmNlIHRvIGEgdGFyZ2V0LiBUaGUgbm9kZXMgYXJlcyBzZWxlY3RlZFxuICAgIC8vIGJhc2VkIG9uIGEgc2VsZWN0b3IgYW5kIHRoZSBwbGFjZSB0aGV5IGFyZSBpbnN0ZXJ0ZWQgaXMgYSBnaXZlbiB0YWdcbiAgICAvLyB3aXRoIGEgXCJzZWxlY3RcIiBhdHRyaWJ1dGUgd2hpY2ggY29udGFpbnMgdGhlIGdpdmVuIHNlbGVjdG9yLiBJZlxuICAgIC8vICAgIHNvdXJjZSBpcyAnYWFhIDxzcGFuIGNsYXNzPVwic29tZXRoaW5nXCI+enp6PC9zcGFuPidcbiAgICAvLyBhbmRcbiAgICAvLyAgICB0YXJnZXQgaXMgJ3JyciA8Y29udGVudCBzZWxlY3Q9XCIuc29tZXRoaW5nXCI+PC9jb250ZW50PiB0dHQnXG4gICAgLy8gQWZ0ZXIgbW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3Ioc291cmNlLCB0YXJnZXQsICcuc29tZXRoaW5nJyk6XG4gICAgLy8gICAgc291cmNlIGlzICdhYWEnXG4gICAgLy8gYW5kXG4gICAgLy8gICAgdGFyZ2V0IGlzICdycnIgPHNwYW4gY2xhc3M9XCJzb21ldGhpbmdcIj56eno8L3NwYW4+IHR0dCdcbiAgICBtb3ZlQ29udGVudEJhc2VkT25TZWxlY3RvcjogZnVuY3Rpb24oc291cmNlLCB0YXJnZXQsIHNlbGVjdG9yLCB0YXJnZXRUYWcpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQ7XG4gICAgICAgIHZhciBlbGVtZW50cztcbiAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnJykge1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKHRhcmdldFRhZyk7XG4gICAgICAgICAgICBlbGVtZW50cyA9IHNvdXJjZS5jaGlsZE5vZGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKHRhcmdldFRhZyArICdbc2VsZWN0PVwiJyArIHNlbGVjdG9yICsgJ1wiXScpO1xuICAgICAgICAgICAgZWxlbWVudHMgPSBzb3VyY2UucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2FybmluZzogaXQgaXMgaW1wb3J0YW50IHRvIGxvb3AgZWxlbWVudHMgYmFja3dhcmQgc2luY2UgY3VycmVudFxuICAgICAgICAvLyBlbGVtZW50IGlzIHJlbW92ZWQgYXQgZWFjaCBzdGVwLlxuICAgICAgICBmb3IgKHZhciBpID0gZWxlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICAvLyBUT0RPLiBMZSBcImluc2VydFwiIGNpLWRlc3NvdXMgc3VyIGxlcyB6LXBvcnQgZmFpdCBxdWUgbGVcbiAgICAgICAgICAgIC8vIGRldGFjaGVkQ2FsbGJhY2sgZXN0IGFwcGVsw6kgYXZlYyBsJ2ltcGxlbWVudGF0aW9uIGRlIGN1c3RvbVxuICAgICAgICAgICAgLy8gZWxtZW50cyBwYXIgd2VicmVmbGVjdGlvbnMgbWFpcyBwYXMgcGFyIGwnaW1wbMOpbWVudGF0aW9uIGRlXG4gICAgICAgICAgICAvLyBQb2x5bWVyIChlbiB1dGlsaXNhbnQgbGUgcG9seWZpbGwgZGUgQm9zb25pYykgbmkgYXZlY1xuICAgICAgICAgICAgLy8gbCdpbXBsw6ltZW50YXRpb24gbmF0aXZlIGRlIGNocm9tZS5cbiAgICAgICAgICAgIGNvbnRlbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBUT0RPIG1vdmUgdGhpcyBlbHNld2hlcmUuXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5vbmNsaWNrID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb21tYW5kcy5lZGl0QmxvY2soc291cmNlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjb250ZW50KTtcbiAgICB9LFxuXG4gICAgbW92ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gZG9tLm1vdmVDb250ZW50QmFzZWRPblNlbGVjdG9yKFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZnJvbSxcbiAgICAgICAgICAgICAgICBvcHRpb25zLnRvLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMud2l0aFNlbGVjdG9yLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMub25UYWdcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLy8gR2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCByZWxhdGl2ZSB0byBhbm90aGVyIG9uZSAoZGVmYXVsdCBpc1xuICAgIC8vIGRvY3VtZW50IGJvZHkpLlxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoZWxlbWVudCwgcmVsYXRpdmVFbGVtZW50KSB7XG4gICAgICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmVsYXRpdmVFbGVtZW50ID0gcmVsYXRpdmVFbGVtZW50IHx8IGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHZhciByZWxhdGl2ZVJlY3QgPSByZWxhdGl2ZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiByZWN0LmxlZnQgLSByZWxhdGl2ZVJlY3QubGVmdCxcbiAgICAgICAgICAgIHk6IHJlY3QudG9wIC0gcmVsYXRpdmVSZWN0LnRvcFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBnZXRTZWxlY3Rpb25TdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmdldFNlbGVjdGlvbigpLmFuY2hvck5vZGU7XG4gICAgICAgIHJldHVybiAoIChub2RlICE9PSBudWxsICYmIG5vZGUubm9kZVR5cGUgPT09IDMpID8gbm9kZS5wYXJlbnROb2RlIDogbm9kZSApO1xuICAgIH1cblxufTtcbnV0aWxzLmRvbSA9IGRvbTtcblxuLy8gVXNlZnVsbCBmb3IgbXVsdGlsaW5lIHN0cmluZyBkZWZpbml0aW9uIHdpdGhvdXQgJ1xcJyBvciBtdWx0aWxpbmVcbi8vIGNvbmNhdGVuYXRpb24gd2l0aCAnKycuXG51dGlscy5zdHJpbmdGcm9tQ29tbWVudEluRnVuY3Rpb24gPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmMudG9TdHJpbmcoKS5tYXRjaCgvW15dKlxcL1xcKihbXl0qKVxcKlxcL1xccypcXH0kLylbMV07XG59O1xuXG51dGlscy5jcmVhdGVLZXlzR2VuZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFJldHVybnMgYSBrZXlzIGdlbmVyYXRvciBmb3IgYSBzZXF1ZW5jZSB0aGF0IGlzIGJ1aWxkIGxpa2UgdGhhdDpcbiAgICAvLyAgIGIsIGMsIGQuLi5cbiAgICAvLyAgIGFiLCBhYywgYWQuLi5cbiAgICAvLyAgIGFhYiwgYWFjLCBhYWQuLi5cbiAgICAvLyBUaGUgaWRlYSBpcyB0byBoYXZlIGEgc2VxdWVuY2Ugd2hlcmUgZWFjaCB2YWx1ZSBpcyBub3QgdGhlIGJlZ2lubmluZ1xuICAgIC8vIG9mIGFueSBvdGhlciB2YWx1ZSAoc28gc2luZ2xlICdhJyBjYW4ndCBiZSBwYXJ0IG9mIHRoZSBzZXF1ZW5jZSkuXG4gICAgLy9cbiAgICAvLyBPbmUgZ29hbCBpcyB0byBoYXZlIHNob3J0ZXN0IHBvc3NpYmxlIGtleXMuIFNvIG1heWJlIHdlIHNob3VsZCB1c2VcbiAgICAvLyBhZGRpdGlvbm5hbCBwcmVmaXggY2hhcnMgYWxvbmcgd2l0aCAnYScuIEFuZCBiZWNhdXNlIGl0IHdpbGwgYmUgdXNlZFxuICAgIC8vIGZvciBzaG9ydGN1dHMsIG1heWJlIHdlIGNhbiBjaG9vc2UgY2hhcnMgYmFzZWQgb24gdGhlaXIgcG9zaXRpb24gb25cbiAgICAvLyB0aGUga2V5Ym9hcmQuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgY2hhckNvZGVzID0gXy5yYW5nZSgnYicuY2hhckNvZGVBdCgwKSwgJ3onLmNoYXJDb2RlQXQoMCkgKyAxKTtcbiAgICB2YXIgaWRTdHJpbmdzID0gXy5tYXAoY2hhckNvZGVzLCBmdW5jdGlvbiAoY2hhckNvZGUpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUpO1xuICAgIH0pO1xuICAgIHZhciBnZW5lcmF0b3IgPSB7fTtcbiAgICBnZW5lcmF0b3IubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGtleSA9ICcnO1xuICAgICAgICB2YXIgaSA9IGluZGV4O1xuICAgICAgICBpZiAoaSA+PSBjaGFyQ29kZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgciA9IE1hdGguZmxvb3IoaSAvIGNoYXJDb2Rlcy5sZW5ndGgpO1xuICAgICAgICAgICAgaSA9IGkgJSBjaGFyQ29kZXMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKHIgPiAwKSB7XG4gICAgICAgICAgICAgICAga2V5ICs9ICdhJztcbiAgICAgICAgICAgICAgICByLS07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAga2V5ICs9IGlkU3RyaW5nc1tpXTtcbiAgICAgICAgaW5kZXgrKztcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGdlbmVyYXRvcjtcbn07XG5cbndpbmRvdy51dGlscyA9IHV0aWxzO1xubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgd2luZG93ICovXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuXG4vKmdsb2JhbCBfICovXG4vKmdsb2JhbCBNb3VzZXRyYXAgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG5cbnZhciB2aWV3ID0ge307XG5cbnZhciBpc0Rlc2NlbmRhbnQgPSBmdW5jdGlvbiAoY2hpbGQsIHBhcmVudCkge1xuICAgICB2YXIgbm9kZSA9IGNoaWxkLnBhcmVudE5vZGU7XG4gICAgIHdoaWxlIChub2RlICE9PSBudWxsKSB7XG4gICAgICAgICBpZiAobm9kZSA9PT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICB9XG4gICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICB9XG4gICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBnZXRQcmVzZW50YXRpb25FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpO1xufTtcblxudmFyIGNyZWF0ZVBoYW50b21MaW5rID0gZnVuY3Rpb24gKHBoYW50b21lZCwgcGhhbnRvbSkge1xuICAgIHBoYW50b20ucGhhbnRvbU9mID0gcGhhbnRvbWVkO1xuICAgIHBoYW50b20uY2xhc3NMaXN0LmFkZCgncGhhbnRvbScpO1xuICAgIHBoYW50b21lZC5waGFudG9tZWRCeSA9IHBoYW50b207XG4gICAgcGhhbnRvbWVkLmNsYXNzTGlzdC5hZGQoJ3BoYW50b21lZCcpO1xufTtcbnZpZXcuY3JlYXRlUGhhbnRvbUxpbmsgPSBjcmVhdGVQaGFudG9tTGluaztcblxudmFyIGNyZWF0ZVBoYW50b20gPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgcGhhbnRvbSA9IGVsZW1lbnQuY2xvbmVOb2RlKHRydWUpO1xuICBwaGFudG9tLmRpc2FibGVkID0gdHJ1ZTtcbiAgcGhhbnRvbS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRFZGl0YWJsZScsIGZhbHNlKTtcbiAgLy8gTGluayB0aGUgdHdvIGZvciBsYXRlciB1c2UgKGluIHBhcnRpY3VsYXJ5IHdoZW4gd2Ugd2lsbCBzd2l0Y2hcbiAgLy8gZGlzcGxheSBtb2RlKS5cbiAgY3JlYXRlUGhhbnRvbUxpbmsoZWxlbWVudCwgcGhhbnRvbSk7XG5cbiAgcmV0dXJuIHBoYW50b207XG59O1xuXG52YXIgaXNDdXJyZW50U2VsZWN0aW9uSW5QcmVzZW50YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCB0aGUgc2VsZWN0aW9uIHJhbmdlIChvciBjdXJzb3IgcG9zaXRpb24pXG4gIHZhciByYW5nZSA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICB2YXIgemVQcmVzZW50YXRpb24gPSBnZXRQcmVzZW50YXRpb25FbGVtZW50KCk7XG4gIC8vIEJlIHN1cmUgdGhlIHNlbGVjdGlvbiBpcyBpbiB0aGUgcHJlc2VudGF0aW9uLlxuICByZXR1cm4gaXNEZXNjZW5kYW50KHJhbmdlLnN0YXJ0Q29udGFpbmVyLCB6ZVByZXNlbnRhdGlvbik7XG59O1xuXG52YXIgaW5zZXJ0SW5QbGFjZU9mU2VsZWN0aW9uID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgLy8gR2V0IHRoZSBzZWxlY3Rpb24gcmFuZ2UgKG9yIGN1cnNvciBwb3NpdGlvbilcbiAgdmFyIHJhbmdlID0gd2luZG93LmdldFNlbGVjdGlvbigpLmdldFJhbmdlQXQoMCk7XG4gIC8vIERlbGV0ZSB3aGF0ZXZlciBpcyBvbiB0aGUgcmFuZ2VcbiAgcmFuZ2UuZGVsZXRlQ29udGVudHMoKTtcbiAgcmFuZ2UuaW5zZXJ0Tm9kZShlbGVtZW50KTtcbn07XG5cbi8vIEluc2VydCBhIHNlbGVjdGVkIGJsb2NrIGluIHRoZSBET00gc2VsZWN0aW9uIGluIHByZXNlbnRhdGlvbiB3aW5kb3cuXG52YXIgaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBibG9jayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudCcpO1xuICBpZiAoYmxvY2sgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE5vdGhpbmcgaXMgc2VsZWN0ZWQuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYoaXNDdXJyZW50U2VsZWN0aW9uSW5QcmVzZW50YXRpb24oKSkge1xuICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICB2YXIgcGhhbnRvbSA9IGNyZWF0ZVBoYW50b20oY29udGVudCk7XG4gICAgaW5zZXJ0SW5QbGFjZU9mU2VsZWN0aW9uKHBoYW50b20pO1xuXG4gICAgLy8gVE9ETyBldmVudHVhbGx5IHN3aXRjaCB0aGUgdHdvIGlmIHdlIGFyZSBpbiBwcmVzZW50YXRpb24gbW9kZS5cbiAgfVxufTtcbnZpZXcuaW5zZXJ0QmxvY2tDb250ZW50SW5TZWxlY3Rpb24gPSBpbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbjtcblxudmFyIGdldFBoYW50b21zID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgcmV0dXJuIGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbn07XG5cbnZhciBnZXRXaW5kb3dGb3JNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcbiAgdmFyIGlkID0gbW9kZTtcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbn07XG5cbnZhciBzd2FwRWxlbWVudHMgPSBmdW5jdGlvbiAob2JqMSwgb2JqMikge1xuICAgIC8vIGNyZWF0ZSBtYXJrZXIgZWxlbWVudCBhbmQgaW5zZXJ0IGl0IHdoZXJlIG9iajEgaXNcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG9iajEucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGVtcCwgb2JqMSk7XG5cbiAgICAvLyBtb3ZlIG9iajEgdG8gcmlnaHQgYmVmb3JlIG9iajJcbiAgICBvYmoyLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG9iajEsIG9iajIpO1xuXG4gICAgLy8gbW92ZSBvYmoyIHRvIHJpZ2h0IGJlZm9yZSB3aGVyZSBvYmoxIHVzZWQgdG8gYmVcbiAgICB0ZW1wLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG9iajIsIHRlbXApO1xuXG4gICAgLy8gcmVtb3ZlIHRlbXBvcmFyeSBtYXJrZXIgbm9kZVxuICAgIHRlbXAucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0ZW1wKTtcbn07XG5cbnZhciBjdXJyZW50TW9kZSA9ICcnO1xuXG4vLyBEbyBhbGwgdGhlIHN0dWZmIG5lZWRlZCB0byBzd2l0Y2ggbW9kZSBiZXR3ZWVuICdlZGl0JyBhbmQgJ3ByZXNlbnRhdGlvbicuXG4vLyBNYWlubHkgc3dhcCAncGhhbnRvbScgYW5kICdwaGFudG9tZWQnIG9iamVjdHMgcGFpcnMuXG52YXIgc3dpdGNoTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG4gICAgaWYgKG1vZGUgPT09IGN1cnJlbnRNb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY3VycmVudE1vZGUgPSBtb2RlO1xuICAvLyBCeSBjb252ZW50aW9uLCB0aGUgJ3BoYW50b20nIGVsZW1lbnRzIGFjdHVhbGx5IGFyZSBpbiB0aGUgd2luZG93XG4gIC8vIGFzc29jaWF0ZWQgdG8gdGhlIG1vZGUgd2Ugd2FudCB0byBzd2l0Y2ggdG8uIFRoZSBwaGFudG9tZWQgb25lIGFyZSBpbiB0aGVcbiAgLy8gd2luZG93IG9mIHRoZSBvdGhlciBtb2RlLlxuXG4gIHZhciBwaGFudG9tcyA9IGdldFBoYW50b21zKGdldFdpbmRvd0Zvck1vZGUobW9kZSkpO1xuICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgLy8gV2hhdCB0aGlzIG9iamVjdCBpcyB0aGUgcGhhbnRvbSBvZj9cbiAgICB2YXIgcGhhbnRvbWVkID0gcGhhbnRvbS5waGFudG9tT2Y7XG4gICAgLy8gU2ltcGx5IHN3YXAgdGhlc2UgRE9NIG9iamVjdHMuXG4gICAgc3dhcEVsZW1lbnRzKHBoYW50b21lZCwgcGhhbnRvbSk7XG4gIH0pO1xufTtcbnZpZXcuc3dpdGNoTW9kZSA9IHN3aXRjaE1vZGU7XG5cbnZhciBwcmVzZW50YXRpb24gPSB7fTtcblxuLy8gVE9ETyBub3QgdXNlZD9cbnZhciBzZWxlY3RFbGVtZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHByZXNlbnRhdGlvbi5zZWxlY3RlZCA9IGV2ZW50LnRhcmdldDtcbn07XG52aWV3LnNlbGVjdEVsZW1lbnQgPSBzZWxlY3RFbGVtZW50O1xuXG52YXIgbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLmNvbnRlbnRFZGl0YWJsZSA9IGZhbHNlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNsb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdW5sb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gZmFsc2U7XG59O1xudmlldy5sb2NrID0gbG9jaztcblxudmFyIHVubG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLmNvbnRlbnRFZGl0YWJsZSA9IHRydWU7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xvY2stYnV0dG9uJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdW5sb2NrLWJ1dHRvbicpLmRpc2FibGVkID0gdHJ1ZTtcbn07XG52aWV3LnVubG9jayA9IHVubG9jaztcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcCA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgICBwLm9uZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgIH07XG4gICAgcC5vbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbW1hbmRzLmJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9O1xufTtcbnZpZXcuaW5pdCA9IGluaXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gdmlldztcbmdsb2JhbC52aWV3ID0gdmlldztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuLypnbG9iYWwgcmVzdHlsZSAqL1xuLypnbG9iYWwgRHJhZ2dhYmlsbHkgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LWJsb2NrJztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8ZGl2IGlkPVwibWFpblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicG9ydHMtY29udGFpbmVyIGlucHV0c1wiPlxuICAgICAgICAgICAgPGNvbnRlbnQgc2VsZWN0PVwiei1wb3J0LmlucHV0XCI+PC9jb250ZW50PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJibG9jay1rZXlcIj5hPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudC1jb250YWluZXJcIj5cbiAgICAgICAgICAgIDxjb250ZW50PjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwb3J0cy1jb250YWluZXIgb3V0cHV0c1wiPlxuICAgICAgICAgICAgPGNvbnRlbnQgc2VsZWN0PVwiei1wb3J0Lm91dHB1dFwiPjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgIC8vIEJ5IGRlZmF1bHQgY3VzdG9tIGVsZW1lbnRzIGFyZSBpbmxpbmUgZWxlbWVudHMuIEN1cnJlbnQgZWxlbWVudFxuICAgICAgICAvLyBoYXMgaXRzIG93biBoZWlnaHQgYW5kIHdpZHRoIGFuZCBjYW4gYmUgaW5zdGVydGVkIGluIGEgdGV4dFxuICAgICAgICAvLyBmbG93LiBTbyB3ZSBuZWVkIGEgJ2Rpc3BsYXk6IGlubGluZS1ibG9jaycgc3R5bGUuIE1vcmVvdmVyLCB0aGlzXG4gICAgICAgIC8vIGlzIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgZm9yIGEgYnVnIGluIERyYWdnYWJpbGx5ICh3aGljaCBvbmx5XG4gICAgICAgIC8vIHdvcmtzIG9uIGJsb2NrIGVsZW1lbnRzLCBub3Qgb24gaW5saW5lIG9uZXMpLlxuICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnXG4gICAgfSxcbiAgICAnPiBkaXYnOiB7XG4gICAgICAgICdiYWNrZ3JvdW5kJzogJ3doaXRlJyxcbiAgICAgICAgJ2JvcmRlci1sZWZ0JzogJzNweCBzb2xpZCcsXG4gICAgICAgICdib3JkZXItbGVmdC1jb2xvcic6ICd3aGl0ZScsXG4gICAgICAgICdib3JkZXItcmlnaHQnOiAnM3B4IHNvbGlkJyxcbiAgICAgICAgJ2JvcmRlci1yaWdodC1jb2xvcic6ICd3aGl0ZScsXG4gICAgICAgICdib3hTaGFkb3cnOiAnMnB4IDJweCAzcHggMHB4ICNkZmRmZGYnXG4gICAgfSxcbiAgICAnLmNvbnRlbnQtY29udGFpbmVyJzoge1xuICAgICAgICAncGFkZGluZyc6ICc4cHggMTVweCA4cHggMTVweCdcbiAgICB9LFxuICAgICcucG9ydHMtY29udGFpbmVyJzoge1xuICAgICAgICAncGFkZGluZyc6IDAsXG4gICAgICAgICdtaW5IZWlnaHQnOiAzLFxuICAgICAgICAnb3ZlcmZsb3cnOiAndmlzaWJsZSdcbiAgICB9LFxuICAgICcucG9ydHMtY29udGFpbmVyIHotcG9ydCc6IHtcbiAgICAgICAgJ2Zsb2F0JzogJ2xlZnQnLFxuICAgICAgICAnbWFyZ2luTGVmdCc6IDgsXG4gICAgICAgICdtYXJnaW5SaWdodCc6IDhcbiAgICB9LFxuICAgICdzcGFuLmJsb2NrLWtleSc6IHtcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6ICdzbWFsbGVyJyxcbiAgICAgICAgJ2NvbG9yJzogJyM0NDQnLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnYm90dG9tJzogMCxcbiAgICAgICAgJ3JpZ2h0JzogMCxcbiAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiAzLFxuICAgICAgICAncGFkZGluZy1sZWZ0JzogMyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2ZmZidcbiAgICB9LFxuICAgICd6LXBvcnQuaW5wdXQgLnBvcnQta2V5Jzoge1xuICAgICAgICAndG9wJzogM1xuICAgIH0sXG4gICAgJ3otcG9ydC5vdXRwdXQgLnBvcnQta2V5Jzoge1xuICAgICAgICAnYm90dG9tJzogM1xuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgIHBvcnQucmVkcmF3KCk7XG4gICAgfSk7XG59O1xuXG52YXIgbWFrZUl0RHJhZ2dhYmxlID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIGRyYWdnaWUgPSBuZXcgRHJhZ2dhYmlsbHkoYmxvY2ssIHtcbiAgICAgICAgY29udGFpbm1lbnQ6IHRydWVcbiAgICB9KTtcbiAgICBkcmFnZ2llLmV4dGVybmFsQW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVkcmF3KGJsb2NrKTtcbiAgICB9O1xufTtcblxudmFyIHByb3BlcnRpZXMgPSB7XG4gICAgY3JlYXRlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBBdCB0aGUgYmVnaW5uaW5nIHRoZSBsaWdodCBET00gaXMgc3RvcmVkIGluIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgICAgIHZhciBsaWdodERvbSA9IHRoaXM7XG4gICAgICAgIC8vIFN0YXJ0IGNvbXBvc2VkIERPTSB3aXRoIGEgY29weSBvZiB0aGUgdGVtcGxhdGVcbiAgICAgICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAvLyBUaGVuIHByb2dyZXNzaXZlbHkgbW92ZSBlbGVtZW50cyBmcm9tIGxpZ2h0IHRvIGNvbXBvc2VkIERPTSBiYXNlZCBvblxuICAgICAgICAvLyBzZWxlY3RvcnMgb24gbGlnaHQgRE9NIGFuZCBmaWxsIDxjb250ZW50PiB0YWdzIGluIGNvbXBvc2VkIERPTSB3aXRoXG4gICAgICAgIC8vIHRoZW0uXG4gICAgICAgIFsnei1wb3J0LmlucHV0JywgJ3otcG9ydC5vdXRwdXQnLCAnJ10uZm9yRWFjaChmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgICAgdXRpbHMuZG9tLm1vdmUoe1xuICAgICAgICAgICAgICAgIGZyb206IGxpZ2h0RG9tLCB3aXRoU2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgIHRvOiBjb21wb3NlZERvbSwgb25UYWc6ICdjb250ZW50J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBBdCB0aGlzIHN0YWdlIGNvbXBvc2VkIERPTSBpcyBjb21wbGV0ZWQgYW5kIGxpZ2h0IERPTSBpcyBlbXB0eSAoaS5lLlxuICAgICAgICAvLyAndGhpcycgaGFzIG5vIGNoaWxkcmVuKS4gQ29tcG9zZWQgRE9NIGlzIHNldCBhcyB0aGUgY29udGVudCBvZiB0aGVcbiAgICAgICAgLy8gY3VycmVudCBlbGVtZW50LlxuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgICAgICB0aGlzLmhpZGVLZXkoKTtcblxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciBwb3J0cyA9IHRoYXQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24ocG9ydCkge1xuICAgICAgICAgICAgcG9ydC5ibG9jayA9IHRoYXQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMucXVlcnlTZWxlY3RvcignLnplLWNvbnRlbnQnKTtcblxuICAgICAgICAvLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG4gICAgICAgIHRoaXMub25jbGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHdpbmRvdy5zZXRDdXJyZW50QmxvY2sodGhhdCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG4gICAgfX0sXG5cbiAgICBhdHRhY2hlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBUT0RPIGJ1ZyBpbiBjaHJvbWUgb3IgaW4gd2VicmVmbGVjdGlvbiBwb2x5ZmlsbC4gSWYgbWFrZUl0RHJhZ2dhYmxlXG4gICAgICAgIC8vIGlzIGNhbGxlZCBpbiBjcmVhdGVkQ2FsbGJhY2sgdGhlbiBEcmFnZ2FiaWx5IGFkZHMgYVxuICAgICAgICAvLyAncG9zaXRpb246cmVsYXRpdmUnIGJlY2F1c2UgdGhlIGNzcyBzdHlsZSBvZiBibG9jayB0aGF0IHNldFxuICAgICAgICAvLyBwb3NpdGlvbiB0byBhYnNvbHV0ZSBoYXMgbm90IGJlZW4gYXBwbGllZCB5ZXQgKHdpdGggY2hyb21lKS4gV2l0aFxuICAgICAgICAvLyBXZWJSZWZsZWN0aW9uJ3MgcG9seWZpbGwgdGhlIHN0eWxlIGlzIGFwcGxpZWQgc28gRHJhZ2dhYmlsbHkgZG9lc24ndFxuICAgICAgICAvLyBjaGFuZ2UgcG9zaXRpb24uIFdoeSBhIGRpZmZlcmVudCBiZWhhdmlvdXI/IFdoaWNoIGlzIHdyb25nID8gQ2hyb21lLFxuICAgICAgICAvLyB3ZWJyZWZsZWN0aW9uIG9yIHRoZSBzcGVjPyBNYXliZSB3ZSBjYW4gdHJ5IHdpdGggcG9seW1lciBwb2x5ZmlsbC5cbiAgICAgICAgbWFrZUl0RHJhZ2dhYmxlKHRoaXMpO1xuICAgIH19LFxuXG4gICAgdW5wbHVnOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcG9ydHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgICAgICBwb3J0LnVucGx1ZygpO1xuICAgICAgICB9KTtcbiAgICB9fSxcblxuICAgIGFkZFBvcnQ6IHt2YWx1ZTogZnVuY3Rpb24gKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxTdHJpbmcpO1xuICAgICAgICB2YXIgcG9ydCA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgIHBvcnQuYmxvY2sgPSB0aGlzO1xuICAgICAgICBpZiAocG9ydC5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JykpIHtcbiAgICAgICAgICAgIHZhciBwb3J0Q29udGFpbmVyID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcucG9ydHMtY29udGFpbmVyLmlucHV0cycpO1xuICAgICAgICAgICAgcG9ydENvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAocG9ydC5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKSB7XG4gICAgICAgICAgICB2YXIgcG9ydENvbnRhaW5lciA9IHRoaXMucXVlcnlTZWxlY3RvcignLnBvcnRzLWNvbnRhaW5lci5vdXRwdXRzJyk7XG4gICAgICAgICAgICBwb3J0Q29udGFpbmVyLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcG9ydDtcbiAgICB9fSxcblxuICAgIGtleUVsZW1lbnQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKCdzcGFuLmJsb2NrLWtleScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleToge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5rZXlFbGVtZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNob3dLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICB9fSxcblxuICAgIGhpZGVLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIH19LFxuXG4gICAgcG9ydHM6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdvdXQnOiB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3otcG9ydC5vdXRwdXQnKSxcbiAgICAgICAgICAgICAgICAnaW5wdXRzJzogdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKSxcbiAgICAgICAgICAgICAgICAnb3V0cHV0cyc6IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsIHByb3BlcnRpZXMpO1xucHJvdG8uY3NzID0gc3R5bGU7XG5kb2N1bWVudC5yZWdpc3RlckVsZW1lbnQodGFnTmFtZSwge3Byb3RvdHlwZTogcHJvdG99KTtcblxuLy8gVE9ETyBjbGVhbiBnbG9iYWxzXG53aW5kb3cuZ2V0RWxlbWVudEJsb2NrID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBUT0RPIGRvIGEgc2VhcmNoIHRvIGZpbmQgdGhlIGZpcnN0IHBhcmVudCBibG9jayBmb3IgY2FzZXMgd2hlcmVcbiAgICAvLyBlbGVtZW50IGlzIGRvd24gaW4gdGhlIGVsZW1lbnQgaGllYXJjaHkuXG4gICAgdmFyIG1heWJlQmxvY2sgPSBlbGVtZW50LnBhcmVudE5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIHZhciBibG9jaztcbiAgICBpZiAobWF5YmVCbG9jay50YWdOYW1lID09PSAnWi1CTE9DSycpIHtcbiAgICAgICAgYmxvY2sgPSBtYXliZUJsb2NrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGJsb2NrID0gZWxlbWVudC5waGFudG9tZWRCeS5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGJsb2NrO1xufTtcbiIsIi8vIEN1c3RvbSBlbGVtZW50IHRvIGRyYXcgYSBsaW5rIGJldHdlZW4gdHdvIHBvcnRzLlxuXG4vLyBXZSBpbXBsZW1lbnQgdGhpcyBhcyBhIGRpdiB3aXRoIHplcm8gaGVpZ2h0IHdoaWNoIHdpZHRoIGlzIHRoZSBsZW5ndGggb2YgdGhlXG4vLyBsaW5lIGFuZCB1c2UgdHJhbnNmb3JtcyB0byBzZXQgaXRzIGVuZHMgdG8gdGhlIHBvcnRzIHBvc2l0aW9ucy4gUmVmZXJlbmNlXG4vLyBvcmlnaW4gcG9zaXRpb24gaXMgcmVsYXRpdmUgY29vcmRpbmF0ZXMgKDAsMCkgYW5kIG90aGVyIGVuZCBpcyAod2lkdGgsMCkuXG4vLyBTbyBiZSBzdXJlIHRoYXQgQ1NTIHN0eWxpbmcgaXMgZG9uZSBhY2NvcmRpbmdseS5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuLypnbG9iYWwgSFRNTEVsZW1lbnQgKi9cblxuLypnbG9iYWwgZ2V0U3R5bGVQcm9wZXJ0eSAqL1xuXG4vKmdsb2JhbCBfICovXG4vKmdsb2JhbCByZXN0eWxlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1saW5rJztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8ZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj5cbiAgICA8L2Rpdj5cbiovfSk7XG52YXIgdGVtcGxhdGUgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFRlbXBsYXRlKTtcblxuLy8gVE9ETyBVc2UgYSBjdXN0b20gZWxlbWVudCBmb3IgbGluZSB3aWR0aC5cbnZhciBsaW5lV2lkdGggPSAzLjA7XG52YXIgcmFkaXVzID0gbGluZVdpZHRoIC8gMjtcbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdoZWlnaHQnOiAwLFxuICAgICAgICAnbWFyZ2luLWxlZnQnOiAtcmFkaXVzLFxuICAgICAgICAnbWFyZ2luLXRvcCc6IC1yYWRpdXMsXG4gICAgICAgICdib3JkZXJXaWR0aCc6IHJhZGl1cyxcbiAgICAgICAgJ2JvcmRlclJhZGl1cyc6IHJhZGl1cyxcbiAgICAgICAgJ2JvcmRlclN0eWxlJzogJ3NvbGlkJyxcbiAgICAgICAgJ2JveFNoYWRvdyc6ICcwcHggMHB4IDNweCAwcHggI2RmZGZkZicsXG4gICAgICAgICdib3JkZXJDb2xvcic6ICcjY2NjJ1xuICAgIH0sXG4gICAgJ2Rpdi5zZWxlY3Rvcic6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAnMTAlJyxcbiAgICAgICAgJ3dpZHRoJzogJzgwJScsXG4gICAgICAgICd0b3AnOiAtNyxcbiAgICAgICAgJ2hlaWdodCc6IDE0LFxuICAgICAgICAnekluZGV4JzogMCxcbiAgICAgICAgJ2JvcmRlckNvbG9yJzogJyMzMzMnXG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIGdldFBvbGFyQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbihwb3NpdGlvbjEsIHBvc2l0aW9uMikge1xuICAgIHZhciB4RGlmZiA9IHBvc2l0aW9uMS54IC0gcG9zaXRpb24yLng7XG4gICAgdmFyIHlEaWZmID0gcG9zaXRpb24xLnkgLSBwb3NpdGlvbjIueTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1vZDogTWF0aC5zcXJ0KHhEaWZmICogeERpZmYgKyB5RGlmZiAqIHlEaWZmKSxcbiAgICAgICAgYXJnOiBNYXRoLmF0YW4oeURpZmYgLyB4RGlmZilcbiAgICB9O1xufTtcblxuLy8gU2V0IHRoZSBzdHlsZSBvZiBhIGdpdmVuIGVsZW1lbnQgc28gdGhhdDpcbi8vICogSXRzIG9yaWdpbiAoaS5lLiAwLDAgcmVsYXRpdmUgY29vcmRpbmF0ZXMpIGlzIHBsYWNlZCBhdCBvbmUgcG9zaXRpb24uXG4vLyAqIEl0cyB3aWR0aCBpcyBzZXQgdG8gdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBwb3NpdGlvbnMuXG4vLyAqIEl0IGlzIHJvdGF0ZWQgc28gdGhhdCBpdHMgZW5kIHBvaW50ICh4ID0gd2lkdGggYW5kIHkgPSAwKSBpcyBwbGFjZWQgYXRcbi8vIHRoZSBvdGhlciBwb3NpdGlvbi5cbnZhciB0cmFuc2Zvcm1Qcm9wZXJ0eSA9IGdldFN0eWxlUHJvcGVydHkoJ3RyYW5zZm9ybScpO1xudmFyIHNldEVsZW1lbnRFbmRzID0gZnVuY3Rpb24oZWxlbWVudCwgZW5kMSwgZW5kMikge1xuICAgIHZhciBvcmlnaW47XG4gICAgaWYgKGVuZDEueCA8IGVuZDIueCkge1xuICAgICAgICBvcmlnaW4gPSBlbmQxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9yaWdpbiA9IGVuZDI7XG4gICAgfVxuXG4gICAgdmFyIHBvbGFyID0gZ2V0UG9sYXJDb29yZGluYXRlcyhlbmQxLCBlbmQyKTtcbiAgICB2YXIgbGVuZ3RoID0gcG9sYXIubW9kO1xuICAgIHZhciBhbmdsZSA9IHBvbGFyLmFyZztcblxuICAgIHZhciB0b3AgPSBvcmlnaW4ueSArIDAuNSAqIGxlbmd0aCAqIE1hdGguc2luKGFuZ2xlKTtcbiAgICB2YXIgbGVmdCA9IG9yaWdpbi54IC0gMC41ICogbGVuZ3RoICogKDEgLSBNYXRoLmNvcyhhbmdsZSkpO1xuICAgIHZhciBwYXJlbnRQb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihlbGVtZW50LnBhcmVudE5vZGUpO1xuICAgIGxlZnQgLT0gcGFyZW50UG9zaXRpb24ueDtcbiAgICB0b3AgLT0gcGFyZW50UG9zaXRpb24ueTtcblxuICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSBsZW5ndGggKyAncHgnO1xuICAgIGVsZW1lbnQuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlW3RyYW5zZm9ybVByb3BlcnR5XSA9ICdyb3RhdGUoJyArIGFuZ2xlICsgJ3JhZCknO1xufTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uICh6bGluaykge1xuICAgIHZhciBlbmQxID0gemxpbmsuYmVnaW4ucG9ydDtcbiAgICB2YXIgZW5kMiA9IHpsaW5rLmVuZC5wb3J0O1xuICAgIGlmIChlbmQxICE9PSB1bmRlZmluZWQgJiYgZW5kMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNldEVsZW1lbnRFbmRzKHpsaW5rLCBlbmQxLmNvbm5lY3Rpb25Qb3NpdGlvbiwgZW5kMi5jb25uZWN0aW9uUG9zaXRpb24pO1xuICAgIH1cbn07XG5cbnZhciBjb25uZWN0ID0gZnVuY3Rpb24oemxpbmssIHBsdWcsIHBvcnQpIHtcbiAgICBpZiAodHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHBvcnQpO1xuICAgIH1cbiAgICBwbHVnLnBvcnQgPSBwb3J0O1xuICAgIHBsdWcucG9ydC5saW5rcy5wdXNoKHpsaW5rKTtcbn07XG5cbnZhciB1bmNvbm5lY3QgPSBmdW5jdGlvbiAoemxpbmspIHtcbiAgICB6bGluay5iZWdpbi5wb3J0LmxpbmtzID0gXy53aXRob3V0KHpsaW5rLmJlZ2luLnBvcnQubGlua3MsIHpsaW5rKTtcbiAgICB6bGluay5lbmQucG9ydC5saW5rcyA9IF8ud2l0aG91dCh6bGluay5lbmQucG9ydC5saW5rcywgemxpbmspO1xuICAgIGlmICh6bGluay5wYXJlbnROb2RlICE9PSBudWxsKSB7XG4gICAgICAgIHpsaW5rLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoemxpbmspO1xuICAgIH1cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcbnByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgIC8vIEN1cnJpZWQgdmVyc2lvbiBvZiAncmVkcmF3JyB3aXRoIGN1cnJlbnQgb2JqZWN0IGluc3RhbmNlLlxuICAgIC8vIFVzZWQgZm9yIGV2ZW50IGxpc3RlbmVycy5cbiAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgIHRoaXMuY29ubmVjdCA9IGNvbm5lY3QuYmluZChudWxsLCB0aGlzKTtcbiAgICB0aGlzLnVuY29ubmVjdCA9IHVuY29ubmVjdC5iaW5kKG51bGwsIHRoaXMpO1xuXG4gICAgdGhpcy5iZWdpbiA9IHt9O1xuICAgIHRoaXMuZW5kID0ge307XG4gICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKCdiZWdpbicpICYmIHRoaXMuaGFzQXR0cmlidXRlKCdlbmQnKSkge1xuICAgICAgICAvLyBUT0RPIGRvIHRoZSBzYW1lIHN0dWZmIG9uIGF0dHJpYnV0ZXMnIGNoYW5nZXMuXG4gICAgICAgIGNvbm5lY3QodGhpcywgdGhpcy5iZWdpbiwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2JlZ2luJykpO1xuICAgICAgICBjb25uZWN0KHRoaXMsIHRoaXMuZW5kLCB0aGlzLmdldEF0dHJpYnV0ZSgnZW5kJykpO1xuXG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgfVxuXG4gICAgc2VsZWN0b3Iuc2V0U2VsZWN0YWJsZSh0aGlzLCB0cnVlKTtcbn07XG5cbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG5cbi8qZ2xvYmFsIHJlc3R5bGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LXBvcnQnO1xuXG52YXIgaHRtbFRlbXBsYXRlID0gdXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uKGZ1bmN0aW9uICgpIHsvKlxuICAgIDxzcGFuIGNsYXNzPVwicG9ydC1rZXlcIj5hPC9zcGFuPlxuICAgIDxkaXYgY2xhc3M9XCJzZWxlY3RvclwiPjwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAnd2lkdGgnOiAxOCxcbiAgICAgICAgJ2hlaWdodCc6IDMsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNjY2MnLFxuICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAncG9zaXRpb24nOiAncmVsYXRpdmUnLFxuICAgICAgICAnb3ZlcmZsb3cnOiAndmlzaWJsZScsXG4gICAgICAgICd6SW5kZXgnOiAnNSdcbiAgICB9LFxuICAgICcucG9ydC1rZXknOiB7XG4gICAgICAgICdmb250LXNpemUnOiAnMC43ZW0nLFxuICAgICAgICAnY29sb3InOiAnIzQ0NCcsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdwYWRkaW5nLWxlZnQnOiAzLFxuICAgICAgICAncGFkZGluZy1yaWdodCc6IDMsXG4gICAgICAgICd6SW5kZXgnOiAnMTAnLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICcjZmZmJ1xuICAgIH0sXG4gICAgJy5zZWxlY3Rvcic6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAtOCxcbiAgICAgICAgJ3RvcCc6IC04LFxuICAgICAgICAnd2lkdGgnOiAyNCxcbiAgICAgICAgJ2hlaWdodCc6IDE0XG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgW10uZm9yRWFjaC5jYWxsKHBvcnQubGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgIGxpbmsucmVkcmF3KCk7XG4gICAgfSk7XG59O1xuXG5cbnZhciBwcm9wZXJ0aWVzID0ge1xuXG4gICAgY3JlYXRlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpbmtzID0gW107XG4gICAgICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG5cbiAgICAgICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgICAgICB0aGlzLmhpZGVLZXkoKTtcbiAgICB9fSxcblxuICAgIHVucGx1Zzoge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubGlua3MuZm9yRWFjaChmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgbGluay51bmNvbm5lY3QoKTtcbiAgICAgICAgfSk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0YWJsZToge3ZhbHVlOiBmdW5jdGlvbiAocG9ydDEsIHBvcnQyKSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpXG4gICAgICAgICAgICAmJiBwb3J0Mi5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKVxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpXG4gICAgICAgICAgICAmJiBwb3J0Mi5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JykpXG4gICAgICAgICAgICApO1xuICAgIH19LFxuXG4gICAgY29ubmVjdDoge3ZhbHVlOiBmdW5jdGlvbiAocG9ydDEsIHBvcnQyKSB7XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnei1saW5rJyk7XG4gICAgICAgIGlmIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKSB7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5iZWdpbiwgcG9ydDEpO1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuZW5kLCBwb3J0Mik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5lbmQsIHBvcnQxKTtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmJlZ2luLCBwb3J0Mik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyB1c2UgYW5vdGhlciB3YXkgdG8gZmluZCB3aGVyZSB0byBhZGQgbmV3IGxpbmtzLlxuICAgICAgICB2YXIgcGF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF0Y2gnKTtcbiAgICAgICAgcGF0Y2guYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICAgIGxpbmsucmVkcmF3KCk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0aW9uUG9zaXRpb246IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgY2VudGVyID0ge1xuICAgICAgICAgICAgICAgIHg6IHBvc2l0aW9uLnggKyByZWN0LndpZHRoIC8gMixcbiAgICAgICAgICAgICAgICB5OiBwb3NpdGlvbi55ICsgcmVjdC5oZWlnaHQgLyAyXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGNlbnRlcjtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXlFbGVtZW50OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3Rvcignc3Bhbi5wb3J0LWtleScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleToge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5rZXlFbGVtZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNob3dLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICB9fSxcblxuICAgIGhpZGVLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIH19XG5cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlLCBwcm9wZXJ0aWVzKTtcbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG5cbiJdfQ==
