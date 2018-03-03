/* I don't know JavaScript 
 * I should have used some promise libraries or await who knows
 */

/* Database storing previous classification results */

function addToDB(classifications){
	var db;
	var request = indexedDB.open("kpgfilter");
	request.onerror = function(event) {
		console.log("index db failure");
	};
	request.onupgradeneeded = function(event) {
		var db = event.target.result;

		// use md5 as keypath because it should be unique
		var objectStore = db.createObjectStore("classifications", { keyPath: "MD5" });
    };
	request.onsuccess = function(event) {
		db = event.target.result;

		var transaction = db.transaction(["classifications"], "readwrite");
		var objectStore = transaction.objectStore("classifications");
		classifications.forEach(function(classification) {
			objectStore.add(classification);
		});
	};
}

function inDB(md5, existsCallback, dneCallback){
	// TODO move open DB to a function
	var db;
	var openreq = indexedDB.open("kpgfilter");
	openreq.onerror = function(event) {
	  console.log("index db failure");
	};
	openreq.onupgradeneeded = function(event) {
		console.log("creeting object store");
		var db = event.target.result;

		// use md5 as keypath because it should be unique
		var objectStore = db.createObjectStore("classifications", { keyPath: "MD5" });

		//dneCallback(md5);
    };
	openreq.onsuccess = function(event) {
		db = event.target.result;

		var transaction = db.transaction(["classifications"], "readwrite");
	    var objectStore = transaction.objectStore("classifications");
	    var request = objectStore.get(md5);

	    request.onsuccess = function(evt) {
	    	var result = evt.target.result;
	    	if (result) {
	    		// console.log("exists " + result);
	    		existsCallback(result);
	    	} else {
	    		// console.log("dne " + md5);
	    		dneCallback(md5);
	    	}
	    };
	    request.onerror = function() {
	    	dneCallback(md5);
	    }
	};
}

/* Filtering stuff */
function findFileThumbs(callback) {
	var data = [];
	var allFileThumbs = document.getElementsByClassName('fileThumb');
	var fileThumbs = [];

	for(var i = 0; i < allFileThumbs.length; i++) {
		var fileThumb = allFileThumbs[i];
		if (fileThumb.tagName !== 'A') continue;
		var url = fileThumb.getAttribute('href');
		var ext = url.split('.').pop();
		if(ext !== "png" && ext !== "jpg") continue;
		var hash = fileThumb.firstChild.getAttribute('data-md5');
		fileThumbs.push(hash);
	}

	var done = 0;
	for(var i = 0; i < fileThumbs.length; i++){
		var hash = fileThumbs[i];
		inDB(hash, 
		function(classification) {
			hideFile(classification);
			done++;
			if (done == fileThumbs.length) {
				callback(data);
			}
		},
		function(hash) {
			data.push(hash);
			done++;
			if (done == fileThumbs.length) {
				callback(data);
			}
		});
	}
}

function postId(fileThumb) {
	var parent = fileThumb.closest("div.postContainer");
	var id = parent.id.replace('pc', '');
	return {
		element: parent,
		id: id
	};
}

function hideFile(classification) {
	var gay = classification.FacesM > classification.FacesF;
	var choa = classification.Choa > 0.6;
	if (gay || choa)
	{
		var fileThumb = findFileThumbByMD5(classification.MD5);
		var parent = postId(fileThumb);

		//make sure it doesn't have post-hidden already
		if (!parent.element.classList.contains('post-hidden')) {
			parent.element.firstChild.setAttribute('data-hidden', parent.id);
			parent.element.classList.add('post-hidden');
			console.log("Hiding post #" + parent.id + " because " + (choa ? "Choa" : "gay"))
		}
	}
}

function findFileThumbByMD5(md5) {
	return document.querySelector("img[data-md5='"+md5+"']");
}

function RunFilter() {
	console.log("Running kpgfilter");
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState != 4) return;
		
		var response = this.response;
		
		if (response === null || response.length < 1){
			return;
		}

		addToDB(response);
		for(var i = 0; i < response.length; i++){
			hideFile(response[i]);
		}
	}

	findFileThumbs(function(data) {
		if (data == null || data.length == 0) return;
		xhttp.responseType='json';
		xhttp.open('POST', location.protocol + '//kpgfilter.azurewebsites.net/api/filter', true);
		xhttp.setRequestHeader('Content-Type', 'application/json');
		xhttp.send(JSON.stringify(data));
	});
}

RunFilter();

if (ThreadUpdater) {
	for(var i = 0; i < ThreadUpdater.delayRange.length; ++i){
		ThreadUpdater.delayRange[i] += 10;
	}
	var oldUpdater = ThreadUpdater.update;
	ThreadUpdater.update = function(e) {
		RunFilter();
		oldUpdater(e);
	};
}