'use strict';

var _ = require('../externals/lodash');

var engine = require('./engine');
var utils = require('./utils');
let selector = require('./selector');

let viewFrame = function () {
    return document.querySelector('#view-window');
};

let lock_ = false;

var editor = {
    get patch () {
        return document.querySelector('#patch');
    },
    get viewOpened () {
        return viewFrame().style.visibility !== 'hidden';
    },
    set viewOpened( value) {
        if (value) {
            viewFrame().style.visibility = 'visible';
        } else {
            viewFrame().style.visibility = 'hidden';
        }
    },
    get lock () {
        return lock_;
    },
    set lock (value) {
        lock_ = value;
        let label = 'toggle lock (' + (value ? 'locked' : 'unlocked' ) + ')';
        document.querySelector('#toggle-lock-button').textContent = label;
    }
};

editor.context = 'block';

let setBlockLock = function (block, lock) {
    block.draggable = !lock;
    block.content.contentEditable = (!lock).toString();
};

let setLock = function (lock) {
    let blocks = document.querySelectorAll('z-block');
    _.each(blocks, function (block) {
        setBlockLock(block, lock);
    });
};

editor.toggleLock = function () {
    editor.lock = !editor.lock;
    setLock(editor.lock);
};

editor.getCurrentBlock = function () {
    return document.querySelector('z-block.current');
};

editor.getPreviousCurrentBlock = function () {
    return document.querySelector('z-block.previous-current');
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
        let previous = editor.getPreviousCurrentBlock();
        if (previous !== null) {
            previous.classList.toggle('previous-current');
        }
        current.classList.toggle('previous-current');
    }
    window.setTimeout(function () {
        document.querySelector('#block-inner-html').textContent = block.contentInnerHTML;
    }, 1);
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
    content = [
        '<z-port class="input"></z-port>'.repeat(nInputs),
        content,
        '<z-port class="output"></z-port>'.repeat(nOutputs)
    ].join('');
    var htmlString = '<z-block>' + content + '</z-block>';
    var fragment = utils.dom.createFragment(htmlString);
    var block = fragment.querySelector('z-block');

    var defaultTop = 100;
    var defaultLeft = (editor.patch.getBoundingClientRect().width) / 3;
    var currentBlock = editor.getCurrentBlock();
    if (currentBlock !== null) {
        var currentPosition = utils.dom.getPosition(currentBlock, currentBlock.parentNode);
        var offset = 23;
        defaultTop = currentPosition.y + currentBlock.getBoundingClientRect().height + offset;
        defaultLeft = currentPosition.x;
    }
    block.style.top = top || defaultTop + 'px';
    block.style.left = left || defaultLeft + 'px';

    editor.setCurrentBlock(block);
    editor.patch.appendChild(fragment);
    // Use a time out to change lock when block is actually created.
    window.setTimeout(function () {
        setBlockLock(block, editor.lock);
    });
    return block;
};

editor.addBlock = function (type) {
    var args = arguments;
    var zeClass = '';
    var blockClass = args[1];
    if (args[1] === 'number') {
        type = 'html';
        args[1] = 'span';
        zeClass = 'zed-number';
        blockClass = zeClass;
    }
    if (args[1] === 'data') {
        type = 'html';
        args[1] = 'span';
        zeClass = 'zed-data';
        blockClass = zeClass;
    }
    if (args[1] === 'event') {
        type = 'html';
        args[1] = 'span';
        zeClass = 'zed-event';
        blockClass = zeClass;
    }
    if (type === 'html') {
        var tagName = args[1];
        if (args[1] === 'comment') {
            tagName = 'span';
        }
        var content = args[2];
        var newContent = `
            <${tagName}
                class="ze-content ${zeClass}"
                contenteditable
            >${content}</${tagName}>
        `;
        if (tagName === 'script') {
            newContent = '';
            let scriptVisibility = 'visible';
            let scriptDisplay = 'block';
            let script = content;
            if (content.view !== undefined) {
                newContent += `
                    <span class="view">
                        ${content.view}
                    </span>
                `;
                script = content.content;
                scriptVisibility = 'hidden';
                scriptDisplay = 'none';
            }
            newContent += `
                <script
                    class="ze-content"
                    type="application/x-prevent-script-execution-onload"
                    style="display: ${scriptDisplay};white-space: pre-wrap;visibility:${scriptVisibility};"
                    contenteditable
                    spellcheck=false
                    oninput="compileScript(this)"
                >${script}</script>
            `;
        }
        if (tagName === 'button') {
            newContent = `
                <button
                    onclick="if (!this.editing) {sendEventToOutputPort(this);}"
                    onblur="this.editing=false;"
                    class="ze-content"
                    spellcheck=false
                    contenteditable
                >${content}</button>
            `;
        }
        if (tagName[0] === '<') {
            // Actually tagName contains a HTML string.
            newContent = tagName;
            if (blockClass[0] === '<') {
                blockClass = '';
            }
        }
        args = Array.prototype.slice.call(args, 2);
        args[0] = newContent;
    }
    var block = editor.createBlockElement.apply(null, args);
    if (blockClass !== '') {
        block.classList.toggle(blockClass);
    }
};

editor.addInput = function () {
    let current = document.querySelector('z-block.current,z-block.current-off-context');
    let port = current.addPort('<z-port class="input"></z-port>');
    if (editor.context !== 'block') {
        editor.setCurrentPort(port);
    }
};

editor.addOutput = function () {
    let current = document.querySelector('z-block.current,z-block.current-off-context');
    let port = current.addPort('<z-port class="output"></z-port>');
    if (editor.context !== 'block') {
        editor.setCurrentPort(port);
    }
};

editor.add = function () {
    if (editor.context === 'block') {
        editor.addBlock.apply(null, arguments);
    } else if (editor.context === 'input') {
        editor.addInput();
    } else if (editor.context === 'output') {
        editor.addOutput();
    }
};

editor.remove = function () {
    var selected = document.querySelector('.selected');
    if (selected !== null && selected.tagName === 'Z-LINK') {
        var link = selected;
        selector.unselect();
        link.unconnect();
    } else if (selected !== null && selected.tagName === 'Z-PORT') {
        let port = selected;
        selector.unselect();
        let block = port.block;
        port.unplug();
        port.parentNode.removeChild(port);
        block.redraw();
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

var switchCurrentOnOffContext = function (cssSelector, onOrOff) {
    var className = 'current';
    if (onOrOff === 'on') {
        className += '-off-context';
    }
    var element = document.querySelector(cssSelector + '.' + className);
    if (element !== null) {
        element.classList.toggle('current-off-context');
        element.classList.toggle('current');
    }
    return element;
};

editor.port = function (inputOrOutput) {
    if (editor.context !== 'block') {
        return;
    }
    let cssSelector = `z-block.current * z-port.${inputOrOutput}`;
    let switchedPort = switchCurrentOnOffContext(cssSelector, 'on');
    if (switchedPort === null) {
        // Maybe there is no port that is current and off context. So set the
        // first port (if any) as current.
        let port = document.querySelector(cssSelector);
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

editor.linkBlocks = function (outputBlock, inputBlock) {
    let input = inputBlock.querySelector('z-port.input');
    let output = outputBlock.querySelector('z-port.output');
    if (input !== null && output !== null) {
        if (input.connectable(input, output)) {
            input.connect(input, output);
        }
    }
};

editor.linkFromInput = function () {
    let outputBlock = editor.getPreviousCurrentBlock();
    let inputBlock = editor.getCurrentBlock();
    editor.linkBlocks(outputBlock, inputBlock);
};

editor.linkFromOutput = function () {
    let outputBlock = editor.getCurrentBlock();
    let inputBlock = editor.getPreviousCurrentBlock();
    editor.linkBlocks(outputBlock, inputBlock);
};

editor.patchLoaded = function () {
    let current = editor.getCurrentBlock();
    if (current !== null) {
        current.classList.toggle('current');
    }
    let previous = editor.getPreviousCurrentBlock();
    if (previous !== null) {
        previous.classList.toggle('previous-current');
    }
    let elements = editor.patch.querySelectorAll('.zed-event');
    [].forEach.call(elements, function (element) {
        let name = element.innerHTML;
        if (name === 'on load') {
            engine.sendEventToOutputPort(element);
        }
    });
};

editor.closeView = function () {
    editor.viewOpened = false;
};

editor.openView = function () {
    editor.viewOpened = true;
};

editor.toggleView = function () {
    editor.viewOpened = !editor.viewOpened;
};

editor.getBlockDesc = function (element) {
    let contentContainerInnerHTML = element.querySelector('.content-container').innerHTML.trim();
    let content = element.content;
    let tagName = content.tagName.toLowerCase();
    if (element.classList.contains('comment')) {
        tagName = 'comment';
    }
    if (element.classList.contains('zed-data')) {
        tagName = 'data';
    }
    if (element.classList.contains('zed-event')) {
        tagName = 'event';
    }
    let value = content.value || content.innerHTML || '';
    let viewContent;
    if (tagName === 'button') {
        value = content.innerHTML;
        contentContainerInnerHTML = '';
    } else if (tagName === 'script') {
        value = utils.getScripStringtWithNewlines(content);
        contentContainerInnerHTML = '';
        let scriptView = element.querySelector('.content-container').querySelector('.view');
        if (scriptView !== null) {
            viewContent = scriptView.innerHTML;
        }
    }
    let inputPorts = element.querySelectorAll('z-port.input');
    let outputPorts = element.querySelectorAll('z-port.output');
    return {
        tagName: tagName,
        nInputs: inputPorts.length,
        nOutputs: outputPorts.length,
        top: element.style.top,
        left: element.style.left,
        width: element.style.width,
        value: value,
        innerHTML: contentContainerInnerHTML,
        view: viewContent
    };
};

editor.createBlockFromDesc = function (block) {
    block.nInputs = block.nInputs || 0;
    block.nOutputs = block.nOutputs || 0;
    if (['script', 'button', 'comment', 'event', 'data'].indexOf(block.tagName) > -1) {
        let content = block.value;
        if (block.view !== undefined) {
            content = {
                view: block.view,
                content: block.value
            };
        }
        editor.addBlock('html', block.tagName, content, block.nInputs, block.nOutputs, block.top, block.left);
    } else {
        editor.addBlock('html', block.innerHTML, '', block.nInputs, block.nOutputs, block.top, block.left);
    }
};

let copyCurrentBlockDesc = function () {
    let block = editor.getCurrentBlock();
    let blockDesc = editor.getBlockDesc(block);
    blockDesc.top = undefined;
    blockDesc.left = undefined;
    return blockDesc;
};

editor.duplicateCurrentBlock = function () {
    let blockDesc = copyCurrentBlockDesc();
    editor.createBlockFromDesc(blockDesc);
};

editor.copyCurrentBlock = function () {
    editor.blockCopyClipboard = copyCurrentBlockDesc();
};

editor.pasteBlockDesc = function () {
    if (editor.blockCopyClipboard !== undefined) {
        editor.createBlockFromDesc(editor.blockCopyClipboard);
    }
};

module.exports = editor;
