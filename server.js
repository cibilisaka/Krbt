const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let players = {};

io.on('connection', (socket) => {
    console.log(`Yeni bağlantı: ${socket.id}`);
    
    // Oyuncu ismini girip oyuna başladığında tetiklenir
    socket.on('joinGame', (userData) => {
        players[socket.id] = {
            id: socket.id,
            username: userData.username,
            x: 4,
            z: 4,
            angle: 0
        };

        // Herkese güncel oyuncu listesini gönder (Arkadaş listesi için)
        io.emit('currentPlayers', players);
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            players[socket.id].angle = movementData.angle;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Arkadaş Daveti Gönderme (Oyna butonuna basınca)
    socket.on('sendInvite', (data) => {
        const targetSocketId = data.targetId;
        if (players[targetSocketId]) {
            // Davet giden kişiye, davet edenin adını ve id'sini yolla
            io.to(targetSocketId).emit('receiveInvite', {
                fromId: socket.id,
                fromUsername: players[socket.id].username
            });
        }
    });

    // Davet Kabul Edildiğinde İkisini Yan Yana Işınla
    socket.on('acceptInvite', (data) => {
        const inviterId = data.inviterId; // Davet eden
        const accepterId = socket.id;     // Kabul eden

        if (players[inviterId] && players[accepterId]) {
            // İki oyuncuyu da haritanın merkezinde aynı noktaya ışınla
            players[inviterId].x = 4; players[inviterId].z = 4;
            players[accepterId].x = 4.5; players[accepterId].z = 4.5;

            // Oyunculara yeni konumlarını bildir
            io.to(inviterId).emit('teleport', { x: 4, z: 4 });
            io.to(accepterId).emit('teleport', { x: 4.5, z: 4.5 });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Ayrıldı: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        io.emit('currentPlayers', players); // Listeyi güncelle
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`KRBT Sunucusu Aktif!`);
});