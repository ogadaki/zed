
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
