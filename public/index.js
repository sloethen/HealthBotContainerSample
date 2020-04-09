const defaultLocale = 'en-US';
const localeRegExPattern = /^[a-z]{2}(-[A-Z]{2})?$/;

function requestChatBot(loc) {
    const params = new URLSearchParams(location.search);
    const locale = params.has('locale') ? extractLocale(params.get('locale')) : defaultLocale;
    const oReq = new XMLHttpRequest();
    oReq.addEventListener("load", initBotConversation);
    var path = "/chatBot?locale=" + locale;

    if (loc) {
        path += "&lat=" + loc.lat + "&long=" + loc.long;
    }
    if (params.has('userId')) {
        path += "&userId=" + params.get('userId');
    }
    if (params.has('userName')) {
        path += "&userName=" + params.get('userName');
    }
    oReq.open("POST", path);
    oReq.send();
}

function extractLocale(localeParam) {
    if(localeParam === 'autodetect') {
        return navigator.language;
    }

    //Before assigning, ensure it's a valid locale string (xx or xx-XX)
    if(localeParam.search(localeRegExPattern) === 0) {
        return localeParam;
    }
    return defaultLocale;
}

function chatRequested() {
    const params = new URLSearchParams(location.search);
    if (params.has('shareLocation')) {
        getUserLocation(requestChatBot);
    }
    else {
        requestChatBot();
    }
}

function getUserLocation(callback) {
    navigator.geolocation.getCurrentPosition(
        function(position) {
            var latitude  = position.coords.latitude;
            var longitude = position.coords.longitude;
            var location = {
                lat: latitude,
                long: longitude
            }
            callback(location);
        },
        function(error) {
            // user declined to share location
            console.log("location error:" + error.message);
            callback();
        });
}

function initBotConversation() {
    if (this.status >= 400) {
        alert(this.statusText);
        return;
    }

    // extract the data from the JWT
    const jsonWebToken = this.response;
    const tokenPayload = JSON.parse(atob(jsonWebToken.split('.')[1]));
    const user = {
        id: tokenPayload.userId,
        name: tokenPayload.userName,
        locale: tokenPayload.locale
    };

    let domain = undefined;

    if (tokenPayload.directLineURI) {
        domain =  "https://" +  tokenPayload.directLineURI + "/v3/directline";
    }

    let location = undefined;

    if (tokenPayload.location) {
        location = tokenPayload.location;
    }

    let locale = undefined;

    if (tokenPayload.locale) {
        locale=tokenPayload.locale || 'en-us';
    }

    var botConnection = window.WebChat.createDirectLine({
        token: tokenPayload.connectorToken,
        domain: domain,
        webSocket: true
    });

    const styleOptions = {
        //botAvatarImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Cartoon_Robot.svg/512px-Cartoon_Robot.svg.png',
        //botAvatarBackgroundColor: '#1abc9c',
        botAvatarInitials: 'Bot',
        //userAvatarImage: 'https://cdn3.iconfinder.com/data/icons/cardiovascular-1/120/heart_patient-512.png',
        //userAvatarBackgroundColor: '#1abc9c',
        userAvatarInitials: 'You',
        avatarSize: 40,
        suggestedActionBackground: 'White'
    };

    const store = window.WebChat.createStore(
        {},
        function(store) {
            return function(next) {
                return function(action) {
                    if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {

                        // Use the following activity to proactively invoke a bot scenario
                        
                        store.dispatch({
                            type: 'DIRECT_LINE/POST_ACTIVITY',
                            meta: {method: 'keyboard'},
                            payload: {
                                activity: {
                                    type: "invoke",
                                    name: "TriggerScenario",
                                    value: {
                                        trigger: "covid19_assessment",
                                        args: {
                                            location: location,
                                        }
                                    }
                                }
                            }
                        });
                        
                    }
                    return next(action);
                };
            };
        }
    );

    const webchatOptions = {
        directLine: botConnection,
        styleOptions: styleOptions,
        store: store,
        userID: user.id,
        username: user.name,
        locale: user.locale
    };

    startChat(user, webchatOptions);
}

function startChat(user, webchatOptions) {
    const botContainer = document.getElementById('webchat');
    window.WebChat.renderWebChat(webchatOptions, botContainer);
}

//
//the following code is added to control the availability of buttons from previous selections.  effect is once a selection is made, you can not go back
//

setInterval(function () {
    // remove all buttons except the selected one, change its color, and make unclickable
    var buttons = document.getElementsByClassName("ac-pushButton");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", selectOption);
        buttons[i].addEventListener("click", adaptiveCardsOption);
        var allChildren = buttons[i].childNodes;
        for (let j = 0; j < allChildren.length; j++) {
            allChildren[j].addEventListener("click", selectParentOption);
        }
    }
}, 10);

function selectOption(event) {
    disableButtons(event.target);
}

function selectParentOption(event) {
    var children = event.target.parentNode.parentNode.childNodes;
    disableParentButtons(children, event.target.innerText);
    //parentNode.parentNode
}

function adaptiveCardsOption(event) {
    var columnSet = $(event.target).closest(".ac-columnSet")[0];
    if (columnSet) {
        var buttonsInColumnSets = columnSet.childNodes;
        for (let j = 0; j < buttonsInColumnSets.length; j++) {
            var columnSetButtons = buttonsInColumnSets[j].querySelectorAll("button");
            if (columnSetButtons) {
                disableParentButtons(columnSetButtons, event.target.parentNode.parentNode.innerText);
            }
        }
    }
}

function grayButton(button) {
    button.style.backgroundColor = "#d9d9d9";
    button.style.color = "#ffffff";
    button.height = "37px";
}

function blueButton(button) {
    button.style.backgroundColor = "#0078d7";
    button.style.color = "white";
    button.height = "37px";
}

function disableParentButtons(children, targetButton) {
    for (let i = 0; i < children.length; i++) {
        var alreadhClicked = false;
        for (var j = 0; j < children[i].classList.length; j++) {
            if (children[i].classList[j] === "old-button" || children[i].classList[j] === "expandable") {
                alreadhClicked = true;
                break;
            }
        }
        if (children[i].nodeName === "BUTTON" && !alreadhClicked) {
            if (children[i].innerText) {
                if (children[i].innerText !== targetButton) {
                    grayButton(children[i]);
                } else {
                    blueButton(children[i]);
                }
                children[i].classList.remove("ac-pushButton");
                children[i].classList.add("old-button");
                setTimeout(function () {
                    if (children[i] != null) {
                        children[i].onclick = "null";
                    }
                }, 50);
                children[i].removeEventListener("click", selectOption);
                children[i].style.outline = "none";
                children[i].style.cursor = "default";
            }
        }
    }
}

function disableButtons(targetButton) {
    var alreadyClicked = false;
    for (var j = 0; j < targetButton.classList.length; j++) {
        if (targetButton.classList[j] === "old-button" || targetButton.classList[j] === "expandable") {
            alreadyClicked = true;
            break;
        }
    }
    for (var k = 0; k < targetButton.parentNode.classList.length; k++) {
        if (targetButton.parentNode.classList[k] === "old-button" || targetButton.parentNode.classList[k] === "expandable") {
            alreadyClicked = true;
            break;
        }
    }
    if (alreadyClicked) {
        return;
    }
    blueButton(targetButton);
    targetButton.classList.add("old-button");
    targetButton.parentNode.parentNode.parentNode.parentNode.style.cursor = "not-allowed";
    var allChildren = targetButton.parentNode.childNodes;
    for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].innerText) {
            if (allChildren[i].innerText !== targetButton.innerText) {
                grayButton(allChildren[i]);
            }
            allChildren[i].classList.remove("ac-pushButton");
            allChildren[i].classList.add("old-button");
            allChildren[i].onclick = "null";
            allChildren[i].removeEventListener("click", selectOption);
            allChildren[i].style.outline = "none";
            allChildren[i].style.cursor = "default";
        }
    }
}