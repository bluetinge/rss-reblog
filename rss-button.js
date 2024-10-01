// prevent this from loading multiple times 
if(!document.rssrButtonScriptRun) {
  document.rssrButtonScriptRun = true;

  // load button stylesheet

  document.head.insertAdjacentHTML(
        'beforeend',
        '<link rel="stylesheet" href="https://rssr.bluetinge.dev/rss-button.css" />');
        
  // for making the rss button page up in an iframe instead of making a new tab

  var iframes = "";
  var index = 0;

  var rssrButtons = document.getElementsByClassName("rssr-reblog-button")
  for (btn of rssrButtons) {
    
    let btn_index = index;
    
    let frameLink = btn.href+"&iframe=true";
    
     iframes = iframes + `<iframe class="rssr-modal-iframe" id="rssrIFrame_${btn_index}" allowtransparency="true" src="${frameLink}" style="display:none;">
        Your browser doesn't support iframes. Click <a href="${frameLink}">here</a> to open ReSShaRe in a new window instead.
        </iframe>`;
    
    // When the user left clicks the link, open the modal 
    // (right click to open context menu, etc)
    btn.onclick = function(e) {
      let iFrame = document.getElementById(`rssrIFrame_${btn_index}`);
      console.log(e.srcElement);
      console.log(e.srcElement.btn_index);
     
      iFrame.style.display = "block";
      
      document.getElementById("rssrModal").style.display = "block";
      return e.preventDefault() && e.stopPropagation();
    }
    
    index = index + 1;
  }

  // Add iframes

  document.getElementsByTagName("body")[0].insertAdjacentHTML(
    'beforeend',
  `
  <style>
  /* The Modal (background) */
.rssr-modal-background {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 255; /* Sit on top */
  /*padding-top: 100px; /* Location of the box */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  /*overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  font-family: Arial, Helvetica, sans-serif;
}

.rssr-modal-content {
  position: absolute;
  left: 5%;
  top: 0%;
  margin: 0px;
  padding: 0px;
  width: 90%;
  height: 100%;
  background-color: transparent;
  border: 0px;*/
}

.rssr-modal-close {
  z-index: 256;
  position:absolute;
  top: 10px;
  right: 10px;
  font-size: 84px;
  font-weight: bold;
  color: white;
  margin: 0px;
  padding: 0px;
  width: 60px;
  height: 60px;
  line-height: 60px;
  text-align: center;
  vertical-align: middle;
  overflow:hidden;
  /*
  background-color: #fefefe;
  border: 4px solid #888;
  border-radius: 20px;
  float: right;
  */
}

.rssr-modal-close:hover,
.rssr-modal-close:focus {
  color: red;
  text-decoration: none;
  cursor: pointer;
}

.rssr-modal-iframe {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 0px;
}
  </style>
  <div id="rssrModal" class="rssr-modal-background">
    <!-- Modal content -->
    <div class="rssr-modal-content">
      <div class="rssr-modal-close">&times;</div>
      <div id="rssrModalFrameHolder">
        ${iframes}
      </div>
    </div>
  </div>`);

  // When the user clicks away or clicks the X, close the modal
  document.getElementsByClassName("rssr-modal-close")[0].onclick = function() {
    document.getElementById("rssrModal").style.display = "none";
  }
  window.onclick = function(event) {
    if (event.target == document.getElementById("rssrModal")) {
      document.getElementById("rssrModal").style.display = "none";
    }
  }

}