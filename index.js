const { WebSocketServer } = require('ws');

var password = 'holatest1232';
var connectedUsers = {};

const wss = new WebSocketServer({
    port: 8080
});

wss.on('connection', function connection(ws, req) {
    var passwd = req.url.match(/passwd=(\w+)/);
    var user = req.url.match(/user=(\w+)/);

    // Check the password
    if (!passwd || passwd[1] !== password) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Wrong password'
        }));
        return ws.terminate();
    }

    // Check if the user is missing
    if (!user) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'User is missing'
        }));
        return ws.terminate();
    }

    // Check if the user is already connected
    if (Object.keys(connectedUsers).includes(user[1])) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'User already connected'
        }));
        return ws.terminate();
    }

    // On message event listener
    ws.on('message', onMessage(ws, user[1]));

    // On connection close remove the user and notify all users
    ws.on('close', () => {
        delete connectedUsers[user[1]];
        sendEveryone({
            type: 'scoreboard',
            scoreboard: getScoreboard()
        })
    });

    connectedUsers[user[1]] = { ws };

    sendEveryone({
        type: 'scoreboard',
        scoreboard: getScoreboard()
    })
});

function getScoreboard() {
    var score = {};
    Object.keys(connectedUsers).forEach(u => score[u] = !!connectedUsers[u].score);
    return score;
}

function getScoreboardPoints() {
    var score = {};
    Object.keys(connectedUsers).forEach(u => score[u] = connectedUsers[u].score);
    return score;
}


function sendEveryone(json) {
    var message = JSON.stringify(json);
    Object.keys(connectedUsers).forEach(u => {
        connectedUsers[u].ws.send(message);
    });
}

function onMessage(ws, user) {
    return data => {
        var json;
        try {
            json = JSON.parse(data.toString());
        } catch (e) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid JSON'
            }));
            return ws.terminate();
        }
        switch (json.type) {
            case 'vote':
                connectedUsers[user].score = json.value;
                sendEveryone({
                    type: 'scoreboard',
                    scoreboard: getScoreboard()
                })
                break;
            case 'calculate':
                var seconds = 5;
                sendEveryone({
                    type: 'time',
                    time: seconds,
                });
                var interval = setInterval(() => {
                    seconds -= 1;
                    sendEveryone({
                        type: 'time',
                        time: seconds
                    });
                    if (seconds === 0) {
                        clearInterval(interval);
                        var total = 0;
                        Object.keys(connectedUsers).forEach(u => total += connectedUsers[u].score);
                        sendEveryone({
                            type: 'scoreboard',
                            scoreboard: getScoreboardPoints()
                        });
                    }
                }, 1000)
                break;
            case 'reset':
                Object.keys(connectedUsers).forEach(u => {
                    connectedUsers[u].score = false;
                });
                sendEveryone({
                    type: 'scoreboard',
                    scoreboard: getScoreboard()
                });
                break;
        }
    }
}
