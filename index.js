const { WebSocketServer } = require('ws');

var password = 'holatest123';
var connectedUsers = {};

const wss = new WebSocketServer({
    port: 8080
});

wss.on('connection', function connection(ws, req) {
    // Check the password
    if (req.headers.passwd !== password) {
        ws.send('wrong password');
        return ws.terminate();
    }

    // Check if the user is missing
    if (!req.headers.user) {
        ws.send('User is missing');
        return ws.terminate();
    }

    // Check if the user is already connected
    if (Object.keys(connectedUsers).includes(req.headers.user)) {
        ws.send('User already connected');
        return ws.terminate();
    }

    // On message event listener
    ws.on('message', onMessage(ws, req.headers.user));

    // On connection close remove the user and notify all users
    ws.on('close', () => {
        delete connectedUsers[req.headers.user];
        sendEveryone({
            type: 'disconnected',
            user: req.headers.user
        })
    });

    connectedUsers[req.headers.user] = { ws };

    ws.send(JSON.stringify(getScoreboard()));
});

function getScoreboard() {
    var score = {};
    Object.keys(connectedUsers).forEach(u => score[u] = connectedUsers[u].score ?? false);
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
            ws.send('Invalid JSON');
            return ws.terminate();
        }
        switch (json.type) {
            case 'vote':
                connectedUsers[user].score = json.value;
                sendEveryone({
                    type: 'vote',
                    user: user,
                    score: json.value
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
                            type: 'total',
                            total
                        });
                    }
                }, 1000)
                break;
            case 'reset':
                Object.keys(connectedUsers).forEach(u => {
                    connectedUsers[u].score = false;
                });
                sendEveryone({ type: 'reset' });
                break;
        }
    }
}
