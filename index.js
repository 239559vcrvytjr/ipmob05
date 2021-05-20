String.prototype.toTitleCase = function () {
  return this.split(" ")
    .map((word) => word[0].toUpperCase() + word.substr(1))
    .join();
};

// Database initialization

const DATABASE_NAME = "clientsDatabase";

var db;
const dbRequest = indexedDB.open(DATABASE_NAME, 1);
const table = document.getElementById("table");

dbRequest.addEventListener("success", (e) => {
  db = e.target.result;

  const transaction = db.transaction(["clientsStore"], "readonly");
  const store = transaction.objectStore("clientsStore");
  const cursor = store.openCursor();

  cursor.addEventListener("success", (e) => {
    const c = e.target.result;
    if (c) {
      addClientRow(c.value);
      c.continue();
    }
  });
});

dbRequest.addEventListener("upgradeneeded", (e) => {
  db = e.target.result;

  const store = db.createObjectStore("clientsStore", {
    keyPath: "id",
    autoIncrement: true,
  });
  store.createIndex("phoneNumber", "phoneNumber");
});

// Handle read/write

function addClient(data) {
  const transaction = db.transaction(["clientsStore"], "readwrite");
  const store = transaction.objectStore("clientsStore");

  const addRequest = store.add({ ...data, image: getTintedCanvas().toDataURL("image/jpeg") });

  addRequest.addEventListener("success", (e) => {
    addClientRow({ ...data, id: e.target.result });
  });
}

function deleteClient(id) {
  const transaction = db.transaction(["clientsStore"], "readwrite");
  const store = transaction.objectStore("clientsStore");
  const deleteRequest = store.delete(id);

  deleteRequest.addEventListener("success", () => {
    deleteClientRow(id);
  });
}

// Finding clients

function findClient(phraseString) {
  const phraseList = phraseString.match(/\S+/g) || [];

  function checkMatch(client) {
    for (const phrase of phraseList) {
      let phraseMatched = false;

      for (const column of Object.values(client)) {
        if (!column || column === true) continue; // skip empty or boolean columns
        if ((column + "").toLowerCase().includes(phrase.toLowerCase())) phraseMatched = true;
      }

      if (!phraseMatched) return false;
    }

    return true;
  }

  const transaction = db.transaction(["clientsStore"], "readonly");
  const store = transaction.objectStore("clientsStore");
  const cursor = store.openCursor();

  deleteAllClientRows();

  cursor.addEventListener("success", (e) => {
    const c = e.target.result;
    if (c) {
      if (checkMatch(c.value)) addClientRow(c.value);
      c.continue();
    }
  });
}

// DOM manipulation

function addClientRow(data) {
  const tableRowData = [
    data.id,
    data.firstName,
    data.lastName,
    data.address,
    data.phoneNumber,
    data.email,
    data.pesel,
    data.identity,
    data.business,
    data.businessName,
    data.nip,
    data.marketing,
    data.image,
  ];

  const tableRow = table.insertRow(-1);
  tableRow.id = `tableRow${data.id}`;

  for (const colData of tableRowData) {
    const tableCell = tableRow.insertCell(-1);
    tableCell.innerHTML = colData || "";
  }

  const deleteButton = document.createElement("button");
  deleteButton.innerHTML = "Usuń";
  deleteButton.addEventListener("click", () => {
    deleteClient(data.id);
  });

  const deleteButtonCell = tableRow.insertCell(-1);
  deleteButtonCell.appendChild(deleteButton);
}

function deleteClientRow(id) {
  document.getElementById(`tableRow${id}`).remove();
}

function deleteAllClientRows() {
  table.querySelectorAll("*").forEach((row) => row.remove());
}

// Handling form data

const formElem = document.getElementById("form");

function getNormalizedFormData() {
  const data = Object.fromEntries(new FormData(formElem));
  data["business"] = !!data["business"];
  data["marketing"] = !!data["marketing"];
  return data;
}

formElem.addEventListener("submit", (e) => {
  e.preventDefault();

  addClient(getNormalizedFormData());
  formElem.reset();
});

// Change case for form data

document.getElementById("invertStringCase").addEventListener("click", invertStringCase);

function invertStringCase(e) {
  e.preventDefault();

  const worker = new Worker("workers/togglecase.js");
  worker.postMessage(getNormalizedFormData());

  worker.addEventListener("message", (e) => {
    for (const [k, v] of Object.entries(e.data)) {
      formElem.elements[k].value = v;
    }
  });
}

// Change tint for image based on form data

document.getElementById("tintImage").addEventListener("click", tintImage);

function tintImage(e) {
  e.preventDefault();

  const worker = new Worker("workers/tintimage.js");
  worker.postMessage(getNormalizedFormData());

  worker.addEventListener("message", (e) => {
    const color = `rgb(${e.data.r}, ${e.data.g}, ${e.data.b})`;
    document.getElementById("canvasWrapper").style.backgroundColor = color;
  });
}

// Handling search box

const searchBox = document.getElementById("searchBox");

searchBox.addEventListener("input", (e) => {
  e.preventDefault();
  findClient(e.target.value);
});

// Generate random data

document.getElementById("addRandomClientButton").addEventListener("click", addRandomClient);

function addRandomClient(e) {
  e.preventDefault();

  function randomString(length) {
    const sourceChars = "abcdefghijklmnopqrstuvwxyz";
    const stringChars = [...Array(length)].map(() =>
      sourceChars.charAt(Math.floor(Math.random() * sourceChars.length))
    );
    return stringChars.join("");
  }

  function randomNumber(length, padZeros = true) {
    const maxValue = 10 ** length - 1;
    const randomNum = Math.floor(Math.random() * maxValue);

    if (padZeros) return (randomNum + "").padStart(length, "0");
    else return randomNum;
  }

  function randomBool() {
    return !!Math.round(Math.random());
  }

  const rS = randomString;
  const rN = randomNumber;
  const rB = randomBool;

  const requirePersonal = rB();
  const requireBusiness = rB();

  const data = {
    firstName: rS(10).toTitleCase(),
    lastName: rS(15).toTitleCase(),
    address: rS(10).toTitleCase() + " " + rN(2, false) + "/" + rN(1),
    phoneNumber: rN(9),
    email: rS(5) + "@" + rS(5) + "." + rS(2),
    pesel: requirePersonal ? rN(11) : undefined,
    identity: requirePersonal ? rS(3).toUpperCase() + rN(6) : undefined,
    business: requireBusiness,
    businessName: requireBusiness ? rS(10).toTitleCase() + " " + rS(10).toTitleCase() : undefined,
    nip: requireBusiness ? rN(3) + "-" + rN(2) + "-" + rN(2) + "-" + rN(3) : undefined,
    marketing: rB(),
  };

  for (const [k, v] of Object.entries(data)) {
    formElem.elements[k].checked = v;
    formElem.elements[k].value = v || "";
  }
}

// Remove database data

document.getElementById("fixDatabaseButton").addEventListener("click", deleteDatabase);

function deleteDatabase() {
  indexedDB.deleteDatabase(DATABASE_NAME);
  alert("Database will be re-created when you refresh the page");
}

// Set form image source

const urlField = document.getElementById("url");
const canvas = document.getElementById("canvas");
const canvasCtx = canvas.getContext("2d");

urlField.addEventListener("blur", (e) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.addEventListener("load", () => {
    canvasCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
    urlField.setCustomValidity("");
  });
  img.addEventListener("error", () => {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    urlField.setCustomValidity("Niepoprawny URL");
  });
  img.src = e.target.value;
});

// Create copy of canvas with tint applied

function getTintedCanvas() {
  const tintedCanvas = document.createElement("canvas");
  const tintedCanvasCtx = tintedCanvas.getContext("2d");

  tintedCanvas.width = canvas.width;
  tintedCanvas.height = canvas.height;

  tintedCanvasCtx.drawImage(canvas, 0, 0);
  tintedCanvasCtx.fillStyle = document.getElementById("canvasWrapper").style.backgroundColor;
  tintedCanvasCtx.globalAlpha = 0.5;
  tintedCanvasCtx.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);

  return tintedCanvas;
}
