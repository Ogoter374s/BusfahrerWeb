const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

connectRoom();
checkToken();
checkCreator();
serverCommunication();

const images = "http://167.86.102.204/";
const phase1 = ["grid-firstRow", "grid-secondRow", "grid-thirdRow", "grid-fourthRow", "grid-fifthRow"];

const gridPhase = document.querySelector(".grid-phase3");
const reset = document.getElementById("reset");
const busfahrer = document.getElementById("busfahrer");

let isBusfahrer = false;
let currIdx = 8;
let creator = false;

function connectRoom() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('connectRoom', token);
        return;
    }
}

function checkCreator() {
    socket.emit('checkCreator', sessionStorage.getItem("room"));
}

function checkToken() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('getRoom', token);
        return;
    }
}

function checkCard(event) {
    let target = event.target.parentNode;
    let parent = target.parentNode;

    if(parent.dataset.row != currIdx) return;

    let idx = target.dataset.idx;

    socket.emit('flipCard', sessionStorage.getItem("room"), idx);
}

function stopGame() {
    showLoading();
    if(creator) {
        socket.emit('stopGame', sessionStorage.getItem("room"));
    } else {
        socket.emit('quitGame', sessionStorage.getItem("room"));
    }
}

function resetPhase() {
    socket.emit('resetCardsPhase3', sessionStorage.getItem("room"));
}

function serverCommunication() {
    socket.on('getCreator', (creat) => {
        if(creat) {
            stopG.disabled = false;
            stopG.style.backgroundColor = "red";

            creator = true;
        } else {
            stopG.disabled = false;
            stopG.style.backgroundColor = "#red";
            stopG.textContent = "Quit Game";

            creator = false;
        }
    });

    socket.on('setRoom', (token) => {
        socket.emit('updatePhase3', token);
    });

    socket.on('setBusfahrer', (bus) => {
        busfahrer.textContent = bus;
    });

    socket.on('getPhase3', (cards, order, cIdx) => {
        gridPhase.innerHTML = "";

        let rowSize = 0;
        let idx = 0;
        let flip = "";

        currIdx = cIdx;

        while(rowSize < 5) {
            const element = document.createElement("div");
            element.setAttribute("data-row", rowSize);

            if(rowSize === 0) {
                element.classList.add(phase1[1]);
    
                let card = cards[idx];
                element.innerHTML += `
                    <div class="card flipped" data-idx="${idx}" onclick="">
                    <div class="front">
                        <img class="front-image" src="${images}${card}">
                    </div>
                    <div class="back"></div>
                    </div>
                `;
    
                idx += 1;
    
                if(order.includes(idx + "")) {
                    flip = "flipped";
                } else {
                    flip = "";
                }

                card = cards[idx];
                element.innerHTML += `
                    <div class="card ${flip}" data-idx="${idx}" onclick="checkCard(event)">
                    <div class="front">
                        <img class="front-image" src="${images}${card}">
                    </div>
                    <div class="back"></div>
                    </div>
                `;
    
                idx += 1;
                element.style.marginLeft = "-150px";
            } 
            else {
                element.classList.add(phase1[rowSize]);
    
                let tmp = -1;
                while(tmp < rowSize) {
                    let card = cards[idx];
    
                    if(order.includes(idx + "")) {
                        flip = "flipped";
                    } else {
                        flip = "";
                    }

                    element.innerHTML += `
                        <div class="card ${flip}" data-idx="${idx}" onclick="checkCard(event)">
                        <div class="front">
                            <img class="front-image" src="${images}${card}">
                        </div>
                        <div class="back"></div>
                        </div>
                    `;
    
                idx += 1;
                tmp += 1;
                }
            }
            
            gridPhase.appendChild(element);
            rowSize += 1;
        }

        rowSize = 5;
        let rec = 2;
        while(rowSize <= 8) {
            const element = document.createElement("div");
            element.setAttribute("data-row", rowSize);

            if(rowSize == 8) {
                element.classList.add(phase1[1]);

                if(order.includes(idx + "")) {
                    flip = "flipped";
                } else {
                    flip = "";
                }

                let card = cards[idx];
                element.innerHTML += `
                    <div class="card ${flip}" data-idx="${idx}" onclick="checkCard(event)">
                    <div class="front">
                        <img class="front-image" src="${images}${card}">
                    </div>
                    <div class="back"></div>
                    </div>
                `;

                idx += 1;

                card = cards[idx];
                element.innerHTML += `
                    <div class="card flipped" data-idx="${idx}" onclick="">
                    <div class="front">
                        <img class="front-image" src="${images}${card}">
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
                    if(order.includes(idx + "")) {
                        flip = "flipped";
                    } else {
                        flip = "";
                    }

                    let card = cards[idx];
                    element.innerHTML += `
                        <div class="card ${flip}" data-idx="${idx}" onclick="checkCard(event)">
                        <div class="front">
                            <img class="front-image" src="${images}${card}">
                        </div>
                        <div class="back"></div>
                        </div>
                    `;

                    tmp += 1;
                    idx += 1;
                }
            }

            gridPhase.append(element);
            rowSize += 1;
            rec += 2;
        }
    });

    socket.on('setFlipped', (idx) => {
        let cardChilds = gridPhase.children;
        for(let child of cardChilds) {
            if(child.dataset.row == currIdx) {
                let itemChildren = child.children;
                for(let iChild of itemChildren) {
                    if(iChild.dataset.idx == idx) {
                        iChild.classList.add("flipped");
                        currIdx -= 1;
                        break;
                    }
                }
                break;
            }
        }
    });

    socket.on('resetedPhase', (token) => {
        socket.emit('updatePhase3', token);
        currIdx = 8;
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