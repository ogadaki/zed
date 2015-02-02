/*eslint quotes: [2, "single"]*/
/*global window */

(function(){
    'use strict';

    window.selector = {
        setSelectable: function (element, withStopPropagation) {
            var selector = this;
            element.addEventListener('click', function (event) {
                selector.action(element);
                if (withStopPropagation !== undefined && withStopPropagation === true) {
                    event.stopPropagation();
                }
            });
        },

        connectable: function (element1, element2) {
            if (element1.connectable !== undefined) {
                return element1.connectable(element1, element2);
            }
            return false;
        },

        action: function (element) {
            if (this.selected !== undefined) {
                if (this.connectable(this.selected, element)) {
                    this.selected.connect(this.selected, element);
                    this.selected.classList.toggle('selected');
                    this.selected = undefined;
                    return;
                }
                this.selected.classList.toggle('selected');
            }
            if (this.selected === element) {
                this.selected = undefined;
            } else {
                this.selected = element;
                element.classList.toggle('selected');
            }
        }
    };

})();
