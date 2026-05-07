const VoiceRecorderUtils = window.VoiceRecorderUtils;

if (!VoiceRecorderUtils) {
    throw new Error('VoiceRecorderUtils não foi carregado.');
}

class VoiceRecorderApp {
    constructor() {
        this.storageKey = 'voiceMessages';
        this.categories = { ...VoiceRecorderUtils.defaultCategories };

        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentAudioBlob = null;
        this.currentAudioCompressed = false;
        this.previewAudioUrl = null;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.pendingAction = null;
        this.toastTimeout = null;
        this.exportProgressHideTimeout = null;

        this.initializeElements();
        this.bindEvents();
        this.normalizeStoredMessages();
        this.checkBrowserSupport();
        this.setupConnectivityMonitoring();
        this.registerServiceWorker();
        this.loadMessages();
    }

    initializeElements() {
        this.startRecordBtn = document.getElementById('startRecord');
        this.stopRecordBtn = document.getElementById('stopRecord');
        this.playRecordBtn = document.getElementById('playRecord');
        this.saveMessageBtn = document.getElementById('saveMessage');
        this.exportAllBtn = document.getElementById('exportAll');
        this.importAudioBtn = document.getElementById('importAudioBtn');
        this.importAudioInput = document.getElementById('importAudioInput');

        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.timer = document.getElementById('timer');
        this.audioPreview = document.getElementById('audioPreview');
        this.saveSection = document.getElementById('saveSection');
        this.messageTitle = document.getElementById('messageTitle');
        this.messageCategory = document.getElementById('messageCategory');
        this.importCategory = document.getElementById('importCategory');
        this.messagesList = document.getElementById('messagesList');
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.clearAllBtn = document.getElementById('clearAll');
        this.enableCompression = document.getElementById('enableCompression');
        this.connectivityStatus = document.getElementById('connectivityStatus');
        this.swStatus = document.getElementById('swStatus');

        this.confirmModal = document.getElementById('confirmModal');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmYes = document.getElementById('confirmYes');
        this.confirmNo = document.getElementById('confirmNo');
        this.exportProgressModal = document.getElementById('exportProgressModal');
        this.exportProgressTitle = document.getElementById('exportProgressTitle');
        this.exportProgressDetail = document.getElementById('exportProgressDetail');
        this.exportProgressTrack = document.getElementById('exportProgressTrack');
        this.exportProgressBar = document.getElementById('exportProgressBar');
        this.exportProgressPercent = document.getElementById('exportProgressPercent');
        this.exportProgressStep = document.getElementById('exportProgressStep');
        this.toast = document.getElementById('toast');
    }

    bindEvents() {
        this.startRecordBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
        this.playRecordBtn.addEventListener('click', () => this.playPreview());
        this.saveMessageBtn.addEventListener('click', () => this.saveMessage());
        this.exportAllBtn.addEventListener('click', () => this.exportAllMessages());

        this.importAudioBtn.addEventListener('click', () => this.importAudioInput.click());
        this.importAudioInput.addEventListener('change', (event) => this.handleImportFiles(event));

        this.searchInput.addEventListener('input', () => this.filterMessages());
        this.categoryFilter.addEventListener('change', () => this.filterMessages());
        this.clearAllBtn.addEventListener('click', () => this.confirmClearAll());

        this.confirmYes.addEventListener('click', () => this.executeConfirmedAction());
        this.confirmNo.addEventListener('click', () => this.hideModal());

        this.confirmModal.addEventListener('click', (event) => {
            if (event.target === this.confirmModal) {
                this.hideModal();
            }
        });

        this.messageTitle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.saveMessage();
            }
        });
    }

    checkBrowserSupport() {
        const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

        if (!hasMediaDevices || !hasMediaRecorder) {
            this.showToast('Seu navegador não suporta gravação de áudio', 'error');
            this.startRecordBtn.disabled = true;
            this.stopRecordBtn.disabled = true;
            return false;
        }

        return true;
    }

    setupConnectivityMonitoring() {
        this.updateConnectivityStatus();
        window.addEventListener('online', () => this.updateConnectivityStatus());
        window.addEventListener('offline', () => this.updateConnectivityStatus());
    }

    updateConnectivityStatus() {
        if (!this.connectivityStatus) {
            return;
        }

        const online = navigator.onLine;
        this.connectivityStatus.textContent = online ? 'Online' : 'Offline';
        this.connectivityStatus.classList.toggle('online', online);
        this.connectivityStatus.classList.toggle('offline', !online);
    }

    async registerServiceWorker() {
        if (!this.swStatus) {
            return;
        }

        if (!('serviceWorker' in navigator)) {
            this.swStatus.textContent = 'Service Worker não suportado';
            this.swStatus.classList.add('offline');
            return;
        }

        try {
            await navigator.serviceWorker.register('sw.js');
            await navigator.serviceWorker.ready;
            this.swStatus.textContent = 'Offline ativo';
            this.swStatus.classList.add('online');
            this.swStatus.classList.remove('offline');
        } catch (error) {
            console.error('Falha ao registrar Service Worker:', error);
            this.swStatus.textContent = 'Offline indisponível';
            this.swStatus.classList.add('offline');
            this.swStatus.classList.remove('online');
        }
    }

    generateId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    async startRecording() {
        if (!this.checkBrowserSupport()) {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            const mimeType = this.getSupportedMimeType();
            const recorderOptions = mimeType ? { mimeType } : undefined;
            this.mediaRecorder = recorderOptions ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream);

            this.audioChunks = [];
            this.isRecording = true;
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                try {
                    this.showToast('Processando áudio...', 'info');

                    const finalType = this.mediaRecorder.mimeType || mimeType || 'audio/webm';
                    const rawBlob = new Blob(this.audioChunks, { type: finalType });
                    const compressedResult = await this.maybeCompressAudioBlob(rawBlob);

                    this.currentAudioBlob = compressedResult.blob;
                    this.currentAudioCompressed = compressedResult.compressed;
                    this.setupAudioPreview();
                    this.showSaveSection();

                    if (compressedResult.compressed) {
                        this.showToast('Gravação comprimida e pronta para salvar.', 'success');
                    }
                } catch (error) {
                    console.error('Erro ao finalizar gravação:', error);
                    this.showToast('Erro ao processar o áudio gravado', 'error');
                } finally {
                    stream.getTracks().forEach((track) => track.stop());
                }
            };

            this.mediaRecorder.start(1000);
            this.updateUIForRecording();
            this.startTimer();
            this.showToast('Gravação iniciada!', 'success');
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            this.showToast('Erro ao acessar o microfone. Verifique as permissões.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateUIForStopped();
            this.stopTimer();
            this.showToast('Gravação finalizada!', 'success');
        }
    }

    playPreview() {
        if (this.currentAudioBlob) {
            this.audioPreview.play().catch((error) => {
                console.error('Erro ao reproduzir preview:', error);
                this.showToast('Não foi possível reproduzir a gravação', 'error');
            });
        }
    }

    setupAudioPreview() {
        if (!this.currentAudioBlob) {
            return;
        }

        if (this.previewAudioUrl) {
            URL.revokeObjectURL(this.previewAudioUrl);
        }

        this.previewAudioUrl = URL.createObjectURL(this.currentAudioBlob);
        this.audioPreview.src = this.previewAudioUrl;
        this.audioPreview.style.display = 'block';
        this.playRecordBtn.disabled = false;
    }

    async saveMessage() {
        const title = this.messageTitle.value.trim();
        const category = this.messageCategory.value || 'geral';

        if (!title) {
            this.showToast('Por favor, digite um título para a mensagem', 'error');
            this.messageTitle.focus();
            return;
        }

        if (!this.currentAudioBlob) {
            this.showToast('Nenhuma gravação para salvar', 'error');
            return;
        }

        try {
            const audioData = await this.blobToDataURL(this.currentAudioBlob);

            const message = {
                id: this.generateId(),
                title,
                category,
                date: new Date().toLocaleString('pt-BR'),
                duration: this.timer.textContent,
                audioData,
                mimeType: this.currentAudioBlob.type || 'audio/webm',
                size: this.currentAudioBlob.size,
                compressed: this.currentAudioCompressed
            };

            this.prependMessage(message);
            this.resetRecordingState();
            this.loadMessages();
            this.showToast('Mensagem salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar mensagem:', error);
            this.showToast('Erro ao salvar a mensagem', 'error');
        }
    }

    prependMessage(message) {
        const messages = this.getMessagesFromStorage();
        messages.unshift(this.normalizeMessage(message));
        localStorage.setItem(this.storageKey, JSON.stringify(messages));
    }

    prependMessages(messagesToAdd) {
        const messages = this.getMessagesFromStorage();
        const normalizedIncoming = messagesToAdd.map((message) => this.normalizeMessage(message));
        const merged = [...normalizedIncoming.reverse(), ...messages];
        localStorage.setItem(this.storageKey, JSON.stringify(merged));
    }

    normalizeStoredMessages() {
        const messages = this.getMessagesFromStorage();
        localStorage.setItem(this.storageKey, JSON.stringify(messages));
    }

    getMessagesFromStorage() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) {
            return [];
        }

        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.map((message) => this.normalizeMessage(message));
        } catch (error) {
            console.error('Erro ao ler mensagens salvas:', error);
            return [];
        }
    }

    normalizeMessage(message) {
        return VoiceRecorderUtils.normalizeMessage(message, {
            categories: this.categories,
            generateId: () => this.generateId(),
            now: () => new Date().toLocaleString('pt-BR')
        });
    }

    loadMessages() {
        this.applyFilters();
    }

    applyFilters() {
        const searchTerm = this.searchInput.value.trim().toLowerCase();
        const selectedCategory = this.categoryFilter.value;
        const messages = this.getMessagesFromStorage();
        const filteredMessages = VoiceRecorderUtils.filterMessages(messages, {
            searchTerm,
            selectedCategory,
            categories: this.categories
        });

        this.renderMessages(filteredMessages);
    }

    renderMessages(messages) {
        if (messages.length === 0) {
            this.messagesList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma mensagem encontrada.</p>
                    <p>Grave ou importe áudios para começar.</p>
                </div>
            `;
            return;
        }

        this.messagesList.innerHTML = messages.map((message) => {
            const categoryLabel = this.getCategoryLabel(message.category);
            const compressedLabel = message.compressed ? '<span class="message-badge">Comprimido</span>' : '';

            return `
                <div class="message-item" data-id="${message.id}">
                    <div class="message-header">
                        <div>
                            <div class="message-title">${this.escapeHtml(message.title)}</div>
                            <div class="message-meta">
                                <span class="message-category">${this.escapeHtml(categoryLabel)}</span>
                                ${compressedLabel}
                            </div>
                        </div>
                        <div class="message-date">${this.escapeHtml(message.date)}</div>
                    </div>
                    <div class="message-controls">
                        <button class="btn btn-play btn-small" onclick="app.playMessage('${message.id}')">
                            Reproduzir
                        </button>
                        <button class="btn btn-download btn-small" onclick="app.downloadMessage('${message.id}')">
                            Download
                        </button>
                        <button class="btn btn-danger btn-small" onclick="app.confirmDeleteMessage('${message.id}')">
                            Excluir
                        </button>
                        <div class="message-duration">${this.escapeHtml(message.duration)} • ${this.formatFileSize(message.size)}</div>
                    </div>
                    <audio class="message-audio" data-id="${message.id}" style="display: none;"></audio>
                </div>
            `;
        }).join('');
    }

    getCategoryLabel(category) {
        return this.categories[category] || this.categories.geral;
    }

    async playMessage(messageId) {
        const messages = this.getMessagesFromStorage();
        const message = messages.find((entry) => entry.id === messageId);

        if (!message || !message.audioData) {
            this.showToast('Mensagem não encontrada', 'error');
            return;
        }

        const audioElement = document.querySelector(`audio[data-id="${messageId}"]`);
        if (!audioElement) {
            this.showToast('Não foi possível abrir o player desta mensagem', 'error');
            return;
        }

        audioElement.src = message.audioData;
        try {
            await audioElement.play();
        } catch (error) {
            console.error('Erro ao reproduzir áudio:', error);
            this.showToast('Erro ao reproduzir a mensagem', 'error');
        }
    }

    async downloadMessage(messageId) {
        const messages = this.getMessagesFromStorage();
        const message = messages.find((entry) => entry.id === messageId);

        if (!message || !message.audioData) {
            this.showToast('Mensagem não encontrada', 'error');
            return;
        }

        this.showExportProgress({
            title: 'Convertendo para MP4',
            detail: `Preparando "${message.title}" para download.`,
            stepLabel: 'Preparando...',
            progress: 0.02
        });

        try {
            const audioBlob = this.dataURLToBlob(message.audioData);
            const mp4Blob = await this.convertBlobForMp4Download(audioBlob, {
                onProgress: ({ progress, stepLabel, detail }) => {
                    this.updateExportProgress({
                        title: 'Convertendo para MP4',
                        detail: detail || `Preparando "${message.title}" para download.`,
                        stepLabel: stepLabel || 'Convertendo',
                        progress
                    });
                }
            });
            const fileName = `${this.sanitizeFileName(message.title)}.mp4`;
            this.updateExportProgress({
                title: 'Download pronto',
                detail: `Abrindo a janela de download para "${message.title}".`,
                stepLabel: 'Finalizando',
                progress: 1
            });
            this.downloadBlob(mp4Blob, fileName);
            await this.wait(220);
            this.showToast('Download iniciado!', 'success');
        } catch (error) {
            console.error('Erro no download:', error);
            this.showToast(error.message || 'Erro ao fazer download da mensagem', 'error');
        } finally {
            this.hideExportProgress();
        }
    }

    async exportAllMessages() {
        const messages = this.getMessagesFromStorage();

        if (messages.length === 0) {
            this.showToast('Não há mensagens para exportar', 'error');
            return;
        }

        const exportableMessages = messages.filter((message) => message.audioData);
        if (exportableMessages.length === 0) {
            this.showToast('Não há mensagens com audio para exportar', 'error');
            return;
        }

        this.showExportProgress({
            title: 'Exportando mensagens em MP4',
            detail: `Preparando ${exportableMessages.length} arquivo(s) para download.`,
            stepLabel: 'Organizando fila...',
            progress: 0.01
        });

        let exportedCount = 0;

        try {
            for (const [index, message] of exportableMessages.entries()) {
                const position = index + 1;
                const itemLabel = `Arquivo ${position} de ${exportableMessages.length}`;

                this.updateExportProgress({
                    title: 'Exportando mensagens em MP4',
                    detail: `Preparando "${message.title}" para conversao.`,
                    stepLabel: `${itemLabel} • Na fila`,
                    progress: index / exportableMessages.length
                });

                const audioBlob = this.dataURLToBlob(message.audioData);
                const mp4Blob = await this.convertBlobForMp4Download(audioBlob, {
                    onProgress: ({ progress, stepLabel, detail }) => {
                        const safeProgress = Number.isFinite(progress) ? progress : 0;
                        const overallProgress = (index + safeProgress) / exportableMessages.length;

                        this.updateExportProgress({
                            title: 'Exportando mensagens em MP4',
                            detail: `${message.title} • ${detail || 'Convertendo audio para MP4.'}`,
                            stepLabel: `${itemLabel} • ${stepLabel || 'Convertendo'}`,
                            progress: overallProgress
                        });
                    }
                });

                const numberedPrefix = String(position).padStart(2, '0');
                const fileName = `${numberedPrefix}_${this.sanitizeFileName(message.title)}.mp4`;
                this.updateExportProgress({
                    title: 'Exportando mensagens em MP4',
                    detail: `Abrindo o download de "${message.title}".`,
                    stepLabel: `${itemLabel} • Finalizando`,
                    progress: (index + 1) / exportableMessages.length
                });
                this.downloadBlob(mp4Blob, fileName);
                exportedCount += 1;
                await this.wait(220);
            }

            this.updateExportProgress({
                title: 'Downloads prontos',
                detail: `${exportedCount} arquivo(s) MP4 enviado(s) para o navegador.`,
                stepLabel: 'Concluido',
                progress: 1
            });
            await this.wait(260);
            this.showToast(`Exportação concluída! ${exportedCount} arquivo(s) MP4.`, 'success');
        } catch (error) {
            console.error('Erro ao exportar mensagem:', error);
            this.showToast(error.message || 'Erro ao exportar mensagens em MP4', 'error');
        } finally {
            this.hideExportProgress();
        }

    }

    async handleImportFiles(event) {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) {
            return;
        }

        const category = this.importCategory.value || 'geral';
        let importedCount = 0;
        let skippedCount = 0;
        const importedMessages = [];

        this.importAudioBtn.disabled = true;
        this.showToast('Importando arquivos de áudio...', 'info');

        try {
            for (const file of files) {
                if (!file.type.startsWith('audio/')) {
                    skippedCount += 1;
                    continue;
                }

                const message = await this.buildMessageFromImportedFile(file, category);
                if (!message) {
                    skippedCount += 1;
                    continue;
                }

                importedMessages.push(message);
                importedCount += 1;
            }

            if (importedMessages.length > 0) {
                this.prependMessages(importedMessages);
                this.loadMessages();
            }

            if (importedCount > 0 && skippedCount === 0) {
                this.showToast(`${importedCount} arquivo(s) importado(s) com sucesso!`, 'success');
            } else if (importedCount > 0 && skippedCount > 0) {
                this.showToast(`${importedCount} importado(s), ${skippedCount} ignorado(s).`, 'info');
            } else {
                this.showToast('Nenhum arquivo de áudio válido foi importado', 'error');
            }
        } catch (error) {
            console.error('Erro ao importar áudios:', error);
            this.showToast('Erro ao importar arquivos de áudio', 'error');
        } finally {
            this.importAudioBtn.disabled = false;
            this.importAudioInput.value = '';
        }
    }

    async buildMessageFromImportedFile(file, category) {
        try {
            const compressionResult = await this.maybeCompressAudioBlob(file);
            const finalBlob = compressionResult.blob;
            const audioData = await this.blobToDataURL(finalBlob);
            const duration = await this.getAudioDuration(finalBlob);
            const title = file.name.replace(/\.[^/.]+$/, '') || `audio_${Date.now()}`;

            return {
                id: this.generateId(),
                title,
                category,
                date: new Date().toLocaleString('pt-BR'),
                duration,
                audioData,
                mimeType: finalBlob.type || file.type || 'audio/webm',
                size: finalBlob.size,
                compressed: compressionResult.compressed
            };
        } catch (error) {
            console.error('Erro ao preparar arquivo importado:', error);
            return null;
        }
    }

    async maybeCompressAudioBlob(audioBlob) {
        if (!this.enableCompression.checked) {
            return { blob: audioBlob, compressed: false };
        }

        if (audioBlob.size < 96 * 1024) {
            return { blob: audioBlob, compressed: false };
        }

        try {
            const compressedBlob = await this.compressAudioBlob(audioBlob);
            if (compressedBlob && compressedBlob.size > 0 && compressedBlob.size < audioBlob.size) {
                return { blob: compressedBlob, compressed: true };
            }
            return { blob: audioBlob, compressed: false };
        } catch (error) {
            console.error('Falha na compressão de áudio:', error);
            return { blob: audioBlob, compressed: false };
        }
    }

    async compressAudioBlob(audioBlob) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass || typeof MediaRecorder === 'undefined') {
            return audioBlob;
        }

        const decodeContext = new AudioContextClass();
        let decodedBuffer;

        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            decodedBuffer = await decodeContext.decodeAudioData(arrayBuffer);
        } finally {
            await decodeContext.close().catch(() => {});
        }

        const monoBuffer = this.convertToMonoBuffer(decodedBuffer);
        const renderedBuffer = await this.renderCompressedBuffer(monoBuffer);
        const encodedBlob = await this.encodeBufferWithMediaRecorder(renderedBuffer);

        return encodedBlob.size > 0 ? encodedBlob : audioBlob;
    }

    async convertBlobForMp4Download(audioBlob, options = {}) {
        const mp4MimeType = this.getPreferredMp4MimeType();
        const notifyProgress = typeof options.onProgress === 'function'
            ? options.onProgress
            : null;

        const emitProgress = (progress, stepLabel, detail) => {
            if (notifyProgress) {
                notifyProgress({
                    progress: Math.max(0, Math.min(1, progress)),
                    stepLabel,
                    detail
                });
            }
        };

        if (!mp4MimeType) {
            throw new Error('Seu navegador não suporta exportação em MP4.');
        }

        const sourceMimeType = (audioBlob.type || '').toLowerCase();
        emitProgress(0.06, 'Preparando', 'Lendo o audio salvo.');

        if (sourceMimeType.includes('mp4')) {
            emitProgress(1, 'MP4 pronto', 'O arquivo ja estava em MP4.');
            return audioBlob;
        }

        emitProgress(0.16, 'Decodificando', 'Preparando o audio para a conversao.');
        const decodedBuffer = await this.decodeAudioBlob(audioBlob);
        emitProgress(0.32, 'Codificando', 'Gerando o arquivo MP4.');
        const mp4Blob = await this.encodeBufferWithMediaRecorder(decodedBuffer, {
            mimeType: mp4MimeType,
            audioBitsPerSecond: 128000,
            unsupportedMessage: 'Seu navegador não suporta exportação em MP4.',
            onProgress: (encodingProgress) => {
                const normalizedProgress = 0.32 + (Math.max(0, Math.min(1, encodingProgress)) * 0.68);
                emitProgress(
                    normalizedProgress,
                    'Codificando',
                    `Gerando o arquivo MP4 (${Math.round(normalizedProgress * 100)}%).`
                );
            }
        });
        emitProgress(1, 'MP4 pronto', 'Arquivo convertido com sucesso.');
        return mp4Blob;
    }

    async decodeAudioBlob(audioBlob) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('Seu navegador não suporta conversão de áudio.');
        }

        const decodeContext = new AudioContextClass();

        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            return await decodeContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            throw new Error('Não foi possível converter este áudio para MP4.');
        } finally {
            await decodeContext.close().catch(() => {});
        }
    }

    convertToMonoBuffer(audioBuffer) {
        if (audioBuffer.numberOfChannels === 1) {
            return audioBuffer;
        }

        const offline = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
        const monoBuffer = offline.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
        const channelData = monoBuffer.getChannelData(0);

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
            const sourceData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < sourceData.length; i += 1) {
                channelData[i] += sourceData[i] / audioBuffer.numberOfChannels;
            }
        }

        return monoBuffer;
    }

    async renderCompressedBuffer(audioBuffer) {
        const targetSampleRate = Math.min(22050, audioBuffer.sampleRate);
        const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate);
        const offlineContext = new OfflineAudioContext(1, targetLength, targetSampleRate);

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        const lowPass = offlineContext.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 10000;

        const compressor = offlineContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        source.connect(lowPass);
        lowPass.connect(compressor);
        compressor.connect(offlineContext.destination);
        source.start(0);

        return offlineContext.startRendering();
    }

    async encodeBufferWithMediaRecorder(audioBuffer, options = {}) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const mimeType = options.mimeType || this.getPreferredCompressedMimeType();
        const audioBitsPerSecond = options.audioBitsPerSecond || 64000;
        const unsupportedMessage = options.unsupportedMessage || 'Codec comprimido não suportado neste navegador.';
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

        if (!AudioContextClass || !mimeType) {
            throw new Error(unsupportedMessage);
        }

        const audioContext = new AudioContextClass({ sampleRate: audioBuffer.sampleRate });
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(destination);

        const chunks = [];
        const recorder = new MediaRecorder(destination.stream, {
            mimeType,
            audioBitsPerSecond
        });

        return new Promise((resolve, reject) => {
            let progressInterval = null;

            const clearProgressInterval = () => {
                if (progressInterval) {
                    window.clearInterval(progressInterval);
                    progressInterval = null;
                }
            };

            const getSafeProgress = () => {
                if (!audioBuffer.duration || !Number.isFinite(audioBuffer.duration) || audioBuffer.duration <= 0) {
                    return 0;
                }

                return Math.max(0, Math.min(0.99, audioContext.currentTime / audioBuffer.duration));
            };

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onerror = (event) => {
                clearProgressInterval();
                reject(event.error || new Error('Erro ao codificar áudio comprimido.'));
            };

            recorder.onstop = async () => {
                clearProgressInterval();
                if (onProgress) {
                    onProgress(1);
                }
                await audioContext.close().catch(() => {});
                resolve(new Blob(chunks, { type: mimeType }));
            };

            source.onended = () => {
                if (recorder.state !== 'inactive') {
                    recorder.stop();
                }
            };

            try {
                if (onProgress) {
                    onProgress(0);
                }

                progressInterval = window.setInterval(() => {
                    if (onProgress) {
                        onProgress(getSafeProgress());
                    }
                }, 120);

                recorder.start(250);
                audioContext.resume().catch(() => {});
                source.start(0);
            } catch (error) {
                clearProgressInterval();
                audioContext.close().catch(() => {});
                reject(error);
            }
        });
    }

    getPreferredCompressedMimeType() {
        const preferredTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4'
        ];

        for (const type of preferredTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    getPreferredMp4MimeType() {
        if (typeof MediaRecorder === 'undefined') {
            return '';
        }

        const preferredTypes = [
            'audio/mp4;codecs=mp4a.40.2',
            'audio/mp4'
        ];

        for (const type of preferredTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    async getAudioDuration(blob) {
        return new Promise((resolve) => {
            const audio = document.createElement('audio');
            const url = URL.createObjectURL(blob);

            const cleanup = () => {
                URL.revokeObjectURL(url);
                audio.remove();
            };

            audio.preload = 'metadata';
            audio.src = url;

            audio.onloadedmetadata = () => {
                const value = Number.isFinite(audio.duration) ? audio.duration : 0;
                cleanup();
                resolve(this.formatDuration(value));
            };

            audio.onerror = () => {
                cleanup();
                resolve('00:00');
            };
        });
    }

    formatDuration(secondsTotal) {
        return VoiceRecorderUtils.formatDuration(secondsTotal);
    }

    async blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Falha ao converter áudio para base64.'));
            reader.readAsDataURL(blob);
        });
    }

    dataURLToBlob(dataURL) {
        return VoiceRecorderUtils.dataURLToBlob(dataURL);
    }

    extractMimeTypeFromDataURL(dataURL) {
        return VoiceRecorderUtils.extractMimeTypeFromDataURL(dataURL);
    }

    estimateSizeFromDataURL(dataURL) {
        return VoiceRecorderUtils.estimateSizeFromDataURL(dataURL);
    }

    getExtensionFromMimeType(mimeType) {
        return VoiceRecorderUtils.getExtensionFromMimeType(mimeType);
    }

    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.style.display = 'none';
        anchor.href = url;
        anchor.download = fileName;

        document.body.appendChild(anchor);
        anchor.click();

        setTimeout(() => {
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        }, 150);
    }

    wait(durationMs) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, durationMs);
        });
    }

    sanitizeFileName(fileName) {
        return VoiceRecorderUtils.sanitizeFileName(fileName);
    }

    formatFileSize(sizeInBytes) {
        return VoiceRecorderUtils.formatFileSize(sizeInBytes);
    }

    confirmDeleteMessage(messageId) {
        this.confirmMessage.textContent = 'Tem certeza que deseja excluir esta mensagem?';
        this.pendingAction = () => this.deleteMessage(messageId);
        this.showModal();
    }

    deleteMessage(messageId) {
        const messages = this.getMessagesFromStorage();
        const filteredMessages = messages.filter((message) => message.id !== messageId);
        localStorage.setItem(this.storageKey, JSON.stringify(filteredMessages));
        this.loadMessages();
        this.showToast('Mensagem excluída!', 'success');
    }

    confirmClearAll() {
        const messages = this.getMessagesFromStorage();
        if (messages.length === 0) {
            this.showToast('Não há mensagens para excluir', 'error');
            return;
        }

        this.confirmMessage.textContent = 'Tem certeza que deseja excluir TODAS as mensagens?';
        this.pendingAction = () => this.clearAllMessages();
        this.showModal();
    }

    clearAllMessages() {
        localStorage.removeItem(this.storageKey);
        this.loadMessages();
        this.showToast('Todas as mensagens foram excluídas!', 'success');
    }

    filterMessages() {
        this.applyFilters();
    }

    updateUIForRecording() {
        this.startRecordBtn.disabled = true;
        this.stopRecordBtn.disabled = false;
        this.playRecordBtn.disabled = true;
        this.recordingIndicator.classList.remove('hidden');
        this.hideSaveSection();
    }

    updateUIForStopped() {
        this.startRecordBtn.disabled = false;
        this.stopRecordBtn.disabled = true;
        this.recordingIndicator.classList.add('hidden');
    }

    showSaveSection() {
        this.saveSection.classList.remove('hidden');
        this.messageTitle.value = '';
        this.messageCategory.value = this.messageCategory.value || 'geral';
        this.messageTitle.focus();
    }

    hideSaveSection() {
        this.saveSection.classList.add('hidden');
    }

    resetRecordingState() {
        this.currentAudioBlob = null;
        this.currentAudioCompressed = false;

        if (this.previewAudioUrl) {
            URL.revokeObjectURL(this.previewAudioUrl);
            this.previewAudioUrl = null;
        }

        this.audioPreview.style.display = 'none';
        this.audioPreview.src = '';
        this.playRecordBtn.disabled = true;
        this.hideSaveSection();
        this.timer.textContent = '00:00';
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.recordingStartTime) {
                const elapsed = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getSupportedMimeType() {
        if (typeof MediaRecorder === 'undefined') {
            return '';
        }

        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    showModal() {
        this.confirmModal.classList.remove('hidden');
    }

    hideModal() {
        this.confirmModal.classList.add('hidden');
        this.pendingAction = null;
    }

    showExportProgress({ title, detail, stepLabel, progress = 0 } = {}) {
        if (!this.exportProgressModal) {
            return;
        }

        if (this.exportProgressHideTimeout) {
            clearTimeout(this.exportProgressHideTimeout);
            this.exportProgressHideTimeout = null;
        }

        this.exportProgressModal.classList.remove('hidden');
        this.exportProgressModal.setAttribute('aria-hidden', 'false');
        this.updateExportProgress({ title, detail, stepLabel, progress });
    }

    updateExportProgress({ title, detail, stepLabel, progress } = {}) {
        if (!this.exportProgressModal || this.exportProgressModal.classList.contains('hidden')) {
            return;
        }

        const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
        const progressPercent = Math.round(safeProgress * 100);

        if (typeof title === 'string' && this.exportProgressTitle) {
            this.exportProgressTitle.textContent = title;
        }

        if (typeof detail === 'string' && this.exportProgressDetail) {
            this.exportProgressDetail.textContent = detail;
        }

        if (typeof stepLabel === 'string' && this.exportProgressStep) {
            this.exportProgressStep.textContent = stepLabel;
        }

        if (this.exportProgressBar) {
            this.exportProgressBar.style.width = `${progressPercent}%`;
        }

        if (this.exportProgressPercent) {
            this.exportProgressPercent.textContent = `${progressPercent}%`;
        }

        if (this.exportProgressTrack) {
            this.exportProgressTrack.setAttribute('aria-valuenow', String(progressPercent));
        }
    }

    hideExportProgress() {
        if (!this.exportProgressModal) {
            return;
        }

        this.exportProgressHideTimeout = window.setTimeout(() => {
            this.exportProgressModal.classList.add('hidden');
            this.exportProgressModal.setAttribute('aria-hidden', 'true');
            this.exportProgressHideTimeout = null;
        }, 120);
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.hideModal();
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.classList.remove('hidden');

        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        this.toastTimeout = setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 3200);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceRecorderApp();
});
