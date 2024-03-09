const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const create = document.getElementById("createRoom");
const inp = document.getElementById("playerName");

const creation = document.getElementById("createScreen");

checkToken();
checkInput();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("token");

    if(token != null) {
        socket.emit('getToken', token);
        return;
    }

    create.disabled = true;
    create.style.backgroundColor = "#626262";
}

function checkInput() {
    document.getElementById("errorMsg").style.display = "none";
    if(inp.value.trim() != "") {
        if(!gameReady()) return;

        create.disabled = false;

        create.style.backgroundColor = "#27ae60";

    } else {
        create.disabled = true;
        
        create.style.backgroundColor = "#626262";
    }

    checkToken();
}

function getVisibility() {
    var btns = document.getElementsByName("visibility");
    for(let btn of btns) {
        if(btn.checked) {
            return btn.value;
        }
    }

    return -1;
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

function gameReady() {
    let male = document.getElementById("male");
    let female = document.getElementById("female");

    let public = document.getElementById("public");
    let private = document.getElementById("private");

    return (male.checked || female.checked) && (public || private);
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

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

function createRoom() {
    let roomKey = generateRoomCode();
    let state = getVisibility();

    showLoading();

    socket.emit('createRoom', roomKey, sessionStorage.getItem("token"), state);
}

function serverCommunication() {
    socket.on('setToken', (token) => {
        checkInput();
    });

    socket.on('setRoom', (token) => {
        socket.emit('joinRoom', token, inp.value, getGender(), 1, 0)
    });

    socket.on('errPlayer', (msg) => {
        console.log(msg);
        document.getElementById("errorMsg").style.display = "inherit";
        document.getElementById("errorMsg").textContent = msg;
    });

    socket.on('roomCreated', (token) => {
        sessionStorage.setItem("room", token);
        if(token != null) {
            socket.emit('getRoom', token);
        }
    });

    socket.on('playerJoined', () => {
        console.log("Creator joined Room");
        hideLoading();
        window.location.href = "http://localhost:3000/lobby";
    });
}