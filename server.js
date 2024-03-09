import express from "express";
import path from "path";
import {createServer} from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import sqlite3 from 'sqlite3';
import {open} from 'sqlite';
import fs from "fs/promises";
import jwt from "jsonwebtoken";

const db = await open({
    filename: 'busfahrer.db',
    driver: sqlite3.Database
});

db.run('PRAGMA foreign_keys = ON;', (err) => {
    if(err) {
        console.error('Error enabling foreign key constraints:', err.message);
    } else {
        console.log('Foreign key constraints enabled successfully.');
    }
});

//Create Database Tables
await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE,
        password TEXT,
        icon TEXT,
        numbGames INTEGER,
        numbBusfahrer INTERGER,
        givenSchluck INTEGER,
        recievedSchluck INTEGER,
        selfSchluck INTEGER,
        numbEx INTEGER
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roomKey TEXT UNIQUE,
        roomName TEXT,
        state INTEGER
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS lobbys (
        roomkey TEXT,
        playerId INTEGER,
        username TEXT,
        gender INTEGER,
        creator INTEGER,
        watch INTEGER,
        busfahrer INTEGER,
        exen INTEGER,
        FOREIGN KEY (roomkey) REFERENCES rooms(roomKey),
        FOREIGN KEY (playerId) REFERENCES players(id)
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
        roomkey TEXT,
        playerId INTEGER,
        cards TEXT,
        FOREIGN KEY (roomkey) REFERENCES rooms(roomKey),
        FOREIGN KEY (playerId) REFERENCES players(id)
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS phase1 (
        roomkey TEXT,
        rowId INTEGER,
        rowFlipped INTEGER,
        currPlayer INTEGER,
        currScore INTEGER,
        cards TEXT,
        FOREIGN KEY (roomkey) REFERENCES rooms(roomKey)
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS phase2 (
        roomkey TEXT,
        currId INTEGER,
        currPlayer INTEGER,
        currScore INTEGER,
        hasCount INTEGER,
        countMan INTEGER,
        countWom INTEGER,
        countAll INTEGER,
        cards1 TEXT,
        cards2 TEXT,
        cards3 TEXT,
        FOREIGN KEY (roomkey) REFERENCES rooms(roomKey)
    );
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS phase3 (
        roomkey TEXT,
        currIdx INTEGER,
        cards TEXT,
        cardOrder TEXT,
        FOREIGN KEY (roomkey) REFERENCES rooms(roomKey)
    );
`);

const app = express();

const jwtSecretKey = "Neger";

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    },
    connectionStateRecovery: {}
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'menu.html'));
});

const game = [];

app.get('/account', (req, res) => {
    res.sendFile(join(__dirname, 'account.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

app.get('/create', (req, res) => {
    res.sendFile(join(__dirname, 'createGame.html'));
});

app.get('/games', (req, res) => {
    res.sendFile(join(__dirname, 'games.html'));
});

app.get('/join', (req, res) => {
    res.sendFile(join(__dirname, 'joinGame.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(join(__dirname, 'lobby.html'));
});

app.get('/phase1', (req, res) => {
    res.sendFile(join(__dirname, 'phase1.html'));
});

app.get('/phase2', (req, res) => {
    res.sendFile(join(__dirname, 'phase2.html'));
});

app.get('/phase3', (req, res) => {
    res.sendFile(join(__dirname, 'phase3.html'));
})

function generateUserToken(userId) {
    var data = {time:Date(), id:userId};
    var token = jwt.sign(data,jwtSecretKey);
    return token;
}

function generateRoomToken(userId, roomkey) {
    var data = {time:Date(), id:userId, room:roomkey};
    var token = jwt.sign(data,jwtSecretKey);
    return token;
}

function isTokenValid(token) {
    var verify = jwt.verify(token,jwtSecretKey);
    if(verify) {
        return true;
    }
    return false;
}

function getUserToken(token) {
    var verify = jwt.verify(token,jwtSecretKey);
    if(verify) {
        return verify.id;
    }
    return -1;
}

function getRoomToken(token) {
    var verify = jwt.verify(token,jwtSecretKey);
    if(verify) {
        return verify;
    }
    return -1;
}

async function getPlayers(roomkey) {
    let players = db.all("SELECT username, gender, creator FROM lobbys where roomkey = ?", [roomkey]);
    return players;
}

async function getRooms() {
    let rooms = db.all("SELECT roomKey, roomName, state FROM rooms");
    return rooms;
}

async function updateGames() {
    let rooms = await getRooms();
    console.log(rooms);

    io.emit('setGames', rooms);
}

export async function getCards() {
    try {

    let data = JSON.parse(await fs.readFile(new URL("data/cards.json", import.meta.url), "utf8"));
    let cards = [...data, ...data];

    cards = shuffleCards(cards);

    return cards;

    } catch(e) {
        console.error("Error reading JSON File: " + e.message);
        return null;
    }
}

function shuffleCards(cards) {
    let curr = cards.length,
        rand,
        tmp;

    while(curr !== 0) {
        rand = Math.floor(Math.random() * curr);
        curr -= 1;
        tmp = cards[curr];
        cards[curr] = cards[rand];
        cards[rand] = tmp;
    }

    return cards;
}

function generatePhase1(cards) {
    let idx = 0;
    let phase = "";
    while(idx < 15) {
        phase += cards[idx].name + "_" + cards[idx].type + ";"
        idx += 1;
    }

    return phase;
}

function removeCard(token, id, sock, currRow) {
    db.each('SELECT cards FROM cards WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
        var cards = row.cards.split(';');
        var idx = Number(id);
        let ret = "";

        cards[idx] = "";

        cards.forEach(card => {
            if(card != '') {
                ret += card + ";";
            }
        });

        db.run('UPDATE cards SET cards = ? WHERE roomkey = ? AND playerId = ?', [ret, token.room, token.id]);

        io.to(sock).emit('layCard', currRow, id, token);
    });
}

function getCardSum(cards, type) {
    let ret = [];
    let nCards = "";
    let lCard = "";
    let idx = 0;
    let sum = 0;
    
    switch(type) {
        case 0:
            for(let card of cards) {
                let numb = Number(card[0]);
                if(numb < 11) {
                    sum += numb;
                    lCard = "" + card[0] + card[1];
                } else {
                    nCards += card[0] + "_" + card[1] + ";";
                    idx += 1;
                }
            }
            break;
        case 1:
            
            break;
        case 2:

            break;
    }

    ret[0] = sum;
    ret[1] = nCards;
    ret[2] = lCard;
    return ret;
}

io.on('connection', async (socket) => {
    console.log("A user connected: " + socket.id);

    //Token
    socket.on('getToken', (token, callback) => {
        var ret = getUserToken(token);

        io.to(socket.id).emit('setToken', ret);
        callback();
    });

    socket.on('getRoom', (token, callback) => {
        var ret = getRoomToken(token);

        io.to(socket.id).emit('setRoom', ret);
        callback();
    });

    socket.on('connectRoom', (token, callback) => {
        var ret = getRoomToken(token);

        socket.join(ret.room);
        callback();
    });

    //Menu Section
    socket.on('chat message', async(msg, clientOffset, callback) => {
        let result;

        try {
            result = await db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', msg, clientOffset);
        } catch(e) {
            if(e.errno === 19) {
                callback();
            }
            return;
        }
        io.emit('chat message', msg, result.lastID);
        callback();
    });

    socket.on('remove message', async(callback) => {
        let res;

        try {;
            res = await db.run('DELETE FROM messages WHERE id=(SELECT id FROM messages ORDER BY id ASC LIMIT 1)');;
        } catch(e) {
            if(e.errno === 19) {
                console.log("Error");
                callback();
            }
            return;
        }
        callback();
    });

    //Account Section
    socket.on('checkRegister', async (name, password, id, callback) => {
        let error = 0;
        let result;
        var token;

        await db.each('SELECT id FROM players WHERE login = ?', [name], (err, row) => {
            error = -1;
        });

        if(error < 0) {
            io.to(id).emit('registerError', "Name is already taken");
            callback();
            return;
        }

        result = await db.run('INSERT INTO players (login, password, numbGames, numbBusfahrer, givenSchluck, recievedSchluck, selfSchluck, numbEx) VALUES (?, ?,0,0,0,0,0,0)', name, password);

        token = generateUserToken(result.lastID);

        io.to(id).emit('registerSuccess', token);

        callback();
    });

    socket.on('checkSignIn', async (name, password, id, callback) => {
        let error = -1;
        let acc;
        var token;

        await db.each('SELECT id FROM players WHERE login = ? AND password = ?', [name, password],(err, row) => {
            error = 0;
            token = generateUserToken(row.id);
        });

        if(error < 0) {
            io.to(id).emit('signInError', "Name or Password are incorrect");
            callback();
            return;
        }

        io.to(id).emit('signInSuccess', token);
        callback();
    });

    socket.on('getAccount', async (accId, callback) => {
        console.log("Get Statistic");
        await db.each('SELECT login, numbGames, numbBusfahrer, givenSchluck, recievedSchluck, selfSchluck, numbEx FROM players WHERE id = ?', [accId], (err,row) => {
            io.to(socket.id).emit('setAccount', row);
        });
        callback();
        return;
    });

    //Creation Section
    socket.on('createRoom', async (roomKey, user, state, callback) => {
        let result;

        try {
            result = await db.run('INSERT INTO rooms (roomkey, roomName, state) VALUES (?, ?, ?)', roomKey, roomKey, state);
        } catch(e) {
            if(e.errno === 19) {
                callback();
            }
            console.log("Error creating Room");
            return;
        }
        console.log("Room created: " + roomKey);
        
        var token = generateRoomToken(getUserToken(user), roomKey);
        io.to(socket.id).emit('roomCreated', token);
        updateGames();
        callback();
    });

    //Join Section
    socket.on('updateGames', async (callback) => {
        updateGames();
        callback();
    });

    socket.on('joinGame', async (roomKey, user, watch, callback) => {
        var token = generateRoomToken(getUserToken(user), roomKey);
        io.to(socket.id).emit('joinedGame', token);
        callback();
    });

    //Lobby Section
    socket.on('joinRoom', async (token, playerName, gender, creator, watch, callback) => {
        let error = -1;
        let result;

        await db.each('SELECT roomKey FROM rooms WHERE roomKey = ?', [token.room], (err, row) => {
            error = 0;
        });

        if(error < 0) {
            console.log("Room does not exist");
            callback();
            return;
        }
        
        try {
            result = await db.run('INSERT INTO lobbys (roomkey, playerId, username, gender, creator, watch) VALUES (?, ?, ?, ?, ?, ?)', token.room, token.id, playerName, gender, creator, watch);
        } catch(e) {
            if(e.errno === 19) {
                callback();
            }
            console.log("Error joining Room: " + e.msg);
            return;
        }
        
        socket.join(token.room);

        io.to(token.room).emit('playerJoined');

        console.log("Joined Room " + token.room + " with the name " + playerName);
        callback();
    });

    socket.on('updateLobby', async(roomKey, callback) => {
        let players = await getPlayers(roomKey);
        console.log(players);

        io.to(roomKey).emit('changeLobby', players);
        callback();
    });

    //General Section
    socket.on('checkCreator', async(room, callback) => {
        var token = getRoomToken(room);

        await db.each('SELECT creator FROM lobbys WHERE playerId = ? AND roomkey = ?', [token.id, token.room], (err, row) => {
            io.to(socket.id).emit('getCreator', row.creator);
        });
        callback();
    });

    socket.on('setNextPlayer', async (user, callback) => {
        var token = getRoomToken(user);
        var first = 0;
        var next = false;

        await db.each('SELECT COUNT(playerId) max FROM lobbys WHERE roomkey = ?', [token.room], (err, row) => {
            var cnt = 0;

            db.each('SELECT playerId FROM lobbys WHERE roomkey = ?', [token.room], (err, res) => {
                if(next === true) {
                    io.to(token.room).emit('getNextPlayer', res.playerId);
                    callback();
                    return;
                }

                if(first === 0) {
                    first = res.playerId;
                }
                
                if(res.playerId === token.id) {
                    next = true;
                }

                cnt += 1;

                if(cnt === row.max) {
                    io.to(token.room).emit('getFirstPlayer');

                    db.each('SELECT currPlayer, currScore FROM phase1 WHERE roomkey = ?', [token.room], (err, row) => {
                        db.run('UPDATE players SET givenSchluck = givenSchluck + ? WHERE id = ?', [row.currScore, row.currPlayer]);
                        db.run('UPDATE phase1 SET currPlayer = ?, currScore = 0 WHERE roomkey = ?', [first, token.room]);
                    });

                    callback();
                }
            });
        });

        callback();
    });

    socket.on('isNext', async (token, id, callback) => {
        var ret = getRoomToken(token);

        if(ret.id === id) {
            await db.each('SELECT currPlayer, currScore FROM phase1 WHERE roomkey = ?', [ret.room], (err, row) => {
                db.run('UPDATE players SET givenSchluck = givenSchluck + ? WHERE id = ?', [row.currScore, row.currPlayer]);
                db.run('UPDATE phase1 SET currPlayer = ?, currScore = 0 WHERE roomkey = ?', [ret.id, ret.room]);
            });

            io.to(socket.id).emit('checkNextPlayer');
        }

        callback();
    });

    //Phase 1 Section

    socket.on('createCards', async(user, callback) => {
        var token = getRoomToken(user);

        let cards = await getCards();
        let playerC;

        await db.each('SELECT playerId FROM lobbys WHERE roomkey = ?', [token.room], (err, row) => {
            playerC = "";
            let tmp = 0;

            cards = shuffleCards(cards);

            while(tmp < 10) {
                playerC += cards[tmp].name + "_" + cards[tmp].type + ";"
                tmp += 1;
            }

            cards.splice(1, 10);

            db.run('INSERT INTO cards (roomkey, playerId, cards) VALUES (?, ?, ?)', token.room, row.playerId, playerC);
            
            //Player Statistics
            db.run('UPDATE players SET numbGames = numbGames + 1 WHERE id = ?', [row.playerId]);
        });

        console.log("Created Cards for Players");

        cards = await getCards();
        let phaseC = generatePhase1(cards);

        await db.run('INSERT INTO phase1 (roomkey, rowId, rowFlipped, currPlayer, currScore, cards) VALUES (?, ?, ?, ?, ?, ?)', token.room, 0, 0, token.id, 0, phaseC);
        console.log("Deal Phase 1 Cards");

        io.to(token.room).emit('generatedCards');

        callback();
    });

    socket.on('updateCards', async(token, callback) => {
        var ret = [];

        await db.each('SELECT cards FROM cards WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
            var playerC = row.cards.split(';');
            var idx = 0;

            playerC.forEach(card => {
                if(card != '') {
                    let parts = card.split('_');
                    ret[idx] = ""+parts[0] + parts[1];
                    idx += 1;
                }
            });

            io.to(socket.id).emit('getCards', ret);
            callback();
        });
        console.log("Give Player Cards");

        ret = [];

        db.each('SELECT cards, rowId, rowFlipped, currPlayer, currScore FROM phase1 WHERE roomkey = ?', [token.room], (err, row) => {
            var phaseC = row.cards.split(';');
            var idx = 0;

            phaseC.forEach(card => {
                if(card != '') {
                    let parts = card.split('_');
                    ret[idx] = "assets/" + parts[0] + parts[1] + ".png";
                    idx += 1;
                }
            });
            
            io.to(socket.id).emit('getPhase1', ret, row.rowId, row.rowFlipped, row.currPlayer);

            
            db.each('SELECT username FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, row.currPlayer], (err,res) => {
                io.to(socket.id).emit('getCount', row.currScore, res.username);
                callback();
            });

            callback();
        });
        console.log("Give Phase 1 Cards");

        callback();
    })

    socket.on('checkCurrentPlayer', (curr, user, callback) => {
        var ret = getUserToken(user);

        io.to(socket.id).emit('getCurrentPlayer', (ret === curr));
        callback();
    });

    socket.on('flipRow', async (token, row, callback) => {
        var ret = getRoomToken(token);

        await db.run('UPDATE phase1 SET rowFlipped = 1 WHERE roomkey = ?', [ret.room]);

        io.to(ret.room).emit('flippedRow', row);
        callback();
    });

    socket.on('checkCard', async (user, currRow, id, card, callback) => {
        var token = getRoomToken(user);

        await db.each('SELECT cards, currPlayer FROM phase1 WHERE roomkey = ? AND currPlayer = ?', [token.room, token.id], (err, row) => {
            var phaseC = row.cards.split(';');
            var min, max, i;

            switch(currRow) {
                case 0:
                    min = 0;
                    max = 1;
                    break;
                case 1:
                    min = 1;
                    max = 3;
                    break;
                case 2:
                    min = 3;
                    max = 6;
                    break;
                case 3:
                    min = 6;
                    max = 10;
                    break;
                case 4:
                    min = 10;
                    max = 15;
                    break;
            }

            for(i=min;i<max;i++) {
                let cardC = phaseC[i];
                if(cardC != '') {
                    let parts = cardC.split('_');
                    if(parts[0] === card) {
                        removeCard(token, id, socket.id, currRow);
                        callback();
                        break;
                    }
                }
            }

            callback();
        });

        callback();
    });

    socket.on('updateScore', async (user, row, callback) => {
        var token = getRoomToken(user);

        db.run('UPDATE phase1 SET currScore = currScore + ? WHERE roomkey = ?', [row + 1, token.room]);

        db.each('SELECT cards, rowId, rowFlipped, currPlayer, currScore FROM phase1 WHERE roomkey = ?', [token.room], (err, row) => {
            db.each('SELECT username FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, row.currPlayer], (err,res) => {
                io.to(token.room).emit('getCount', row.currScore, res.username);
                callback();
            });
        });

        callback();
    })

    socket.on('setCurrentRow', async (user, callback) => {
        var token = getRoomToken(user);

        db.run('UPDATE phase1 SET rowId = rowId + 1 WHERE roomkey = ?', [token.room]);

        await db.each('SELECT rowId FROM phase1 WHERE roomkey = ?', [token.room], (err, row) => {
            io.to(token.room).emit('getCurrentRow', row.rowId);
            callback();
        });

        callback();
    })

    socket.on('calculateBusfahrer', async(user, callback) => {
        console.log("Calculate Busfahrer");
        var token = getRoomToken(user);

        let busfahrer = "";
        let curr = 0;

        await db.each('SELECT cards, playerId FROM cards WHERE roomkey = ?', [token.room], (err, row) => {
            let playerC = row.cards.split(';');
            let sum = playerC.length - 1;
            if(sum === curr) {
                busfahrer += ";" + row.playerId;
            }
            
            if(sum > curr) {
                busfahrer = row.playerId + "";

                curr = sum;
            }
        });

        let players = busfahrer.split(";");
        for(let player of players) { 
            if(player != '') {
                db.run('UPDATE lobbys SET busfahrer = 1 WHERE roomkey = ? AND playerId = ?', [token.room, player]);
                db.run('UPDATE players SET numbBusfahrer = numbBusfahrer + 1 WHERE id = ?', [player]);
            }
        }

        callback();
    });

    //Phase 2 Section

    socket.on('createCardsPhase2', async(user, callback) => {
        var token = getRoomToken(user);

        await db.run('INSERT INTO phase2 (roomkey, currId, currPlayer, currScore, hasCount, countMan, countWom, countAll, cards1, cards2, cards3) VALUES (?, 0, ?, 0, 0, 0, 0, 0, "", "", "")', [token.room, token.id]);
        
        io.to(token.room).emit('getBusfahrer');
        
        callback();
    });

    socket.on('updateCardsPhase2', async(token, callback) => {
        var ret = [];
        var bus = "";
        
        await db.each('SELECT username FROM lobbys WHERE roomkey = ? AND busfahrer = 1', [token.room], (err, row) => {
            if(bus === "") {
                bus = row.username;
            } else {
                bus += " & " + row.username;
            }
        })
        io.to(socket.id).emit('setBusfahrer', bus);

        await db.each('SELECT cards FROM cards WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
            var playerC = row.cards.split(';');
            var idx = 0;

            playerC.forEach(card => {
                if(card != '') {
                    let parts = card.split('_');
                    ret[idx] = ""+parts[0] + parts[1];
                    idx += 1;
                }
            });

            io.to(socket.id).emit('getCards', ret);
            callback();
        });

        await db.each('SELECT currScore, currPlayer, currId, hasCount, countMan, countWom, countAll FROM phase2 WHERE roomkey = ?', [token.room], (err, row) => {
            if(row.currId === 0) {
                db.each('SELECT username FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, row.currPlayer], (err, res) => {
                    io.to(socket.id).emit('updatedScore', res.username, row.currScore);
                    callback();
                });
            } else if(row.currId < 3) {
                db.each('SELECT username, gender FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, res) => {
                    io.to(socket.id).emit('setCourt', res.username, res.gender, row.countMan, row.countWom, row.countAll);
                    callback();
                });
            } else {
                db.each('SELECT username, gender, exen FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, res) => {
                    io.to(socket.id).emit('setEx', res.username, res.exen);
                    callback();
                });
            }

            if(token.id === row.currPlayer && row.hasCount === 1) {
                io.to(socket.id).emit('counted');
            }

            if(token.id != row.currPlayer) {
                io.to(socket.id)
            }

            io.to(socket.id).emit('updateType', row.currId);
        });

        await db.each('SELECT cards1, cards2, cards3, currPlayer FROM phase2 WHERE roomkey = ?', [token.room], (err, row) => {
            let cards = [row.cards1, row.cards2, row.cards3];
            io.to(socket.id).emit('updateTypes', cards, row.currPlayer);
            callback();
        });

        callback();
    });

    socket.on('countCards', async(user, type, callback) => {
        var token = getRoomToken(user);

        await db.each('SELECT cards FROM cards WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
            let playerC = row.cards.split(';');
            let ret = [];
            let idx = 0;

            playerC.forEach(card => {
                if(card != '') {
                    let parts = card.split('_');
                    ret[idx] = parts;
                    idx += 1;
                }
            });

            let nRet = getCardSum(ret, type);

            db.run('UPDATE players SET selfSchluck = selfSchluck + ? WHERE id = ?', [nRet[0], token.id]);
            db.run('UPDATE cards SET cards = ? WHERE roomkey = ? AND playerId = ?', [nRet[1], token.room, token.id]);

            if(nRet[2] != "") {
                db.run('UPDATE phase2 SET currScore = ?, cards1 = ?, hasCount = 1 WHERE roomkey = ?', [nRet[0], nRet[2], token.room]);
            }

            io.to(token.room).emit('cardsChanged', token);
            callback();
        });
        callback();
    });

    socket.on('setNextCount', async(user, callback) => {
        var token = getRoomToken(user);
        var next = false;
        var first = 0;

        await db.each('SELECT COUNT(playerId) max FROM lobbys WHERE roomkey = ?', [token.room], (err, row) => {
            var cnt = 0;

            db.each('SELECT playerId FROM lobbys WHERE roomkey = ?', [token.room], (err, res) => {
                if(next === true) {
                    io.to(token.room).emit('getNextCount', res.playerId);
                    callback();
                    return;
                }

                if(first === 0) {
                    first = res.playerId;
                }
                
                if(res.playerId === token.id) {
                    next = true;
                }

                cnt += 1;

                if(cnt === row.max) {
                    io.to(token.room).emit('getFirstPlayer');

                    db.run('UPDATE phase2 SET currPlayer = ?, currScore = 0, hasCount = 0, currId = currId + 1 WHERE roomkey = ?', [first, token.room]);

                    io.to(token.room).emit('setAllScore');

                    callback();
                }
            });
        });

        callback();
    });

    socket.on('getAllScore', async (user, callback) => {
        var token = getRoomToken(user);

        db.each('SELECT username, gender FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, res) => {
            io.to(socket.id).emit('setCourt', res.username, res.gender, 0, 0, 0);
            callback();
        });

        callback();
    });

    socket.on('updateCountScore', async (user, callback) => {
        var token = getRoomToken(user);

        db.each('SELECT currPlayer, currScore FROM phase2 WHERE roomkey = ?', [token.room], (err, row) => {
            db.each('SELECT username FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, row.currPlayer], (err,res) => {
                io.to(token.room).emit('updatedScore', res.username, row.currScore);
                callback();
            });
        });

        callback();
    });

    socket.on('isNextCount', async (token, id, callback) => {
        var ret = getRoomToken(token);

        if(ret.id === id) {
            db.run('UPDATE phase2 SET currPlayer = ?, currScore = 0, hasCount = 0 WHERE roomkey = ?', [ret.id, ret.room]);

            io.to(socket.id).emit('checkNextCount');
        }

        callback();
    });

    socket.on('countCourtCards', async (user, callback) => {
        var token = getRoomToken(user);
        var all = 0;
        var wom = 0;
        var man = 0;
        let players = [];
        let idx = 0;
        let lCard = "";

        try {
            let rows = await db.all('SELECT cards, playerId FROM cards WHERE roomkey = ?', [token.room]);

            for(let row of rows) {
                let playerC = row.cards.split(';');
                let ret = "";

                playerC.forEach(card => {
                    if(card != '') {
                        let parts = card.split('_');

                        var numb = Number(parts[0]);

                        switch(numb) {
                            case 11:
                                man += 1;
                                lCard = parts[0] + parts[1] + ""; 
                                break;
                            case 12:
                                wom += 1;
                                lCard = parts[0] + parts[1] + "";
                                break;
                            case 13:
                                all += 1;
                                lCard = parts[0] + parts[1] + "";
                                break;
                            case 14:
                                ret += card + ";";
                                break;
                        }
                    }
                });

                db.run('UPDATE cards SET cards = ? WHERE roomkey = ? AND playerId = ?', [ret, token.room, row.playerId]);
                if(lCard != "") {
                    db.run('UPDATE phase2 SET cards2 = ? WHERE roomkey = ?', [lCard, token.room]);
                }
                players[idx] = row.playerId;
                idx += 1;
            }

            for(let player of players) {
                io.to(token.room).emit('updateCourtScore', player, man, wom, all)
            }

            await db.run('UPDATE phase2 SET countMan = ?, countWom = ?, countAll = ? WHERE roomkey = ?', [man, wom, all, token.room]);

        } catch(e) {
            console.log(e);
        }

        callback();
    });

    socket.on('checkCourt', async (user, player, man, wom, all, callback) => {
        var token = getRoomToken(user);

        if(token.id === player) {
            await db.each('SELECT gender, username FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
                io.to(socket.id).emit('setCourt', row.username, row.gender, man, wom, all);
            });
            callback();
        }

        callback();
    });

    socket.on('getCurrType', async (user, callback) => {
        var token = getRoomToken(user);

        await db.each('SELECT currId FROM phase2 WHERE roomkey = ?', [token.room], (err, row) => {
            io.to(socket.id).emit('setCurrType', row.currId);
            callback();
        });

        callback();
    });

    socket.on('updatePhaseCards', async(user, callback) => {
        var token = getRoomToken(user);
        var ret = [];

        await db.each('SELECT cards FROM cards WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
            var playerC = row.cards.split(';');
            var idx = 0;

            playerC.forEach(card => {
                if(card != '') {
                    let parts = card.split('_');
                    ret[idx] = ""+parts[0] + parts[1];
                    idx += 1;
                }
            });

            io.to(socket.id).emit('getCards', ret);
            callback();
        });

        await db.each('SELECT cards1, cards2, cards3, currPlayer FROM phase2 WHERE roomkey = ?', [token.room], (err, row) => {
            let cards = [row.cards1, row.cards2, row.cards3];
            io.to(socket.id).emit('updateTypes', cards, row.currPlayer);
            callback();
        });

        callback();
    });

    socket.on('nextType', async (user, callback) => {
        var token = getRoomToken(user);

        await db.run('UPDATE phase2 SET currId = currId + 1 WHERE roomkey = ?', [token.room]);

        await db.each('SELECT currId FROM phase2 WHERE roomkey = ?', [token.room], (err, row) => {
            io.to(socket.id).emit('setCurrType', row.currId);
        });

        callback();
    });

    socket.on('countEx', async (user, callback) => {
        var token = getRoomToken(user);

        let players = [];
        let idx = 0;
        let lCard = "";

        try {
            let rows = await db.all('SELECT cards, playerId FROM cards WHERE roomkey = ?', [token.room]);

            for(let row of rows) {
                let playerC = row.cards.split(';');
                let ex = false;

                playerC.forEach(card => {
                    if(card != '') {
                        let parts = card.split('_');
                        ex = true;
                        lCard = parts[0] + parts[1] + "";
                    }
                });

                db.run('UPDATE cards SET cards = "" WHERE roomkey = ? AND playerId = ?', [token.room, row.playerId]);
                if(lCard != "") {
                    db.run('UPDATE phase2 SET cards3 = ? WHERE roomkey = ?', [lCard, token.room]);
                }

                if(ex) {
                    db.run('UPDATE players SET numbEx = numbEx + 1 WHERE id = ?', [row.playerId]);
                }

                players[idx] = [];
                players[idx][0] = row.playerId;
                players[idx][1] = ex;
                idx += 1;
            }

            for(let player of players) {
                io.to(token.room).emit('updateEx', player[0], player[1]);
            }
        } catch(e) {
            console.log(e);
        }

        callback();
    });

    socket.on('checkEx', async(user, player, ex, callback) => {
        var token = getRoomToken(user);

        if(token.id === player) {
            await db.each('SELECT username FROM lobbys WHERE roomkey = ? AND playerId = ?', [token.room, token.id], (err, row) => {
                io.to(socket.id).emit('setEx', row.username, ex);
            });

            await db.run('UPDATE lobbys SET exen = ? WHERE roomkey = ? AND playerId = ?', [ex, token.room, token.id]);

            callback();
        }

        callback();
    });

    //Phase 3 Section

    socket.on('createCardsPhase3', async (user, callback) => {
        var token = getRoomToken(user);

        let cards = await getCards();
        cards = shuffleCards(cards);
        cards = shuffleCards(cards);

        let phase = "";
        let idx = 0;

        while(idx < 27) {
            phase += cards[idx].name + "_" + cards[idx].type + ";"
            idx += 1;
        }

        await db.run('INSERT INTO phase3 (roomkey, currIdx, cards, cardOrder) VALUES (?, 0, ?, "")', [token.room, phase]);

        io.to(token.room).emit('generatedPhase3');

        callback();
    });

    socket.on('updatePhase3', async (token, callback) => {
        var bus = "";
        
        await db.each('SELECT username FROM lobbys WHERE roomkey = ? AND busfahrer = 1', [token.room], (err, row) => {
            if(bus === "") {
                bus = row.username;
            } else {
                bus += " & " + row.username;
            }
        })
        io.to(socket.id).emit('setBusfahrer', bus);

        let ret = [];

        db.each('SELECT cards, cardOrder, currIdx FROM phase3 WHERE roomkey = ?', [token.room], (err, row) => {
            var phaseC = row.cards.split(';');
            var order = row.cardOrder.split(';');
            var idx = 0;

            phaseC.forEach(card => {
                if(card != '') {
                    let parts = card.split('_');
                    ret[idx] = "assets/" + parts[0] + parts[1] + ".png";
                    idx += 1;
                }
            });
            
            io.to(socket.id).emit('getPhase3', ret, order, row.currIdx);
            callback();
        });

        callback();
    });

    socket.on('resetCardsPhase3', async (user, callback) => {
        var token = getRoomToken(user);

        let cards = await getCards();
        cards = shuffleCards(cards);
        cards = shuffleCards(cards);

        let phase = "";
        let idx = 0;

        while(idx < 27) {
            phase += cards[idx].name + "_" + cards[idx].type + ";"
            idx += 1;
        }

        await db.run('UPDATE phase3 SET cards = ?, cardOrder = "", currIdx = 8 WHERE roomkey = ?', [phase, token.room]);

        io.to(token.room).emit('resetedPhase', token);

        callback();
    });

    socket.on('flipCard', async (user, idx, callback) => {
        var token = getRoomToken(user);

        await db.each('SELECT cardOrder FROM phase3 WHERE roomkey = ?', [token.room], (err, row) => {
            var card = row.cardOrder + "" + idx + ";";

            db.run('UPDATE phase3 SET cardOrder = ?, currIdx = currIdx - 1 WHERE roomkey = ?', [card, token.room]);
        });

        io.to(token.room).emit('setFlipped', idx);
        callback();
    })

    //Recover Session
    if(!socket.recovered) {
        try {
            await db.each('SELECT id, content FROM messages WHERE id > ?',
            [socket.handshake.auth.serverOffset || 0],
            (_err, row) => {
              socket.emit('chat message', row.content, row.id);
            }
          )
        } catch(e) {

        }
    }

});

server.listen(3000, () => {
    console.log('Server is running at http://localhost:3000');
});