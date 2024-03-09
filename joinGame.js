const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const join = document.getElementById("joinRoom");
const inp = document.getElementById("playerName");

checkInput();

checkToken();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        return;
    }

    join.disabled = true;
    join.style.backgroundColor = "#626262";
}

function checkInput() {
    document.getElementById("errorMsg").style.display = "none";
    if(inp.value.trim() != "") {
        if(!gameReady()) return;

        join.disabled = false;

        join.style.backgroundColor = "#3578e4";

    } else {
        join.disabled = true;
        
        join.style.backgroundColor = "#626262";
    }

    checkToken();
}

function gameReady() {
    let male = document.getElementById("male");
    let female = document.getElementById("female");

    return (male.checked || female.checked);
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

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

function joinRoom() {
    console.log("Joining Room");

    showLoading();

    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('getRoom', token);
        return;
    }
}

function serverCommunication() {
    socket.on('setRoom', (token) => {
        socket.emit('joinRoom', token, inp.value, getGender(), 0, 0);
    });

    socket.on('playerJoined', () => {
        console.log("Player joined Room");
        hideLoading();
        window.location.href = "http://localhost:3000/lobby";
    });
}