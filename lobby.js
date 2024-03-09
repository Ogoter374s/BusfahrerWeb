const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const start = document.getElementById("startGame");
const lobby = document.getElementById("lobby");

checkToken();
connectRoom();
checkCreator();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('getRoom', token);
        return;
    }

    start.disabled = true;
    start.style.backgroundColor = "#626262";
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

function removePlayer() {
    //Remove Player
}

function startGame() {
    console.log("Start Game");

    showLoading();

    socket.emit('createCards', sessionStorage.getItem("room"));
}

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

function serverCommunication() {
    socket.on('setRoom', (token) => {
        
        socket.emit('updateLobby', token.room);

        start.disabled = false;
        start.style.backgroundColor = "#27ae60";
    });

    socket.on('changeLobby', (players) => {
        lobby.innerHTML = "";
        
        players.forEach(player => {
            const element = document.createElement('li');
            element.classList.add("lobby-item");
            element.innerHTML = `
                <span>${player.username}</span>
                <button class="removeBtn" onclick="removePlayer"></button>
            `;

            lobby.appendChild(element);
        });
    });

    socket.on('playerJoined', () => {
        checkToken();
    });

    socket.on('getCreator', (creator) => {
        if(creator) {
            start.disabled = false;
            start.style.backgroundColor = "#27ae60";
        } else {
            start.disabled = true;
            start.style.backgroundColor = "#626262";
        }
    });

    socket.on('generatedCards', () => {
        hideLoading();
        window.location.href = "http://localhost:3000/phase1";
    });
}