

// Feeds are loaded from links via rss2json, to circumvent cross-origin policy
// TODO: change to something better 
getExternalFeed = function (feedURL, successFunc, errorFunc) {
  if (!(feedURL.startsWith("http"))) feedURL = "https://"+feedURL;

  $.ajax({
    type: 'GET',
    url: "https://api.rss2json.com/v1/api.json?rss_url=" + feedURL,
    dataType: 'jsonp',
    success: successFunc,
    error: function(result) {
      console.log("Error recieved when attempting to load: "+feedURL+ ":\n", result);
      errorFunc(result);
    }
  });
}

getFavicon = function(feedURL) {
  let srcLink = 'http://www.google.com/s2/favicons?size=24&domain=' + feedURL;
  return srcLink; 
}

errorDestFeed = function(errorText) {
  errorDestFeedInfo.innerText = errorText; 
  destFeedInfoBox.style.visibility = 'hidden';
  errorDestFeedInfo.style.display = 'block'; 
}

// prevent XSS by removing javascript from links
// todo -- use third party solution
scrubLink = function (unsafeLink) {
  let safeLink = "";
  if(unsafeLink && !unsafeLink.startsWith("https:") && !unsafeLink.startsWith("http:") && !unsafeLink.startsWith("mailto:")) safeLink = "https://"+unsafeLink;
  else safeLink = unsafeLink;
  return safeLink;
}

// "borrowed" from https://github.com/ChaiaEran/RuSShdown/blob/main/russhdown.js
// ty for the STRONGEST LICENSE, and consider cirno APPRECIATED :)
async function readRssFile(f) {
    let inputFileContents = await new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = (e) => {
            reject(e);
        };
        reader.readAsText(f);
    });

    let parser = new DOMParser();
    let rssDoc = parser.parseFromString(inputFileContents, "text/xml");

    return rssDoc;
}



initRSSReblog = function() {
  
  srcFeed = {
    feedURL:null,     // Provided via URLSearchParams
    guid:null,        // Provided via URLSearchParams
    postLink:null,    // Provided via URLSearchParams
    displayIcon:null, // Provided via URLSearchParams OR derived from feedURL
    displayName:null, // Provided via URLSearchParams OR derived from feedURL
    title:"",         // Derived from feedURL
    link:"",          // Derived from feedURL
  };
  srcItem = null;
  destFeed = {
    feedURL:"",          // from user input (link) but could be from file
    link:null,           // from file
    filename:"rss.xml",  //from filename
    customDisplayName:"", //from user
    customDisplayIcon:"" //from user
    };
  cachedDestFeedLink = null
  
  
  //1. Autofill the source feed and source guid.
  
  let pageURL = "rssr.dev/reblog?&feed=https%3A%2F%2Fwww.bluetinge.dev%2Frss.xml&guid=https%3A%2F%2Fbluetinge.github.io%2Fregex-crossword%2F8"; //sample
  // let pageURL = window.location.href; //uncomment to use actual URL
  
  searchParams = new URLSearchParams(pageURL);
  srcFeed.feedURL = scrubLink(searchParams.get("feed"));
  srcFeed.guid = searchParams.get("guid");
  // OPTIONAL PARAM:
  srcFeed.postLink = searchParams.get("link");  // can be used instead of guid, I GUESS. If the owner of the feed is SLOPPY :/
  //ideally these are embedded in the RSS feed but cross-origin policy does make this difficult 
  srcFeed.displayIcon = searchParams.get("icon");
  srcFeed.displayName = searchParams.get("name");
  
  //TODO: error check (should have url set and at least one of guid or postLink)

  //  1.2 Attempt to load the source feed
  getExternalFeed(
    srcFeed.feedURL, 
    function(result) { 
      console.log(result);
      // RSS2JSON-specific
      srcFeed.json = result;
      loadSrc();
    },
    function(result) { 
      errorTop.innerText = "Error: a feed could not be derived from "+srcFeed.url; 
    }
  )
}

  //2. From the source feed, determine if the guid can be found. Load the source pfp and name, and the source item tags.

loadSrc = function() {
  
  // TODO: Allow for loading by link instead
  // TODO -- Attempt to fix errors by:
  //  - searching for link if guid cannot be found, or vice versa
  //  - removing stuff past the url and searching again
  //  - replace https with http and try again
  //  - add https, http and try again
  //  - remove http / https altogether and try again
  
  /* Loading via RSS2JSON */
  srcFeed.title = srcFeed.json.feed.title;
  srcFeed.link = srcFeed.json.feed.link;
  srcItem = null;
  for (item of srcFeed.json.items) {
    if (srcFeed.guid === item.guid){
      if (srcItem != null) {
        errorTop.innerText = "Error: GUID occurs multiple times in feed";
        return;
      }
      srcItem = item;
    }
  }
  if (srcItem == null) {
    errorTop.innerText = "Error: GUID not in feed";
    return;
  }
  
  // scrub srcFeed.link, srcFeed.displayIcon, and srcItem.link to prevent XSS, in theory
  srcFeed.link = scrubLink(srcFeed.link);
  srcFeed.displayIcon = scrubLink(srcFeed.displayIcon);
  srcItem.link = scrubLink(srcItem.link);
  
  //If no display name was provided, the feed title is used
  if(!srcFeed.displayName) srcFeed.displayName = srcFeed.title;
  // if no display icon is provided, favicon is used
  if(!srcFeed.displayIcon) srcFeed.displayIcon = getFavicon(srcFeed.feedURL);

  //feed loaded correctly
  // now to fill vars on page
  document.getElementById("srcItemTitle").innerText = srcItem.title;
  document.getElementById('srcFeedIcon').src = srcFeed.displayIcon;
  for (srcNameElement of document.getElementsByClassName("srcFeedDisplayName")){
    srcNameElement.innerText = srcFeed.displayName;
  }
  
  reblogTags.value = "#reblog"
  for(cat of srcItem.categories) {
    if(cat=="reblog") continue;
    reblogTags.value  = reblogTags.value  + " #" + cat;
  }
  
  //display to user
  errorTop.style.display = 'none';
  document.getElementById('all').style.visibility = 'visible';
  
}

  //3. Prompt the user for their feed (link or file)

getDestFromLink = function() {
  errorDestFeedInfo.style.display = 'none';
  
  let oldLink = destFeed.feedURL;
  destFeed.feedURL = document.getElementById("destLinkInput").value;
  if (destFeed.feedURL == "" || destFeed.feedURL == oldLink){
  //use cached feed
    if(cachedDestFeedLink != null) {
      destFeed = cachedDestFeedLink;
      //console.log("Reading from cache");
      loadDest();
    }
  }
  else {
    getExternalFeed(
      destFeed.feedURL, 
      function(result) { 
        destFeed.json = result; 
        destFeed.link = destFeed.json.feed.url
        destFeed.title = destFeed.json.feed.title;
        cachedDestFeedLink = destFeed;
        loadDest();
      },
      function(result) { 
        errorDestFeed("Error: a feed could not be derived from '"+destFeed.feedURL+"'")
    })
  }
}
    
async function getDestFromFile() {
  errorDestFeedInfo.style.display = 'none';
  
  destFiles = document.getElementById("destFileInput").files;
  if (destFiles.length == 1){
    let destFile = destFiles[0];
    destFeed.file = await readRssFile(destFile);
    try {
      destFeed.file = await readRssFile(destFile);
      //sanity check: ensure bare minimum for well-formed file
      if(destFeed.file.querySelector('channel').parentNode !== destFeed.file.querySelector('rss')) {
        throw new Error("Channel is not a child element of RSS");
      }
      destFeed.title = destFeed.file.querySelector("title").innerHTML;
      destFeed.link = destFeed.file.querySelector("link").getAttribute("href");
      loadDest();
      
    }
    catch (e) {
      console.log(e);
      let errText = "";
      if(destFeed.file && destFeed.file.querySelector){
        if (!destFeed.file.querySelector("title")) errText += ", feed title not found";
        if (!destFeed.file.querySelector("link")) errText += ", feed link not found";
        if (!destFeed.file.querySelector("channel")) errText += ", channel element not found";
        if (!destFeed.file.querySelector("rss")) errText += ", rss element not found";
      }
      if(errText == "") errText = e;
      else errText = errText.substring(2);
      errorDestFeed("Error when reading file: "+errText);
    }
  }
  else if (destFiles.length > 1){
    errorDestFeed("Error: Multiple files uploaded!");
  }
}
    
  //4. On load, display the determined display name and pfp.
loadDest = function() {
  console.log(destFeed);
  if(destFeed.customDisplayName == ""){
    document.getElementById("destFeedTitleBox").value = destFeed.title;
    document.getElementById("destFeedTitle").innerText = destFeed.title;
  }
  else {
    document.getElementById("destFeedTitleBox").value = destFeed.customDisplayName;
    document.getElementById("destFeedTitle").innerText = destFeed.customDisplayName;
  }

  if(destFeed.customDisplayIcon == ""){
    document.getElementById('destFeedIcon').src = getFavicon(destFeed.link); 
  }
  else {
    document.getElementById('destFeedIcon').src = destFeed.customDisplayIcon;
  }

  destFeedInfoBox.style.visibility = 'visible';
  generateButton.disabled = false;
}
    
  //5. Optionally, the user may alter the username. 
openDisplayNameEditor = function() {
  document.getElementById("destFeedTitleBox").value = document.getElementById("destFeedTitle").innerText;
  
  document.getElementById("destFeedTitleBox").onkeydown = function(){
    if(event.key == 'Enter') {
      document.getElementById("destFeedTitleBox").blur();
    }
  }
  document.getElementById("destFeedTitle").style.display = 'none';
  document.getElementById("editHelper").style.display = 'none';
  document.getElementById('saveDefaultNameIcon').style.display = 'inline';
  document.getElementById("destFeedTitleBox").style.display = 'inline';
  document.getElementById("destFeedTitleBox").focus();
}

closeDisplayNameEditor = function() {
  let displayName = document.getElementById("destFeedTitleBox").value;
  
  if(displayName == destFeed.title || displayName == "") {
    destFeed.customDisplayName = "";
    displayName = destFeed.title;
  }
  else{
    destFeed.customDisplayName = displayName;
  }
  document.getElementById("destFeedTitle").innerText = displayName;
  document.getElementById("destFeedTitleBox").style.display = 'none';
  document.getElementById("destFeedTitle").style.display = 'inline';
  document.getElementById("editHelper").style.display = 'inline';
}
  // 5b. Optionally, the user may edit the PFP/icon
editPFP = function() {
  PFPLink = prompt("Enter the link to the icon to display (or leave blank to use the site icon)\n Maximum size: 24x24 (will shrink to fit)");
  if(PFPLink === null) return;
  else if(PFPLink === ""){
    destFeed.customDisplayIcon = "";
    PFPLink = getFavicon(destFeed.link);
    document.getElementById('destFeedIcon').alt = "";
  }
  else {
    destFeed.customDisplayIcon = PFPLink;
  }
  document.getElementById('destFeedIcon').alt = " ";
  document.getElementById('destFeedIcon').src = PFPLink;
  document.getElementById('saveDefaultNameIcon').style.display = 'inline';
}

  //6. The user may check a box to save their display name in their feed for the future: “Make this the default display name used by rss-reblog for this feed.”
  //6b. Same with user pfp


//7. The user clicks generate, and the file is created.
  // The new post contains all the same data as the old one, except:
  // The date published is updated to the current date/time.
  // The guid is updated.
  // If a link was provided by the current user, the link is updated. Otherwise, it stays the same.
  // <author> and <dc:creator> remain the same. If one of them was set and the other was not, the other tag is added.
  // <dc:contributor> adds the current user, if the current user is not already in dc:contributor or dc:user
      //TODO: Can't view dc:creator or dc:contributor with rss2json. Need to switch to in house solution to meaningfully implement
  // The reblog <category> is added, if not already present. Additional tags provided by the user are added as categories.
  // If there is no content:encoded, then the post is considered to be in description, and so both the header and footer are added to the description. If there is a content:encoded, then only the header is added to description, and both the header and footer are added to content:encoded.
generateRSS = function() {

  // Create a new XML document
  newFile = destFeed.file.implementation.createDocument(
      destFeed.file.namespaceURI,    //namespace to use
      null,                          //name of the root element (or for empty document)
      null                           //doctype (null for XML)
  );
  var newRoot = newFile.importNode(
      destFeed.file.documentElement, //node to import
      true                           //clone its descendants
  );
  newFile.appendChild(newRoot);

  let dateTime = new Date();

  // A new item is added to the feed, with all the original data of the old item
  newItem = newFile.createElement("item");
  
  // RSS2JSON provides only: author,categories,content,description,enclosure,guid,link,pubDate,thumbnail,title
  // Completely unchanged: author, enclosure, thumbnail, title
  if (srcItem.author != "") newItem.appendChild(newFile.createElement("author")).innerHTML = srcItem.author;
  if (srcItem.enclosure != {}) addEnclosure(newItem, srcItem.enclosure);
  if (srcItem.thumbnail != "") newItem.appendChild(newFile.createElement("thumbnail")).innerHTML = srcItem.thumbnail;
  if (srcItem.title != "") newItem.appendChild(newFile.createElement("title")).innerHTML = srcItem.title;
  
  // Use original to modify: content, description, link
  let srcContent = srcItem.content;
  let srcDescription = srcItem.description;
  let srcLink = srcItem.link;

  let destItemLink = addLinkGUID(newItem,srcLink)
  addContentDescription(newItem,srcContent,srcDescription,srcLink,destItemLink,srcItem.title,dateTime,srcItem.pubDate);
  
  //populate without retrieving from JSON: categories (retrieved earlier), pubDate
  addCategories(newItem)
  addPubDate(newItem,dateTime);

  //Add the new item to the channel
  newFile.querySelector("channel").appendChild(newItem);
  
  // The newly generated feed is the same as before, except:
  // Any new namespaces are added (done when the element is added)
  
  // The last build date is updated to the current date/time.
  updateLastBuildDate(newFile.querySelector("channel"),dateTime);
  
  // If the user selected it, the display name and icon are saved as defaults within the feed element using the "rssr:displayName" and "rssr:icon" elements
  addDefaultDisplayNameIcon(newFile.querySelector("channel"));
  
  // Preview is generated
}

addContentDescription = function(newItem,srcContent,srcDescription,srcLink,destItemLink,srcTitle,dateTime,oPubDate) {
  
  // If both description and content:encoded are present, description is assumed to be a summary. Therefore, only the REBLOG-HEADER step is applied to description, while all steps are applied to content:encoded.
  // Exception: if they are literally identical, they remain literally identical.
  // If only one or the other is present in the original, that remains true.
  // if both srcContent and srcDescription are empty, the post is just srcLink
  
  // Post content is stripped of unwanted elements FIRST
  // options -- cloned in case the options are changed by the user
  let opt = { 
    "whiteList": structuredClone(rssReblogXSSOptions.whiteList),
    "css": structuredClone(rssReblogXSSOptions.css),
    "stripCommentTag": rssReblogXSSOptions.stripCommentTag,
    "escapeHtml": rssReblogXSSOptions.escapeHtml
  }
  if(document.getElementById('removeAll').checked) {
    // all styling is removed
    // TODO: should also remove non-RSSR style classes
    for ( const [tag, attr] of Object.entries(opt.whiteList)) {
      opt.whiteList[tag] = attr.filter(a => a !== 'style');
    }
  } else if (document.getElementById('removeSome').checked) {
    opt = rssReblogXSSOptions;
  } else if (document.getElementById('keepStyles').checked) {
    // TODO: style blocks should be adjusted to prevent alteration of other classes in the post 
    opt.whiteList.style = [];
    opt.css = false;
  } else if (document.getElementById('keepAll').checked) {
    // TODO: the post should be wrapped inside a sandboxed iframe
    // that seems like the safest way to keep scripts
    opt = undefined;
  }
  if(opt){
    srcContent = filterXSS(srcContent,rssReblogXSSOptions);
    srcDescription = filterXSS(srcDescription,rssReblogXSSOptions);
  }
  // Should now be free of anything dangerous
  
  // srcFull is the variable that holds the canonical post content 
  // and optionally, there is a separate description in srcDescription
  let srcFull = srcContent;
  if (!srcContent) srcFull = srcDescription;
  if (!srcDescription) srcFull = `<a href=${srcLink} target="_blank" rel="noopener noreferrer" >${srcTitle}</a>`;
  
  console.log(srcFull);

  // Some other relevant variables:
  // TODO: Encode these so that " and stuff don't mess literally everything up
  
  // default display name and icon vs. custom
  
  let isCustomDisplayName = false;
  destFeed.displayName = destFeed.title;
  if(destFeed.customDisplayName) {
    let isCustomDisplayName = true;
    destFeed.displayName = destFeed.customDisplayName;
  }
  let isCustomDisplayIcon = false;
  destFeed.displayIcon = document.getElementById("destFeedIcon").src;
  if(destFeed.customDisplayIcon) {
    let isCustomDisplayIcon = true;
    destFeed.displayIcon = destFeed.customDisplayIcon;
  }
  
  // post links
  
  // current datetime and publication datetime
  
  // addendum and addendum link

  // rb button link

  // RSSR REBLOG HEADER
  // If there was already a reblog header in the original post, it is REPLACED by the new header.
  let newFull = "";
  
let reblogHeader = `\
  <!-- RSS-Reblog Header -->
  <div class="rssr-item" id="rssr-item-GUID">
    <div class="rssr-section rssr-reblog-header">
      <p><small class="rssr-font rssr-reblog-header-font" style="vertical-align:middle;padding:0.36em;">
        <a href="${destFeed.link}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
          <img style="max-height:24px;vertical-align:middle;" src="${destFeed.displayIcon}" alt=""> 
          <b>${destFeed.displayName}</b>
        </a> <i> reblogged a <a href="${destItemLink}" target="_blank" rel="noopener noreferrer">post</a> from&nbsp; </i> 
        <a href="${srcFeed.link}" target="_blank" rel="noopener noreferrer" style="text-decoration:none"> 
          <img style="max-height:2em;vertical-align:middle;" src="${srcFeed.displayIcon}" alt="">
          <b>${srcFeed.displayName}</b>
        </a><i><time class="rssr-datetime" datetime="${"YYYY-MM-DD HH:MM:SS +HHSS"}">on ${"YYYY-MM-DD"}:</time></i>
      </small></p>
    </div>
    <hr class="rssr-hr rssr-reblog-header-divider">
  <!-- End RSS-Reblog Header -->
`
  
  // RSSR OP HEADER
  //If there was already an OP header in the original post, it is UNCHANGED (No new op header added)

let opHeader = `\
  <!-- RSS-OP Header -->
    <div class="rssr-section rssr-post-original">
      <div class="rssr-section-header rssr-op-header">
        <p><small class="rssr-font rssr-op-header-font" style="vertical-align:middle;padding:0.36em;">
          <a href="${srcFeed.link}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">
            <img style="max-height:24px;vertical-align:middle;" src="${srcFeed.displayIcon}" alt="">
            <b>${srcFeed.displayName}</b>
          </a><i>${`<a href="${srcLink}" target="_blank" rel="noopener noreferrer">posted</a>`}<time class="rssr-datetime" datetime="${"YYYY-MM-DD HH:MM:SS +HHSS"}"> on ${"YYYY-MM-DD"}</time>:</i>
        </small></p>
      </div>
  <!-- End RSS-OP Header -->
`

  // ORIGINAL POST 
  // The entire original post is placed here -- except the aforemented REBLOG HEADER and REBLOG FOOTER

  // ADDENDUM 
  // Only placed if addendum field is not empty

let addendemHeader = `\
  <!-- RSS-Addendum Header -->
    </div>
    <hr class="rssr-hr rssr-hr-mid">
    <div class="rssr-section rssr-post-addendum">
      <div class="rssr-section-header rssr-addendum-header">
        <p><small class="rssr-font rssr-addendum-header-font" style="vertical-align:middle;padding:0.36em;">
          <a href="${destFeed.link}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">
          <img style="max-height:24px;vertical-align:middle;" src="${destFeed.displayIcon}" alt="">
          <b>${destFeed.displayName}</b></a> ${`<i><a href="${destItemLink}" target="_blank" rel="noopener noreferrer">added</a>`}<time class="rssr-datetime" datetime="${"YYYY-MM-DD HH:MM:SS +HHSS"}"> on ${"YYYY-MM-DD"}</time>:</i>
        </small></p>
      </div>
  <!-- End RSS-Addendum Header -->
`

  // Addendum content goes here

  // RSS REBLOG FOOTER 
  // If there was already a reblog footer in the original post, it is REPLACED by the new footer.

let reblogFooter = `\
  <!-- RSS-Reblog Footer (Reblog Button) -->
    </div>
    <hr class="rssr-hr rssr-footer-divider">
    <div class="rssr-section rssr-footer">
      <p style=""><small class="rssr-font rssr-footer-font" style="vertical-align:middle;text-color:blue;"><a href="${`https://rssr.purl.org/rss-reblog?&feed=${"destFeed.feedURL (tbd)"}&guid=${"destItem.guid (tbd)"}`}" target="_blank" rel="noopener noreferrer" class="rssr-reblog-button" style="padding:0.36em;"><img style="height:1em;vertical-align:middle;" src="${"https://www.rssboard.org/images/rss-icon.png"}" alt=""> <b>Reblog via RSS</b></a></small></p>
      <script async src="${"rssr.purl.org/script"}" charset="utf-8"></script>
    </div>
  </div>
  <!-- End RSS-Reblog Footer -->
`

newFull = reblogHeader + opHeader + srcFull + reblogFooter;

//then add  as CDATASection

console.log(newFull);

}  

  // If a link was provided by the current user, the link is updated. Otherwise, it stays the same (*XSS vector? Javascript:, etc should be disallowed)
    // The patterns $GUID$ and $POST_NUM$ are replaced, respectively. (Escape by encoding the $ as %24
  // If any of the following are true, the GUID is auto-generated:
    //A) The link was not provided
    //B) The link is non-unique.
    //C) The link contained the $GUID$ pattern
  // Otherwise, the GUID is set to the provided link.
addLinkGUID = function (newItem, srcLink) {
  
  let url = document.getElementById("postLink").value;
  if (url == "") url = srcLink;
  let guid = url;
  let isPermaLink = true;
  
  let unique = true;
  newFile.querySelectorAll('guid').forEach((g)=>(unique = (url != g.innerHTML)));
  if(url == "" || url.includes("$GUID$") || !unique ) {
    //use autogenerated GUID
    guid = crypto.randomUUID();
    isPermaLink = false;
  }
  //add guid element
  let guidElem = newFile.createElement("guid")
  guidElem.innerHTML = guid;
  guidElem.setAttribute("isPermaLink", isPermaLink);
  newItem.appendChild(guidElem);
  
  // add link element
  if (url != "") {
    url = url.replace(/\$GUID\$/g, guid);
    url = url.replace(/\$POSTNUM\$/g, newFile.querySelectorAll('item').length);
    newItem.appendChild(newFile.createElement("link")).innerHtml = url; //TODO! chk if encoded
  }
  return url;
}
  // The reblog <category> is added, if not already present. Additional tags provided by the user are added as categories.
addCategories = function(newItem) {
  
  let tags = document.getElementById("reblogTags").value.split("#");
  let cats = [];
  for (tag of tags) {
    tag = tag.trim();
    if(tag != "" && !(cats.includes(tag)) ) {
      newItem.appendChild(newFile.createElement("category")).innerHTML = tag;
      cats = cats.concat(tag);
    }
  }
  
}
  // The date published is updated to the current date/time.
addPubDate = function(newItem,dateTime) {
  newItem.appendChild(newFile.createElement("pubDate")).innerHTML = dateTime.toUTCString();
}

  // The last build date is updated to the current date/time.
updateLastBuildDate = function(channel,dateTime) {
    channel.appendChild(newFile.createElement("lastBuildDate")).innerHTML = dateTime.toUTCString();
}
  
  // If the user selected it, the display name and icon are saved as defaults within the feed element using the "rssr:displayName" and "rssr:icon" elements
addDefaultDisplayNameIcon = function(channel) {
  
}

//JSON enclosure object -> XML
addEnclosure = function (newItem, enclosure){
  if(enclosure.length, enclosure.link, enclosure.type){
    let enc = newFile.createElement("enclosure");
    enc.appendChild(newFile.createElement("length")).innerHTML = enclosure.length;
    enc.appendChild(newFile.createElement("url")).innerHTML = enclosure.link;
    enc.appendChild(newFile.createElement("type")).innerHTML = enclosure.type;
    newItem.appendChild(enc);
  }
}

/*
//11. A final preview is created. 
//12. The user may download or copy the feed (as an RSS/XML file)
//13. The user may download or copy the post (as an html file or a markdown file)
*/









