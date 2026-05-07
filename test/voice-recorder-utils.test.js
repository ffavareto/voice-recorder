const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('../voice-recorder-utils.js');

test('normalizeMessage preenche campos ausentes e infere mime e tamanho', () => {
    const audioData = 'data:audio/ogg;base64,QUJD';
    const message = normalizeMessage(
        {
            audioData,
            category: 'inexistente'
        },
        {
            categories: defaultCategories,
            generateId: () => 'generated-id',
            now: () => '07/05/2026 13:30:00'
        }
    );

    assert.deepEqual(message, {
        id: 'generated-id',
        title: 'Mensagem sem título',
        category: 'geral',
        date: '07/05/2026 13:30:00',
        duration: '00:00',
        audioData,
        mimeType: 'audio/ogg',
        size: 3,
        compressed: false
    });
});

test('filterMessages combina busca textual e filtro por categoria', () => {
    const messages = [
        { title: 'Daily', date: '07/05/2026', category: 'trabalho' },
        { title: 'Ideia de produto', date: '08/05/2026', category: 'ideias' },
        { title: 'Lembrete', date: '09/05/2026', category: 'pessoal' }
    ];

    const filtered = filterMessages(messages, {
        searchTerm: 'ideia',
        selectedCategory: 'ideias',
        categories: defaultCategories
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, 'Ideia de produto');
});

test('formatDuration normaliza valores inválidos e formata minutos/segundos', () => {
    assert.equal(formatDuration(-10), '00:00');
    assert.equal(formatDuration(125.8), '02:05');
});

test('dataURLToBlob converte base64 para Blob preservando o mime type', async () => {
    const blob = dataURLToBlob('data:text/plain;base64,SGVsbG8=');

    assert.equal(blob.type, 'text/plain');
    assert.equal(await blob.text(), 'Hello');
});

test('extractMimeTypeFromDataURL e estimateSizeFromDataURL tratam entradas inválidas', () => {
    assert.equal(extractMimeTypeFromDataURL('data:audio/webm;base64,QUJDRA=='), 'audio/webm');
    assert.equal(extractMimeTypeFromDataURL('conteudo-invalido'), '');
    assert.equal(estimateSizeFromDataURL('data:audio/webm;base64,QUJDRA=='), 6);
    assert.equal(estimateSizeFromDataURL(null), 0);
});

test('getExtensionFromMimeType mapeia formatos conhecidos e fallback', () => {
    assert.equal(getExtensionFromMimeType('audio/mpeg'), 'mp3');
    assert.equal(getExtensionFromMimeType('audio/mp4'), 'm4a');
    assert.equal(getExtensionFromMimeType('audio/webm;codecs=opus'), 'webm');
    assert.equal(getExtensionFromMimeType('application/octet-stream'), 'audio');
});

test('sanitizeFileName remove acentos, caracteres inválidos e aplica fallback', () => {
    assert.equal(sanitizeFileName(' Reunião #1 / MVP '), 'reuniao_1_mvp');
    assert.equal(sanitizeFileName(''), 'mensagem_de_voz');
});

test('formatFileSize exibe bytes, KB e MB', () => {
    assert.equal(formatFileSize(0), '0 KB');
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(2048), '2.0 KB');
    assert.equal(formatFileSize(3 * 1024 * 1024), '3.0 MB');
});
