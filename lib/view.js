/*global Mousetrap */

'use strict';

var _ = require('../externals/lodash');

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
        // Use global namespace because commands module is not loaded when this
        // callback is defined.
        // FIXME
        window.app.commands.bindKeysForMainMode();
    };
    let patch = document.querySelector('#patch');
    let draggie = new Draggabilly(patch, {
        handle: '#draggabilly-handle'
    });
};
view.init = init;

module.exports = view;
global.view = view;
