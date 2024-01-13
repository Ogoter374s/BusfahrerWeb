import express from "express";
import {createServer} from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import fs from "fs/promises";

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

const game = [];

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log("A user connected");
    socket.on('createRoom', (roomKey, playerName, gender) => {
        let room = [];
        let players = [];
        let player = [];

        socket.join(roomKey);
        room.push(roomKey)
        player.push(playerName);
        player.push(gender);

        socket.emit('roomCreated', roomKey, players);
        console.log("Room " + roomKey + " created and User " + playerName + " joined");

        players.push(player);
        room.push(players);
        game.push(room);
    });

    socket.on('joinRoom', (roomKey, playerName, gender) => {
        let room = findRoom(roomKey);
        let ret = [];

        if(!room) {
            ret = [-1, "Room does not exist"];
        } 
        else {
            ret = checkPlayer(playerName, room[1]);

            if(ret[0] < 0) {
                socket.emit('errPlayer', ret[1]);
            } 
            else {
                let players = room[1];
                let player = [];

                socket.join(roomKey);
                player.push(playerName);
                player.push(gender);
                players.push(player);
                socket.emit('roomJoined', roomKey, players);
                
                io.to(roomKey).emit('playerJoined', players);

                console.log("Joined Room " + roomKey + " with the name " + player[0] + " with gender " + player[1]);
            }
        }
    });

    socket.on('startGame', async (roomKey) => {
        let room = findRoom(roomKey);
        
        if(!room) {
            console.log("Room does not exist");
            return;
        }
        
        let cards = await getCards();

        //Generate Player Cards
        let players = room[1];
        for(let player of players) {
            let currCards = [];
            cards = shuffleCards(cards);
            let tmp = 0;
            while(tmp < 10) {
                currCards.push(cards[tmp]);
                tmp += 1;
            }
            cards.splice(1, 10);
            player.push(currCards);
        }
        io.to(roomKey).emit('setCards', players);

        console.log("Dealing Cards to Players");
        
        //Generate Phase 1 Cards
        cards = await getCards();
        let phase1 = [0];

        let phase1Cards = generatePhase1(cards);

        io.to(roomKey).emit('setPhase1', cards);
        console.log("Deal Phase 1 Cards");
        phase1.push(phase1Cards);
        room.push(phase1);
    });

    socket.on('getNextPlayer', (roomkey) => {
        let room = findRoom(roomkey);
        let players = room[1];

        let curr = room[2][0];
        let next;
        
        if(curr+1 < players.length) {
            next = players[curr+1];
            room[2][0] = curr+1;
        } 
        else {
            curr = 0;
            next = players[curr];
            room[2][0] = 0;
        }

        io.to(roomkey).emit('setNextPlayer', next[0]);
    });

    socket.on('nextPhase1Row', (roomKey, idx) => {
        io.to(roomKey).emit('flipPhase1Row', idx);
    });

    socket.on('checkRow', (roomkey, rowIdx, cardName, cardId, playerName) => {
        let room = findRoom(roomkey);
        let players = room[1];
        let phase1 = room[2][1];

        let idxs = getPhase1Idx(rowIdx);
        for(let idx of idxs) {
            if(phase1[idx].name == cardName) {
                markCard(players, phase1[idx], playerName);
                io.to(roomkey).emit('layCard', true, cardId);
                return;
            }
        }

        io.to(roomkey).emit('layCard', false, cardId);
        
    });

    socket.on('showScore', (roomkey, score) => {
        io.to(roomkey).emit('updateScore', score);
    });

    socket.on('startPhase2', (roomKey) => {
        console.log("Initialize Phase 2");
        let room = findRoom(roomKey);
        let players = room[1];

        io.to(roomKey).emit('setPhase2', players);

        let phase2 = [1,0,0,0];

        room.push(phase2);
    });

    socket.on('getBusfahrer', (roomKey) => {
        console.log("Calculating Busfahrer");
        let room = findRoom(roomKey);
        let players = room[1];

        let name = "";
        let max = 0;

        for(let player of players) {
            let cnt = 0;
            for(let card of player[2]) {
                if(card.type != "X") {
                    cnt += 1;
                }
            }

            if(cnt >= max) {
                if(cnt == max) {
                    name += " & ";
                } 
                else {
                    name = "";
                }
                name += player[0];
                max = cnt;
            }
        }

        cleanUp(players);

        io.to(roomKey).emit('setBusfahrer', name);
    });

    socket.on('countCards', (roomKey, name, type) => {
        console.log("Count Cards");
        let room = findRoom(roomKey);
        let player = findPlayer(room[1], name);
        let phase2 = room[3];

        let score = 0;
        
        switch(type) {
            case 0:
                for(let card of player[2]) {
                    let numb = parseFloat(card.name);
                    if(numb <= 10) {
                        io.to(roomKey).emit('giveCard', card, type);
                        score += numb;
                        card.imgage = "X";
                    }
                }
                break;
            case 2:
                for(let card of player[2]) {
                    let numb = parseFloat(card.name);
                    if(numb == 14) {
                        io.to(roomKey).emit('giveCard', card, type);
                        score = -1;
                        card.imgage = "X";
                    }
                }
                break;
        }

        cleanUp(room[1]);

        if(type == 2) {
            if(score != -1) {
                io.to(roomKey).emit('setLastCount', player[0], player[1], false);
            } else {
                io.to(roomKey).emit('setLastCount', player[0], player[1], true);
            }
        } else {
            io.to(roomKey).emit('updateScore', score);
        }

        io.to(roomKey).emit('clearCards', player[0], type);
    });

    socket.on('getNextCount', (roomKey) => {
        console.log("Next Player");
        let room = findRoom(roomKey);
        let players = room[1];
        let idx = room[3][0];
        let ret = "";
        let gender = "";

        if(idx+1 > players.length) {
            idx = 0;
            ret = players[idx][0];
            gender = players[idx][1];
            idx += 1;
            room[3][0] = idx;
        } 
        else {
            ret = players[idx][0];
            gender = players[idx][1];
            idx += 1;
            room[3][0] = idx;
        }

        io.to(roomKey).emit('setNextCount', ret, gender);
    });

    socket.on('countCourtCard', (roomKey) => {
        console.log("Count Court Cards");
        let room = findRoom(roomKey);
        let players = room[1];
        let phase2 = room[3];

        for(let player of players) {
            let cards = player[2];

            console.log(cards);
            for(let card of cards) {
                let found = false;
                let numb = parseFloat(card.name);
                console.log("Card Number: " + numb);
                switch(numb) {
                    case 11:
                        phase2[1] += 1;
                        found = true;
                    break;
                    case 12:
                        phase2[2] += 1;
                        found = true;
                        break;
                    case 13:
                        phase2[3] += 1;
                        found = true;
                        break;
                    case 14:
                        break;
                }

                if(found) {
                    io.to(roomKey).emit('giveCard', card, 1);
                    card.imgage = "X";
                }
            }
            io.to(roomKey).emit('clearCards', player[0], 1);
        }

        console.log(phase2);

        let ret = calculateScore(phase2);
        cleanUp(room[1]);

        io.to(roomKey).emit('updateCourtScore', ret);
    });

    socket.on('setSelfDesc', (roomKey) => {
        io.to(roomKey).emit('getSelfDesc', roomKey);
    });

    socket.on('clearScore', (roomKey) => {
        io.to(roomKey).emit('setClear');
    });

    socket.on('getGender', (roomKey, name) => {
        let room = findRoom(roomKey);
        let players = room[1];

        for(let player of players) {
            if(player[0] == name) {
                console.log(room[1]);
                console.log(player);

                io.to(roomKey).emit('setGender', player[1]);
                return;
            }
        }
    })

    socket.on('startPhase3', async (roomKey) => {
        console.log("Initialize Phase 3");
        let room = findRoom(roomKey);

        io.to(roomKey).emit('setPhase3');

        let phase3 = [8];

        //Generate Phase 3 Cards
        let cards = await getCards();
        let deck3 = generatePhase3Cards(cards);

        io.to(roomKey).emit('setPhase3Cards', deck3);

        phase3.push(deck3);
        room.push(phase3);
    })

    socket.on('getReset', async (roomKey) => {
        console.log("Reset Phase 3");
        let room = findRoom(roomKey);

        let phase3 = [8];

        let cards = await getCards();
        let deck3 = generatePhase1(cards);

        console.log("Send Reset")
        io.to(roomKey).emit('setReset', cards);
        console.log("After Reset")

        phase3.push(deck3);
        room[4] = phase3;
    });

    socket.on('flipCard', (roomKey, card) => {
        io.to(roomKey).emit('setFlipped', card);
    });
});

function generatePhase3Cards(cards) {
    let ret = [];

    cards = shuffleCards(cards);
    cards = shuffleCards(cards);

    let idx = 0;
    while(idx < 27) {
        ret.push(cards[idx]);
        idx += 1;
    }

    return ret;
}

function calculateScore(phase2) {
    let ret = [];

    ret.push(phase2[1] + phase2[3]);
    ret.push(phase2[2] + phase2[3]);

    return ret
}

function cleanUp(players) {
    for(let player of players) {
        let cards = player[2];
        let tmp = [];
        for(let card of cards) {
            if(card.type != "X" && card.imgage != "X") {
                tmp.push(card);
            }
        }
        player[2] = tmp;
    }
}

function findPlayer(players, name) {
    console.log("Find player");
    for(let player of players) {
        console.log(player);
        if(player[0] == name) {
            return player;
        }
    }
    return null;
}

function markCard(players, card, name) {
    for(let player of players) {
        if(player[0] == name) {
            let cards = player[2];
            for(let tmp of cards) {
                if(tmp.name == card.name && tmp.type != "X") {
                    tmp.type = "X";
                    break;
                }
            }
            break;
        }
    }
}

function getPhase1Idx(rowIdx) {
    let ret = [0];
    switch(rowIdx) {
        case 1:
            ret = [0];
            break;
        case 2:
            ret = [1, 2];
            break;
        case 3:
            ret = [3,4,5];
            break;
        case 4:
            ret = [6,7,8,9];
            break;
        case 5:
            ret = [10, 11, 12, 13, 14];
            break;
    }
    return ret;
}

function generatePhase1(cards) {
    let idx = 0;
    let phase1 = [];
    while(idx < 15) {
        phase1.push(cards[idx]);
        idx += 1;
    }

    return phase1;
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

function findRoom(roomkey) {
    for(let room of game) {
        if(room[0] == roomkey) {
            return room;
        }
    }
    return;
}

function checkPlayer(name, players) {
    let ret = [];

    if(players.length >= 10) {
        ret = [-1, "Too many Players in Room"];
        return ret;
    }

    if(players.includes(name)) {
        ret = [-1, "Name is already taken"];
        return ret;
    }

    ret[0, "User successfully joined Room"];
    return ret;
}

server.listen(3000, () => {
    console.log('Server is running at http://167.86.102.204:3000');
});