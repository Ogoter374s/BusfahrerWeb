const socket = io();

const gridPlayers = document.querySelector(".players");
const gridCards = document.querySelector(".grid-cards");
const gridPhase1 = document.querySelector(".grid-phase1");
const gridPhase2 = document.querySelector(".grid-phase2");
const gridPhase3 = document.querySelector(".grid-phase3");

var roomKey;
var playerName;
var gender;
var creator = false;
var score = 0;

var currPlayer = false;
var currRow = 1;
let currCardCount = 10;

let currType = -1;

let currIdx = 9;

let busfahrer = false;

let phase1 = ["grid-firstRow", "grid-secondRow", "grid-thirdRow", "grid-fourthRow", "grid-fifthRow"];

document.getElementById("joinRoom").style.display = "none";
document.getElementById("errorMsg").style.display = "none";


document.getElementById("lobbyScreen").style.display = "none";
document.getElementById("actions").style.display = "none";
document.getElementById("stopGame").style.display = "none";
document.getElementById("startPhase2").style.display = "none";

document.getElementById("actionsPhase1").style.display = "none";
document.getElementById("score").style.display = "none";
document.getElementById("gridCards").style.display = "none";

document.getElementById("phase2Cont").style.display = "none";
document.getElementById("titlePhase2").style.display = "none";

document.getElementById("phase3Cont").style.display = "none";

checkInput();
updateRoomBtn();
updateNextPlayerBtn();

serverCommunication();

//------------ Start Screen ------------\\

function changeButton() {
    checkInput();
    updateRoomBtn();
}

function checkInput() {
    document.getElementById("errorMsg").style.display = "none";
    let createBtn = document.getElementById("createRoom");
    let joinBtn = document.getElementById("joinRoom");
    let inp = document.getElementById("playerName");

    if(inp.value.trim() != "") {
        if(!genderChecked()) return;

        createBtn.disabled = false;
        joinBtn.disabled = false;

        createBtn.style.backgroundColor = "#27ae60";
        joinBtn.style.backgroundColor = "#3578e4";

    } else {
        createBtn.disabled = true;
        joinBtn.disabled = true;
        
        createBtn.style.backgroundColor = "#626262";
        joinBtn.style.backgroundColor = "#626262";
    }
}

function genderChecked() {
    let male = document.getElementById("male");
    let female = document.getElementById("female");

    return male.checked || female.checked;
}

function updateRoomBtn() {
    document.getElementById("errorMsg").style.display = "none";
    let inp = document.getElementById("roomKeyInp");

    if(inp.value.trim() !== "") {
        if(!genderChecked()) return;

        document.getElementById("joinRoom").style.display = "initial";
        document.getElementById("createRoom").style.display = "none";
    } else {
        document.getElementById("joinRoom").style.display = "none";
        document.getElementById("createRoom").style.display = "initial";
    }
}

function generateRoomCode() {
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; 
    let code = "";

    for(let i=0;i<5;i++) {
        let rIdx = Math.floor(Math.random() * characters.length);
        code += characters.charAt(rIdx);
    }

    return code;
}

function getGender() {
    var btns = document.getElementsByName("gender");
    for(let btn of btns) {
        if(btn.checked) {
            return btn.value;
        }
    }

    return -1;
}

function createRoom() {
    roomKey = generateRoomCode();
    playerName = document.getElementById("playerName").value;
    gender = getGender();

    socket.emit('createRoom', roomKey, playerName, gender);

    socket.on('errPlayer', (msg) => {
        console.log(msg);
        document.getElementById("errorMsg").style.display = "inherit";
        document.getElementById("errorMsg").textContent = msg;
    });

    socket.on('roomCreated', (createdRoomKey, playerNames) => {
        console.log("Successfully created and joined room " + createdRoomKey);

        creator = true;
        lobbyScreen();

        addPlayersToGrid(playerNames);
    });
}

function joinRoom() {
    roomKey = document.getElementById("roomKeyInp").value;
    playerName = document.getElementById("playerName").value;
    gender = getGender();

    if(roomKey.length != 5) {
        document.getElementById("errorMsg").style.display = "inherit";
        document.getElementById("errorMsg").textContent = "A Roomkey is always 5 letters long";
        return;
    }

    socket.emit('joinRoom', roomKey, playerName, gender);

    socket.on('errPlayer', (msg) => {
        console.log(msg);
        document.getElementById("errorMsg").style.display = "inherit";
        document.getElementById("errorMsg").textContent = msg;
    });

    socket.on('roomJoined', (usedRoomKey, playerNames) => {
        console.log("Successfully joined room " + usedRoomKey);

        lobbyScreen();

        addPlayersToGrid(playerNames);
    });
}

//------------ Lobby Screen ------------\\

function lobbyScreen() {
    document.getElementById("settings").style.display = "none";

    document.getElementById("lobbyScreen").style.display = "inherit";
    document.getElementById("actions").style.display = "inherit";

    document.getElementById("roomKey").textContent = roomKey;

    checkIfCreator();

    socket.on('playerJoined', (playerNames) => {
        console.log("new Player Joined");
        addPlayersToGrid(playerNames)
    });
}

function checkIfCreator() {
    if(!creator) {
        document.getElementById("startGame").disabled = true;
        document.getElementById("startGame").style.backgroundColor = "#626262";
        document.getElementById("stopGame").disabled = true;
        document.getElementById("stopGame").style.backgroundColor = "#626262";
        document.getElementById("startPhase2").disabled = true;
        document.getElementById("startPhase2").style.backgroundColor = "#626262";
    }
}

function addPlayersToGrid(names) {
    gridPlayers.innerHTML = "";
    for(let name of names) {
        const element = document.createElement("span");
        element.innerHTML += `
            ${name[0]}
        `;
        gridPlayers.appendChild(element);
    }
}

//------------ Phase 1 Functions ------------\\

function startGame() {
    socket.emit('startGame', roomKey);

    if(creator) {
        currPlayer = true;
    }
    updateNextPlayerBtn();
    document.getElementById("score").innerHTML = `
        <span style="color:cyan" id="innerName">Du</span> darfst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke verteilen
    `;
}

function getCards(players) {
    for(let player of players) {
        let idx = 0;
        if(player[0] == playerName) {
            let cards = player[2];
            for(let card of cards) {

                const element = document.createElement("div");
                element.setAttribute("data-name", card.name);
                element.setAttribute("data-away", 0);
                element.setAttribute("data-gridid", idx)
                element.classList.add("cardSelf");
                element.classList.add("flipped");
                element.addEventListener("click", layDownCard);
                element.innerHTML = `
                <div class="front">
                    <img class="front-image-self" src="http://167.86.102.204/${card.image}">
                </div>
                <div class="back"></div>
                `;
                gridCards.appendChild(element);
                idx += 1;
            }
            return;
        }
    }
}

function flipRow() {
    if(creator && currPlayer) {
        if(currRow != this.dataset.row) return;
        if(!this.dataset.locked) return;

        socket.emit('nextPhase1Row', roomKey, this.dataset.row);
    }
}

function printPhase1(cards) {
    let rowSize = 1;
    let idx = 0;
    while(rowSize <= 5) {
        const element = document.createElement("div");
        element.setAttribute("data-row", rowSize);
        element.setAttribute("data-locked", 1);
        element.classList.add(phase1[rowSize-1]);

        let tmp = 0;
        while(tmp < rowSize) {
            let card = cards[idx];

            element.innerHTML += `
                <div class="card">
                <div class="front">
                    <img class="front-image" src="http://167.86.102.204/${card.image}">
                </div>
                <div class="back"></div>
                </div>
            `;
            idx+= 1;
            tmp += 1;
        }
        element.addEventListener("click", flipRow);
        gridPhase1.appendChild(element);
        rowSize += 1;
    }

    document.getElementById("innerScore").textContent = score;
}

function nextPlayer() {
    if(checkIfFlipped()) {
        socket.emit('getNextPlayer', roomKey);

        currPlayer = false;
        currRow += 1;

        score = 0;
        document.getElementById("innerScore").textContent = score;
    }
}

function nextPhase1Row(idx) {
    let cardChilds = gridPhase1.children;
    for(let child of cardChilds) {
        if(child.dataset.row == idx) {
            for(let card of child.children) {
                card.classList.add("flipped");
            }
            child.dataset.locked = 0;
            break;
        }
    }

    score = 0;
    document.getElementById("innerScore").textContent = score;
}

function updateNextPlayerBtn() {
    if(!currPlayer || currRow > 5) {
        document.getElementById("nextPlayer").style.backgroundColor = "#626262";
        document.getElementById("nextPlayer").disabled = true;
    } 
    else {
        document.getElementById("nextPlayer").style.backgroundColor = "#2ed1ee";
        document.getElementById("nextPlayer").disabled = false;
    }
}

function checkIfFlipped() {
    let cardChildern = gridPhase1.children;
    let child = cardChildern[currRow-1];
    if(child.dataset.locked = 0) {
        console.log("You have to flip the current Row");
        return false;
    }
    return true;
}

function layDownCard() {
    if(currRow == 0 || currRow == 6) return;
    if(!currPlayer) return;

    socket.emit('checkRow', roomKey, currRow, this.dataset.name, this.dataset.gridid, playerName);
}

//------------ Phase 2 Functions ------------\\

function startPhase2() {
    console.log("Start Phase 2");
    socket.emit('startPhase2', roomKey);

    currType = 0;
    
    if(creator) {
        currPlayer = true;
    }

    document.getElementById("score").innerHTML = `
        <span style="color:cyan" id="innerName">Du</span> musst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
    `;

    document.getElementById("startPhase2").style.display = "none";

    socket.emit('getBusfahrer', roomKey);

    updateCountBtn();
}

function updateCountBtn() {
    if(creator) {
        document.getElementById("count").disabled = false;
        document.getElementById("nextCount").disabled = false;
        document.getElementById("phase3").disabled = false;

        document.getElementById("count").style.backgroundColor = "goldenrod";
        document.getElementById("nextCount").style.backgroundColor = "#2ed1ee";
        document.getElementById("phase3").style.backgroundColor = "#d67d41";
    }
    else {
        document.getElementById("count").disabled = true;
        document.getElementById("nextCount").disabled = true;
        document.getElementById("phase3").disabled = true;

        document.getElementById("count").style.backgroundColor = "#626262";
        document.getElementById("nextCount").style.backgroundColor = "#626262";
        document.getElementById("phase3").style.backgroundColor = "#626262";
    }
}

function countCards() {
    console.log("Count Cards with type: " + currType);

    if(currType == -1) currType = 0;

    if(currType == 1) {
        socket.emit('countCourtCard', roomKey);
        currType += 1;

        
        document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">Du</span> musst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
        `;

        return;
    }

    if(currType > 2) {
        document.getElementById("count").style.display = "none";
        document.getElementById("phase3").style.display = "inherit";
        return;
    }

    socket.emit('countCards', roomKey, playerName, currType)

    document.getElementById("count").style.display = "none";
    document.getElementById("nextCount").style.display = "inherit";

    document.getElementById("nextCount").style.backgroundColor = "#2ed1ee";
    document.getElementById("nextCount").disabled = false;
}

function getCardName(name) {
    if(name == 11) {
        return "J";
      } else if(name == 12) {
        return "Q";
      } else if(name == 13) {
        return "K";
      } else if(name == 14) {
        return "A";
      }
      return "";
}

function nextCount() {
    socket.emit('getNextCount', roomKey);

    currPlayer = false;
    currType += 1;

    document.getElementById("nextCount").style.display = "none";
    document.getElementById("count").style.display = "inherit";

    document.getElementById("count").disabled = true;
    document.getElementById("count").style.backgroundColor = "#626262";
}

function activatePhase3Btn() {
    document.getElementById("score").style.display = "none";
    document.getElementById("count").style.display = "none";
    document.getElementById("phase3").style.display = "inherit";

    socket.emit('clearScore', roomKey);
}

//------------ Phase 3 Functions ------------\\

function startPhase3() {
    console.log("Start Phase 3");
    socket.emit('startPhase3', roomKey);

    currIdx = 9;
}

function updateResetBtn() {
    if(busfahrer) {
        document.getElementById('reset').disabled = false;
        document.getElementById('reset').style.backgroundColor = "#e15858";
    } 
    else {
        document.getElementById('reset').disabled = true;
        document.getElementById('reset').style.backgroundColor = "#626262";
    }
}

function printPhase3(cards) {
    let rowSize = 1;
    let idx = 0;
    while(rowSize <= 5) {
        
        const element = document.createElement("div");
        element.setAttribute("data-row", rowSize);

        if(rowSize == 1) {
            element.classList.add(phase1[1]);

            let card = cards[idx];
            element.innerHTML += `
                <div class="card flipped" data-idx="${idx}" onclick="">
                <div class="front">
                    <img class="front-image" src=http://167.86.102.204/${card.image}>
                </div>
                <div class="back"></div>
                </div>
            `;

            idx += 1;

            card = cards[idx];
            element.innerHTML += `
                <div class="card" data-idx="${idx}" onclick="checkCard(event)">
                <div class="front">
                    <img class="front-image" src=http://167.86.102.204/${card.image}>
                </div>
                <div class="back"></div>
                </div>
            `;

            idx += 1;

            element.style.marginLeft = "-150px";
        } 
        else {
            element.classList.add(phase1[rowSize-1]);

            let tmp = 0;
            while(tmp < rowSize) {
                let card = cards[idx];

                element.innerHTML += `
                    <div class="card" data-idx="${idx}" onclick="checkCard(event)">
                    <div class="front">
                        <img class="front-image" src=http://167.86.102.204/${card.image}>
                    </div>
                    <div class="back"></div>
                    </div>
                `;

            idx += 1;
            tmp += 1;
            }
        }

        gridPhase3.append(element);
        rowSize += 1;
    }

    rowSize = 5;
    let rec = 2;
    while(rowSize <= 8) {
        const element = document.createElement("div");
        element.setAttribute("data-row", rowSize+1);

        if(rowSize == 8) {
            element.classList.add(phase1[1]);

            let card = cards[idx];
            element.innerHTML += `
                <div class="card" data-idx="${idx}" onclick="checkCard(event)">
                <div class="front">
                    <img class="front-image" src=http://167.86.102.204/${card.image}>
                </div>
                <div class="back"></div>
                </div>
            `;

            idx += 1;

            card = cards[idx];
            element.innerHTML += `
                <div class="card flipped" data-idx="${idx}" onclick="">
                <div class="front">
                    <img class="front-image" src=http://167.86.102.204/${card.image}>
                </div>
                <div class="back"></div>
                </div>
            `;

            idx += 1;

            element.style.marginLeft = "150px";
        } 
        else {
            element.classList.add(phase1[rowSize-rec]);
            let tmp = 0;
            while(tmp < rowSize - rec+1) {
                let card = cards[idx];
                element.innerHTML += `
                    <div class="card" data-idx="${tmp}" onclick="checkCard(event)">
                    <div class="front">
                        <img class="front-image" src=http://167.86.102.204/${card.image}>
                    </div>
                    <div class="back"></div>
                    </div>
                `;

                tmp += 1;
                idx += 1;
            }
        }
        gridPhase3.append(element);
        rowSize += 1;
        rec += 2;
    }
}

function resetPhase3() {
    console.log("Reset Phase 3");
    socket.emit('getReset', roomKey);
}

function checkCard(event) {
    console.log("CheckCards");

    let target = event.target.parentNode;
    let parent = target.parentNode;

    if(parent.dataset.row != currIdx) return;

    console.log(target);

    let idxs = [target.dataset.idx, parent.dataset.row];

    socket.emit('flipCard', roomKey, idxs);
}

//------------ General Functions ------------\\

function serverCommunication() {
    socket.on('setCards', (players) => {
        document.getElementById("heading").style.display = "none";
        document.getElementById("lobbyScreen").style.display = "none";
        document.getElementById("startGame").style.display = "none";

        document.getElementById("stopGame").style.display = "initial";
        document.getElementById("score").style.display = "inherit";
        document.getElementById("gridCards").style.display = "inherit";
        document.getElementById("actionsPhase1").style.display = "inherit";
        
        getCards(players);

        if(!creator) {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">${players[0][0]}</span> darf <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke verteilen
            `;
        }
    });

    socket.on('setPhase1', (cards) => {
        console.log("Printing Phase 1 Cards");
        printPhase1(cards);
    });

    socket.on('setNextPlayer', (name) => {
        console.log("It's the next Player's turn");

        score = 0;
        document.getElementById("innerScore").textContent = score;

        if(playerName == name) {
            currPlayer = true;
            if(currRow > 5) {
                document.getElementById("startPhase2").style.display = "inherit";
            }
            document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">Du</span> darfst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke verteilen
            `;
        } 
        else  {
            document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">${name}</span> darf <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke verteilen
            `;
        }
        updateNextPlayerBtn();
    });

    socket.on('flipPhase1Row', (idx) => {
        nextPhase1Row(idx);
    });

    socket.on('layCard', (found, cardId) => {
        console.log("layCard");
        if(!found) return;
        if(!currPlayer) return;

        for(let card of gridCards.children) {
            if(card.dataset.gridid == cardId) {
                card.dataset.away = 1;
                card.style.display = "none";
                break;
            }
            
        }

        currCardCount -= 1;
        gridCards.style.gridTemplateColumns = "repeat(" + currCardCount + ", 110px)";
 
        score += currRow;
        document.getElementById("innerScore").textContent = score;
        console.log("Score: " + score);

        socket.emit('showScore', roomKey, score);
    });

    socket.on('updateScore', (newScore) => {
        if(newScore == -1) {
            return;
        }

        score = newScore;

        if(currPlayer) {
            if(currType < 2) {
                if(score != 0) {
                    document.getElementById("innerScore").style.color = "red";
                } else {
                    console.log("Green: " + score);
                    document.getElementById("innerScore").style.color = "green";
                }
            }
        }

        document.getElementById("innerScore").textContent = score;
    });

    socket.on('setPhase2', (players) => {
        console.log("initialize phase2");
        document.getElementById("gridPhase1").style.display = "none";
        document.getElementById("actionsPhase1").style.display = "none";

        currType = 0;

        document.getElementById("titlePhase2").style.display = "inherit";
        document.getElementById("phase2Cont").style.display = "inherit";
        document.getElementById("nextCount").style.display = "none";
        document.getElementById("phase3").style.display = "none";

        if(!creator) {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">${players[0][0]}</span> muss <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
            `;
        }

        score = 0;
        document.getElementById("innerScore").textContent = score;

        updateCountBtn();
    });

    socket.on('setBusfahrer', (name) => {
        console.log("The Busfahrer is " + name);
        document.querySelector(".busfahrer").textContent = name;

        var names = name.split('&');

        for(let tmp of names) {
            tmp = tmp.replace(/\s/, '');

            console.log(tmp);

            if(tmp == playerName) {
                busfahrer = true;
            }

        }

    });

    socket.on('giveCard', (card, type) => {
        console.log("Give Card");
        let cardChilds = Array.from(gridPhase2.children);

        const element = document.createElement("div");
        element.classList.add("cardPhase2");
        element.setAttribute("data-name", card.name);
        element.setAttribute("data-type", type);

        let name = card.name;

        if(parseFloat(card.name) > 10) {
             name = getCardName(card.name);
        }
                
        element.innerHTML = `
            <div class="front">
                 <img class="front-image-phase2" src=${"http://167.86.102.204/assets/" + name + card.type + ".png"}>
            </div>
            <div class="back"></div>
        `;

        for(child of cardChilds) {
            if(child.dataset.type == type) {
                gridPhase2.insertBefore(element, child);
                gridPhase2.removeChild(child);
                return;
            }
        }

        gridPhase2.appendChild(element);

    });

    socket.on('clearCards', (name, type) => {
        if(playerName != name) return;

        let cards = gridCards.children;

        switch(type) {
            case 0:
                for(let card of cards) {
                    let numb = parseFloat(card.dataset.name);
                    if(numb <= 10 && card.dataset.away != 1) {
                        card.dataset.away = 1;
                        card.style.display = "none";

                        currCardCount -= 1;
                        gridCards.style.gridTemplateColumns = "repeat(" + currCardCount + ", 110px)";
                    }
                }
                break;
            case 1:
                for(let card of cards) {
                    let name = getCardName(parseFloat(card.dataset.name));
                    if(name != "A" && card.dataset.away != 1) {
                        card.dataset.away = 1;
                        card.style.display = "none";

                        currCardCount -= 1;
                        gridCards.style.gridTemplateColumns = "repeat(" + currCardCount + ", 110px)";
                    }
                }
                break;
            case 2:
                for(let card of cards) {
                    let name = getCardName(parseFloat(card.dataset.name));
                    if(name == "A" && card.dataset.away != 1) {
                        card.dataset.away = 1;
                        card.style.display = "none";

                        currCardCount -= 1;
                        gridCards.style.gridTemplateColumns = "repeat(" + currCardCount + ", 110px)";
                    }
                }
                break;
        }
    });

    socket.on('setNextCount', (name, pGender) => {
        console.log("It's the next Player's turn");

        if(currType < 2) {
            score = 0;
            document.getElementById("innerScore").textContent = score;
        }

        console.log(name + " | " + currType);

        if(currType >= 2) {
            console.log("Phase 2 Exen");

            if(playerName == name) {
                currPlayer = true;

                document.getElementById("score").innerHTML = `
                    <span style="color:cyan" id="innerName">Du</span> musst dein Glas exen?
                `;

                document.getElementById("count").disabled = false;
                document.getElementById("count").style.backgroundColor = "goldenrod";
            }
            else {
                let pron = "";
                console.log(pGender);
                if(pGender == 0) {
                    pron = "sein";
                } else {
                    pron = "ihr";
                }

                console.log(pron);

                document.getElementById("score").innerHTML = `
                    <span style="color:cyan" id="innerName">${name}</span> muss ${pron} Glas exen?
                `;
            }

            if(currType == 3 && currPlayer) {
                activatePhase3Btn();
                return;
            }

            return;
        }

        if(playerName == name) {
            currPlayer = true;

            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">Du</span> musst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
            `;

            document.getElementById("count").disabled = false;
            document.getElementById("count").style.backgroundColor = "goldenrod";
        } 
        else {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">${name}</span> muss <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
            `;
        }

        console.log("Type: " + currType + " | Creator: " + creator + " | current: " + currPlayer);

        if(currType == 1 && creator && currPlayer) {


            socket.emit('setSelfDesc', roomKey);
            currPlayer = true;

            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">Du</span> musst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
            `;

            document.getElementById("count").disabled = false;
            document.getElementById("count").style.backgroundColor = "goldenrod";

            return;
        }

        if(currType == 3 && currPlayer) {

        }
    });

    socket.on('updateCourtScore', (scores) => {
        score = scores[gender];

        currType = 2;

        if(score != 0) {
            document.getElementById("innerScore").style.color = "red";
        } else {
            document.getElementById("innerScore").style.color = "green";
        }

        document.getElementById("innerScore").textContent = score;
    });

    socket.on('setLastCount', (name, pGender, exen) => {
        if(playerName == name) {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">Du</span> musst dein Glas <span style="color:red" id="innerScore" class="score"></span>
            `;
        }
        else {
            let pron = "";
            console.log(pGender);
            if(pGender == 0) {
                pron = "sein";
            } else {
                pron = "ihr";
            }

            console.log(pron);

            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">${name}</span> muss ${pron} Glas <span style="color:red" id="innerScore" class="score"></span>
            `;
        }

        if(exen) {
            document.getElementById("innerScore").style.color = "red";
            document.getElementById("innerScore").textContent = "exen";
        } else {
            document.getElementById("innerScore").style.color = "green";
            document.getElementById("innerScore").textContent = "nicht exen";
        }
    });

    socket.on('getSelfDesc', (roomKey) => {
        console.log("Self Desc");
        if(!creator) {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">Du</span> musst <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke trinken
            `;
        }
    });

    socket.on('setClear', () => {
        document.getElementById("score").style.display = "none";
    });

    socket.on('setGender', (pGender) => {
        let pron = "";
        if(pGender) {
            pron = "sein"
        } else {
            pron = "ihr"
        }

        document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">${name}</span> muss ${pron} Glas <span style="color:red" id="innerScore" class="score"></span>
        `;
    });

    socket.on('setPhase3', () => {
        document.getElementById("phase2Cont").style.display = "none";
        document.getElementById("gridCards").style.display = "none";

        document.getElementById("phase3Cont").style.display = "inherit";

        updateResetBtn();
    });

    socket.on('setPhase3Cards', (cards) => {
        console.log("Printing Phase 3 Cards");
        printPhase3(cards);
    });

    socket.on('setReset', (cards) => {
        console.log("New Phase 3 Deck");
        gridPhase3.innerHTML = "";
        
        printPhase3(cards);

        currIdx = 9;
    });

    socket.on('setFlipped', (card) => {
        let cardChilds = gridPhase3.children;
        for(let child of cardChilds) {
            if(child.dataset.row == card[1]) {
                let itemChildren = child.children;
                for(let iChild of itemChildren) {
                    if(iChild.dataset.idx == card[0]) {
                        iChild.classList.add("flipped");
                        break;
                    }
                }
                break;
            }
        }
        
        currIdx -= 1;
    });
}

function stopGame() {
    console.log("Stop Game");
}