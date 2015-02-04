/*eslint quotes: [2, "single"]*/

/*global document, window */

/*global utils */

/*global TermGlobals */
/*global termKey */
/*global Parser */
/*global Terminal */

/*global Mousetrap */


(function(){
    'use strict';
    // Keyboard shortcuts.

    var setCurrentBlock = function (block) {
        var current = document.querySelector('z-block.current');
        block.classList.toggle('current');
        current.classList.toggle('current');
    };

    var setCurrentPort = function (port) {
        var current = document.querySelector('z-port.current');
        port.classList.toggle('current');
        current.classList.toggle('current');
    };

    var offsetCurrentBlock = function (offset) {
        var elements = document.querySelectorAll('z-block');
        var current = document.querySelector('z-block.current');
        for (var i = 0; i < elements.length; i++) {
            if (elements[i] === current) {
                var index = (elements.length + i + offset) % elements.length;
                setCurrentBlock(elements[index]);
            }
        }
    };
    window.setCurrentBlock = setCurrentBlock;

    // TODO 'context' or 'mode'?
    var context = 'block';
    var offsetCurrentPort = function (offset) {
        var elements = document.querySelectorAll('z-block.current-off-context * z-port.' + context);
        var current = document.querySelector('z-port.current');
        for (var i = 0; i < elements.length; i++) {
            if (elements[i] === current) {
                var index = (elements.length + i + offset) % elements.length;
                setCurrentPort(elements[index]);
            }
        }
    };

    window.commands = {};
    var commands = window.commands;
    var offsetCurrent = function (offset) {
        if (context === 'block') {
            offsetCurrentBlock(offset);
        } else if (context === 'input' || context === 'output') {
            offsetCurrentPort(offset);
        }
    };

    commands.prev = offsetCurrent.bind(null, -1);
    commands.next = offsetCurrent.bind(null, 1);

    commands.createBlockElement = function (content, nInputs, nOutputs) {
        var patch = document.querySelector('#patch');
        content = [
            '<z-port class="input"></z-port>'.repeat(nInputs),
            content,
            '<z-port class="output"></z-port>'.repeat(nOutputs)
        ].join('');
        var htmlString = '<z-block>' + content + '</z-block>';
        var fragment = utils.dom.createFragment(htmlString);
        var block = fragment.querySelector('z-block');

        var currentBlock = document.querySelector('z-block.current');
        var position = utils.dom.getPosition(currentBlock, currentBlock.parentNode);
        var top = position.y + currentBlock.getBoundingClientRect().height + 23;
        var left = position.x;
        block.style.top = top + 'px';
        block.style.left = left + 'px';

        setCurrentBlock(block);
        patch.appendChild(fragment);
    };

    commands.addBlock = function (type) {
        var args = arguments;
        var zeClass = '';
        if (args[1] === 'number') {
            type = 'html';
            args[1] = 'span';
            zeClass = 'zed-number';
        }
        if (type === 'html') {
            var tagName = args[1];
            var content = args[2];
            var newContent = '<' + tagName + ' class="ze-content ' + zeClass + '" contenteditable>' + content + '</' + tagName + '>';
            if (tagName === 'script') {
                newContent = '<script class="ze-content" type="application/x-prevent-script-execution-onload" style="display: block;" contenteditable oninput="compileScript(this)">' + content + '</script>';
            }
            if (tagName === 'button') {
                newContent = '<button onclick="sendEventToOutputPort(this)" class="ze-content" contenteditable>' + content + '</button>';
            }
            if (tagName[0] === '<') {
                // Actually tagName contains a HTML string.
                newContent = tagName;
            }
            args = Array.prototype.slice.call(args, 2);
            args[0] = newContent;
        }
        commands.createBlockElement.apply(null, args);
    };

    commands.add = function () {
        var current;
        if (context === 'block') {
            commands.addBlock.apply(null, arguments);
        } else if (context === 'input') {
            current = document.querySelector('z-block.current-off-context');
            current.addPort('<z-port class="input"></z-port>');
        } else if (context === 'output') {
            current = document.querySelector('z-block.current-off-context');
            current.addPort('<z-port class="output"></z-port>');
        }
    };

    commands.remove = function () {
        var selected = document.querySelector('.selected');
        if (selected !== null && selected.tagName === 'Z-LINK') {
            var link = selected;
            link.unconnect();
        } else if (context === 'block') {
            var block = document.querySelector('z-block.current');
            offsetCurrentBlock(1);
            block.unplug();
            block.parentNode.removeChild(block);
        } else if (context === 'input' || context === 'output') {
            var port = document.querySelector('z-port.current');
            offsetCurrentPort(1);
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

    commands.port = function (inputOrOutput) {
        if (context !== 'block') {
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
        context = inputOrOutput;
    };
    commands.inputs = commands.port.bind(null, 'input');
    commands.outputs = commands.port.bind(null, 'output');

    commands.block = function () {
        context = 'block';
        switchCurrentOnOffContext('z-block', 'on');
        try {
            switchCurrentOnOffContext('z-port.input', 'off');
        } catch(e) {}
        try {
            switchCurrentOnOffContext('z-port.output', 'off');
        } catch(e) {}
    };

    var startBlinking = function () {
        var block = document.querySelector('z-block.current');
        if (block.classList.contains('stop-blinking')) {
            block.classList.toggle('stop-blinking');
        }
    };

    var stopBlinking = function () {
        var block = document.querySelector('z-block.current');
        if (!block.classList.contains('stop-blinking')) {
            block.classList.toggle('stop-blinking');
        }
    };

    var goOutOfCommandLine = function () {
        TermGlobals.keylock = true;
        TermGlobals.activeTerm.cursorOff();
        bindKeysForMainMode();
        var termDiv = document.querySelector('#termDiv');
        termDiv.classList.toggle('focused');
        startBlinking();
    };

    var ctrlHandler = function () {
        if (this.inputChar === termKey.ESC) {
            goOutOfCommandLine();
        }
    };

    var termHandler = function () {
        this.newLine();
        var parser = new Parser();
        parser.parseLine(this);
        var commandName = this.argv[0];
        if (commands.hasOwnProperty(commandName)) {
            var args = this.argv.slice(1);
            try {
                commands[commandName].apply(null, args);
            } catch (e) {
                this.write(e.message);
            }
        } else {
            this.write('unknown command "' + commandName + '".');
        }
        this.prompt();
    };

    var initHandler = function () {
        this.prompt();
    };

    var term = new Terminal( {
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
    var res = term.open();

    commands.goToCommandLine = function () {
        if (TermGlobals.keylock === false) {
            return;
        }
        TermGlobals.keylock = false;
        Mousetrap.reset();
        TermGlobals.activeTerm.cursorOn();
        var termDiv = document.querySelector('#termDiv');
        termDiv.classList.toggle('focused');
        stopBlinking();
    };

    commands.editBlock = function (block) {
        Mousetrap.reset();
        Mousetrap.bind('esc', commands.escape);
        block.content.focus();
    };

    commands.edit = function () {
        if (context === 'block') {
            var block = document.querySelector('z-block.current');
            commands.editBlock(block);
            stopBlinking();
            // Prevent default when this function is used with Moustrap.
            return false;
        }
    };

    commands.fire = function () {
        if (context === 'block') {
            var block = document.querySelector('z-block.current');
            var content = block.content;
            if (content.tagName === 'BUTTON') {
                sendEventToOutputPort(content);
            } else if (content.tagName === 'SCRIPT') {
                fireEvent2(block);
            }
        }
    };

    commands.help = function (subject) {
        if (subject === undefined) {
            term.write('Press Esc to leave the command line and go back to normal mode.');
            term.newLine();
            term.newLine();
            term.write('Commands: next, prev, remove, add and set content.');
        } else if (subject === 'add') {
            term.write('Add a new block just below the current block.');
            term.newLine();
            term.newLine();
            term.write('add html <what> <content> <nb inputs> <nb outputs>');
            term.newLine();
            term.write('  <what>    is either "button", "script", "text", "number" or a HTML tag.');
            term.newLine();
            term.write('  <content> is the content of the block (i.e. the button name, the');
            term.newLine();
            term.write('            script code, the text or number value, etc.).');
        } else {
            term.write('No help for "' + subject + '".');
        }
    };

    commands.addButton = commands.add.bind(null, 'html', 'button', 'go', 0, 1);
    commands.addScript = commands.add.bind(null, 'html', 'script', 'return in1 + 2;', 1, 1);
    commands.addText = commands.add.bind(null, 'html', 'span', 'empty', 1, 1);
    commands.addNumber = commands.add.bind(null, 'zed', 'number', '42', 1, 1);
    var bindKeysForMainMode = function () {
        Mousetrap.reset();
        Mousetrap.bind('k', commands.prev);
        Mousetrap.bind('j', commands.next);
        Mousetrap.bind('a n', commands.add.bind(null, 'New'));
        Mousetrap.bind('a h b', commands.addButton);
        Mousetrap.bind('a h s', commands.addScript);
        Mousetrap.bind('a h t', commands.addText);
        Mousetrap.bind('a h n', commands.addNumber);
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

    commands.escape = function () {
        if (context === 'block') {
            var currentlyEditingElement = utils.dom.getSelectionStart();
            if (currentlyEditingElement !== null) {
                currentlyEditingElement.blur();
                startBlinking();
            }
            bindKeysForMainMode();
        }
    };

    var hideAllPorts = function () {
        var ports = document.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.hideKey();
        });
    };
    var firstPort;
    var selectPort = function (port) {
        if (firstPort === undefined) {
            firstPort = port;
        } else {
            if (port.connectable(port, firstPort)) {
                port.connect(port, firstPort);
                firstPort = undefined;
                hideAllPorts();
                bindKeysForMainMode();
            }
        }
    };

    var portToLinkTo;
    commands.link = function () {
        if (context === 'block') {
            firstPort = undefined;
            Mousetrap.reset();
            var ports = document.querySelectorAll('z-port');
            var index = 1;
            [].forEach.call(ports, function (port) {
                port.showKey();
                var key = port.querySelector('span.port-key').innerHTML;
                // Convert 'aae' into 'a a e'.
                key = key.split('').join(' ');
                Mousetrap.bind(key, selectPort.bind(null, port));
                index++;
            });
            Mousetrap.bind('esc', function () {
                bindKeysForMainMode();
                hideAllPorts();
            });
        } else {
            var port = document.querySelector('z-port.current');
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
        setCurrentBlock(block);
        var blocks = document.querySelectorAll('z-block');
        [].forEach.call(blocks, function (block) {
            block.hideKey();
        });
        bindKeysForMainMode();
    };

    commands.goToBlock = function () {
        Mousetrap.reset();
        var blocks = document.querySelectorAll('z-block');
        var index = 0;
        [].forEach.call(blocks, function (block) {
            block.showKey();
            var key = block.querySelector('span.id').innerHTML;
            // Convert 'aae' into 'a a e'.
            key = key.split('').join(' ');
            Mousetrap.bind(key, setCurrentBlockAndBackToMainMode.bind(null, block));
            index++;
        });
        Mousetrap.bind('esc', bindKeysForMainMode);
    };

    commands.set = function (target, value) {
        if (target === 'content') {
            if (context === 'block') {
                var block = document.querySelector('z-block.current');
                block.content.innerHTML = value;
            }
        }
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

    var blinkCursor = function () {
        var current = document.querySelector('z-block.current');
        if (current !== null) {
            current.classList.toggle('cursor-displayed');
        }
        window.setTimeout(blinkCursor, 1000);
    };
    blinkCursor();

    bindKeysForMainMode();
    goOutOfCommandLine();

    var http = {};
    window.http = http;
    http.get = function (url, success) {
      var request = new XMLHttpRequest();
      request.onload = function (e) {
        success(JSON.parse(request.responseText));
      };
      request.open("get", url, true);
      request.send();
    };

})();
