const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

let currTab = 0;

document.getElementById("logginCont").style.display = "visible";
document.getElementById("registerCont").style.display = "none";
document.getElementById("accountCont").style.display = "none";

document.getElementById("signIn").style.display = "none";

checkInput();
checkToken();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("token");

    if(token != null) {
        socket.emit('getToken', token);
    }
}


function checkInput() {
    var inputs = document.querySelectorAll('.checkInp');
    for(var i=0;i<inputs.length;i++) {
        if(inputs[i].value.trim() === '') {
            document.getElementById("signIn").style.display = "none";
            document.getElementById("register").style.display = "inherit";
            return;
        }
    }

    document.getElementById("signIn").style.display = "inherit";
    document.getElementById("register").style.display = "none";

    return;
}

function checkRegisterInp() {
    var inputs = document.querySelectorAll('.checkRegInp');
    for(var i=0;i<inputs.length;i++) {
        if(inputs[i].value.trim() === '') {
            document.getElementById("register").style.backgroundColor = "#626262";
            return;
        }
    }

    document.getElementById("register").style.backgroundColor = "#00f0dc";

    return;
}

function checkLogin() {
    let name = document.getElementById("registerName").value;
    let pswd = document.getElementById("registerPswd").value

    socket.emit('checkRegister', name, pswd, socket.id);
}

function signIn() {
    let name = document.getElementById("loginName").value;
    let pswd = document.getElementById("loginPswd").value

    socket.emit('checkSignIn', name, pswd, socket.id);
    document.getElementById("accErrorMsg").style.display = "none";
}

function account() {
    document.getElementById("registerCont").style.display = "none";
    document.getElementById("logginCont").style.display = "none";
    document.getElementById("accountCont").style.display = "inherit";

    document.getElementById("register").style.display = "none";
    document.getElementById("signIn").style.display = "none";
}

function backToMenu() {
    //Return to Menu Screen
}

function register() {
    if(currTab === 0) {
        document.getElementById("register").style.backgroundColor = "#626262";

        document.getElementById("logginCont").style.display = "none";
        document.getElementById("registerCont").style.display = "inherit";
        currTab = 1;
    } else {
        checkLogin();
        document.getElementById("accErrorMsg").style.display = "none";
    }
}

function serverCommunication() {
    socket.on('registerError', (msg) => {
        document.getElementById("accErrorMsg").style.display = "inherit";
        document.getElementById("accErrorMsg").textContent = msg;
    });

    socket.on('registerSuccess', (token) => {
        account();

        sessionStorage.setItem("token", token);
    })

    socket.on('signInError', (msg) => {
        document.getElementById("accErrorMsg").style.display = "inherit";
        document.getElementById("accErrorMsg").textContent = msg;
    });

    socket.on('signInSuccess', (token) => {
        account();

        sessionStorage.setItem("token", token);
    })

    socket.on('setToken', (token) => {
        account();
    });
}