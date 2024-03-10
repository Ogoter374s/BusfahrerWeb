const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const grid = document.querySelector(".grid-cards");
const gridPhase = document.querySelector(".grid-phase2");

const images = "http://167.86.102.204/";

const stopG = document.getElementById("stopGame");
const count = document.getElementById("count");
const next = document.getElementById("nextCount");
const phase3 = document.getElementById("phase3");
const busfahrer = document.getElementById("busfahrer");

var creator = false;
var currPlayer = false;
var currTyp = 0;

connectRoom();
checkToken();
checkCreator();
checkCurrPlayer();
checkCurrType();

serverCommunication();

function checkCreator() {
    socket.emit('checkCreator', sessionStorage.getItem("room"));
}

function checkToken() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('getRoom', token);

        phase3.style.display = "none";
        next.style.display = "none";
        return;
    }
}

function connectRoom() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('connectRoom', token);
        return;
    }
}

function checkCurrPlayer() {
    if(currPlayer) {
        count.disabled = false;
        count.style.backgroundColor = "goldenrod";
    } else {
        count.disabled = true;
        count.style.backgroundColor = "#626262";
    }
}

function checkCurrType() {
    socket.emit('getCurrType', sessionStorage.getItem("room"));
}

function countCards() {
    switch(currTyp) {
        case 0:
            socket.emit('countCards', sessionStorage.getItem("room"), currTyp);

            count.style.display = "none";
            next.style.display = "inherit";
            break;
        case 1:
            socket.emit('countCourtCards', sessionStorage.getItem("room"));
            socket.emit('nextType', sessionStorage.getItem("room"));
            break;
        case 2:
            socket.emit('countEx', sessionStorage.getItem("room"));
            socket.emit('nextType', sessionStorage.getItem("room"));

            checkNextPhase();
            break;
    }
}

function checkNextPhase() {
    if(currTyp > 2) {
        count.style.display = "none";
        if(creator) {
            phase3.style.display = "inherit";
        }
    }
}

function stopGame() {
    showLoading();
    if(creator) {
        socket.emit('stopGame', sessionStorage.getItem("room"));
    } else {
        socket.emit('quitGame', sessionStorage.getItem("room"));
    }
}

function nextCount() {
    socket.emit('setNextCount', sessionStorage.getItem("room"));

    currPlayer = false;
    next.style.display = "none";
    count.style.display = "inherit";
    count.style.backgroundColor = "#626262";
    count.disabled = true;
}

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

function startPhase3() {
    showLoading();

    socket.emit('createCardsPhase3', sessionStorage.getItem("room"));
}

function serverCommunication() {
    socket.on('getCreator', (creat) => {
        if(creat) {
            phase3.disabled = false;
            phase3.style.backgroundColor = "d67d41";

            stopG.disabled = false;
            stopG.style.backgroundColor = "red";

            count.disabled = false;
            count.style.backgroundColor = "goldenrod"

            currPlayer = true;
            creator = true;
        } else {
            phase3.disabled = true;
            phase3.style.backgroundColor = "#626262";

            stopG.disabled = false;
            stopG.style.backgroundColor = "#red";
            stopG.textContent = "Quit Game";

            count.disabled = true;
            count.style.backgroundColor = "#626262";

            creator = false;
        }
    });

    socket.on('setRoom', (token) => {
        socket.emit('updateCardsPhase2', token);
    });

    socket.on('setBusfahrer', (bus) => {
        busfahrer.textContent = bus;
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

    socket.on('updatedScore', (name, score) => {
        document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">
                ${name}
            </span>
             muss 
            <span style="color:red" id="innerScore" class="score">
                ${score}
            </span>
             Schlucke trinken
        `;
    });

    socket.on('updateType', (type) => {
        currTyp = type;
    });

    socket.on('updateTypes', (cards, curr) => {
        gridPhase.innerHTML = "";
        for(let card of cards) {
            if(card != "") {
                const element = document.createElement("div");
                element.classList.add("cardPhase2");
                element.innerHTML = `
                    <div class="front">
                        <img class="front-image-phase2" src="${images}assets/${card}.png">
                `; 
                gridPhase.appendChild(element);
            }
        }

        socket.emit('checkCurrentPlayer', curr, sessionStorage.getItem("token"));
    });

    socket.on('cardsChanged', (token) => {
        var token = sessionStorage.getItem("room");

        if(token != null) {
            socket.emit('getRoom', token);
            return;
        }
    });

    socket.on('counted', () => {
        count.style.display = "none";
        next.style.display = "inherit";
    });

    socket.on('getNextCount', (id) => {
        socket.emit('isNextCount', sessionStorage.getItem("room"), id);
        currPlayer = false;
        next.style.display = "none"

        socket.emit('updateCountScore', sessionStorage.getItem("room"));
    });

    socket.on('getCurrentPlayer', (curr) => {
        if(curr) {
            currPlayer = true;
            count.disabled = false;
            count.style.backgroundColor = "goldenrod";
            return;
        }

        currPlayer = false;
        next.style.display = "none"
        count.disabled = true;
        count.style.display = "inherit";
        count.style.backgroundColor = "#626262";
    });

    socket.on('checkNextCount', () => {
        currPlayer = true;

        count.disabled = false;
        count.style.display = "inherit";
        count.style.backgroundColor = "goldenrod";
    });

    socket.on('setAllScore', () => {
        socket.emit('getAllScore', sessionStorage.getItem("room"));
    })

    socket.on('getFirstPlayer', () => {
        if(creator) {
            currTyp += 1;
            currPlayer = true;

            count.disabled = false;
            count.style.backgroundColor = "goldenrod"

            checkCurrType();
        }
    });

    socket.on('updateCourtScore', (player, man, wom, all) => {
        socket.emit('checkCourt', sessionStorage.getItem("room"), player, man, wom, all);
    });

    socket.on('setCourt', (name, gender, man, wom, all) => {
        console.log("court");
        let sum = 0;

        if(gender === 0) {
            sum = man;
        } else {
            sum = wom;
        }

        sum += all;

        document.getElementById("score").innerHTML = `
            <span style="color:cyan" id="innerName">
                ${name}
            </span>
             muss 
            <span style="color:red" id="innerScore" class="score">
                ${sum}
            </span>
             Schlucke trinken
        `;

        socket.emit('updatePhaseCards', sessionStorage.getItem("room"));
    });

    socket.on('setCurrType', (type) => {
        currTyp = type;
        checkNextPhase();
    });

    socket.on('updateEx', (name, ex) => {
        socket.emit('checkEx', sessionStorage.getItem("room"), name, ex);
    });

    socket.on('setEx', (name, ex) => {
        if(ex) {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">
                    ${name}
                </span>
                muss das Glas
                <span style="color:red" id="innerScore" class="score">
                    exen
                </span>
            `;
        } else {
            document.getElementById("score").innerHTML = `
                <span style="color:cyan" id="innerName">
                    ${name}
                </span>
                muss das Glas
                <span style="color:red" id="innerScore" class="score">
                    nicht exen
                </span>
            `;
        }

        socket.emit('updatePhaseCards', sessionStorage.getItem("room"));
    });

    socket.on('generatedPhase3', () => {
        hideLoading();

        window.location.href = "http://localhost:3000/phase3";
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