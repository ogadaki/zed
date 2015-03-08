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

module.exports = stuff;
```

And to use the module:
```javascript
var stuff = require('./stuff');

stuff.print();
```
