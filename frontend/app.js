// Configuration - Use relative path for Docker (nginx proxy)
const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === ''
    ? '' // Docker: nginx proxies /kyc/ to backend
    : 'http://localhost:3000'; // Development: direct to backend

// State
let currentStep = 1;
let selectedCountry = 'EC';
let documentFrontFile = null;
let documentBackFile = null;
let selfieBlob = null;
let documentId = null;
let extractedDocumentData = null;
let cameraStream = null;

// DOM Elements
const steps = document.querySelectorAll('.step');
const stepLines = document.querySelectorAll('.step-line');
const stepCards = document.querySelectorAll('.step-card');

const userIdInput = document.getElementById('userId');
const countryBtns = document.querySelectorAll('.country-btn');

// Front document upload
const documentFrontUpload = document.getElementById('documentFrontUpload');
const documentFrontInput = document.getElementById('documentFrontInput');
const documentFrontPreview = document.getElementById('documentFrontPreview');

// Back document upload
const documentBackUpload = document.getElementById('documentBackUpload');
const documentBackInput = document.getElementById('documentBackInput');
const documentBackPreview = document.getElementById('documentBackPreview');

const submitDocumentBtn = document.getElementById('submitDocument');

// Camera elements
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const selfiePreview = document.getElementById('selfiePreview');
const startCameraBtn = document.getElementById('startCamera');
const capturePhotoBtn = document.getElementById('capturePhoto');
const retakePhotoBtn = document.getElementById('retakePhoto');

const submitSelfieBtn = document.getElementById('submitSelfie');
const backToStep1Btn = document.getElementById('backToStep1');
const dataGrid = document.getElementById('dataGrid');

const resultContainer = document.getElementById('resultContainer');
const startOverBtn = document.getElementById('startOver');

const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Country selection
    countryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            countryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCountry = btn.dataset.country;
        });
    });

    // Front document upload
    documentFrontUpload.addEventListener('click', () => documentFrontInput.click());
    documentFrontInput.addEventListener('change', handleDocumentFrontSelect);
    documentFrontUpload.addEventListener('dragover', handleDragOver);
    documentFrontUpload.addEventListener('dragleave', handleDragLeave);
    documentFrontUpload.addEventListener('drop', handleDocumentFrontDrop);

    // Back document upload
    documentBackUpload.addEventListener('click', () => documentBackInput.click());
    documentBackInput.addEventListener('change', handleDocumentBackSelect);
    documentBackUpload.addEventListener('dragover', handleDragOver);
    documentBackUpload.addEventListener('dragleave', handleDragLeave);
    documentBackUpload.addEventListener('drop', handleDocumentBackDrop);

    // Camera controls
    startCameraBtn.addEventListener('click', startCamera);
    capturePhotoBtn.addEventListener('click', capturePhoto);
    retakePhotoBtn.addEventListener('click', retakePhoto);

    // Buttons
    submitDocumentBtn.addEventListener('click', submitDocuments);
    submitSelfieBtn.addEventListener('click', submitSelfie);
    backToStep1Btn.addEventListener('click', () => {
        stopCamera();
        goToStep(1);
    });
    startOverBtn.addEventListener('click', resetVerification);
}

// File handling
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDocumentFrontDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.match(/^image\/(jpeg|png|jpg)$/)) {
        setDocumentFrontFile(file);
    } else {
        showToast('Please upload a JPEG or PNG image', 'error');
    }
}

function handleDocumentBackDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.match(/^image\/(jpeg|png|jpg)$/)) {
        setDocumentBackFile(file);
    } else {
        showToast('Please upload a JPEG or PNG image', 'error');
    }
}

function handleDocumentFrontSelect(e) {
    const file = e.target.files[0];
    if (file) setDocumentFrontFile(file);
}

function handleDocumentBackSelect(e) {
    const file = e.target.files[0];
    if (file) setDocumentBackFile(file);
}

function setDocumentFrontFile(file) {
    documentFrontFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        documentFrontPreview.src = e.target.result;
        documentFrontPreview.classList.remove('hidden');
        documentFrontUpload.querySelector('.upload-content').style.display = 'none';
        documentFrontUpload.classList.add('has-file');
    };
    reader.readAsDataURL(file);
    updateSubmitButtonState();
}

function setDocumentBackFile(file) {
    documentBackFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        documentBackPreview.src = e.target.result;
        documentBackPreview.classList.remove('hidden');
        documentBackUpload.querySelector('.upload-content').style.display = 'none';
        documentBackUpload.classList.add('has-file');
    };
    reader.readAsDataURL(file);
}

function updateSubmitButtonState() {
    submitDocumentBtn.disabled = !documentFrontFile;
}

// Camera functions
async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 }
        });
        cameraVideo.srcObject = cameraStream;
        cameraVideo.style.display = 'block';
        selfiePreview.classList.add('hidden');

        startCameraBtn.classList.add('hidden');
        capturePhotoBtn.disabled = false;
        capturePhotoBtn.classList.remove('hidden');
        retakePhotoBtn.classList.add('hidden');

        showToast('Camera started. Position your face and click capture.', 'success');
    } catch (error) {
        console.error('Camera error:', error);
        showToast('Could not access camera. Please allow camera permissions.', 'error');
    }
}

function capturePhoto() {
    const video = cameraVideo;
    const canvas = cameraCanvas;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
        selfieBlob = blob;
        selfiePreview.src = URL.createObjectURL(blob);
        selfiePreview.classList.remove('hidden');
        cameraVideo.style.display = 'none';

        capturePhotoBtn.classList.add('hidden');
        retakePhotoBtn.classList.remove('hidden');
        submitSelfieBtn.disabled = false;

        showToast('Photo captured! Click verify to continue.', 'success');
    }, 'image/jpeg', 0.9);

    stopCamera();
}

function retakePhoto() {
    selfieBlob = null;
    selfiePreview.classList.add('hidden');
    submitSelfieBtn.disabled = true;
    startCamera();
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// API calls
async function submitDocuments() {
    const userId = userIdInput.value.trim();
    if (!userId) {
        showToast('Please enter a User ID', 'error');
        return;
    }

    if (!documentFrontFile) {
        showToast('Please upload the front of your document', 'error');
        return;
    }

    showLoading('Processing documents with AWS Textract...');

    try {
        const formData = new FormData();
        formData.append('front', documentFrontFile);
        if (documentBackFile) {
            formData.append('back', documentBackFile);
        }
        formData.append('userId', userId);
        formData.append('country', selectedCountry);

        const response = await fetch(`${API_BASE_URL}/kyc/textract`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to process documents');
        }

        documentId = data.documentId;
        extractedDocumentData = data.data;

        displayExtractedData(data.data);
        goToStep(2);
        showToast('Documents processed successfully!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Failed to process documents', 'error');
    } finally {
        hideLoading();
    }
}

async function submitSelfie() {
    if (!selfieBlob) {
        showToast('Please capture a selfie', 'error');
        return;
    }

    if (!documentId) {
        showToast('Document ID not found. Please start over.', 'error');
        return;
    }

    showLoading('Verifying identity with AWS Rekognition...');

    const formData = new FormData();
    formData.append('selfie', selfieBlob, 'selfie.jpg');
    formData.append('documentId', documentId);

    try {
        const response = await fetch(`${API_BASE_URL}/kyc/selfieprove`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to verify identity');
        }

        displayResult(data);
        goToStep(3);
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Failed to verify identity', 'error');
    } finally {
        hideLoading();
    }
}

// Display functions
function displayExtractedData(data) {
    const frontData = data.front || {};
    const backData = data.back || {};

    const allFields = [
        { label: 'Document Number', value: frontData.id_number },
        { label: 'Surnames', value: frontData.surnames },
        { label: 'Names', value: frontData.names },
        { label: 'Nationality', value: frontData.nationality },
        { label: 'Date of Birth', value: frontData.birth_date },
        { label: 'Birth Place', value: frontData.birth_place },
        { label: 'Sex', value: frontData.sex },
        { label: 'Civil Status', value: frontData.civil_status || backData.civil_status },
        { label: 'Expiration Date', value: frontData.expiration_date || backData.expiration_date },
        { label: 'Father Name', value: backData.father_name },
        { label: 'Mother Name', value: backData.mother_name },
        { label: 'Issue Date', value: backData.issue_date },
        { label: 'Issue Place', value: backData.issue_place },
        { label: 'Blood Type', value: backData.blood_type },
        { label: 'Donor Status', value: backData.donor_status },
        { label: 'Fingerprint Code', value: backData.fingerprint_code },
    ];

    dataGrid.innerHTML = allFields
        .filter(f => f.value)
        .map(field => `
      <div class="data-item">
        <label>${field.label}</label>
        <span>${field.value}</span>
      </div>
    `).join('');
}

function displayResult(data) {
    const isApproved = data.status === 'approved';
    const similarity = data.similarity || 0;

    resultContainer.innerHTML = `
    <div class="result-icon ${isApproved ? 'success' : 'error'}">
      ${isApproved ? `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `}
    </div>
    <h2 class="result-title ${isApproved ? 'success' : 'error'}">
      ${isApproved ? '✅ Identity Verified!' : '❌ Verification Failed'}
    </h2>
    <p class="result-message">${data.message}</p>
    
    <div class="result-details">
      <h4>Verification Details</h4>
      <div class="similarity-value ${isApproved ? 'success' : 'error'}">
        ${similarity.toFixed(1)}%
      </div>
      <p>Face Similarity Score</p>
      <div class="similarity-bar">
        <div class="similarity-fill ${isApproved ? 'success' : 'error'}" style="width: ${similarity}%"></div>
      </div>
      <p style="font-size: 0.75rem; color: var(--gray-500);">
        Threshold: 85% | ${isApproved ? 'Above' : 'Below'} threshold
      </p>
    </div>
  `;
}

// Step navigation
function goToStep(step) {
    currentStep = step;

    steps.forEach((s, index) => {
        s.classList.remove('active', 'completed');
        if (index + 1 < step) {
            s.classList.add('completed');
        } else if (index + 1 === step) {
            s.classList.add('active');
        }
    });

    stepLines.forEach((line, index) => {
        line.classList.remove('completed');
        if (index + 1 < step) {
            line.classList.add('completed');
        }
    });

    stepCards.forEach(card => card.classList.add('hidden'));
    document.getElementById(`step${step}`).classList.remove('hidden');
}

function resetVerification() {
    stopCamera();

    // Reset state
    documentFrontFile = null;
    documentBackFile = null;
    selfieBlob = null;
    documentId = null;
    extractedDocumentData = null;

    // Reset front document upload
    documentFrontInput.value = '';
    documentFrontPreview.src = '';
    documentFrontPreview.classList.add('hidden');
    documentFrontUpload.querySelector('.upload-content').style.display = 'flex';
    documentFrontUpload.classList.remove('has-file');

    // Reset back document upload
    documentBackInput.value = '';
    documentBackPreview.src = '';
    documentBackPreview.classList.add('hidden');
    documentBackUpload.querySelector('.upload-content').style.display = 'flex';
    documentBackUpload.classList.remove('has-file');

    submitDocumentBtn.disabled = true;

    // Reset camera
    selfiePreview.classList.add('hidden');
    cameraVideo.style.display = 'none';
    startCameraBtn.classList.remove('hidden');
    capturePhotoBtn.classList.add('hidden');
    retakePhotoBtn.classList.add('hidden');
    submitSelfieBtn.disabled = true;

    goToStep(1);
}

// UI helpers
function showLoading(text = 'Processing...') {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
