# Ecmascript 2015

Use traceur.js

## Modules

Use es6-module-loader.js polyfill.

Use the following syntax for exporting:
```javascript
export var version = 653;
```
but not the revealing syntax:
```javascript
var version = 653;
export { version };
```

On firefox there are some "syntax errors" when importing modules. It doesn't
harm and it is a known issue
https://github.com/ModuleLoader/es6-module-loader/issues/227).
