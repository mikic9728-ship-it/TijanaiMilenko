const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "heic", "mp4", "mov"];
const FALLBACK_UPLOAD_ENDPOINT = "/api/upload";

const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const uploadForm = document.querySelector("#uploadForm");
const uploadButton = document.querySelector("#uploadButton");
const clearFilesButton = document.querySelector("#clearFiles");
const fileSummary = document.querySelector("#fileSummary");
const fileCount = document.querySelector("#fileCount");
const totalSize = document.querySelector("#totalSize");
const fileList = document.querySelector("#fileList");
const progressWrap = document.querySelector("#progressWrap");
const progressBar = document.querySelector("#progressBar");
const progressLabel = document.querySelector("#progressLabel");
const progressPercent = document.querySelector("#progressPercent");
const statusMessage = document.querySelector("#statusMessage");
const qrImage = document.querySelector("#qrImage");
const qrUrl = document.querySelector("#qrUrl");

let selectedFiles = [];
let uploadEndpoint = window.WEDDING_UPLOAD_ENDPOINT || FALLBACK_UPLOAD_ENDPOINT;

init();

function init() {
  setupUploadEndpoint();
  setupDragAndDrop();
  setupQrCode();

  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  uploadForm.addEventListener("submit", handleUpload);
  clearFilesButton.addEventListener("click", clearSelectedFiles);
}

async function setupUploadEndpoint() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const config = await response.json();

    if (config.uploadEndpoint) {
      uploadEndpoint = config.uploadEndpoint;
    }
  } catch (error) {
    console.info("Koristi se podrazumevani upload endpoint.", error);
  }
}

function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer.files);
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
}

function setupQrCode() {
  const pageUrl = window.location.href.split("#")[0];
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&data=${encodeURIComponent(pageUrl)}`;

  qrImage.src = qrApiUrl;
  qrUrl.textContent = pageUrl;
}

function addFiles(fileListToAdd) {
  const incomingFiles = Array.from(fileListToAdd);
  const validationErrors = [];

  incomingFiles.forEach((file) => {
    const extension = getFileExtension(file.name);
    const alreadySelected = selectedFiles.some((selectedFile) => {
      return selectedFile.name === file.name && selectedFile.size === file.size;
    });

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      validationErrors.push(`${file.name}: format nije podržan.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      validationErrors.push(`${file.name}: fajl je veći od 50MB.`);
      return;
    }

    if (!alreadySelected) {
      selectedFiles.push(file);
    }
  });

  renderFiles();

  if (validationErrors.length > 0) {
    showStatus(validationErrors.join(" "), "error");
  } else if (incomingFiles.length > 0) {
    showStatus("Fajlovi su spremni za upload.", "success");
  }
}

function renderFiles() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const size = document.createElement("span");

    name.className = "file-name";
    name.textContent = file.name;
    size.className = "file-size";
    size.textContent = formatBytes(file.size);

    item.append(name, size);
    fileList.appendChild(item);
  });

  const filesLength = selectedFiles.length;
  const selectedTotalSize = selectedFiles.reduce((total, file) => total + file.size, 0);

  fileSummary.hidden = filesLength === 0;
  uploadButton.disabled = filesLength === 0;
  fileCount.textContent = `${filesLength} ${getFileWord(filesLength)}`;
  totalSize.textContent = `${formatBytes(selectedTotalSize)} ukupno`;
}

function handleUpload(event) {
  event.preventDefault();

  if (selectedFiles.length === 0) {
    showStatus("Prvo izaberite fotografije ili video zapise.", "error");
    return;
  }

  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append("files", file));
  formData.append("eventName", "Tijana & Milenko — Wedding Memories");
  formData.append("eventDate", "2026-10-10");

  const request = new XMLHttpRequest();
  request.open("POST", uploadEndpoint, true);

  request.upload.addEventListener("progress", (event) => {
    if (!event.lengthComputable) {
      return;
    }

    const percent = Math.round((event.loaded / event.total) * 100);
    updateProgress(percent, "Upload u toku...");
  });

  request.addEventListener("load", () => {
    if (request.status >= 200 && request.status < 300) {
      updateProgress(100, "Upload završen");
      showStatus("Hvala! Vaše uspomene su uspešno uploadovane.", "success");
      clearSelectedFiles({ keepStatus: true });
      return;
    }

    showStatus(getServerErrorMessage(request), "error");
    uploadButton.disabled = false;
  });

  request.addEventListener("error", () => {
    showStatus("Upload nije uspeo. Proverite internet vezu i pokušajte ponovo.", "error");
    uploadButton.disabled = false;
  });

  request.addEventListener("abort", () => {
    showStatus("Upload je prekinut.", "error");
    uploadButton.disabled = false;
  });

  uploadButton.disabled = true;
  progressWrap.hidden = false;
  updateProgress(0, "Priprema upload-a...");
  showStatus("", "");
  request.send(formData);
}

function clearSelectedFiles(options = {}) {
  selectedFiles = [];
  renderFiles();

  if (!options.keepStatus) {
    showStatus("", "");
    progressWrap.hidden = true;
    updateProgress(0, "Priprema upload-a...");
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type || ""}`.trim();
}

function updateProgress(percent, label) {
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressLabel.textContent = label;
}

function getFileExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function getFileWord(count) {
  if (count === 1) {
    return "fajl";
  }

  if (count >= 2 && count <= 4) {
    return "fajla";
  }

  return "fajlova";
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return "0 MB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function getServerErrorMessage(request) {
  try {
    const response = JSON.parse(request.responseText);

    if (response.message) {
      return response.message;
    }
  } catch (error) {
    console.info("Server nije vratio JSON poruku.", error);
  }

  return "Upload nije uspeo. Pokušajte ponovo malo kasnije.";
}
