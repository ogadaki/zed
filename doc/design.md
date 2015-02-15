# Ecmascript 2015

Use traceur.js

# Modules

Use the following to define a module:
```javascript
var stuff = {};

var getName = function() {
    return 'zed';
};

stuff.print = function () {
    console.log(getName());
};

export default stuff;
```

And to use the module:
```javascript
import stuff from 'stuff'

stuff.print();
```
This way:
* We benefit the ES 2015 syntax for importing modules.
* We benefit the ES 2015 elegant way to isolate private context.
* We can easily switch to some other syntax if for some reason we find ES 2015
  modules inappropriate.

Use es6-module-loader.js polyfill.

On firefox there are some "syntax errors" when importing modules. It doesn't
harm and it is a known issue
https://github.com/ModuleLoader/es6-module-loader/issues/227).
