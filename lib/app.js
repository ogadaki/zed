import * as commands from 'lib/commands';
import * as engine from 'lib/engine';
import editor from 'lib/editor';

export function init () {
    commands.init();
    engine.init();
    editor.init();
};
