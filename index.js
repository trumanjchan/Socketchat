const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var clients = [];

app.use('/favicon.ico', express.static('public/favicon.ico'));
app.use('/public', express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    var count = clients.length;
    io.emit('update-num-users', count);
    io.emit('update-user-list', clients);

    socket.on('storeClientInfo', function (data) {
        var nickavailability = clients.find(obj => {
            return obj.username === data.username.trim();
        })
        if (nickavailability == undefined && data.username.length < 11 && data.username.trim().length != 0) {
            io.emit('new-nickname');
            var clientInfo = new Object();
            clientInfo.clientId = socket.id;
            clientInfo.username = data.username;
            clients.push(clientInfo);
            console.log(clients);
            io.emit('announce-user', data.username);
            console.log('Welcome, ' + data.username + '!');

            count = clients.length;
            io.emit('update-num-users', count);
            io.emit('update-user-list', clients);

            socket.on('user-typing', () => {
                io.emit('user-typing', data.username + ' is typing...');
            });
            socket.on('user-stopped-typing', () => {
                io.emit('user-typing', '');
            });
            socket.on('chat-message', msg => {
                io.emit('chat-message', '<' + data.username + '> ' + msg);
                console.log(data.username + ': ' + msg);
            });
            socket.on('privatemessaging', data => {
                for (var i = 0; i < data.groupchat.length; i++) {
                    var result = clients.find(obj => {
                        return obj.username === data.groupchat[i];
                    })

                    data.groupchat[i] = 'me';
                    io.to(result.clientId).emit('private-message', '[' + clientInfo.username + ' -> ' + data.groupchat.join(', ') + '] ' + data.pm);
                    data.groupchat[i] = result.username;
                }
            });

            socket.on('disconnect', () => {
                clients = clients.filter(person => person.username != data.username);
                console.log(clients);
                io.emit('user-left', data.username);
                count = clients.length;
                io.emit('update-num-users', count);
                io.emit('update-user-list', clients);
                console.log('Disconnected: ' + data.username);
            });
        }
    });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000');
});