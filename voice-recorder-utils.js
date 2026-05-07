(function (root, factory) {
    const utils = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = utils;
    }

    root.VoiceRecorderUtils = utils;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const defaultCategories = Object.freeze({
        geral: 'Geral',
        trabalho: 'Trabalho',
        pessoal: 'Pessoal',
        estudos: 'Estudos',
        ideias: 'Ideias'
    });

    function formatDuration(secondsTotal) {
        const safeSeconds = Math.max(0, Math.floor(secondsTotal));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function decodeBase64(base64Value) {
        if (typeof atob === 'function') {
            return atob(base64Value);
        }

        if (typeof Buffer !== 'undefined') {
            return Buffer.from(base64Value, 'base64').toString('binary');
        }

        throw new Error('Ambiente sem suporte para decodificação Base64.');
    }

    function dataURLToBlob(dataURL) {
        const parts = String(dataURL || '').split(',');
        if (parts.length !== 2) {
            throw new Error('DataURL inválida.');
        }

        const mimeMatch = parts[0].match(/data:(.*?);base64/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = decodeBase64(parts[1]);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    }

    function extractMimeTypeFromDataURL(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            return '';
        }

        const match = dataURL.match(/^data:(.*?);base64,/);
        return match ? match[1] : '';
    }

    function estimateSizeFromDataURL(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            return 0;
        }

        const base64 = dataURL.split(',')[1] || '';
        return Math.ceil((base64.length * 3) / 4);
    }

    function getExtensionFromMimeType(mimeType) {
        const mime = String(mimeType || '').toLowerCase();

        if (mime.includes('mpeg')) {
            return 'mp3';
        }
        if (mime.includes('wav')) {
            return 'wav';
        }
        if (mime.includes('ogg')) {
            return 'ogg';
        }
        if (mime.includes('mp4') || mime.includes('m4a')) {
            return 'm4a';
        }
        if (mime.includes('webm')) {
            return 'webm';
        }

        return 'audio';
    }

    function sanitizeFileName(fileName) {
        return String(fileName || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s_-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 60)
            .toLowerCase() || 'mensagem_de_voz';
    }

    function formatFileSize(sizeInBytes) {
        if (!sizeInBytes || sizeInBytes <= 0) {
            return '0 KB';
        }
        if (sizeInBytes < 1024) {
            return `${sizeInBytes} B`;
        }

        const kb = sizeInBytes / 1024;
        if (kb < 1024) {
            return `${kb.toFixed(1)} KB`;
        }

        return `${(kb / 1024).toFixed(1)} MB`;
    }

    function normalizeMessage(message, {
        categories = defaultCategories,
        generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        now = () => new Date().toLocaleString('pt-BR')
    } = {}) {
        const safeMessage = message || {};
        const category = categories[safeMessage.category] ? safeMessage.category : 'geral';
        const audioData = typeof safeMessage.audioData === 'string' ? safeMessage.audioData : '';
        const inferredMime = extractMimeTypeFromDataURL(audioData) || 'audio/webm';
        const size = Number.isFinite(safeMessage.size)
            ? safeMessage.size
            : estimateSizeFromDataURL(audioData);

        return {
            id: safeMessage.id ? String(safeMessage.id) : generateId(),
            title: safeMessage.title ? String(safeMessage.title) : 'Mensagem sem título',
            category,
            date: safeMessage.date ? String(safeMessage.date) : now(),
            duration: safeMessage.duration ? String(safeMessage.duration) : '00:00',
            audioData,
            mimeType: safeMessage.mimeType ? String(safeMessage.mimeType) : inferredMime,
            size,
            compressed: Boolean(safeMessage.compressed)
        };
    }

    function filterMessages(messages, {
        searchTerm = '',
        selectedCategory = 'all',
        categories = defaultCategories
    } = {}) {
        const normalizedSearchTerm = String(searchTerm || '').trim().toLowerCase();

        return (Array.isArray(messages) ? messages : []).filter((message) => {
            const category = categories[message?.category] ? message.category : 'geral';
            const categoryLabel = (categories[category] || categories.geral || '').toLowerCase();
            const title = String(message?.title || '').toLowerCase();
            const date = String(message?.date || '').toLowerCase();
            const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
            const matchesSearch = !normalizedSearchTerm
                || title.includes(normalizedSearchTerm)
                || date.includes(normalizedSearchTerm)
                || categoryLabel.includes(normalizedSearchTerm);

            return matchesCategory && matchesSearch;
        });
    }

    return {
        defaultCategories,
        normalizeMessage,
        filterMessages,
        formatDuration,
        dataURLToBlob,
        extractMimeTypeFromDataURL,
        estimateSizeFromDataURL,
        getExtensionFromMimeType,
        sanitizeFileName,
        formatFileSize
    };
}));
