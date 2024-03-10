const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const stopG = document.getElementById("stopGame");
const phase2 = document.getElementById("startPhase2");

const grid = document.querySelector(".grid-cards");
const gridPhase = document.querySelector(".grid-phase1");

const next = document.getElementById("nextPlayer");

const images = "http://167.86.102.204/";
const phase1 = ["grid-firstRow", "grid-secondRow", "grid-thirdRow", "grid-fourthRow", "grid-fifthRow"];

let currRow = -1;
let creator = false;
let currPlayer = false;

connectRoom();
checkToken();
checkCreator();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('getRoom', token);

        phase2.style.display = "none";
        return;
    }
}

function checkCreator() {
    socket.emit('checkCreator', sessionStorage.getItem("room"));
}

function connectRoom() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('connectRoom', token);
        return;
    }
}

function setScore(count) {
    socket.emit('setCount', count);
}

function stopGame() {
    showLoading();
    if(creator) {
        socket.emit('stopGame', sessionStorage.getItem("room"));
    } else {
        socket.emit('quitGame', sessionStorage.getItem("room"));
    }
}

function startPhase2() {
    showLoading();

    socket.emit('calculateBusfahrer', sessionStorage.getItem("room"));
    socket.emit('createCardsPhase2', sessionStorage.getItem("room"));
}

function flipRow() {
    if(creator && currPlayer) {
        if(currRow === -1) {
            currRow = 0;
            socket.emit('flipRow', sessionStorage.getItem("room"), currRow);
            return;
        }

        if(currRow != this.dataset.row) return;
        if(this.dataset.locked === "0") return;

        socket.emit('flipRow', sessionStorage.getItem("room"), currRow);
    }
}

function rowFlip(idx) {
    for(let child of gridPhase.children) {
        if(child.dataset.row == idx) {
            for(let card of child.children) {
                card.classList.add("flipped");
            }
            child.dataset.locked = 0;
            break;
        }
    }
}

function layCard() {
    if(currRow === -1 || currRow === 6) return;
    if(!currPlayer) return;

    var card = this.dataset.name.slice(0,-1);

    socket.emit('checkCard', sessionStorage.getItem("room"), currRow, this.dataset.gridid, card);
}

function nextPlayer() {
    socket.emit('setNextPlayer', sessionStorage.getItem("room"));

    currPlayer = false;
    next.style.display = "none";
}

function checkNextPhase() {
    if(currRow === 5) {
        next.style.display = "none";
        phase2.style.display = "inherit";
        return;
    }
}

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

function serverCommunication() {
    socket.on('checkNextPlayer', () => {
        currPlayer = true;
        next.style.display = "inherit"
    });

    socket.on('setRoom', (token) => {
        socket.emit('updateCards', token);
    });

    socket.on('getCreator', (creat) => {
        if(creat) {
            stopG.disabled = false;
            stopG.style.backgroundColor = "red";

            phase2.disabled = false;
            phase2.style.backgroundColor = "#2ed1ee";

            creator = true;
        } else {
            stopG.disabled = false;
            stopG.style.backgroundColor = "#red";
            stopG.textContent = "Quit Game";

            phase2.disabled = true;
            phase2.style.backgroundColor = "#626262";

            creator = false;
        }
    });

    socket.on('getCards', (cards) => {
        grid.innerHTML = "";

        var idx = 0;
        for(let card of cards) {
            const element = document.createElement("div");
            element.setAttribute("data-name", card);
            element.setAttribute("data-gridid", idx);
            element.classList.add("cardSelf");
            element.classList.add("flipped");
            element.addEventListener("click", layCard);
            element.innerHTML = `
                <div class="front">
                    <img class="front-image-self" src="${images}assets/${card}.png">
                </div>
                <div class="back"></div>
            `;
            grid.appendChild(element);

            idx += 1;
        }

        var length = grid.children.length;

        grid.style.gridTemplateColumns = "repeat(" + length + ", 110px)";
    });

    socket.on('getPhase1', (cards, id, flipped, curr) => {
        gridPhase.innerHTML = "";

        let rowSize = 0;
        let idx = 0;

        while(rowSize < 5) {
            let flip = "";
            let lock = 1;

            if(rowSize < id) {
                flip = "flipped";
                lock = 0;
            }

            if(rowSize === id) {
                if(flipped) {
                    flip = "flipped";
                    lock = 0;
                }
            }

            const element = document.createElement("div");
            element.setAttribute("data-row", rowSize);
            element.setAttribute("data-locked", lock);
            element.classList.add(phase1[rowSize]);

            let tmp = 0;
            while(tmp <= rowSize) {
                let card = cards[idx];

                element.innerHTML += `
                    <div class="card ${flip}">
                        <div class="front">
                            <img class="front-image" src="${images}${card}">
                        </div>
                        <div class="back">
                        </div>
                    </div>
                `;
                idx += 1;
                tmp += 1;
            }

            element.addEventListener("click", flipRow);
            gridPhase.appendChild(element);
            rowSize += 1;
        }

        currRow = id;

        checkNextPhase();
        
        socket.emit('checkCurrentPlayer', curr, sessionStorage.getItem("token"));
    });

    socket.on('getCurrentPlayer', (curr) => {
        if(curr) {
            currPlayer = true;
            if(currRow != 5) {
                next.style.display = "inherit"
            }
            return;
        }

        currPlayer = false;
        next.style.display = "none"
    });

    socket.on('flippedRow', (idx) => {
        rowFlip(idx);
    })

    socket.on('getCount', (score, player) => {
        document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">${player}</span> darf <span style="color:red" id="innerScore" class="score">${score}</span> Schlucke verteilen
        `;
    })

    socket.on('layCard', (row, id, token) => {
        console.log("card");

        if(!currPlayer) return;

        var idx = Number(id);

        grid.children[idx].remove();

        var length = grid.children.length;

        grid.style.gridTemplateColumns = "repeat(" + length + ", 110px)";

        socket.emit('updateScore', sessionStorage.getItem("room"), row);
        socket.emit('updateCards', token)
    })
    
    socket.on('getNextPlayer', (id) => {
        socket.emit('isNext', sessionStorage.getItem("room"), id);
        currPlayer = false;
        next.style.display = "none"

        socket.emit('updateScore', sessionStorage.getItem("room"), -1);
    })

    socket.on('getFirstPlayer', () => {
        if(creator) {
            currRow += 1;
            currPlayer = true;

            next.style.display = "inherit";

            checkNextPhase();

            socket.emit('setCurrentRow', sessionStorage.getItem("room"));
            socket.emit('updateScore', sessionStorage.getItem("room"), -1);
        }
    });

    socket.on('getCurrentRow', (row) => {
        currRow = row;
    });

    socket.on('getBusfahrer', () => {
        hideLoading();
        window.location.href= "http://localhost:3000/phase2";
    });

    socket.on('setQuitGame', () => {
        hideLoading();
        sessionStorage.removeItem("room");
        window.location.href= "http://localhost:3000";
    });

    socket.on('setStopGame', () => {
        hideLoading();
        sessionStorage.removeItem("room");
        window.location.href= "http://localhost:3000";
    });
}