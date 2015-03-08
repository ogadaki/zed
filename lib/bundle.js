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

// This module is to be used from the global namespace (i.e. from app.html).
global.app = exports;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./commands":"/home/zed/lib/commands.js","./editor":"/home/zed/lib/editor.js","./engine":"/home/zed/lib/engine.js","./http":"/home/zed/lib/http.js","./storage":"/home/zed/lib/storage.js","./view":"/home/zed/lib/view.js"}],"/home/zed/lib/commands.js":[function(require,module,exports){
/*eslint quotes: [2, "single"]*/

/*global document, window */

/*global Mousetrap */

'use strict';

var storage = require('./storage');
var editor = require('./editor');
var terminal = require('./terminal');
var utils = require('./utils');

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
/*eslint quotes: [2, "single"]*/

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
        console.log(tagName);
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
                console.log(tagName);
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
                    window.commands.editBlock(source);
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
        window.bindKeysForMainMode();
    };
};
view.init = init;

module.exports = view;
global.view = view;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/zed/webcomponents/z-block.js":[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYXBwLmpzIiwibGliL2NvbW1hbmRzLmpzIiwibGliL2VkaXRvci5qcyIsImxpYi9lbmdpbmUuanMiLCJsaWIvaHR0cC5qcyIsImxpYi9zZWxlY3Rvci5qcyIsImxpYi9zdG9yYWdlLmpzIiwibGliL3Rlcm1pbmFsLmpzIiwibGliL3V0aWxzLmpzIiwibGliL3ZpZXcuanMiLCJ3ZWJjb21wb25lbnRzL3otYmxvY2suanMiLCJ3ZWJjb21wb25lbnRzL3otbGluay5qcyIsIndlYmNvbXBvbmVudHMvei1wb3J0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XG52YXIgZW5naW5lID0gcmVxdWlyZSgnLi9lbmdpbmUnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBodHRwID0gcmVxdWlyZSgnLi9odHRwJyk7XG4vLyBpbXBvcnQgdmlldyBtb2R1bGUgc28gdGhhdCBpdHMgZ2xvYmFscyBhcmUgZGVmaW5lZC5cbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbnZhciBleHBvcnRzID0ge307XG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb21tYW5kcy5pbml0KCk7XG4gICAgZW5naW5lLmluaXQoKTtcbiAgICBlZGl0b3IuaW5pdCgpO1xuICAgIHZpZXcuaW5pdCgpO1xuICAgIGdsb2JhbC5odHRwID0gaHR0cDtcbiAgICAvLyBMb2FkIGEgcGF0Y2ggYXMgYW4gZXhhbXBsZS5cbiAgICBzdG9yYWdlLmxvYWRQYXRjaCgnaHR0cCcsICdwYXRjaGVzL21haW4uemVkJyk7XG59O1xuZXhwb3J0cy52aWV3ID0gdmlldztcblxuLy8gVGhpcyBtb2R1bGUgaXMgdG8gYmUgdXNlZCBmcm9tIHRoZSBnbG9iYWwgbmFtZXNwYWNlIChpLmUuIGZyb20gYXBwLmh0bWwpLlxuZ2xvYmFsLmFwcCA9IGV4cG9ydHM7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cblxuLypnbG9iYWwgTW91c2V0cmFwICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0b3JhZ2UgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcicpO1xudmFyIHRlcm1pbmFsID0gcmVxdWlyZSgnLi90ZXJtaW5hbCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG4vLyBOb3QgdGhlIHJlYWwgbW9kdWxlIG5hbWUgdG8gYXZvaWQgbmFtZSBjbGFzaCB3aXRoICdjb21tYW5kcycgb2JqZWN0IHdoaWNoXG4vLyBjb250YWlucyBhbGwgdGhlIGNvbW1hbmRzLlxuLy8gLy8gVE9ETyByZW5hbWUgYm90aD9cbnZhciBjb20gPSB7fTtcblxuY29tLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LmNvbW1hbmRzID0ge307XG4gICAgdmFyIGNvbW1hbmRzID0gd2luZG93LmNvbW1hbmRzO1xuXG4gICAgY29tbWFuZHMucHJldiA9IGVkaXRvci5vZmZzZXRDdXJyZW50LmJpbmQobnVsbCwgLTEpO1xuICAgIGNvbW1hbmRzLm5leHQgPSBlZGl0b3Iub2Zmc2V0Q3VycmVudC5iaW5kKG51bGwsIDEpO1xuICAgIGNvbW1hbmRzLmFkZCA9IGVkaXRvci5hZGQ7XG4gICAgY29tbWFuZHMucmVtb3ZlID0gZWRpdG9yLnJlbW92ZTtcbiAgICBjb21tYW5kcy5pbnB1dHMgPSBlZGl0b3IucG9ydC5iaW5kKG51bGwsICdpbnB1dCcpO1xuICAgIGNvbW1hbmRzLm91dHB1dHMgPSBlZGl0b3IucG9ydC5iaW5kKG51bGwsICdvdXRwdXQnKTtcbiAgICBjb21tYW5kcy5ibG9jayA9IGVkaXRvci5ibG9jaztcbiAgICBjb21tYW5kcy5maXJlID0gZWRpdG9yLmZpcmU7XG4gICAgY29tbWFuZHMuc2V0ID0gZWRpdG9yLnNldDtcbiAgICBjb21tYW5kcy5tb3ZlID0gZWRpdG9yLm1vdmU7XG4gICAgY29tbWFuZHMub2Zmc2V0ID0gZWRpdG9yLm1vdmVCeTtcbiAgICBjb21tYW5kcy5jbGVhciA9IGVkaXRvci5jbGVhckFsbDtcblxuXG4gICAgdmFyIGVkaXRCbG9jayA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGNvbW1hbmRzLmVzY2FwZSk7XG4gICAgICAgIGJsb2NrLmNvbnRlbnQuZm9jdXMoKTtcbiAgICB9O1xuICAgIGNvbW1hbmRzLmVkaXRCbG9jayA9IGVkaXRCbG9jaztcblxuICAgIGNvbW1hbmRzLmVkaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICAgICAgZWRpdEJsb2NrKGJsb2NrKTtcbiAgICAgICAgICAgIGVkaXRvci5zdG9wQmxpbmtpbmcoKTtcbiAgICAgICAgICAgIC8vIFByZXZlbnQgZGVmYXVsdCB3aGVuIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCB3aXRoIE1vdXN0cmFwLlxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbW1hbmRzLmFkZEJ1dHRvbiA9IGNvbW1hbmRzLmFkZC5iaW5kKG51bGwsICdodG1sJywgJ2J1dHRvbicsICdnbycsIDAsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICBjb21tYW5kcy5hZGRTY3JpcHQgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnaHRtbCcsICdzY3JpcHQnLCAnaW4xICsgMicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICBjb21tYW5kcy5hZGRUZXh0ID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ2h0bWwnLCAnc3BhbicsICdlbXB0eScsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICBjb21tYW5kcy5hZGROdW1iZXIgPSBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnemVkJywgJ251bWJlcicsICc0MicsIDEsIDEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICBjb21tYW5kcy5hZGRDb21tZW50ID0gY29tbWFuZHMuYWRkLmJpbmQobnVsbCwgJ2h0bWwnLCAnY29tbWVudCcsICdDb21tZW50JywgMCwgMCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuICAgIHZhciBiaW5kS2V5c0Zvck1haW5Nb2RlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBNb3VzZXRyYXAucmVzZXQoKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ0snLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAwLCAtMTApKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ0onLCBjb21tYW5kcy5vZmZzZXQuYmluZChudWxsLCAwLCAxMCkpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnSCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIC0xMCwgMCkpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnTCcsIGNvbW1hbmRzLm9mZnNldC5iaW5kKG51bGwsIDEwLCAwKSk7XG4gICAgICAgIE1vdXNldHJhcC5iaW5kKCdrJywgY29tbWFuZHMucHJldik7XG4gICAgICAgIE1vdXNldHJhcC5iaW5kKCdqJywgY29tbWFuZHMubmV4dCk7XG4gICAgICAgIE1vdXNldHJhcC5iaW5kKCdhIG4nLCBjb21tYW5kcy5hZGQuYmluZChudWxsLCAnTmV3JykpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnYSBoIGInLCBjb21tYW5kcy5hZGRCdXR0b24pO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHMnLCBjb21tYW5kcy5hZGRTY3JpcHQpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnYSBoIHQnLCBjb21tYW5kcy5hZGRUZXh0KTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBuJywgY29tbWFuZHMuYWRkTnVtYmVyKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2EgaCBjJywgY29tbWFuZHMuYWRkQ29tbWVudCk7XG4gICAgICAgIE1vdXNldHJhcC5iaW5kKCdyJywgY29tbWFuZHMucmVtb3ZlKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2knLCBjb21tYW5kcy5pbnB1dHMpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnbycsIGNvbW1hbmRzLm91dHB1dHMpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnYicsIGNvbW1hbmRzLmJsb2NrKTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2MnLCBjb21tYW5kcy5nb1RvQ29tbWFuZExpbmUpO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnbCcsIGNvbW1hbmRzLmxpbmspO1xuICAgICAgICBNb3VzZXRyYXAuYmluZCgnZycsIGNvbW1hbmRzLmdvVG9CbG9jayk7XG4gICAgICAgIE1vdXNldHJhcC5iaW5kKCdlJywgY29tbWFuZHMuZWRpdCk7XG4gICAgICAgIE1vdXNldHJhcC5iaW5kKCdzcGFjZScsIGNvbW1hbmRzLmZpcmUpO1xuICAgIH07XG4gICAgd2luZG93LmJpbmRLZXlzRm9yTWFpbk1vZGUgPSBiaW5kS2V5c0Zvck1haW5Nb2RlO1xuXG4gICAgY29tbWFuZHMuZXNjYXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50bHlFZGl0aW5nRWxlbWVudCA9IHV0aWxzLmRvbS5nZXRTZWxlY3Rpb25TdGFydCgpO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRpbmdFbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudGx5RWRpdGluZ0VsZW1lbnQuYmx1cigpO1xuICAgICAgICAgICAgICAgIGVkaXRvci5zdGFydEJsaW5raW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHN3aXRjaERlZW1waGFzaXNBbGxCbG9ja3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChibG9ja3MsIGZ1bmN0aW9uIChiKSB7XG4gICAgICAgICAgICBiLmNsYXNzTGlzdC50b2dnbGUoJ2RlLWVtcGhhc2lzJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgaGlkZUFsbEtleXMgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuaGlkZUtleSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3dpdGNoRGVlbXBoYXNpc0FsbEJsb2NrcygpO1xuICAgIH07XG5cbiAgICB2YXIgZmlyc3RQb3J0O1xuICAgIHZhciBzZWxlY3RQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgaWYgKGZpcnN0UG9ydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmaXJzdFBvcnQgPSBwb3J0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBvcnQuY29ubmVjdGFibGUocG9ydCwgZmlyc3RQb3J0KSkge1xuICAgICAgICAgICAgICAgIHBvcnQuY29ubmVjdChwb3J0LCBmaXJzdFBvcnQpO1xuICAgICAgICAgICAgICAgIGZpcnN0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBoaWRlQWxsS2V5cygnei1wb3J0Jyk7XG4gICAgICAgICAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBwb3J0VG9MaW5rVG87XG4gICAgY29tbWFuZHMubGluayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICAgICAgICAgIGZpcnN0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgICAgICAgICAgdmFyIHBvcnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGtleXMubmV4dCgpO1xuICAgICAgICAgICAgICAgIHBvcnQua2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgIHBvcnQuc2hvd0tleSgpO1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgJ2FhZScgaW50byAnYSBhIGUnLlxuICAgICAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICAgICAgICAgIE1vdXNldHJhcC5iaW5kKGtleSwgc2VsZWN0UG9ydC5iaW5kKG51bGwsIHBvcnQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgICAgICAgICAgICAgaGlkZUFsbEtleXMoJ3otcG9ydCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcG9ydCA9IGVkaXRvci5nZXRDdXJyZW50UG9ydCgpO1xuICAgICAgICAgICAgaWYgKHBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAocG9ydFRvTGlua1RvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gcG9ydDtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuY29ubmVjdGFibGUocG9ydCwgcG9ydFRvTGlua1RvKSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0LmNvbm5lY3QocG9ydCwgcG9ydFRvTGlua1RvKTtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvLmNsYXNzTGlzdC50b2dnbGUoJ3RvLWxpbmstdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFRvTGlua1RvID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUbyA9IHBvcnQ7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRUb0xpbmtUby5jbGFzc0xpc3QudG9nZ2xlKCd0by1saW5rLXRvJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZSA9IGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudEJsb2NrKGJsb2NrKTtcbiAgICAgICAgaGlkZUFsbEtleXMoJ3otYmxvY2snKTtcbiAgICAgICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgIH07XG5cbiAgICBjb21tYW5kcy5nb1RvQmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgICAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICB2YXIga2V5cyA9IHV0aWxzLmNyZWF0ZUtleXNHZW5lcmF0b3IoKTtcbiAgICAgICAgW10uZm9yRWFjaC5jYWxsKGJsb2NrcywgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5cy5uZXh0KCk7XG4gICAgICAgICAgICBibG9jay5rZXkgPSBrZXk7XG4gICAgICAgICAgICBibG9jay5zaG93S2V5KCk7XG4gICAgICAgICAgICAvLyBDb252ZXJ0ICdhYWUnIGludG8gJ2EgYSBlJy5cbiAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnJykuam9pbignICcpO1xuICAgICAgICAgICAgTW91c2V0cmFwLmJpbmQoa2V5LCBzZXRDdXJyZW50QmxvY2tBbmRCYWNrVG9NYWluTW9kZS5iaW5kKG51bGwsIGJsb2NrKSk7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwLmJpbmQoJ2VzYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGhpZGVBbGxLZXlzKCd6LWJsb2NrJyk7XG4gICAgICAgICAgICBiaW5kS2V5c0Zvck1haW5Nb2RlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzd2l0Y2hEZWVtcGhhc2lzQWxsQmxvY2tzKCk7XG4gICAgfTtcblxuICAgIC8vIFNldCBhIG5ldyBzdG9wQ2FsbGJhY2sgZm9yIE1vdXN0cmFwIHRvIGF2b2lkIHN0b3BwaW5nIHdoZW4gd2Ugc3RhcnRcbiAgICAvLyBlZGl0aW5nIGEgY29udGVudGVkaXRhYmxlLCBzbyB0aGF0IHdlIGNhbiB1c2UgZXNjYXBlIHRvIGxlYXZlIGVkaXRpbmcuXG4gICAgTW91c2V0cmFwLnN0b3BDYWxsYmFjayA9IGZ1bmN0aW9uKGUsIGVsZW1lbnQsIGNvbWJvKSB7XG4gICAgICAgIC8vIGlmIHRoZSBlbGVtZW50IGhhcyB0aGUgY2xhc3MgXCJtb3VzZXRyYXBcIiB0aGVuIG5vIG5lZWQgdG8gc3RvcFxuICAgICAgICBpZiAoKCcgJyArIGVsZW1lbnQuY2xhc3NOYW1lICsgJyAnKS5pbmRleE9mKCcgbW91c2V0cmFwICcpID4gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgICAvLyBzdG9wIGZvciBpbnB1dCwgc2VsZWN0LCBhbmQgdGV4dGFyZWFcbiAgICAgICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQSc7XG4gICAgIH07XG5cbiAgICBjb21tYW5kcy5zYXZlID0gc3RvcmFnZS5zYXZlUGF0Y2g7XG4gICAgY29tbWFuZHMubG9hZCA9IHN0b3JhZ2UubG9hZFBhdGNoO1xuICAgIGNvbW1hbmRzLnJtID0gc3RvcmFnZS5yZW1vdmVQYXRjaDtcbiAgICBjb21tYW5kcy5saXN0ID0gc3RvcmFnZS5nZXRQYXRjaE5hbWVzO1xuICAgIGNvbW1hbmRzLmxzID0gc3RvcmFnZS5nZXRQYXRjaE5hbWVzO1xuXG4gICAgdmFyIHRlcm1pbmFsT25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cuYmluZEtleXNGb3JNYWluTW9kZSgpO1xuICAgICAgICBlZGl0b3Iuc3RhcnRCbGlua2luZygpO1xuICAgIH07XG5cbiAgICB2YXIgdGVybSA9IHRlcm1pbmFsLmNyZWF0ZShjb21tYW5kcywgdGVybWluYWxPbmJsdXIpO1xuXG4gICAgY29tbWFuZHMuZ29Ub0NvbW1hbmRMaW5lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0ZXJtLmZvY3VzKCk7XG4gICAgICAgIE1vdXNldHJhcC5yZXNldCgpO1xuICAgICAgICBlZGl0b3Iuc3RvcEJsaW5raW5nKCk7XG4gICAgfTtcblxuICAgIC8vIFRPRE8gY3JlYXRlIGEgdGVybS53cml0ZShtdWx0aUxpbmVTdHJpbmcpIGFuZCB1c2UgaXQuXG4gICAgY29tbWFuZHMuaGVscCA9IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgICAgIGlmIChzdWJqZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRlcm0udGVybS53cml0ZSgnUHJlc3MgRXNjIHRvIGxlYXZlIHRoZSBjb21tYW5kIGxpbmUgYW5kIGdvIGJhY2sgdG8gbm9ybWFsIG1vZGUuJyk7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgICAgIHRlcm0udGVybS53cml0ZSgnQ29tbWFuZHM6IG5leHQsIHByZXYsIHJlbW92ZSwgYWRkLCBzZXQgY29udGVudCwgbW92ZSwgb2Zmc2V0Jyk7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICAgICAgdGVybS50ZXJtLndyaXRlKCdscywgbG9hZCwgc2F2ZSwgY2xlYXIgYW5kIHJtLicpO1xuICAgICAgICB9IGVsc2UgaWYgKHN1YmplY3QgPT09ICdhZGQnKSB7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ0FkZCBhIG5ldyBibG9jayBqdXN0IGJlbG93IHRoZSBjdXJyZW50IGJsb2NrLicpO1xuICAgICAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ2FkZCBodG1sIDx3aGF0PiA8Y29udGVudD4gPG5iIGlucHV0cz4gPG5iIG91dHB1dHM+Jyk7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ubmV3TGluZSgpO1xuICAgICAgICAgICAgdGVybS50ZXJtLndyaXRlKCcgIDx3aGF0PiAgICBpcyBlaXRoZXIgXCJidXR0b25cIiwgXCJzY3JpcHRcIiwgXCJ0ZXh0XCIsIFwibnVtYmVyXCIgb3IgYSBIVE1MIHRhZy4nKTtcbiAgICAgICAgICAgIHRlcm0udGVybS5uZXdMaW5lKCk7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJyAgPGNvbnRlbnQ+IGlzIHRoZSBjb250ZW50IG9mIHRoZSBibG9jayAoaS5lLiB0aGUgYnV0dG9uIG5hbWUsIHRoZScpO1xuICAgICAgICAgICAgdGVybS50ZXJtLm5ld0xpbmUoKTtcbiAgICAgICAgICAgIHRlcm0udGVybS53cml0ZSgnICAgICAgICAgICAgc2NyaXB0IGNvZGUsIHRoZSB0ZXh0IG9yIG51bWJlciB2YWx1ZSwgZXRjLikuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0ZXJtLnRlcm0ud3JpdGUoJ05vIGhlbHAgZm9yIFwiJyArIHN1YmplY3QgKyAnXCIuJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYmluZEtleXNGb3JNYWluTW9kZSgpO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbTtcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQsIHdpbmRvdyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbmdpbmUgPSByZXF1aXJlKCcuL2VuZ2luZScpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZWRpdG9yID0ge307XG5cbmVkaXRvci5jb250ZXh0ID0gJ2Jsb2NrJztcblxuZWRpdG9yLmdldEN1cnJlbnRCbG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50Jyk7XG59O1xuXG5lZGl0b3IuZ2V0Q3VycmVudFBvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otcG9ydC5jdXJyZW50Jyk7XG59O1xuXG5lZGl0b3Iuc2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIGlmIChjdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGN1cnJlbnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgIH1cbn07XG4vLyBUT0RPIG5vdCBpbiB0aGUgd2luZG93IG5hbWVzcGFjZVxud2luZG93LnNldEN1cnJlbnRCbG9jayA9IGVkaXRvci5zZXRDdXJyZW50QmxvY2s7XG5cbmVkaXRvci5zZXRDdXJyZW50UG9ydCA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBlZGl0b3IuZ2V0Q3VycmVudFBvcnQoKTtcbiAgICBwb3J0LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnJlbnQnKTtcbiAgICB9XG59O1xuXG5lZGl0b3Iub2Zmc2V0Q3VycmVudEJsb2NrID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otYmxvY2snKTtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChlbGVtZW50c1tpXSA9PT0gY3VycmVudCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gKGVsZW1lbnRzLmxlbmd0aCArIGkgKyBvZmZzZXQpICUgZWxlbWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgZWRpdG9yLnNldEN1cnJlbnRCbG9jayhlbGVtZW50c1tpbmRleF0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLm9mZnNldEN1cnJlbnRQb3J0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgdmFyIGVsZW1lbnRzID0gY3VycmVudC5ibG9jay5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuJyArIGVkaXRvci5jb250ZXh0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChlbGVtZW50c1tpXSA9PT0gY3VycmVudCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gKGVsZW1lbnRzLmxlbmd0aCArIGkgKyBvZmZzZXQpICUgZWxlbWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgZWRpdG9yLnNldEN1cnJlbnRQb3J0KGVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5lZGl0b3Iub2Zmc2V0Q3VycmVudCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdibG9jaycpIHtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRCbG9jayhvZmZzZXQpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdpbnB1dCcgfHwgZWRpdG9yLmNvbnRleHQgPT09ICdvdXRwdXQnKSB7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50UG9ydChvZmZzZXQpO1xuICAgIH1cbn07XG5cbmVkaXRvci5jcmVhdGVCbG9ja0VsZW1lbnQgPSBmdW5jdGlvbiAoY29udGVudCwgbklucHV0cywgbk91dHB1dHMsIHRvcCwgbGVmdCkge1xuICAgIHZhciBwYXRjaCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwYXRjaCcpO1xuICAgIGNvbnRlbnQgPSBbXG4gICAgICAgICc8ei1wb3J0IGNsYXNzPVwiaW5wdXRcIj48L3otcG9ydD4nLnJlcGVhdChuSW5wdXRzKSxcbiAgICAgICAgY29udGVudCxcbiAgICAgICAgJzx6LXBvcnQgY2xhc3M9XCJvdXRwdXRcIj48L3otcG9ydD4nLnJlcGVhdChuT3V0cHV0cylcbiAgICBdLmpvaW4oJycpO1xuICAgIHZhciBodG1sU3RyaW5nID0gJzx6LWJsb2NrPicgKyBjb250ZW50ICsgJzwvei1ibG9jaz4nO1xuICAgIHZhciBmcmFnbWVudCA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sU3RyaW5nKTtcbiAgICB2YXIgYmxvY2sgPSBmcmFnbWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrJyk7XG5cbiAgICB2YXIgZGVmYXVsdFRvcCA9IDA7XG4gICAgdmFyIGRlZmF1bHRMZWZ0ID0gMDtcbiAgICB2YXIgY3VycmVudEJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChjdXJyZW50QmxvY2sgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gdXRpbHMuZG9tLmdldFBvc2l0aW9uKGN1cnJlbnRCbG9jaywgY3VycmVudEJsb2NrLnBhcmVudE5vZGUpO1xuICAgICAgICBkZWZhdWx0VG9wID0gcG9zaXRpb24ueSArIGN1cnJlbnRCbG9jay5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgKyAyMztcbiAgICAgICAgZGVmYXVsdExlZnQgPSBwb3NpdGlvbi54O1xuICAgIH1cbiAgICBibG9jay5zdHlsZS50b3AgPSB0b3AgfHwgZGVmYXVsdFRvcCArICdweCc7XG4gICAgYmxvY2suc3R5bGUubGVmdCA9IGxlZnQgfHwgZGVmYXVsdExlZnQgKyAncHgnO1xuXG4gICAgZWRpdG9yLnNldEN1cnJlbnRCbG9jayhibG9jayk7XG4gICAgcGF0Y2guYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuICAgIHJldHVybiBibG9jaztcbn07XG5cbmVkaXRvci5hZGRCbG9jayA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgdmFyIHplQ2xhc3MgPSAnJztcbiAgICBpZiAoYXJnc1sxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdHlwZSA9ICdodG1sJztcbiAgICAgICAgYXJnc1sxXSA9ICdzcGFuJztcbiAgICAgICAgemVDbGFzcyA9ICd6ZWQtbnVtYmVyJztcbiAgICB9XG4gICAgdmFyIGJsb2NrQ2xhc3MgPSBhcmdzWzFdO1xuICAgIGlmICh0eXBlID09PSAnaHRtbCcpIHtcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBhcmdzWzFdO1xuICAgICAgICBpZiAoYXJnc1sxXSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gJ3NwYW4nO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb250ZW50ID0gYXJnc1syXTtcbiAgICAgICAgdmFyIG5ld0NvbnRlbnQgPSAnPCcgKyB0YWdOYW1lICsgJyBjbGFzcz1cInplLWNvbnRlbnQgJyArIHplQ2xhc3MgKyAnXCIgY29udGVudGVkaXRhYmxlPicgKyBjb250ZW50ICsgJzwvJyArIHRhZ05hbWUgKyAnPic7XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnc2NyaXB0Jykge1xuICAgICAgICAgICAgbmV3Q29udGVudCA9ICc8c2NyaXB0IGNsYXNzPVwiemUtY29udGVudFwiIHR5cGU9XCJhcHBsaWNhdGlvbi94LXByZXZlbnQtc2NyaXB0LWV4ZWN1dGlvbi1vbmxvYWRcIiBzdHlsZT1cImRpc3BsYXk6IGJsb2NrO3doaXRlLXNwYWNlOiBwcmUtd3JhcDtcIiBjb250ZW50ZWRpdGFibGUgb25pbnB1dD1cImNvbXBpbGVTY3JpcHQodGhpcylcIj4nICsgY29udGVudCArICc8L3NjcmlwdD4nO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnYnV0dG9uJykge1xuICAgICAgICAgICAgbmV3Q29udGVudCA9ICc8YnV0dG9uIG9uY2xpY2s9XCJzZW5kRXZlbnRUb091dHB1dFBvcnQodGhpcylcIiBjbGFzcz1cInplLWNvbnRlbnRcIiBjb250ZW50ZWRpdGFibGU+JyArIGNvbnRlbnQgKyAnPC9idXR0b24+JztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGFnTmFtZVswXSA9PT0gJzwnKSB7XG4gICAgICAgICAgICAvLyBBY3R1YWxseSB0YWdOYW1lIGNvbnRhaW5zIGEgSFRNTCBzdHJpbmcuXG4gICAgICAgICAgICBuZXdDb250ZW50ID0gdGFnTmFtZTtcbiAgICAgICAgICAgIGJsb2NrQ2xhc3MgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMik7XG4gICAgICAgIGFyZ3NbMF0gPSBuZXdDb250ZW50O1xuICAgIH1cbiAgICB2YXIgYmxvY2sgPSBlZGl0b3IuY3JlYXRlQmxvY2tFbGVtZW50LmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIGlmIChibG9ja0NsYXNzICE9PSAnJykge1xuICAgICAgICBibG9jay5jbGFzc0xpc3QudG9nZ2xlKGJsb2NrQ2xhc3MpO1xuICAgIH1cbn07XG5cbmVkaXRvci5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cnJlbnQ7XG4gICAgdmFyIHBvcnQ7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIGVkaXRvci5hZGRCbG9jay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdpbnB1dCcpIHtcbiAgICAgICAgY3VycmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3otYmxvY2suY3VycmVudC1vZmYtY29udGV4dCcpO1xuICAgICAgICBwb3J0ID0gY3VycmVudC5hZGRQb3J0KCc8ei1wb3J0IGNsYXNzPVwiaW5wdXRcIj48L3otcG9ydD4nKTtcbiAgICAgICAgZWRpdG9yLnNldEN1cnJlbnRQb3J0KHBvcnQpO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdvdXRwdXQnKSB7XG4gICAgICAgIGN1cnJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQtb2ZmLWNvbnRleHQnKTtcbiAgICAgICAgcG9ydCA9IGN1cnJlbnQuYWRkUG9ydCgnPHotcG9ydCBjbGFzcz1cIm91dHB1dFwiPjwvei1wb3J0PicpO1xuICAgICAgICBlZGl0b3Iuc2V0Q3VycmVudFBvcnQocG9ydCk7XG4gICAgfVxufTtcblxuZWRpdG9yLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZWN0ZWQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2VsZWN0ZWQnKTtcbiAgICBpZiAoc2VsZWN0ZWQgIT09IG51bGwgJiYgc2VsZWN0ZWQudGFnTmFtZSA9PT0gJ1otTElOSycpIHtcbiAgICAgICAgdmFyIGxpbmsgPSBzZWxlY3RlZDtcbiAgICAgICAgbGluay51bmNvbm5lY3QoKTtcbiAgICB9IGVsc2UgaWYgKGVkaXRvci5jb250ZXh0ID09PSAnYmxvY2snKSB7XG4gICAgICAgIHZhciBibG9jayA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICAgICAgZWRpdG9yLm9mZnNldEN1cnJlbnRCbG9jaygxKTtcbiAgICAgICAgYmxvY2sudW5wbHVnKCk7XG4gICAgICAgIGJsb2NrLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYmxvY2spO1xuICAgIH0gZWxzZSBpZiAoZWRpdG9yLmNvbnRleHQgPT09ICdpbnB1dCcgfHwgZWRpdG9yLmNvbnRleHQgPT09ICdvdXRwdXQnKSB7XG4gICAgICAgIHZhciBwb3J0ID0gZWRpdG9yLmdldEN1cnJlbnRQb3J0KCk7XG4gICAgICAgIGVkaXRvci5vZmZzZXRDdXJyZW50UG9ydCgxKTtcbiAgICAgICAgcG9ydC51bnBsdWcoKTtcbiAgICAgICAgcG9ydC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBvcnQpO1xuICAgIH1cbn07XG5cbnZhciBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0ID0gZnVuY3Rpb24gKGVsZW1lbnRUYWdOYW1lLCBvbk9yT2ZmKSB7XG4gICAgdmFyIGNsYXNzTmFtZSA9ICdjdXJyZW50JztcbiAgICBpZiAob25Pck9mZiA9PT0gJ29uJykge1xuICAgICAgICBjbGFzc05hbWUgKz0gJy1vZmYtY29udGV4dCc7XG4gICAgfVxuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50VGFnTmFtZSArICcuJyArIGNsYXNzTmFtZSk7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50LW9mZi1jb250ZXh0Jyk7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdjdXJyZW50Jyk7XG59O1xuXG5lZGl0b3IucG9ydCA9IGZ1bmN0aW9uIChpbnB1dE9yT3V0cHV0KSB7XG4gICAgaWYgKGVkaXRvci5jb250ZXh0ICE9PSAnYmxvY2snKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1ibG9jay5jdXJyZW50ICogei1wb3J0LicgKyBpbnB1dE9yT3V0cHV0LCAnb24nKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhciBwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50ICogei1wb3J0LicgKyBpbnB1dE9yT3V0cHV0KTtcbiAgICAgICAgaWYgKHBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHBvcnQuY2xhc3NMaXN0LnRvZ2dsZSgnY3VycmVudCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN3aXRjaEN1cnJlbnRPbk9mZkNvbnRleHQoJ3otYmxvY2snLCAnb2ZmJyk7XG4gICAgZWRpdG9yLmNvbnRleHQgPSBpbnB1dE9yT3V0cHV0O1xufTtcblxuZWRpdG9yLmJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIGVkaXRvci5jb250ZXh0ID0gJ2Jsb2NrJztcbiAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LWJsb2NrJywgJ29uJyk7XG4gICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoQ3VycmVudE9uT2ZmQ29udGV4dCgnei1wb3J0LmlucHV0JywgJ29mZicpO1xuICAgIH0gY2F0Y2goZSkge31cbiAgICB0cnkge1xuICAgICAgICBzd2l0Y2hDdXJyZW50T25PZmZDb250ZXh0KCd6LXBvcnQub3V0cHV0JywgJ29mZicpO1xuICAgIH0gY2F0Y2goZSkge31cbn07XG5cbmVkaXRvci5maXJlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICB2YXIgYmxvY2sgPSBlZGl0b3IuZ2V0Q3VycmVudEJsb2NrKCk7XG4gICAgICAgIHZhciBjb250ZW50ID0gYmxvY2suY29udGVudDtcbiAgICAgICAgaWYgKGNvbnRlbnQudGFnTmFtZSA9PT0gJ0JVVFRPTicpIHtcbiAgICAgICAgICAgIGVuZ2luZS5zZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29udGVudC50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgICAgZW5naW5lLmZpcmVFdmVudDIoYmxvY2spO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZWRpdG9yLnNldCA9IGZ1bmN0aW9uICh0YXJnZXQsIHZhbHVlKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgICAgIGlmIChlZGl0b3IuY29udGV4dCA9PT0gJ2Jsb2NrJykge1xuICAgICAgICAgICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgICAgICAgICAgYmxvY2suY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5tb3ZlID0gZnVuY3Rpb24gKGxlZnQsIHRvcCkge1xuICAgIHZhciBjdXJyZW50ID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGN1cnJlbnQuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICBjdXJyZW50LnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICBjdXJyZW50LnJlZHJhdygpO1xufTtcblxuZWRpdG9yLm1vdmVCeSA9IGZ1bmN0aW9uIChsZWZ0T2Zmc2V0LCB0b3BPZmZzZXQpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICB2YXIgdG9wID0gTnVtYmVyKGN1cnJlbnQuc3R5bGUudG9wLnNsaWNlKDAsIC0yKSkgKyBOdW1iZXIodG9wT2Zmc2V0KTtcbiAgICB2YXIgbGVmdCA9IE51bWJlcihjdXJyZW50LnN0eWxlLmxlZnQuc2xpY2UoMCwgLTIpKSArIE51bWJlcihsZWZ0T2Zmc2V0KTtcbiAgICBlZGl0b3IubW92ZShsZWZ0LCB0b3ApO1xufTtcblxuZWRpdG9yLnN0YXJ0QmxpbmtpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmIChibG9jayAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoYmxvY2suY2xhc3NMaXN0LmNvbnRhaW5zKCdzdG9wLWJsaW5raW5nJykpIHtcbiAgICAgICAgICAgIGJsb2NrLmNsYXNzTGlzdC50b2dnbGUoJ3N0b3AtYmxpbmtpbmcnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVkaXRvci5zdG9wQmxpbmtpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJsb2NrID0gZWRpdG9yLmdldEN1cnJlbnRCbG9jaygpO1xuICAgIGlmICghYmxvY2suY2xhc3NMaXN0LmNvbnRhaW5zKCdzdG9wLWJsaW5raW5nJykpIHtcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LnRvZ2dsZSgnc3RvcC1ibGlua2luZycpO1xuICAgIH1cbn07XG5cbnZhciBibGlua0N1cnNvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VycmVudCA9IGVkaXRvci5nZXRDdXJyZW50QmxvY2soKTtcbiAgICBpZiAoY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgICBjdXJyZW50LmNsYXNzTGlzdC50b2dnbGUoJ2N1cnNvci1kaXNwbGF5ZWQnKTtcbiAgICB9XG4gICAgd2luZG93LnNldFRpbWVvdXQoYmxpbmtDdXJzb3IsIDEwMDApO1xufTtcblxuZWRpdG9yLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgYmxpbmtDdXJzb3IoKTtcbn07XG5cbmVkaXRvci5jbGVhckFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnei1ibG9jaycpO1xuICAgIF8uZWFjaChibG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICBibG9jay51bnBsdWcoKTtcbiAgICAgICAgYmxvY2sucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChibG9jayk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLmlubmVySFRNTCA9ICcnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0b3I7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG4vKmdsb2JhbCBfICovXG5cbi8qZ2xvYmFsIGdldEVsZW1lbnRCbG9jayAqL1xuXG4ndXNlIHN0cmljdCc7XG52YXIgZW5naW5lID0ge307XG5cbmVuZ2luZS5jb21waWxlU2NyaXB0ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICB2YXIgc3RyaW5nID0gZWxlbWVudC50ZXh0O1xuICAgIHZhciBzY3JpcHQ7XG4gICAgdmFyIGNvbXBpbGVkO1xuICAgIHRyeSB7XG4gICAgICAgIC8vIEluIGNhc2Ugc2NyaXB0IGlzIGFuIGV4cHJlc3Npb24uXG4gICAgICAgIHZhciBtYXliZUV4cHJlc3Npb24gPSBzdHJpbmc7XG4gICAgICAgIHNjcmlwdCA9ICdyZXR1cm4gKCcgKyBtYXliZUV4cHJlc3Npb24gKyAnKTsnO1xuICAgICAgICBjb21waWxlZCA9IG5ldyBGdW5jdGlvbignc2VuZFRvT3V0cHV0JywgJ2Rlc3QxJywgJ2luMScsICdpbjInLCAnaW4zJywgJ2luNCcsICdpbjUnLCBzY3JpcHQpO1xuICAgICAgICBlbGVtZW50LmNvbXBpbGVkU2NyaXB0ID0gY29tcGlsZWQ7XG4gICAgfSBjYXRjaCAoZTEpIHtcbiAgICAgICAgLy8gQ29tcGlsYXRpb24gZmFpbGVkIHRoZW4gaXQgaXNuJ3QgYW4gZXhwcmVzc2lvbi4gVHJ5IGFzIGFcbiAgICAgICAgLy8gZnVuY3Rpb24gYm9keS5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNjcmlwdCA9IGVsZW1lbnQudGV4dDtcbiAgICAgICAgICAgIGNvbXBpbGVkID0gbmV3IEZ1bmN0aW9uKCdzZW5kVG9PdXRwdXQnLCAnZGVzdDEnLCAnaW4xJywgJ2luMicsICdpbjMnLCAnaW40JywgJ2luNScsIHNjcmlwdCk7XG4gICAgICAgICAgICBlbGVtZW50LmNvbXBpbGVkU2NyaXB0ID0gY29tcGlsZWQ7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIE5vdCBhIGZ1bmN0aW9uIGJvZHksIHN0cmluZyBpcyBub3QgdmFsaWQuXG4gICAgICAgICAgICBlbGVtZW50LmNvbXBpbGVkU2NyaXB0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmVuZ2luZS5zZW5kRXZlbnRUb091dHB1dFBvcnQgPSBmdW5jdGlvbiAoZWxlbWVudCwgdmFsdWUpIHtcbiAgICB2YXIgYmxvY2sgPSBnZXRFbGVtZW50QmxvY2soZWxlbWVudCk7XG4gICAgdmFyIHBvcnRzID0gYmxvY2sucG9ydHMub3V0cHV0cztcbiAgICBpZiAocG9ydHMpIHtcbiAgICAgICAgaWYgKHBvcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIHBvcnQgPSBwb3J0c1swXTtcbiAgICAgICAgICAgIHBvcnQubGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgICAgICAgZmlyZUV2ZW50KGxpbmssIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQWN0dWFsbHkgdmFsdWUgaXMgYW4gYXJyYXkgb2YgdmFsdWVzLlxuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlO1xuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBvcnRzLCBmdW5jdGlvbiAocG9ydCwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB2YXIgemVWYWx1ZSA9IHZhbHVlc1tpbmRleF07XG4gICAgICAgICAgICAgICAgcG9ydC5saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyZUV2ZW50KGxpbmssIHplVmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZ2V0T3V0cHV0TGlua3NGaXJzdERlc3RpbmF0aW9uQ29udGVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdmFyIGJsb2NrID0gZ2V0RWxlbWVudEJsb2NrKGVsZW1lbnQpO1xuICAgIHZhciBwb3J0ID0gYmxvY2sucG9ydHMub3V0cHV0c1swXTtcbiAgICB2YXIgY29udGVudDtcbiAgICBpZiAocG9ydCAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgbGlua3MgPSBwb3J0LmxpbmtzO1xuICAgICAgICB2YXIgbGluayA9IGxpbmtzWzBdO1xuICAgICAgICBpZiAobGluayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gbGluay5lbmQucG9ydC5ibG9jaztcbiAgICAgICAgICAgIGNvbnRlbnQgPSB0YXJnZXQuY29udGVudDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudDtcbn07XG5cbi8vIFRPRE8gY2hhbmdlIG5hbWUuXG5lbmdpbmUuZmlyZUV2ZW50MiA9IGZ1bmN0aW9uICh0YXJnZXQsIHZhbHVlKSB7XG4gICAgdmFyIGNvbnRlbnQgPSB0YXJnZXQuY29udGVudDtcbiAgICB2YXIgdGFnTmFtZSA9IGNvbnRlbnQudGFnTmFtZTtcblxuICAgIGlmICh0YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICB2YXIgZGF0YVBvcnRzID0gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpO1xuICAgICAgICB2YXIgaW5wdXRzID0gW107XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChkYXRhUG9ydHMsIGZ1bmN0aW9uIChkYXRhUG9ydCkge1xuICAgICAgICAgICAgdmFyIGRhdGFMaW5rcyA9IGRhdGFQb3J0ID09PSBudWxsID8gW10gOiBkYXRhUG9ydC5saW5rcztcblxuICAgICAgICAgICAgaWYgKGRhdGFMaW5rcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YUxpbmsgPSBfLmZpbmQoZGF0YUxpbmtzLCBmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IGxpbmsuYmVnaW4ucG9ydC5ibG9jay5jb250ZW50LnRhZ05hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFnICE9PSAnQlVUVE9OJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhTGluaztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YUxpbmsgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IGRhdGFMaW5rLmJlZ2luLnBvcnQuYmxvY2suY29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdTUEFOJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqLmlubmVySFRNTDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmNsYXNzTGlzdC5jb250YWlucygnemVkLW51bWJlcicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9iai50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb2JqLmV4ZWN1dGlvblJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9iajtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnB1dHMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBuZXh0QWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBmaXJzdERlc3RpbmF0aW9uQ29udGVudCA9IGdldE91dHB1dExpbmtzRmlyc3REZXN0aW5hdGlvbkNvbnRlbnQoY29udGVudCk7XG5cbiAgICAgICAgdmFyIHRoZVNjcmlwdCA9IGNvbnRlbnQuY29tcGlsZWRTY3JpcHQ7XG4gICAgICAgIGlmICh0aGVTY3JpcHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29tcGlsZVNjcmlwdChjb250ZW50KTtcbiAgICAgICAgICAgIHRoZVNjcmlwdCA9IGNvbnRlbnQuY29tcGlsZWRTY3JpcHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoZVNjcmlwdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnRXJyb3IgaW4gc2NyaXB0LiBBYm9ydGluZy4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgIGFyZ3MucHVzaChuZXh0QWN0aW9uKTtcbiAgICAgICAgYXJncy5wdXNoKGZpcnN0RGVzdGluYXRpb25Db250ZW50KTtcbiAgICAgICAgYXJncyA9IGFyZ3MuY29uY2F0KGlucHV0cyk7XG4gICAgICAgIHZhciByZXN1bHQgPSB0aGVTY3JpcHQuYXBwbHkobnVsbCwgYXJncyk7XG5cbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBTdG9yZSByZXN1bHQgZm9yIGZ1dHVyZSB1c2UuXG4gICAgICAgICAgICBjb250ZW50LmV4ZWN1dGlvblJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBzZW5kRXZlbnRUb091dHB1dFBvcnQoY29udGVudCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbmRFdmVudFRvT3V0cHV0UG9ydChjb250ZW50LCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdOVU1CRVInKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250ZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZ05hbWUgPT09ICdESVYnIHx8IHRhZ05hbWUgPT09ICdTUEFOJykge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGVudC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gY29udGVudC5pbm5lckhUTUw7XG4gICAgICAgIH1cbiAgICAgICAgc2VuZEV2ZW50VG9PdXRwdXRQb3J0KGNvbnRlbnQsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodGFnTmFtZSA9PT0gJ0lOUFVUJykge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGVudC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRhcmdldC5yZWRyYXcoKTtcbn07XG5cbmVuZ2luZS5maXJlRXZlbnQgPSBmdW5jdGlvbiAobGluaywgdmFsdWUpIHtcbiAgICB2YXIgdGFyZ2V0ID0gbGluay5lbmQucG9ydC5ibG9jaztcbiAgICBpZiAodGFyZ2V0LnBvcnRzLmlucHV0c1swXSA9PT0gbGluay5lbmQucG9ydCkge1xuICAgICAgICAvLyBPbmx5IGFjdHVhbGx5IGZpcmUgdGhlIGJsb2NrIG9uIGl0cyBmaXJzdCBpbnB1dCBwb3J0LlxuICAgICAgICBmaXJlRXZlbnQyKHRhcmdldCwgdmFsdWUpO1xuICAgIH1cbn07XG5cbmVuZ2luZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIHdpbmRvdy5jb21waWxlU2NyaXB0ID0gZW5naW5lLmNvbXBpbGVTY3JpcHQ7XG4gICAgd2luZG93LnNlbmRFdmVudFRvT3V0cHV0UG9ydCA9IGVuZ2luZS5zZW5kRXZlbnRUb091dHB1dFBvcnQ7XG4gICAgd2luZG93LmZpcmVFdmVudDIgPSBlbmdpbmUuZmlyZUV2ZW50MjtcbiAgICB3aW5kb3cuZmlyZUV2ZW50ID0gZW5naW5lLmZpcmVFdmVudDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZW5naW5lO1xuIiwidmFyIGh0dHAgPSB7fTtcblxuaHR0cC5nZXQgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCk7XG5cbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVxdWVzdC5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QocmVxdWVzdC5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcignTmV0d29yayBlcnJvcicpKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaHR0cDtcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzZWxlY3RvciA9IHtcbiAgICBzZXRTZWxlY3RhYmxlOiBmdW5jdGlvbiAoZWxlbWVudCwgd2l0aFN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzO1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBzZWxlY3Rvci5hY3Rpb24oZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAod2l0aFN0b3BQcm9wYWdhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHdpdGhTdG9wUHJvcGFnYXRpb24gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGNvbm5lY3RhYmxlOiBmdW5jdGlvbiAoZWxlbWVudDEsIGVsZW1lbnQyKSB7XG4gICAgICAgIGlmIChlbGVtZW50MS5jb25uZWN0YWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDEuY29ubmVjdGFibGUoZWxlbWVudDEsIGVsZW1lbnQyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIGFjdGlvbjogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGFibGUodGhpcy5zZWxlY3RlZCwgZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkLmNvbm5lY3QodGhpcy5zZWxlY3RlZCwgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5zZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3Rvcjtcbi8vIFRPRE8gbW92ZSBlbHNld2hlcmVcbmdsb2JhbC5zZWxlY3RvciA9IHNlbGVjdG9yO1xuIiwiLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCB3aW5kb3cgKi9cbi8qZ2xvYmFsIGRvY3VtZW50ICovXG5cbi8qZ2xvYmFsIF8gKi9cblxuLypnbG9iYWwgY29tbWFuZHMgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3InKTtcbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbnZhciBzdG9yYWdlID0ge307XG5cbmZ1bmN0aW9uIGV4cG9ydFBhdGNoICgpIHtcbiAgICB2aWV3LnN3aXRjaE1vZGUoJ2VkaXQnKTtcbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd6LWJsb2NrJyk7XG4gICAgdmFyIHBhdGNoID0ge307XG4gICAgcGF0Y2guYmxvY2tzID0gW107XG4gICAgcGF0Y2gubGlua3MgPSBbXTtcbiAgICBfLmVhY2goZWxlbWVudHMsIGZ1bmN0aW9uIChlbGVtZW50LCBpbmRleCkge1xuICAgICAgICB2YXIgY29udGVudENvbnRhaW5lcklubmVySFRNTCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQtY29udGFpbmVyJykuaW5uZXJIVE1MLnRyaW0oKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBlbGVtZW50LmNvbnRlbnQ7XG4gICAgICAgIHZhciB0YWdOYW1lID0gY29udGVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnY29tbWVudCcpKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gJ2NvbW1lbnQnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHRhZ05hbWUpO1xuICAgICAgICB2YXIgdmFsdWUgPSBjb250ZW50LnZhbHVlIHx8IGNvbnRlbnQuaW5uZXJIVE1MIHx8ICcnO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY29udGVudC5pbm5lckhUTUw7XG4gICAgICAgICAgICBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH0gZWxzZSBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcpIHtcbiAgICAgICAgICAgIC8vIFRoZSBuZXdsaW5lcyBhcmUgbG9zdCB3aGVuIHVzaW5nIHJhdyBpbm5lckhUTUwgZm9yIHNjcmlwdCB0YWdzXG4gICAgICAgICAgICAvLyAoYXQgbGVhc3Qgb24gZmlyZWZveCkuIFNvIHdlIHBhcnNlIGVhY2ggY2hpbGQgdG8gYWRkIGEgbmV3bGluZVxuICAgICAgICAgICAgLy8gd2hlbiBCUiBhcmUgZW5jb3VudGVyZWQuXG4gICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKGNvbnRlbnQuY2hpbGROb2RlcywgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lID09PSAnQlInKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IG5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb250ZW50Q29udGFpbmVySW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlucHV0UG9ydHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpO1xuICAgICAgICB2YXIgb3V0cHV0UG9ydHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKTtcbiAgICAgICAgcGF0Y2guYmxvY2tzLnB1c2goe1xuICAgICAgICAgICAgaWQ6IGluZGV4LFxuICAgICAgICAgICAgdGFnTmFtZTogdGFnTmFtZSxcbiAgICAgICAgICAgIG5JbnB1dHM6IGlucHV0UG9ydHMubGVuZ3RoLFxuICAgICAgICAgICAgbk91dHB1dHM6IG91dHB1dFBvcnRzLmxlbmd0aCxcbiAgICAgICAgICAgIHRvcDogZWxlbWVudC5zdHlsZS50b3AsXG4gICAgICAgICAgICBsZWZ0OiBlbGVtZW50LnN0eWxlLmxlZnQsXG4gICAgICAgICAgICB3aWR0aDogZWxlbWVudC5zdHlsZS53aWR0aCxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIGlubmVySFRNTDogY29udGVudENvbnRhaW5lcklubmVySFRNTFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHBoYW50b20gPSBjb250ZW50LnBoYW50b21lZEJ5O1xuICAgICAgICBpZiAocGhhbnRvbSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwaGFudG9tLnNldEF0dHJpYnV0ZSgnZGF0YS1pbmRleC10by1waGFudG9tJywgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIF8uZWFjaChpbnB1dFBvcnRzLCBmdW5jdGlvbiAocG9ydCwgcG9ydEluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaW5MaW5rcyA9IHBvcnQubGlua3M7XG4gICAgICAgICAgICBfLmVhY2goaW5MaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJQb3J0ID0gbGluay5iZWdpbi5wb3J0O1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrID0gb3RoZXJQb3J0LmJsb2NrO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrSW5kZXggPSBfLmluZGV4T2YoZWxlbWVudHMsIG90aGVyQmxvY2spO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlckJsb2NrUG9ydHMgPSBvdGhlckJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5vdXRwdXQnKTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJCbG9ja1BvcnRJbmRleCA9IF8uaW5kZXhPZihvdGhlckJsb2NrUG9ydHMsIG90aGVyUG9ydCk7XG4gICAgICAgICAgICAgICAgcGF0Y2gubGlua3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jazogaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBwb3J0SW5kZXhcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jazogb3RoZXJCbG9ja0luZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogb3RoZXJCbG9ja1BvcnRJbmRleFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGFnTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGF0Y2gucHJlc2VudGF0aW9uID0ge307XG4gICAgcGF0Y2gucHJlc2VudGF0aW9uLmlubmVySFRNTCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKS5pbm5lckhUTUw7XG4gICAgdmFyIHBoYW50b21zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXNlbnRhdGlvbicpLnF1ZXJ5U2VsZWN0b3JBbGwoJy5waGFudG9tJyk7XG4gICAgXy5lYWNoKHBoYW50b21zLCBmdW5jdGlvbiAocGhhbnRvbSkge1xuICAgICAgICAvLyBGSVhNRSBkYXRhLWluZGV4LXRvLXBoYW50b20gaW5zdGVhZD9cbiAgICAgICAgcGhhbnRvbS5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtcGhhbnRvbWVkLWJsb2NrLWlkJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHBhdGNoO1xufTtcblxuLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxudmFyIGNvbm5lY3RCbG9ja3MgPSBmdW5jdGlvbihlbmQsIHN0YXJ0LCBpbnB1dFBvcnRQb3NpdGlvbiwgb3V0cHV0UG9ydFBvc2l0aW9uKSB7XG4gICAgdmFyIHN0YXJ0UG9ydCA9IChzdGFydC5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQub3V0cHV0JykpW291dHB1dFBvcnRQb3NpdGlvbl07XG4gICAgdmFyIGVuZFBvcnQgPSAoZW5kLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydC5pbnB1dCcpKVtpbnB1dFBvcnRQb3NpdGlvbl07XG4gICAgaWYgKHN0YXJ0UG9ydC5jb25uZWN0YWJsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFRPRE8gY29ubmVjdGFibGUgdGFrZXMgc29tZSB0aW1lIHRvIGJlIGRlZmluZWQuIFdhaXQgZm9yIGl0LlxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChjb25uZWN0QmxvY2tzLCAxLCBlbmQsIHN0YXJ0LCBpbnB1dFBvcnRQb3NpdGlvbiwgb3V0cHV0UG9ydFBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHN0YXJ0UG9ydC5jb25uZWN0YWJsZShzdGFydFBvcnQsIGVuZFBvcnQpKSB7XG4gICAgICAgIHN0YXJ0UG9ydC5jb25uZWN0KHN0YXJ0UG9ydCwgZW5kUG9ydCk7XG4gICAgfVxufTtcblxuLy8gVE9ETyBtb3ZlIGVsc2V3aGVyZVxudmFyIGNyZWF0ZVBoYW50b21MaW5rRm9yQmxvY2sgPSBmdW5jdGlvbiAoYmxvY2ssIHBoYW50b20pIHtcbiAgICB2YXIgY29udGVudCA9IGJsb2NrLmNvbnRlbnQ7XG4gICAgaWYgKGNvbnRlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBGSVggTUUgd2FpdCB0aGF0IGNvbnRlbnQgYWN0dWFsbHkgZXhpc3RzLlxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChjcmVhdGVQaGFudG9tTGlua0ZvckJsb2NrLCAxLCBibG9jaywgcGhhbnRvbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy5jcmVhdGVQaGFudG9tTGluayhjb250ZW50LCBwaGFudG9tKTtcbiAgICB9XG59O1xuXG52YXIgaW1wb3J0UGF0Y2ggPSBmdW5jdGlvbiAocGF0Y2gpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBbXTtcbiAgICBfLmVhY2gocGF0Y2guYmxvY2tzLCBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgYmxvY2subklucHV0cyA9IGJsb2NrLm5JbnB1dHMgfHwgMDtcbiAgICAgICAgYmxvY2subk91dHB1dHMgPSBibG9jay5uT3V0cHV0cyB8fCAwO1xuICAgICAgICBpZiAoYmxvY2sudGFnTmFtZSA9PT0gJ3NjcmlwdCcgfHzCoGJsb2NrLnRhZ05hbWUgPT09ICdidXR0b24nIHx8IGJsb2NrLnRhZ05hbWUgPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgZWRpdG9yLmFkZEJsb2NrKCdodG1sJywgYmxvY2sudGFnTmFtZSwgYmxvY2sudmFsdWUsIGJsb2NrLm5JbnB1dHMsIGJsb2NrLm5PdXRwdXRzLCBibG9jay50b3AsIGJsb2NrLmxlZnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWRpdG9yLmFkZEJsb2NrKCdodG1sJywgYmxvY2suaW5uZXJIVE1MLCAnJywgYmxvY2subklucHV0cywgYmxvY2subk91dHB1dHMsIGJsb2NrLnRvcCwgYmxvY2subGVmdCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd6LWJsb2NrLmN1cnJlbnQnKTtcbiAgICAgICAgZWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICB9KTtcbiAgICBfLmVhY2gocGF0Y2gubGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSBlbGVtZW50c1tsaW5rLm91dHB1dC5ibG9ja107XG4gICAgICAgIHZhciBpbnB1dCA9IGVsZW1lbnRzW2xpbmsuaW5wdXQuYmxvY2tdO1xuICAgICAgICBjb25uZWN0QmxvY2tzKGlucHV0LCBvdXRwdXQsIGxpbmsuaW5wdXQucG9ydCwgbGluay5vdXRwdXQucG9ydCk7XG4gICAgfSk7XG4gICAgdmFyIHByZXNlbnRhdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmVzZW50YXRpb24nKTtcbiAgICBwcmVzZW50YXRpb24uaW5uZXJIVE1MID0gcGF0Y2gucHJlc2VudGF0aW9uLmlubmVySFRNTDtcbiAgICB2YXIgcGhhbnRvbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJykucXVlcnlTZWxlY3RvckFsbCgnLnBoYW50b20nKTtcbiAgICBfLmVhY2gocGhhbnRvbXMsIGZ1bmN0aW9uIChwaGFudG9tKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHBoYW50b20uZ2V0QXR0cmlidXRlKCdkYXRhLWluZGV4LXRvLXBoYW50b20nKTtcbiAgICAgICAgdmFyIGJsb2NrID0gZWxlbWVudHNbaW5kZXhdO1xuICAgICAgICBjcmVhdGVQaGFudG9tTGlua0ZvckJsb2NrKGJsb2NrLCBwaGFudG9tKTtcbiAgICB9KTtcbn07XG5cbnN0b3JhZ2Uuc2F2ZVBhdGNoID0gZnVuY3Rpb24gKHdoZXJlLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBPbmx5IG9uZSBhcmd1bWVudCBtZWFucyBpdCBpcyBhY3R1YWxseSB0aGUgbmFtZSBhbmQgd2UgbG9hZCBmcm9tXG4gICAgICAgIC8vIGxvY2Fsc3RvcmFnZS5cbiAgICAgICAgbmFtZSA9IHdoZXJlO1xuICAgICAgICB3aGVyZSA9ICdsb2NhbCc7XG4gICAgfVxuICAgIHZhciBwYXRjaCA9IGV4cG9ydFBhdGNoKCk7XG4gICAgaWYgKHdoZXJlID09PSAnbG9jYWwnKSB7XG4gICAgICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgICAgICBwYXRjaGVzW25hbWVdID0gcGF0Y2g7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGF0Y2hlcycsIEpTT04uc3RyaW5naWZ5KHBhdGNoZXMpKTtcbiAgICB9IGVsc2UgaWYgKHdoZXJlID09PSAnZmlsZScpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShwYXRjaCwgbnVsbCwgJyAgICAnKTtcbiAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbY29udGVudF0sIHsgdHlwZSA6IFwidGV4dC9wbGFpblwiLCBlbmRpbmdzOiBcInRyYW5zcGFyZW50XCJ9KTtcbiAgICAgICAgd2luZG93LnNhdmVBcyhibG9iLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBFcnJvcignYmFkIHNhdmUgbG9jYXRpb24gKFwiJyArIHdoZXJlICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdcIiksIG11c3QgYmUgXCJsb2NhbFwiIG9yIFwiZmlsZVwiJyk7XG4gICAgfVxufTtcblxuc3RvcmFnZS5sb2FkUGF0Y2ggPSBmdW5jdGlvbiAod2hlcmUsIHdoYXQpIHtcbiAgICBpZiAod2hhdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHdoYXQgPSB3aGVyZTtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aGF0KSA9PT0gJ1tvYmplY3QgRmlsZV0nKSB7XG4gICAgICAgICAgICB3aGVyZSA9ICdmaWxlIG9iamVjdCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGVyZSA9ICdsb2NhbCc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHByb21pc2U7XG4gICAgaWYgKHdoZXJlID09PSAnbG9jYWwnKSB7XG4gICAgICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgICAgIHBhdGNoZXMgPSBwYXRjaGVzIHx8IHt9O1xuICAgICAgICB2YXIgcGF0Y2ggPSBwYXRjaGVzW3doYXRdO1xuICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKHBhdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhdGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdObyBwYXRjaCB3aXRoIG5hbWUgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoYXQgKyAnXCIgaW4gbG9jYWwgc3RvcmFnZS4nKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAod2hlcmUgPT09ICdodHRwJykge1xuICAgICAgICB2YXIgdXJsID0gd2hhdDtcbiAgICAgICAgcHJvbWlzZSA9IGh0dHAuZ2V0KHVybCk7XG4gICAgfSBlbHNlIGlmICh3aGVyZSA9PT0gJ2ZpbGUgb2JqZWN0Jykge1xuICAgICAgICB2YXIgZmlsZSA9IHdoYXQ7XG4gICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICBmaWxlUmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShldmVudC50YXJnZXQucmVzdWx0KSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZmlsZVJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdiYWQgbG9hZCBsb2NhdGlvbiAoXCInICsgd2hlcmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiKSwgbXVzdCBiZSBcImxvY2FsXCIgb3IgXCJodHRwXCInKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uIChwYXRjaCkge1xuICAgICAgICBlZGl0b3IuY2xlYXJBbGwoKTtcbiAgICAgICAgaW1wb3J0UGF0Y2gocGF0Y2gpO1xuICAgIH0pO1xufTtcblxuc3RvcmFnZS5yZW1vdmVQYXRjaCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIHBhdGNoZXMgPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGF0Y2hlcycpKTtcbiAgICBwYXRjaGVzID0gcGF0Y2hlcyB8fCB7fTtcbiAgICB2YXIgdHJhc2ggPSBKU09OLnBhcnNlKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndHJhc2gnKSk7XG4gICAgdHJhc2ggPSB0cmFzaCB8fCB7fTtcbiAgICB2YXIgcGF0Y2ggPSBwYXRjaGVzW25hbWVdO1xuICAgIGlmIChwYXRjaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93ICdObyBwYXRjaCB3aXRoIG5hbWUgXCInICsgbmFtZSArICdcIiBpbiBsb2NhbCBzdG9yYWdlLic7XG4gICAgfVxuICAgIHRyYXNoW25hbWVdID0gcGF0Y2g7XG4gICAgZGVsZXRlIHBhdGNoZXNbbmFtZV07XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwYXRjaGVzJywgSlNPTi5zdHJpbmdpZnkocGF0Y2hlcykpO1xuICAgIGVkaXRvci5jbGVhckFsbCgpO1xufTtcblxuc3RvcmFnZS5nZXRQYXRjaE5hbWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXRjaGVzID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3BhdGNoZXMnKSk7XG4gICAgcmV0dXJuIF8ua2V5cyhwYXRjaGVzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RvcmFnZTtcbiIsIi8vIFVzZSBvZiB0ZXJtbGliLmpzIGZvciB0aGUgdGVybWluYWwgZnJhbWUuXG5cbi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQsIHdpbmRvdyAqL1xuXG4vLyBnbG9iYWxzIGZyb20gdGVybWxpYi5qc1xuLypnbG9iYWwgVGVybUdsb2JhbHMgKi9cbi8qZ2xvYmFsIHRlcm1LZXkgKi9cbi8qZ2xvYmFsIFBhcnNlciAqL1xuLypnbG9iYWwgVGVybWluYWwgKi9cblxudmFyIHRlcm1pbmFsID0ge307XG5cbnRlcm1pbmFsLmNyZWF0ZSA9IGZ1bmN0aW9uIChjb21tYW5kcywgb25ibHVyKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIHRlcm1EaXZJZCA9ICdjb21tYW5kLWxpbmUtZnJhbWUnO1xuXG4gICAgdmFyIGdldFRlcm1EaXYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJyArIHRlcm1EaXZJZCk7XG4gICAgfTtcblxuICAgIHZhciBibHVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBUZXJtR2xvYmFscy5rZXlsb2NrID0gdHJ1ZTtcbiAgICAgICAgVGVybUdsb2JhbHMuYWN0aXZlVGVybS5jdXJzb3JPZmYoKTtcbiAgICAgICAgdmFyIHRlcm1EaXYgPSBnZXRUZXJtRGl2KCk7XG4gICAgICAgIHRlcm1EaXYuY2xhc3NMaXN0LnRvZ2dsZSgnZm9jdXNlZCcpO1xuICAgICAgICBvbmJsdXIoKTtcbiAgICB9O1xuXG4gICAgdmFyIGN0cmxIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5pbnB1dENoYXIgPT09IHRlcm1LZXkuRVNDKSB7XG4gICAgICAgICAgICBibHVyKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHRlcm1IYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoYXQubmV3TGluZSgpO1xuICAgICAgICB2YXIgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuICAgICAgICBwYXJzZXIucGFyc2VMaW5lKHRoYXQpO1xuICAgICAgICB2YXIgY29tbWFuZE5hbWUgPSB0aGF0LmFyZ3ZbMF07XG4gICAgICAgIGlmIChjb21tYW5kcy5oYXNPd25Qcm9wZXJ0eShjb21tYW5kTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gdGhhdC5hcmd2LnNsaWNlKDEpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gY29tbWFuZHNbY29tbWFuZE5hbWVdLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnRoZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud3JpdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndyaXRlKCdFcnJvcjogJyArIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud3JpdGUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnByb21wdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aGF0LndyaXRlKGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgdGhhdC5wcm9tcHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQud3JpdGUoJ3Vua25vd24gY29tbWFuZCBcIicgKyBjb21tYW5kTmFtZSArICdcIi4nKTtcbiAgICAgICAgICAgIHRoYXQucHJvbXB0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGluaXRIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnByb21wdCgpO1xuICAgIH07XG5cbiAgICAvLyBUaGUgdGVybWxpYi5qcyBvYmplY3RcbiAgICB2YXIgdGVybSA9IG5ldyBUZXJtaW5hbCgge1xuICAgICAgICB0ZXJtRGl2OiB0ZXJtRGl2SWQsXG4gICAgICAgIGhhbmRsZXI6IHRlcm1IYW5kbGVyLFxuICAgICAgICBiZ0NvbG9yOiAnI2YwZjBmMCcsXG4gICAgICAgIGNyc3JCbGlua01vZGU6IHRydWUsXG4gICAgICAgIGNyc3JCbG9ja01vZGU6IGZhbHNlLFxuICAgICAgICByb3dzOiAxMCxcbiAgICAgICAgZnJhbWVXaWR0aDogMCxcbiAgICAgICAgY2xvc2VPbkVTQzogZmFsc2UsXG4gICAgICAgIGN0cmxIYW5kbGVyOiBjdHJsSGFuZGxlcixcbiAgICAgICAgaW5pdEhhbmRsZXI6IGluaXRIYW5kbGVyXG5cbiAgICB9ICk7XG4gICAgdGVybS5vcGVuKCk7XG5cbiAgICB2YXIgZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChUZXJtR2xvYmFscy5rZXlsb2NrID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFRlcm1HbG9iYWxzLmtleWxvY2sgPSBmYWxzZTtcbiAgICAgICAgVGVybUdsb2JhbHMuYWN0aXZlVGVybS5jdXJzb3JPbigpO1xuICAgICAgICB2YXIgdGVybURpdiA9IGdldFRlcm1EaXYoKTtcbiAgICAgICAgdGVybURpdi5jbGFzc0xpc3QudG9nZ2xlKCdmb2N1c2VkJyk7XG4gICAgfTtcblxuICAgIGJsdXIoKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGZvY3VzOiBmb2N1cyxcbiAgICAgICAgdGVybTogdGVybVxuICAgIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlcm1pbmFsO1xuIiwiLy8gU3ludGFjdGljIHN1Z2FyIGFuZCBzaW1wbGUgdXRpbGl0aWVzLlxuXG4vKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG4vKmdsb2JhbCBkb2N1bWVudCwgd2luZG93ICovXG5cbi8qZ2xvYmFsIF8gKi9cblxudmFyIHV0aWxzID0ge307XG5cbnZhciBkb207XG5kb20gPSB7XG4gICAgLy8gQ3JlYXRlIGEgZG9tIGZyYWdtZW50IGZyb20gYSBIVE1MIHN0cmluZy5cbiAgICBjcmVhdGVGcmFnbWVudDogZnVuY3Rpb24oaHRtbFN0cmluZykge1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGlmIChodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgZGl2ID0gZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xuICAgICAgICAgICAgZGl2LmlubmVySFRNTCA9IGh0bWxTdHJpbmc7XG4gICAgICAgICAgICB2YXIgY2hpbGQ7XG4gICAgICAgICAgICAvKmVzbGludC1kaXNhYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgICAgICAgICB3aGlsZSAoY2hpbGQgPSBkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIC8qZXNsaW50LWVuYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgICAgICAgICAgICAgIGZyYWdtZW50Lmluc2VydEJlZm9yZShjaGlsZCwgZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWdtZW50LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH0sXG5cbiAgICAvLyBNb3ZlIERPTSBub2RlcyBmcm9tIGEgc291cmNlIHRvIGEgdGFyZ2V0LiBUaGUgbm9kZXMgYXJlcyBzZWxlY3RlZFxuICAgIC8vIGJhc2VkIG9uIGEgc2VsZWN0b3IgYW5kIHRoZSBwbGFjZSB0aGV5IGFyZSBpbnN0ZXJ0ZWQgaXMgYSBnaXZlbiB0YWdcbiAgICAvLyB3aXRoIGEgXCJzZWxlY3RcIiBhdHRyaWJ1dGUgd2hpY2ggY29udGFpbnMgdGhlIGdpdmVuIHNlbGVjdG9yLiBJZlxuICAgIC8vICAgIHNvdXJjZSBpcyAnYWFhIDxzcGFuIGNsYXNzPVwic29tZXRoaW5nXCI+enp6PC9zcGFuPidcbiAgICAvLyBhbmRcbiAgICAvLyAgICB0YXJnZXQgaXMgJ3JyciA8Y29udGVudCBzZWxlY3Q9XCIuc29tZXRoaW5nXCI+PC9jb250ZW50PiB0dHQnXG4gICAgLy8gQWZ0ZXIgbW92ZUNvbnRlbnRCYXNlZE9uU2VsZWN0b3Ioc291cmNlLCB0YXJnZXQsICcuc29tZXRoaW5nJyk6XG4gICAgLy8gICAgc291cmNlIGlzICdhYWEnXG4gICAgLy8gYW5kXG4gICAgLy8gICAgdGFyZ2V0IGlzICdycnIgPHNwYW4gY2xhc3M9XCJzb21ldGhpbmdcIj56eno8L3NwYW4+IHR0dCdcbiAgICBtb3ZlQ29udGVudEJhc2VkT25TZWxlY3RvcjogZnVuY3Rpb24oc291cmNlLCB0YXJnZXQsIHNlbGVjdG9yLCB0YXJnZXRUYWcpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQ7XG4gICAgICAgIHZhciBlbGVtZW50cztcbiAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnJykge1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKHRhcmdldFRhZyk7XG4gICAgICAgICAgICBlbGVtZW50cyA9IHNvdXJjZS5jaGlsZE5vZGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udGVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKHRhcmdldFRhZyArICdbc2VsZWN0PVwiJyArIHNlbGVjdG9yICsgJ1wiXScpO1xuICAgICAgICAgICAgZWxlbWVudHMgPSBzb3VyY2UucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2FybmluZzogaXQgaXMgaW1wb3J0YW50IHRvIGxvb3AgZWxlbWVudHMgYmFja3dhcmQgc2luY2UgY3VycmVudFxuICAgICAgICAvLyBlbGVtZW50IGlzIHJlbW92ZWQgYXQgZWFjaCBzdGVwLlxuICAgICAgICBmb3IgKHZhciBpID0gZWxlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICAvLyBUT0RPLiBMZSBcImluc2VydFwiIGNpLWRlc3NvdXMgc3VyIGxlcyB6LXBvcnQgZmFpdCBxdWUgbGVcbiAgICAgICAgICAgIC8vIGRldGFjaGVkQ2FsbGJhY2sgZXN0IGFwcGVsw6kgYXZlYyBsJ2ltcGxlbWVudGF0aW9uIGRlIGN1c3RvbVxuICAgICAgICAgICAgLy8gZWxtZW50cyBwYXIgd2VicmVmbGVjdGlvbnMgbWFpcyBwYXMgcGFyIGwnaW1wbMOpbWVudGF0aW9uIGRlXG4gICAgICAgICAgICAvLyBQb2x5bWVyIChlbiB1dGlsaXNhbnQgbGUgcG9seWZpbGwgZGUgQm9zb25pYykgbmkgYXZlY1xuICAgICAgICAgICAgLy8gbCdpbXBsw6ltZW50YXRpb24gbmF0aXZlIGRlIGNocm9tZS5cbiAgICAgICAgICAgIGNvbnRlbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBUT0RPIG1vdmUgdGhpcyBlbHNld2hlcmUuXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5vbmNsaWNrID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY29tbWFuZHMuZWRpdEJsb2NrKHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb250ZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY29udGVudCk7XG4gICAgfSxcblxuICAgIG1vdmU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGRvbS5tb3ZlQ29udGVudEJhc2VkT25TZWxlY3RvcihcbiAgICAgICAgICAgICAgICBvcHRpb25zLmZyb20sXG4gICAgICAgICAgICAgICAgb3B0aW9ucy50byxcbiAgICAgICAgICAgICAgICBvcHRpb25zLndpdGhTZWxlY3RvcixcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uVGFnXG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8vIEdldCB0aGUgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQgcmVsYXRpdmUgdG8gYW5vdGhlciBvbmUgKGRlZmF1bHQgaXNcbiAgICAvLyBkb2N1bWVudCBib2R5KS5cbiAgICBnZXRQb3NpdGlvbjogZnVuY3Rpb24gKGVsZW1lbnQsIHJlbGF0aXZlRWxlbWVudCkge1xuICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHJlbGF0aXZlRWxlbWVudCA9IHJlbGF0aXZlRWxlbWVudCB8fCBkb2N1bWVudC5ib2R5O1xuICAgICAgICB2YXIgcmVsYXRpdmVSZWN0ID0gcmVsYXRpdmVFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcmVjdC5sZWZ0IC0gcmVsYXRpdmVSZWN0LmxlZnQsXG4gICAgICAgICAgICB5OiByZWN0LnRvcCAtIHJlbGF0aXZlUmVjdC50b3BcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VsZWN0aW9uU3RhcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKS5hbmNob3JOb2RlO1xuICAgICAgICByZXR1cm4gKCAobm9kZSAhPT0gbnVsbCAmJiBub2RlLm5vZGVUeXBlID09PSAzKSA/IG5vZGUucGFyZW50Tm9kZSA6IG5vZGUgKTtcbiAgICB9XG5cbn07XG51dGlscy5kb20gPSBkb207XG5cbi8vIFVzZWZ1bGwgZm9yIG11bHRpbGluZSBzdHJpbmcgZGVmaW5pdGlvbiB3aXRob3V0ICdcXCcgb3IgbXVsdGlsaW5lXG4vLyBjb25jYXRlbmF0aW9uIHdpdGggJysnLlxudXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBmdW5jLnRvU3RyaW5nKCkubWF0Y2goL1teXSpcXC9cXCooW15dKilcXCpcXC9cXHMqXFx9JC8pWzFdO1xufTtcblxudXRpbHMuY3JlYXRlS2V5c0dlbmVyYXRvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBSZXR1cm5zIGEga2V5cyBnZW5lcmF0b3IgZm9yIGEgc2VxdWVuY2UgdGhhdCBpcyBidWlsZCBsaWtlIHRoYXQ6XG4gICAgLy8gICBiLCBjLCBkLi4uXG4gICAgLy8gICBhYiwgYWMsIGFkLi4uXG4gICAgLy8gICBhYWIsIGFhYywgYWFkLi4uXG4gICAgLy8gVGhlIGlkZWEgaXMgdG8gaGF2ZSBhIHNlcXVlbmNlIHdoZXJlIGVhY2ggdmFsdWUgaXMgbm90IHRoZSBiZWdpbm5pbmdcbiAgICAvLyBvZiBhbnkgb3RoZXIgdmFsdWUgKHNvIHNpbmdsZSAnYScgY2FuJ3QgYmUgcGFydCBvZiB0aGUgc2VxdWVuY2UpLlxuICAgIC8vXG4gICAgLy8gT25lIGdvYWwgaXMgdG8gaGF2ZSBzaG9ydGVzdCBwb3NzaWJsZSBrZXlzLiBTbyBtYXliZSB3ZSBzaG91bGQgdXNlXG4gICAgLy8gYWRkaXRpb25uYWwgcHJlZml4IGNoYXJzIGFsb25nIHdpdGggJ2EnLiBBbmQgYmVjYXVzZSBpdCB3aWxsIGJlIHVzZWRcbiAgICAvLyBmb3Igc2hvcnRjdXRzLCBtYXliZSB3ZSBjYW4gY2hvb3NlIGNoYXJzIGJhc2VkIG9uIHRoZWlyIHBvc2l0aW9uIG9uXG4gICAgLy8gdGhlIGtleWJvYXJkLlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIGNoYXJDb2RlcyA9IF8ucmFuZ2UoJ2InLmNoYXJDb2RlQXQoMCksICd6Jy5jaGFyQ29kZUF0KDApICsgMSk7XG4gICAgdmFyIGlkU3RyaW5ncyA9IF8ubWFwKGNoYXJDb2RlcywgZnVuY3Rpb24gKGNoYXJDb2RlKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJDb2RlKTtcbiAgICB9KTtcbiAgICB2YXIgZ2VuZXJhdG9yID0ge307XG4gICAgZ2VuZXJhdG9yLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBrZXkgPSAnJztcbiAgICAgICAgdmFyIGkgPSBpbmRleDtcbiAgICAgICAgaWYgKGkgPj0gY2hhckNvZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIHIgPSBNYXRoLmZsb29yKGkgLyBjaGFyQ29kZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGkgPSBpICUgY2hhckNvZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChyID4gMCkge1xuICAgICAgICAgICAgICAgIGtleSArPSAnYSc7XG4gICAgICAgICAgICAgICAgci0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGtleSArPSBpZFN0cmluZ3NbaV07XG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfTtcblxuICAgIHJldHVybiBnZW5lcmF0b3I7XG59O1xuXG53aW5kb3cudXRpbHMgPSB1dGlscztcbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIHdpbmRvdyAqL1xuLypnbG9iYWwgZG9jdW1lbnQgKi9cblxuLypnbG9iYWwgXyAqL1xuLypnbG9iYWwgTW91c2V0cmFwICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHZpZXcgPSB7fTtcblxudmFyIGlzRGVzY2VuZGFudCA9IGZ1bmN0aW9uIChjaGlsZCwgcGFyZW50KSB7XG4gICAgIHZhciBub2RlID0gY2hpbGQucGFyZW50Tm9kZTtcbiAgICAgd2hpbGUgKG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgIGlmIChub2RlID09PSBwYXJlbnQpIHtcbiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgIH1cbiAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgIH1cbiAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGdldFByZXNlbnRhdGlvbkVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlc2VudGF0aW9uJyk7XG59O1xuXG52YXIgY3JlYXRlUGhhbnRvbUxpbmsgPSBmdW5jdGlvbiAocGhhbnRvbWVkLCBwaGFudG9tKSB7XG4gICAgcGhhbnRvbS5waGFudG9tT2YgPSBwaGFudG9tZWQ7XG4gICAgcGhhbnRvbS5jbGFzc0xpc3QuYWRkKCdwaGFudG9tJyk7XG4gICAgcGhhbnRvbWVkLnBoYW50b21lZEJ5ID0gcGhhbnRvbTtcbiAgICBwaGFudG9tZWQuY2xhc3NMaXN0LmFkZCgncGhhbnRvbWVkJyk7XG59O1xudmlldy5jcmVhdGVQaGFudG9tTGluayA9IGNyZWF0ZVBoYW50b21MaW5rO1xuXG52YXIgY3JlYXRlUGhhbnRvbSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciBwaGFudG9tID0gZWxlbWVudC5jbG9uZU5vZGUodHJ1ZSk7XG4gIHBoYW50b20uZGlzYWJsZWQgPSB0cnVlO1xuICBwaGFudG9tLnNldEF0dHJpYnV0ZSgnY29udGVudEVkaXRhYmxlJywgZmFsc2UpO1xuICAvLyBMaW5rIHRoZSB0d28gZm9yIGxhdGVyIHVzZSAoaW4gcGFydGljdWxhcnkgd2hlbiB3ZSB3aWxsIHN3aXRjaFxuICAvLyBkaXNwbGF5IG1vZGUpLlxuICBjcmVhdGVQaGFudG9tTGluayhlbGVtZW50LCBwaGFudG9tKTtcblxuICByZXR1cm4gcGhhbnRvbTtcbn07XG5cbnZhciBpc0N1cnJlbnRTZWxlY3Rpb25JblByZXNlbnRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHRoZSBzZWxlY3Rpb24gcmFuZ2UgKG9yIGN1cnNvciBwb3NpdGlvbilcbiAgdmFyIHJhbmdlID0gd2luZG93LmdldFNlbGVjdGlvbigpLmdldFJhbmdlQXQoMCk7XG4gIHZhciB6ZVByZXNlbnRhdGlvbiA9IGdldFByZXNlbnRhdGlvbkVsZW1lbnQoKTtcbiAgLy8gQmUgc3VyZSB0aGUgc2VsZWN0aW9uIGlzIGluIHRoZSBwcmVzZW50YXRpb24uXG4gIHJldHVybiBpc0Rlc2NlbmRhbnQocmFuZ2Uuc3RhcnRDb250YWluZXIsIHplUHJlc2VudGF0aW9uKTtcbn07XG5cbnZhciBpbnNlcnRJblBsYWNlT2ZTZWxlY3Rpb24gPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAvLyBHZXQgdGhlIHNlbGVjdGlvbiByYW5nZSAob3IgY3Vyc29yIHBvc2l0aW9uKVxuICB2YXIgcmFuZ2UgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCkuZ2V0UmFuZ2VBdCgwKTtcbiAgLy8gRGVsZXRlIHdoYXRldmVyIGlzIG9uIHRoZSByYW5nZVxuICByYW5nZS5kZWxldGVDb250ZW50cygpO1xuICByYW5nZS5pbnNlcnROb2RlKGVsZW1lbnQpO1xufTtcblxuLy8gSW5zZXJ0IGEgc2VsZWN0ZWQgYmxvY2sgaW4gdGhlIERPTSBzZWxlY3Rpb24gaW4gcHJlc2VudGF0aW9uIHdpbmRvdy5cbnZhciBpbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGJsb2NrID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignei1ibG9jay5jdXJyZW50Jyk7XG4gIGlmIChibG9jayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gTm90aGluZyBpcyBzZWxlY3RlZC5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZihpc0N1cnJlbnRTZWxlY3Rpb25JblByZXNlbnRhdGlvbigpKSB7XG4gICAgdmFyIGNvbnRlbnQgPSBibG9jay5jb250ZW50O1xuICAgIHZhciBwaGFudG9tID0gY3JlYXRlUGhhbnRvbShjb250ZW50KTtcbiAgICBpbnNlcnRJblBsYWNlT2ZTZWxlY3Rpb24ocGhhbnRvbSk7XG5cbiAgICAvLyBUT0RPIGV2ZW50dWFsbHkgc3dpdGNoIHRoZSB0d28gaWYgd2UgYXJlIGluIHByZXNlbnRhdGlvbiBtb2RlLlxuICB9XG59O1xudmlldy5pbnNlcnRCbG9ja0NvbnRlbnRJblNlbGVjdGlvbiA9IGluc2VydEJsb2NrQ29udGVudEluU2VsZWN0aW9uO1xuXG52YXIgZ2V0UGhhbnRvbXMgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICByZXR1cm4gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGhhbnRvbScpO1xufTtcblxudmFyIGdldFdpbmRvd0Zvck1vZGUgPSBmdW5jdGlvbiAobW9kZSkge1xuICB2YXIgaWQgPSBtb2RlO1xuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xufTtcblxudmFyIHN3YXBFbGVtZW50cyA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gICAgLy8gY3JlYXRlIG1hcmtlciBlbGVtZW50IGFuZCBpbnNlcnQgaXQgd2hlcmUgb2JqMSBpc1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb2JqMS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0ZW1wLCBvYmoxKTtcblxuICAgIC8vIG1vdmUgb2JqMSB0byByaWdodCBiZWZvcmUgb2JqMlxuICAgIG9iajIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUob2JqMSwgb2JqMik7XG5cbiAgICAvLyBtb3ZlIG9iajIgdG8gcmlnaHQgYmVmb3JlIHdoZXJlIG9iajEgdXNlZCB0byBiZVxuICAgIHRlbXAucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUob2JqMiwgdGVtcCk7XG5cbiAgICAvLyByZW1vdmUgdGVtcG9yYXJ5IG1hcmtlciBub2RlXG4gICAgdGVtcC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRlbXApO1xufTtcblxudmFyIGN1cnJlbnRNb2RlID0gJyc7XG5cbi8vIERvIGFsbCB0aGUgc3R1ZmYgbmVlZGVkIHRvIHN3aXRjaCBtb2RlIGJldHdlZW4gJ2VkaXQnIGFuZCAncHJlc2VudGF0aW9uJy5cbi8vIE1haW5seSBzd2FwICdwaGFudG9tJyBhbmQgJ3BoYW50b21lZCcgb2JqZWN0cyBwYWlycy5cbnZhciBzd2l0Y2hNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcbiAgICBpZiAobW9kZSA9PT0gY3VycmVudE1vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjdXJyZW50TW9kZSA9IG1vZGU7XG4gIC8vIEJ5IGNvbnZlbnRpb24sIHRoZSAncGhhbnRvbScgZWxlbWVudHMgYWN0dWFsbHkgYXJlIGluIHRoZSB3aW5kb3dcbiAgLy8gYXNzb2NpYXRlZCB0byB0aGUgbW9kZSB3ZSB3YW50IHRvIHN3aXRjaCB0by4gVGhlIHBoYW50b21lZCBvbmUgYXJlIGluIHRoZVxuICAvLyB3aW5kb3cgb2YgdGhlIG90aGVyIG1vZGUuXG5cbiAgdmFyIHBoYW50b21zID0gZ2V0UGhhbnRvbXMoZ2V0V2luZG93Rm9yTW9kZShtb2RlKSk7XG4gIF8uZWFjaChwaGFudG9tcywgZnVuY3Rpb24gKHBoYW50b20pIHtcbiAgICAvLyBXaGF0IHRoaXMgb2JqZWN0IGlzIHRoZSBwaGFudG9tIG9mP1xuICAgIHZhciBwaGFudG9tZWQgPSBwaGFudG9tLnBoYW50b21PZjtcbiAgICAvLyBTaW1wbHkgc3dhcCB0aGVzZSBET00gb2JqZWN0cy5cbiAgICBzd2FwRWxlbWVudHMocGhhbnRvbWVkLCBwaGFudG9tKTtcbiAgfSk7XG59O1xudmlldy5zd2l0Y2hNb2RlID0gc3dpdGNoTW9kZTtcblxudmFyIHByZXNlbnRhdGlvbiA9IHt9O1xuXG4vLyBUT0RPIG5vdCB1c2VkP1xudmFyIHNlbGVjdEVsZW1lbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgcHJlc2VudGF0aW9uLnNlbGVjdGVkID0gZXZlbnQudGFyZ2V0O1xufTtcbnZpZXcuc2VsZWN0RWxlbWVudCA9IHNlbGVjdEVsZW1lbnQ7XG5cbnZhciBsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAgIHAuY29udGVudEVkaXRhYmxlID0gZmFsc2U7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xvY2stYnV0dG9uJykuZGlzYWJsZWQgPSB0cnVlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN1bmxvY2stYnV0dG9uJykuZGlzYWJsZWQgPSBmYWxzZTtcbn07XG52aWV3LmxvY2sgPSBsb2NrO1xuXG52YXIgdW5sb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAgIHAuY29udGVudEVkaXRhYmxlID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjbG9jay1idXR0b24nKS5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN1bmxvY2stYnV0dG9uJykuZGlzYWJsZWQgPSB0cnVlO1xufTtcbnZpZXcudW5sb2NrID0gdW5sb2NrO1xuXG52YXIgaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwID0gZ2V0UHJlc2VudGF0aW9uRWxlbWVudCgpO1xuICAgIHAub25mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgTW91c2V0cmFwLnJlc2V0KCk7XG4gICAgfTtcbiAgICBwLm9uYmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmJpbmRLZXlzRm9yTWFpbk1vZGUoKTtcbiAgICB9O1xufTtcbnZpZXcuaW5pdCA9IGluaXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gdmlldztcbmdsb2JhbC52aWV3ID0gdmlldztcbiIsIi8qZXNsaW50IHF1b3RlczogWzIsIFwic2luZ2xlXCJdKi9cblxuLypnbG9iYWwgZG9jdW1lbnQgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuLypnbG9iYWwgcmVzdHlsZSAqL1xuLypnbG9iYWwgRHJhZ2dhYmlsbHkgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LWJsb2NrJztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8ZGl2IGlkPVwibWFpblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicG9ydHMtY29udGFpbmVyIGlucHV0c1wiPlxuICAgICAgICAgICAgPGNvbnRlbnQgc2VsZWN0PVwiei1wb3J0LmlucHV0XCI+PC9jb250ZW50PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJibG9jay1rZXlcIj5hPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudC1jb250YWluZXJcIj5cbiAgICAgICAgICAgIDxjb250ZW50PjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwb3J0cy1jb250YWluZXIgb3V0cHV0c1wiPlxuICAgICAgICAgICAgPGNvbnRlbnQgc2VsZWN0PVwiei1wb3J0Lm91dHB1dFwiPjwvY29udGVudD5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4qL30pO1xudmFyIHRlbXBsYXRlID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxUZW1wbGF0ZSk7XG5cbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgIC8vIEJ5IGRlZmF1bHQgY3VzdG9tIGVsZW1lbnRzIGFyZSBpbmxpbmUgZWxlbWVudHMuIEN1cnJlbnQgZWxlbWVudFxuICAgICAgICAvLyBoYXMgaXRzIG93biBoZWlnaHQgYW5kIHdpZHRoIGFuZCBjYW4gYmUgaW5zdGVydGVkIGluIGEgdGV4dFxuICAgICAgICAvLyBmbG93LiBTbyB3ZSBuZWVkIGEgJ2Rpc3BsYXk6IGlubGluZS1ibG9jaycgc3R5bGUuIE1vcmVvdmVyLCB0aGlzXG4gICAgICAgIC8vIGlzIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgZm9yIGEgYnVnIGluIERyYWdnYWJpbGx5ICh3aGljaCBvbmx5XG4gICAgICAgIC8vIHdvcmtzIG9uIGJsb2NrIGVsZW1lbnRzLCBub3Qgb24gaW5saW5lIG9uZXMpLlxuICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnXG4gICAgfSxcbiAgICAnPiBkaXYnOiB7XG4gICAgICAgICdiYWNrZ3JvdW5kJzogJ3doaXRlJyxcbiAgICAgICAgJ2JvcmRlci1sZWZ0JzogJzNweCBzb2xpZCcsXG4gICAgICAgICdib3JkZXItbGVmdC1jb2xvcic6ICd3aGl0ZScsXG4gICAgICAgICdib3JkZXItcmlnaHQnOiAnM3B4IHNvbGlkJyxcbiAgICAgICAgJ2JvcmRlci1yaWdodC1jb2xvcic6ICd3aGl0ZScsXG4gICAgICAgICdib3hTaGFkb3cnOiAnMnB4IDJweCAzcHggMHB4ICNkZmRmZGYnXG4gICAgfSxcbiAgICAnLmNvbnRlbnQtY29udGFpbmVyJzoge1xuICAgICAgICAncGFkZGluZyc6ICc4cHggMTVweCA4cHggMTVweCdcbiAgICB9LFxuICAgICcucG9ydHMtY29udGFpbmVyJzoge1xuICAgICAgICAncGFkZGluZyc6IDAsXG4gICAgICAgICdtaW5IZWlnaHQnOiAzLFxuICAgICAgICAnb3ZlcmZsb3cnOiAndmlzaWJsZSdcbiAgICB9LFxuICAgICcucG9ydHMtY29udGFpbmVyIHotcG9ydCc6IHtcbiAgICAgICAgJ2Zsb2F0JzogJ2xlZnQnLFxuICAgICAgICAnbWFyZ2luTGVmdCc6IDgsXG4gICAgICAgICdtYXJnaW5SaWdodCc6IDhcbiAgICB9LFxuICAgICdzcGFuLmJsb2NrLWtleSc6IHtcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6ICdzbWFsbGVyJyxcbiAgICAgICAgJ2NvbG9yJzogJyM0NDQnLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnYm90dG9tJzogMCxcbiAgICAgICAgJ3JpZ2h0JzogMCxcbiAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiAzLFxuICAgICAgICAncGFkZGluZy1sZWZ0JzogMyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAnI2ZmZidcbiAgICB9LFxuICAgICd6LXBvcnQuaW5wdXQgLnBvcnQta2V5Jzoge1xuICAgICAgICAndG9wJzogM1xuICAgIH0sXG4gICAgJ3otcG9ydC5vdXRwdXQgLnBvcnQta2V5Jzoge1xuICAgICAgICAnYm90dG9tJzogM1xuICAgIH1cbn07XG4vLyBBcHBseSB0aGUgY3NzIGRlZmluaXRpb24gYW5kIHByZXBlbmRpbmcgdGhlIGN1c3RvbSBlbGVtZW50IHRhZyB0byBhbGxcbi8vIENTUyBzZWxlY3RvcnMuXG52YXIgc3R5bGUgPSByZXN0eWxlKHRhZ05hbWUsIGNzc0FzSnNvbik7XG5cbnZhciByZWRyYXcgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICB2YXIgcG9ydHMgPSBibG9jay5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQnKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgIHBvcnQucmVkcmF3KCk7XG4gICAgfSk7XG59O1xuXG52YXIgbWFrZUl0RHJhZ2dhYmxlID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgdmFyIGRyYWdnaWUgPSBuZXcgRHJhZ2dhYmlsbHkoYmxvY2ssIHtcbiAgICAgICAgY29udGFpbm1lbnQ6IHRydWVcbiAgICB9KTtcbiAgICBkcmFnZ2llLmV4dGVybmFsQW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVkcmF3KGJsb2NrKTtcbiAgICB9O1xufTtcblxudmFyIHByb3BlcnRpZXMgPSB7XG4gICAgY3JlYXRlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBBdCB0aGUgYmVnaW5uaW5nIHRoZSBsaWdodCBET00gaXMgc3RvcmVkIGluIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgICAgIHZhciBsaWdodERvbSA9IHRoaXM7XG4gICAgICAgIC8vIFN0YXJ0IGNvbXBvc2VkIERPTSB3aXRoIGEgY29weSBvZiB0aGUgdGVtcGxhdGVcbiAgICAgICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAvLyBUaGVuIHByb2dyZXNzaXZlbHkgbW92ZSBlbGVtZW50cyBmcm9tIGxpZ2h0IHRvIGNvbXBvc2VkIERPTSBiYXNlZCBvblxuICAgICAgICAvLyBzZWxlY3RvcnMgb24gbGlnaHQgRE9NIGFuZCBmaWxsIDxjb250ZW50PiB0YWdzIGluIGNvbXBvc2VkIERPTSB3aXRoXG4gICAgICAgIC8vIHRoZW0uXG4gICAgICAgIFsnei1wb3J0LmlucHV0JywgJ3otcG9ydC5vdXRwdXQnLCAnJ10uZm9yRWFjaChmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgICAgdXRpbHMuZG9tLm1vdmUoe1xuICAgICAgICAgICAgICAgIGZyb206IGxpZ2h0RG9tLCB3aXRoU2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgIHRvOiBjb21wb3NlZERvbSwgb25UYWc6ICdjb250ZW50J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBBdCB0aGlzIHN0YWdlIGNvbXBvc2VkIERPTSBpcyBjb21wbGV0ZWQgYW5kIGxpZ2h0IERPTSBpcyBlbXB0eSAoaS5lLlxuICAgICAgICAvLyAndGhpcycgaGFzIG5vIGNoaWxkcmVuKS4gQ29tcG9zZWQgRE9NIGlzIHNldCBhcyB0aGUgY29udGVudCBvZiB0aGVcbiAgICAgICAgLy8gY3VycmVudCBlbGVtZW50LlxuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgICAgICB0aGlzLmhpZGVLZXkoKTtcblxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciBwb3J0cyA9IHRoYXQucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Jyk7XG4gICAgICAgIFtdLmZvckVhY2guY2FsbChwb3J0cywgZnVuY3Rpb24ocG9ydCkge1xuICAgICAgICAgICAgcG9ydC5ibG9jayA9IHRoYXQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMucXVlcnlTZWxlY3RvcignLnplLWNvbnRlbnQnKTtcblxuICAgICAgICAvLyBUT0RPIG1vdmUgZWxzZXdoZXJlXG4gICAgICAgIHRoaXMub25jbGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHdpbmRvdy5zZXRDdXJyZW50QmxvY2sodGhhdCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG4gICAgfX0sXG5cbiAgICBhdHRhY2hlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBUT0RPIGJ1ZyBpbiBjaHJvbWUgb3IgaW4gd2VicmVmbGVjdGlvbiBwb2x5ZmlsbC4gSWYgbWFrZUl0RHJhZ2dhYmxlXG4gICAgICAgIC8vIGlzIGNhbGxlZCBpbiBjcmVhdGVkQ2FsbGJhY2sgdGhlbiBEcmFnZ2FiaWx5IGFkZHMgYVxuICAgICAgICAvLyAncG9zaXRpb246cmVsYXRpdmUnIGJlY2F1c2UgdGhlIGNzcyBzdHlsZSBvZiBibG9jayB0aGF0IHNldFxuICAgICAgICAvLyBwb3NpdGlvbiB0byBhYnNvbHV0ZSBoYXMgbm90IGJlZW4gYXBwbGllZCB5ZXQgKHdpdGggY2hyb21lKS4gV2l0aFxuICAgICAgICAvLyBXZWJSZWZsZWN0aW9uJ3MgcG9seWZpbGwgdGhlIHN0eWxlIGlzIGFwcGxpZWQgc28gRHJhZ2dhYmlsbHkgZG9lc24ndFxuICAgICAgICAvLyBjaGFuZ2UgcG9zaXRpb24uIFdoeSBhIGRpZmZlcmVudCBiZWhhdmlvdXI/IFdoaWNoIGlzIHdyb25nID8gQ2hyb21lLFxuICAgICAgICAvLyB3ZWJyZWZsZWN0aW9uIG9yIHRoZSBzcGVjPyBNYXliZSB3ZSBjYW4gdHJ5IHdpdGggcG9seW1lciBwb2x5ZmlsbC5cbiAgICAgICAgbWFrZUl0RHJhZ2dhYmxlKHRoaXMpO1xuICAgIH19LFxuXG4gICAgdW5wbHVnOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcG9ydHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ3otcG9ydCcpO1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwocG9ydHMsIGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgICAgICAgICBwb3J0LnVucGx1ZygpO1xuICAgICAgICB9KTtcbiAgICB9fSxcblxuICAgIGFkZFBvcnQ6IHt2YWx1ZTogZnVuY3Rpb24gKGh0bWxTdHJpbmcpIHtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gdXRpbHMuZG9tLmNyZWF0ZUZyYWdtZW50KGh0bWxTdHJpbmcpO1xuICAgICAgICB2YXIgcG9ydCA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgIHBvcnQuYmxvY2sgPSB0aGlzO1xuICAgICAgICBpZiAocG9ydC5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JykpIHtcbiAgICAgICAgICAgIHZhciBwb3J0Q29udGFpbmVyID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcucG9ydHMtY29udGFpbmVyLmlucHV0cycpO1xuICAgICAgICAgICAgcG9ydENvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAocG9ydC5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKSB7XG4gICAgICAgICAgICB2YXIgcG9ydENvbnRhaW5lciA9IHRoaXMucXVlcnlTZWxlY3RvcignLnBvcnRzLWNvbnRhaW5lci5vdXRwdXRzJyk7XG4gICAgICAgICAgICBwb3J0Q29udGFpbmVyLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcG9ydDtcbiAgICB9fSxcblxuICAgIGtleUVsZW1lbnQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKCdzcGFuLmJsb2NrLWtleScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleToge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5rZXlFbGVtZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNob3dLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICB9fSxcblxuICAgIGhpZGVLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIH19LFxuXG4gICAgcG9ydHM6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdvdXQnOiB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3otcG9ydC5vdXRwdXQnKSxcbiAgICAgICAgICAgICAgICAnaW5wdXRzJzogdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCd6LXBvcnQuaW5wdXQnKSxcbiAgICAgICAgICAgICAgICAnb3V0cHV0cyc6IHRoaXMucXVlcnlTZWxlY3RvckFsbCgnei1wb3J0Lm91dHB1dCcpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsIHByb3BlcnRpZXMpO1xucHJvdG8uY3NzID0gc3R5bGU7XG5kb2N1bWVudC5yZWdpc3RlckVsZW1lbnQodGFnTmFtZSwge3Byb3RvdHlwZTogcHJvdG99KTtcblxuLy8gVE9ETyBjbGVhbiBnbG9iYWxzXG53aW5kb3cuZ2V0RWxlbWVudEJsb2NrID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBUT0RPIGRvIGEgc2VhcmNoIHRvIGZpbmQgdGhlIGZpcnN0IHBhcmVudCBibG9jayBmb3IgY2FzZXMgd2hlcmVcbiAgICAvLyBlbGVtZW50IGlzIGRvd24gaW4gdGhlIGVsZW1lbnQgaGllYXJjaHkuXG4gICAgdmFyIG1heWJlQmxvY2sgPSBlbGVtZW50LnBhcmVudE5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIHZhciBibG9jaztcbiAgICBpZiAobWF5YmVCbG9jay50YWdOYW1lID09PSAnWi1CTE9DSycpIHtcbiAgICAgICAgYmxvY2sgPSBtYXliZUJsb2NrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGJsb2NrID0gZWxlbWVudC5waGFudG9tZWRCeS5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGJsb2NrO1xufTtcbiIsIi8vIEN1c3RvbSBlbGVtZW50IHRvIGRyYXcgYSBsaW5rIGJldHdlZW4gdHdvIHBvcnRzLlxuXG4vLyBXZSBpbXBsZW1lbnQgdGhpcyBhcyBhIGRpdiB3aXRoIHplcm8gaGVpZ2h0IHdoaWNoIHdpZHRoIGlzIHRoZSBsZW5ndGggb2YgdGhlXG4vLyBsaW5lIGFuZCB1c2UgdHJhbnNmb3JtcyB0byBzZXQgaXRzIGVuZHMgdG8gdGhlIHBvcnRzIHBvc2l0aW9ucy4gUmVmZXJlbmNlXG4vLyBvcmlnaW4gcG9zaXRpb24gaXMgcmVsYXRpdmUgY29vcmRpbmF0ZXMgKDAsMCkgYW5kIG90aGVyIGVuZCBpcyAod2lkdGgsMCkuXG4vLyBTbyBiZSBzdXJlIHRoYXQgQ1NTIHN0eWxpbmcgaXMgZG9uZSBhY2NvcmRpbmdseS5cblxuLyplc2xpbnQgcXVvdGVzOiBbMiwgXCJzaW5nbGVcIl0qL1xuXG4vKmdsb2JhbCBkb2N1bWVudCAqL1xuLypnbG9iYWwgSFRNTEVsZW1lbnQgKi9cblxuLypnbG9iYWwgZ2V0U3R5bGVQcm9wZXJ0eSAqL1xuXG4vKmdsb2JhbCBfICovXG4vKmdsb2JhbCByZXN0eWxlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3V0aWxzJyk7XG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuLi9saWIvc2VsZWN0b3InKTtcblxudmFyIHRhZ05hbWUgPSAnei1saW5rJztcblxudmFyIGh0bWxUZW1wbGF0ZSA9IHV0aWxzLnN0cmluZ0Zyb21Db21tZW50SW5GdW5jdGlvbihmdW5jdGlvbiAoKSB7LypcbiAgICA8ZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj5cbiAgICA8L2Rpdj5cbiovfSk7XG52YXIgdGVtcGxhdGUgPSB1dGlscy5kb20uY3JlYXRlRnJhZ21lbnQoaHRtbFRlbXBsYXRlKTtcblxuLy8gVE9ETyBVc2UgYSBjdXN0b20gZWxlbWVudCBmb3IgbGluZSB3aWR0aC5cbnZhciBsaW5lV2lkdGggPSAzLjA7XG52YXIgcmFkaXVzID0gbGluZVdpZHRoIC8gMjtcbnZhciBjc3NBc0pzb24gPSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyB3aWxsIGFwcGx5IHRvIHRoZSByb290IERPTSBlbGVtZW50IG9mIHRoZSBjdXN0b21cbiAgICAvLyBlbGVtZW50LlxuICAgICcnOiB7XG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdoZWlnaHQnOiAwLFxuICAgICAgICAnbWFyZ2luLWxlZnQnOiAtcmFkaXVzLFxuICAgICAgICAnbWFyZ2luLXRvcCc6IC1yYWRpdXMsXG4gICAgICAgICdib3JkZXJXaWR0aCc6IHJhZGl1cyxcbiAgICAgICAgJ2JvcmRlclJhZGl1cyc6IHJhZGl1cyxcbiAgICAgICAgJ2JvcmRlclN0eWxlJzogJ3NvbGlkJyxcbiAgICAgICAgJ2JveFNoYWRvdyc6ICcwcHggMHB4IDNweCAwcHggI2RmZGZkZicsXG4gICAgICAgICdib3JkZXJDb2xvcic6ICcjY2NjJ1xuICAgIH0sXG4gICAgJ2Rpdi5zZWxlY3Rvcic6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAnMTAlJyxcbiAgICAgICAgJ3dpZHRoJzogJzgwJScsXG4gICAgICAgICd0b3AnOiAtNyxcbiAgICAgICAgJ2hlaWdodCc6IDE0LFxuICAgICAgICAnekluZGV4JzogMCxcbiAgICAgICAgJ2JvcmRlckNvbG9yJzogJyMzMzMnXG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIGdldFBvbGFyQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbihwb3NpdGlvbjEsIHBvc2l0aW9uMikge1xuICAgIHZhciB4RGlmZiA9IHBvc2l0aW9uMS54IC0gcG9zaXRpb24yLng7XG4gICAgdmFyIHlEaWZmID0gcG9zaXRpb24xLnkgLSBwb3NpdGlvbjIueTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1vZDogTWF0aC5zcXJ0KHhEaWZmICogeERpZmYgKyB5RGlmZiAqIHlEaWZmKSxcbiAgICAgICAgYXJnOiBNYXRoLmF0YW4oeURpZmYgLyB4RGlmZilcbiAgICB9O1xufTtcblxuLy8gU2V0IHRoZSBzdHlsZSBvZiBhIGdpdmVuIGVsZW1lbnQgc28gdGhhdDpcbi8vICogSXRzIG9yaWdpbiAoaS5lLiAwLDAgcmVsYXRpdmUgY29vcmRpbmF0ZXMpIGlzIHBsYWNlZCBhdCBvbmUgcG9zaXRpb24uXG4vLyAqIEl0cyB3aWR0aCBpcyBzZXQgdG8gdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBwb3NpdGlvbnMuXG4vLyAqIEl0IGlzIHJvdGF0ZWQgc28gdGhhdCBpdHMgZW5kIHBvaW50ICh4ID0gd2lkdGggYW5kIHkgPSAwKSBpcyBwbGFjZWQgYXRcbi8vIHRoZSBvdGhlciBwb3NpdGlvbi5cbnZhciB0cmFuc2Zvcm1Qcm9wZXJ0eSA9IGdldFN0eWxlUHJvcGVydHkoJ3RyYW5zZm9ybScpO1xudmFyIHNldEVsZW1lbnRFbmRzID0gZnVuY3Rpb24oZWxlbWVudCwgZW5kMSwgZW5kMikge1xuICAgIHZhciBvcmlnaW47XG4gICAgaWYgKGVuZDEueCA8IGVuZDIueCkge1xuICAgICAgICBvcmlnaW4gPSBlbmQxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9yaWdpbiA9IGVuZDI7XG4gICAgfVxuXG4gICAgdmFyIHBvbGFyID0gZ2V0UG9sYXJDb29yZGluYXRlcyhlbmQxLCBlbmQyKTtcbiAgICB2YXIgbGVuZ3RoID0gcG9sYXIubW9kO1xuICAgIHZhciBhbmdsZSA9IHBvbGFyLmFyZztcblxuICAgIHZhciB0b3AgPSBvcmlnaW4ueSArIDAuNSAqIGxlbmd0aCAqIE1hdGguc2luKGFuZ2xlKTtcbiAgICB2YXIgbGVmdCA9IG9yaWdpbi54IC0gMC41ICogbGVuZ3RoICogKDEgLSBNYXRoLmNvcyhhbmdsZSkpO1xuICAgIHZhciBwYXJlbnRQb3NpdGlvbiA9IHV0aWxzLmRvbS5nZXRQb3NpdGlvbihlbGVtZW50LnBhcmVudE5vZGUpO1xuICAgIGxlZnQgLT0gcGFyZW50UG9zaXRpb24ueDtcbiAgICB0b3AgLT0gcGFyZW50UG9zaXRpb24ueTtcblxuICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSBsZW5ndGggKyAncHgnO1xuICAgIGVsZW1lbnQuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICBlbGVtZW50LnN0eWxlW3RyYW5zZm9ybVByb3BlcnR5XSA9ICdyb3RhdGUoJyArIGFuZ2xlICsgJ3JhZCknO1xufTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uICh6bGluaykge1xuICAgIHZhciBlbmQxID0gemxpbmsuYmVnaW4ucG9ydDtcbiAgICB2YXIgZW5kMiA9IHpsaW5rLmVuZC5wb3J0O1xuICAgIGlmIChlbmQxICE9PSB1bmRlZmluZWQgJiYgZW5kMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNldEVsZW1lbnRFbmRzKHpsaW5rLCBlbmQxLmNvbm5lY3Rpb25Qb3NpdGlvbiwgZW5kMi5jb25uZWN0aW9uUG9zaXRpb24pO1xuICAgIH1cbn07XG5cbnZhciBjb25uZWN0ID0gZnVuY3Rpb24oemxpbmssIHBsdWcsIHBvcnQpIHtcbiAgICBpZiAodHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHBvcnQpO1xuICAgIH1cbiAgICBwbHVnLnBvcnQgPSBwb3J0O1xuICAgIHBsdWcucG9ydC5saW5rcy5wdXNoKHpsaW5rKTtcbn07XG5cbnZhciB1bmNvbm5lY3QgPSBmdW5jdGlvbiAoemxpbmspIHtcbiAgICB6bGluay5iZWdpbi5wb3J0LmxpbmtzID0gXy53aXRob3V0KHpsaW5rLmJlZ2luLnBvcnQubGlua3MsIHpsaW5rKTtcbiAgICB6bGluay5lbmQucG9ydC5saW5rcyA9IF8ud2l0aG91dCh6bGluay5lbmQucG9ydC5saW5rcywgemxpbmspO1xuICAgIGlmICh6bGluay5wYXJlbnROb2RlICE9PSBudWxsKSB7XG4gICAgICAgIHpsaW5rLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoemxpbmspO1xuICAgIH1cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcbnByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb21wb3NlZERvbSA9IHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgIC8vIEN1cnJpZWQgdmVyc2lvbiBvZiAncmVkcmF3JyB3aXRoIGN1cnJlbnQgb2JqZWN0IGluc3RhbmNlLlxuICAgIC8vIFVzZWQgZm9yIGV2ZW50IGxpc3RlbmVycy5cbiAgICB0aGlzLnJlZHJhdyA9IHJlZHJhdy5iaW5kKG51bGwsIHRoaXMpO1xuICAgIHRoaXMuY29ubmVjdCA9IGNvbm5lY3QuYmluZChudWxsLCB0aGlzKTtcbiAgICB0aGlzLnVuY29ubmVjdCA9IHVuY29ubmVjdC5iaW5kKG51bGwsIHRoaXMpO1xuXG4gICAgdGhpcy5iZWdpbiA9IHt9O1xuICAgIHRoaXMuZW5kID0ge307XG4gICAgaWYgKHRoaXMuaGFzQXR0cmlidXRlKCdiZWdpbicpICYmIHRoaXMuaGFzQXR0cmlidXRlKCdlbmQnKSkge1xuICAgICAgICAvLyBUT0RPIGRvIHRoZSBzYW1lIHN0dWZmIG9uIGF0dHJpYnV0ZXMnIGNoYW5nZXMuXG4gICAgICAgIGNvbm5lY3QodGhpcywgdGhpcy5iZWdpbiwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2JlZ2luJykpO1xuICAgICAgICBjb25uZWN0KHRoaXMsIHRoaXMuZW5kLCB0aGlzLmdldEF0dHJpYnV0ZSgnZW5kJykpO1xuXG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgfVxuXG4gICAgc2VsZWN0b3Iuc2V0U2VsZWN0YWJsZSh0aGlzLCB0cnVlKTtcbn07XG5cbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG4iLCIvKmVzbGludCBxdW90ZXM6IFsyLCBcInNpbmdsZVwiXSovXG5cbi8qZ2xvYmFsIGRvY3VtZW50LCB3aW5kb3cgKi9cbi8qZ2xvYmFsIEhUTUxFbGVtZW50ICovXG5cbi8qZ2xvYmFsIHJlc3R5bGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4uL2xpYi9zZWxlY3RvcicpO1xuXG52YXIgdGFnTmFtZSA9ICd6LXBvcnQnO1xuXG52YXIgaHRtbFRlbXBsYXRlID0gdXRpbHMuc3RyaW5nRnJvbUNvbW1lbnRJbkZ1bmN0aW9uKGZ1bmN0aW9uICgpIHsvKlxuICAgIDxzcGFuIGNsYXNzPVwicG9ydC1rZXlcIj5hPC9zcGFuPlxuICAgIDxkaXYgY2xhc3M9XCJzZWxlY3RvclwiPjwvZGl2PlxuKi99KTtcbnZhciB0ZW1wbGF0ZSA9IHV0aWxzLmRvbS5jcmVhdGVGcmFnbWVudChodG1sVGVtcGxhdGUpO1xuXG52YXIgY3NzQXNKc29uID0ge1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBhcHBseSB0byB0aGUgcm9vdCBET00gZWxlbWVudCBvZiB0aGUgY3VzdG9tXG4gICAgLy8gZWxlbWVudC5cbiAgICAnJzoge1xuICAgICAgICAnd2lkdGgnOiAxOCxcbiAgICAgICAgJ2hlaWdodCc6IDMsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJyNjY2MnLFxuICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAncG9zaXRpb24nOiAncmVsYXRpdmUnLFxuICAgICAgICAnb3ZlcmZsb3cnOiAndmlzaWJsZScsXG4gICAgICAgICd6SW5kZXgnOiAnNSdcbiAgICB9LFxuICAgICcucG9ydC1rZXknOiB7XG4gICAgICAgICdmb250LXNpemUnOiAnMC43ZW0nLFxuICAgICAgICAnY29sb3InOiAnIzQ0NCcsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdwYWRkaW5nLWxlZnQnOiAzLFxuICAgICAgICAncGFkZGluZy1yaWdodCc6IDMsXG4gICAgICAgICd6SW5kZXgnOiAnMTAnLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICcjZmZmJ1xuICAgIH0sXG4gICAgJy5zZWxlY3Rvcic6IHtcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAtOCxcbiAgICAgICAgJ3RvcCc6IC04LFxuICAgICAgICAnd2lkdGgnOiAyNCxcbiAgICAgICAgJ2hlaWdodCc6IDE0XG4gICAgfVxufTtcbi8vIEFwcGx5IHRoZSBjc3MgZGVmaW5pdGlvbiBhbmQgcHJlcGVuZGluZyB0aGUgY3VzdG9tIGVsZW1lbnQgdGFnIHRvIGFsbFxuLy8gQ1NTIHNlbGVjdG9ycy5cbnZhciBzdHlsZSA9IHJlc3R5bGUodGFnTmFtZSwgY3NzQXNKc29uKTtcblxudmFyIHJlZHJhdyA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgW10uZm9yRWFjaC5jYWxsKHBvcnQubGlua3MsIGZ1bmN0aW9uIChsaW5rKSB7XG4gICAgICAgIGxpbmsucmVkcmF3KCk7XG4gICAgfSk7XG59O1xuXG5cbnZhciBwcm9wZXJ0aWVzID0ge1xuXG4gICAgY3JlYXRlZENhbGxiYWNrOiB7dmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpbmtzID0gW107XG4gICAgICAgIHRoaXMucmVkcmF3ID0gcmVkcmF3LmJpbmQobnVsbCwgdGhpcyk7XG4gICAgICAgIHNlbGVjdG9yLnNldFNlbGVjdGFibGUodGhpcywgdHJ1ZSk7XG5cbiAgICAgICAgdmFyIGNvbXBvc2VkRG9tID0gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGNvbXBvc2VkRG9tKTtcblxuICAgICAgICB0aGlzLmhpZGVLZXkoKTtcbiAgICB9fSxcblxuICAgIHVucGx1Zzoge3ZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubGlua3MuZm9yRWFjaChmdW5jdGlvbiAobGluaykge1xuICAgICAgICAgICAgbGluay51bmNvbm5lY3QoKTtcbiAgICAgICAgfSk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0YWJsZToge3ZhbHVlOiBmdW5jdGlvbiAocG9ydDEsIHBvcnQyKSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAocG9ydDEuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnB1dCcpXG4gICAgICAgICAgICAmJiBwb3J0Mi5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKVxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpXG4gICAgICAgICAgICAmJiBwb3J0Mi5jbGFzc0xpc3QuY29udGFpbnMoJ2lucHV0JykpXG4gICAgICAgICAgICApO1xuICAgIH19LFxuXG4gICAgY29ubmVjdDoge3ZhbHVlOiBmdW5jdGlvbiAocG9ydDEsIHBvcnQyKSB7XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnei1saW5rJyk7XG4gICAgICAgIGlmIChwb3J0MS5jbGFzc0xpc3QuY29udGFpbnMoJ291dHB1dCcpKSB7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5iZWdpbiwgcG9ydDEpO1xuICAgICAgICAgICAgbGluay5jb25uZWN0KGxpbmsuZW5kLCBwb3J0Mik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaW5rLmNvbm5lY3QobGluay5lbmQsIHBvcnQxKTtcbiAgICAgICAgICAgIGxpbmsuY29ubmVjdChsaW5rLmJlZ2luLCBwb3J0Mik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyB1c2UgYW5vdGhlciB3YXkgdG8gZmluZCB3aGVyZSB0byBhZGQgbmV3IGxpbmtzLlxuICAgICAgICB2YXIgcGF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF0Y2gnKTtcbiAgICAgICAgcGF0Y2guYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICAgIGxpbmsucmVkcmF3KCk7XG4gICAgfX0sXG5cbiAgICBjb25uZWN0aW9uUG9zaXRpb246IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlscy5kb20uZ2V0UG9zaXRpb24oZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgY2VudGVyID0ge1xuICAgICAgICAgICAgICAgIHg6IHBvc2l0aW9uLnggKyByZWN0LndpZHRoIC8gMixcbiAgICAgICAgICAgICAgICB5OiBwb3NpdGlvbi55ICsgcmVjdC5oZWlnaHQgLyAyXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGNlbnRlcjtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBrZXlFbGVtZW50OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3Rvcignc3Bhbi5wb3J0LWtleScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGtleToge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5rZXlFbGVtZW50LmlubmVySFRNTCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNob3dLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICB9fSxcblxuICAgIGhpZGVLZXk6IHt2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmtleUVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIH19XG5cbn07XG5cbnZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlLCBwcm9wZXJ0aWVzKTtcbnByb3RvLmNzcyA9IHN0eWxlO1xuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KHRhZ05hbWUsIHtwcm90b3R5cGU6IHByb3RvfSk7XG5cbiJdfQ==
