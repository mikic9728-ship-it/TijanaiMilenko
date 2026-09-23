const MAX_FILE_SIZE = 50 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "heic", "mp4", "mov"];

const FALLBACK_UPLOAD_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxEv1xZ7NOzJX_8IWdwh0VrVbw_3N1W89hFIAPsK6vmSkQVAS3j84_VpBCsyE3mKls3/exec";

const uploadEndpoint =
  window.WEDDING_UPLOAD_ENDPOINT || FALLBACK_UPLOAD_ENDPOINT;

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
const progressTrack = document.querySelector("#progressTrack");
const progressBar = document.querySelector("#progressBar");
const progressLabel = document.querySelector("#progressLabel");
const progressPercent = document.querySelector("#progressPercent");
const statusMessage = document.querySelector("#statusMessage");
const qrImage = document.querySelector("#qrImage");
const qrUrl = document.querySelector("#qrUrl");

let selectedFiles = [];
let isUploading = false;

init();

function init() {
  setupDragAndDrop();
  setupQrCode();

  fileInput.addEventListener("change", () => {
    if (!isUploading) {
      addFiles(fileInput.files);
    }

    fileInput.value = "";
  });

  uploadForm.addEventListener("submit", handleUpload);
  clearFilesButton.addEventListener("click", clearSelectedFiles);
}

function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      if (!isUploading) {
        dropZone.classList.add("is-dragover");
      }
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    if (!isUploading) {
      addFiles(event.dataTransfer.files);
    }
  });
}

function setupQrCode() {
  const pageUrl = window.location.href.split(/[?#]/)[0];
  const qrApiUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&data=${encodeURIComponent(pageUrl)}`;

  qrImage.src = qrApiUrl;
  qrUrl.textContent = pageUrl;

  qrImage.addEventListener("error", () => {
    qrImage.hidden = true;
    qrUrl.textContent = `QR kod trenutno nije dostupan. Otvorite: ${pageUrl}`;
  });
}

function addFiles(fileListToAdd) {
  const incomingFiles = Array.from(fileListToAdd);
  const validationErrors = [];

  incomingFiles.forEach((file) => {
    const extension = getFileExtension(file.name);
    const alreadySelected = selectedFiles.some((selectedFile) => {
      return (
        selectedFile.name === file.name &&
        selectedFile.size === file.size &&
        selectedFile.lastModified === file.lastModified
      );
    });

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      validationErrors.push(`${file.name}: format nije podržan.`);
      return;
    }

    if (file.size === 0) {
      validationErrors.push(`${file.name}: fajl je prazan.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      validationErrors.push(`${file.name}: fajl je veći od 50 MB.`);
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
  fileList.replaceChildren();

  selectedFiles.forEach((file) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const size = document.createElement("span");

    name.className = "file-name";
    name.textContent = file.name;
    name.title = file.name;
    size.className = "file-size";
    size.textContent = formatBytes(file.size);

    item.append(name, size);
    fileList.appendChild(item);
  });

  const filesLength = selectedFiles.length;
  const selectedTotalSize = selectedFiles.reduce(
    (total, file) => total + file.size,
    0
  );

  fileSummary.hidden = filesLength === 0;
  uploadButton.disabled = isUploading || filesLength === 0;
  clearFilesButton.disabled = isUploading || filesLength === 0;
  fileCount.textContent = `${filesLength} ${getFileWord(filesLength)}`;
  totalSize.textContent = `${formatBytes(selectedTotalSize)} ukupno`;
}

async function handleUpload(event) {
  event.preventDefault();

  if (isUploading) {
    return;
  }

  if (selectedFiles.length === 0) {
    showStatus("Prvo izaberite fajlove.", "error");
    return;
  }

  const uploadQueue = [...selectedFiles];
  let uploadedCount = 0;
  let currentFile = null;

  setUploadingState(true);
  progressWrap.hidden = false;
  showStatus("", "");

  try {
    for (let index = 0; index < uploadQueue.length; index += 1) {
      currentFile = uploadQueue[index];

      updateProgress(
        Math.round((uploadedCount / uploadQueue.length) * 100),
        `Priprema ${index + 1} od ${uploadQueue.length}: ${currentFile.name}`
      );

      await nextPaint();
      await uploadFile(currentFile);

      uploadedCount += 1;
      selectedFiles = selectedFiles.filter((file) => file !== currentFile);
      renderFiles();

      updateProgress(
        Math.round((uploadedCount / uploadQueue.length) * 100),
        `Poslano ${uploadedCount} od ${uploadQueue.length}`
      );
    }

    showStatus(
      "Hvala! Vaše uspomene su uspješno uploadovane ❤️",
      "success"
    );
  } catch (error) {
    console.error("Upload nije uspio:", error);

    const completedMessage =
      uploadedCount > 0
        ? ` ${uploadedCount} ${getFileWord(uploadedCount)} je već uspješno poslano.`
        : "";

    showStatus(
      `${currentFile?.name || "Fajl"}: ${getUploadErrorMessage(error)}${completedMessage}`,
      "error"
    );

    updateProgress(
      Math.round((uploadedCount / uploadQueue.length) * 100),
      "Upload je zaustavljen"
    );
  } finally {
    setUploadingState(false);
  }
}

async function uploadFile(file) {
  const base64 = await toBase64(file);
  const separatorIndex = base64.indexOf(",");

  if (separatorIndex === -1) {
    throw new UploadError("read", "Fajl nije moguće pripremiti za slanje.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    UPLOAD_TIMEOUT_MS
  );

  let response;

  try {
    response = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
        uploadId: createUploadId(file),
        file: base64.slice(separatorIndex + 1)
      }),
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new UploadError(
        "timeout",
        "Slanje je trajalo duže od 5 minuta. Provjerite internet vezu i pokušajte ponovo."
      );
    }

    throw new UploadError(
      "network",
      "Nije moguće povezati se sa serverom. Provjerite internet vezu i pokušajte ponovo."
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new UploadError(
      "http",
      `Server je vratio grešku ${response.status}. Pokušajte ponovo.`
    );
  }

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new UploadError(
      "response",
      "Server nije vratio ispravan odgovor. Pokušajte ponovo."
    );
  }

  if (result.success !== true) {
    throw new UploadError(
      "server",
      result.message || "Server nije prihvatio fajl. Pokušajte ponovo."
    );
  }

  return result;
}

function setUploadingState(uploading) {
  isUploading = uploading;
  uploadForm.setAttribute("aria-busy", String(uploading));
  fileInput.disabled = uploading;
  clearFilesButton.disabled = uploading;
  dropZone.classList.toggle("is-disabled", uploading);
  dropZone.setAttribute("aria-disabled", String(uploading));
  renderFiles();
}

function clearSelectedFiles() {
  if (isUploading) {
    return;
  }

  selectedFiles = [];
  renderFiles();
  showStatus("", "");
  progressWrap.hidden = true;
  updateProgress(0, "Priprema upload-a...");
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type || ""}`.trim();
  statusMessage.setAttribute("role", type === "error" ? "alert" : "status");
  statusMessage.setAttribute(
    "aria-live",
    type === "error" ? "assertive" : "polite"
  );
}

function updateProgress(percent, label) {
  const safePercent = Math.max(0, Math.min(100, percent));

  progressBar.style.width = `${safePercent}%`;
  progressPercent.textContent = `${safePercent}%`;
  progressLabel.textContent = label;
  progressTrack.setAttribute("aria-valuenow", String(safePercent));
  progressTrack.setAttribute("aria-valuetext", `${safePercent}%. ${label}`);
}

function getUploadErrorMessage(error) {
  if (error instanceof UploadError) {
    return error.message;
  }

  return "Upload nije uspio. Pokušajte ponovo.";
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
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
      new UploadError("read", "Fajl nije moguće pročitati.")
    );
    reader.onabort = () => reject(
      new UploadError("read", "Čitanje fajla je prekinuto.")
    );

    reader.readAsDataURL(file);
  });
}

function createUploadId(file) {
  const randomPart = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return `${file.lastModified}-${file.size}-${randomPart}`;
}

function nextPaint() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

class UploadError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}
