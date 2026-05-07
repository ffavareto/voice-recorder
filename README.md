# Gravador de Mensagens de Voz

Aplicação web para gravar, importar, organizar e exportar áudios diretamente no navegador.

## Funcionalidades

- Gravação de áudio com MediaRecorder
- Reprodução das mensagens salvas
- Exportação individual de mensagem
- Exportação em lote de todas as mensagens
- Importação de arquivos de áudio existentes
- Categorização de mensagens
- Busca por texto e filtro por categoria
- Compressão automática opcional de áudio
- Armazenamento local com localStorage
- Suporte offline com Service Worker

## Checklist de Entrega

- [x] Exportar mensagens para arquivos de áudio
- [x] Importar arquivos de áudio existentes
- [x] Categorização de mensagens
- [x] Compressão de áudio
- [x] Suporte offline com Service Workers

## Como usar

1. Execute a aplicação em um servidor local (necessário para Service Worker):

```bash
python3 -m http.server 8080
```

2. Abra http://localhost:8080 no navegador.
3. Clique em Iniciar Gravação para capturar um novo áudio.
4. Pare a gravação, escolha título e categoria, e salve.
5. Use Importar Áudios para carregar arquivos existentes.
6. Use Exportar Tudo para baixar todas as mensagens salvas.
7. Utilize busca e filtro de categoria para localizar mensagens rapidamente.

## Compressão de áudio

- A opção Comprimir áudio automaticamente vem habilitada por padrão.
- A compressão usa Web Audio API + MediaRecorder com bitrate reduzido.
- Se o navegador não suportar o codec comprimido, o áudio original é preservado.

## Modo offline

- O Service Worker faz cache da aplicação (HTML, CSS e JavaScript).
- A interface mostra status de conectividade e status do modo offline.
- Em navegação sem rede, o app continua disponível com os recursos já em cache.

## Estrutura do projeto

```text
voice-recorder/
├── index.html
├── style.css
├── script.js
├── voice-recorder-utils.js
├── sw.js
├── test/
│   └── voice-recorder-utils.test.js
├── package.json
└── README.md
```

## Testes

Os testes unitários usam apenas recursos nativos do Node.js:

```bash
npm test
```

Eles cobrem a camada de utilitários reaproveitada pela interface, incluindo normalização, filtros, formatação e conversões de DataURL.

## Dados armazenados

Cada mensagem é salva localmente com:

- id
- título
- categoria
- data
- duração
- áudio em DataURL
- tipo MIME
- tamanho em bytes
- flag de compressão
