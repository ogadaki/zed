// Use of termlib.js for the terminal frame.

/*eslint quotes: [2, "single"]*/

/*global document, window */

// globals from termlib.js
/*global TermGlobals */
/*global termKey */
/*global Parser */
/*global Terminal */

var terminal = {};

terminal.createNewTerm = function (commands, onblur) {
    'use strict';
    var blur = function () {
        TermGlobals.keylock = true;
        TermGlobals.activeTerm.cursorOff();
        var termDiv = document.querySelector('#command-line-frame');
        termDiv.classList.toggle('focused');
        onblur();
    };

    var ctrlHandler = function () {
        if (this.inputChar === termKey.ESC) {
            blur();
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
                var result = commands[commandName].apply(null, args);
                if (result !== undefined) {
                    this.write(result);
                }
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

    // The termlib.js object
    var term = new Terminal( {
        termDiv: 'command-line-frame',
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
        var termDiv = document.querySelector('#command-line-frame');
        termDiv.classList.toggle('focused');
    }
    blur();

    return {
        focus: focus,
        term: term
    };
};

export default terminal;
