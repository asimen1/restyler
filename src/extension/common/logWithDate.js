'use strict';

let LogWithDate = {
    log: function() {
        let now = new Date();
        let h = now.getHours();
        let m = now.getMinutes();
        let s = now.getSeconds();
        let ms = now.getMilliseconds();

        let argsArr = ['(' + h + ':' + m + ':' + s + '.' + ms + ')'];
        argsArr = argsArr.concat(Array.prototype.slice.call(arguments));

        console.origLog.apply(null, argsArr);
    },
};

console.origLog = console.log;
console.log = LogWithDate.log;

export default LogWithDate;