var src = chrome.extension.getURL('clear.js');
var s = document.createElement('script');
s.src = src;

s.onload = function() {
     this.remove();
};

(document.head || document.documentElement).appendChild(s);
