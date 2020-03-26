function requestChatBot() {
    const params = new URLSearchParams(location.search);
    const oReq = new XMLHttpRequest();
    oReq.addEventListener("load", initBotConversation);
    var path = "/chatBot?";
    if (params.has('userId')) {
        path += "&userId=" + params.get('userId');
    }
    if (params.has('region')) {
        path += "&region=" + params.get('region');
    }
    oReq.open("POST", path);
    oReq.send();
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
        name: tokenPayload.userName
    };

    let domain = undefined;

    if (tokenPayload.directLineURI) {
        domain =  "https://" +  tokenPayload.directLineURI + "/v3/directline";
    }

    let region = undefined;

    if (tokenPayload.region) {
        region = tokenPayload.region;
    }

    var botConnection = window.WebChat.createDirectLine({
        token: tokenPayload.connectorToken,
        domain: domain,
        webSocket: true
    });

    const styleOptions = {
        botAvatarImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Cartoon_Robot.svg/512px-Cartoon_Robot.svg.png',
        botAvatarBackgroundColor: '#1abc9c',
        //botAvatarInitials: 'Bot',
        userAvatarImage: 'https://cdn3.iconfinder.com/data/icons/cardiovascular-1/120/heart_patient-512.png',
        userAvatarBackgroundColor: '#1abc9c',
        //userAvatarInitials: 'You'
        avatarSize: 60,
    };

    const store = window.WebChat.createStore(
        {},
        function(store) {
            return function(next) {
                return function(action) {
                    if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
                        
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
                                            region: region
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
        styleOptions,
        store,
        userID: user.id,
        username: user.name,
        locale: 'en'
    };
    startChat(user, webchatOptions);
}

function startChat(user, webchatOptions) {
    const botContainer = document.getElementById('webchat');
    window.WebChat.renderWebChat(webchatOptions, botContainer);
}
