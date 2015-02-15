import commands from 'lib/commands';
import engine from 'lib/engine';
import editor from 'lib/editor';

var app = {};

app.init = function () {
    commands.init();
    engine.init();
    editor.init();
};

export default app;
