# 🎤 Gravador de Mensagens de Voz

Um webapp moderno e responsivo para gravar e armazenar mensagens de voz localmente no navegador.

## ✨ Funcionalidades

- **Gravação de Áudio**: Grave mensagens de voz diretamente pelo navegador
- **Armazenamento Local**: Todas as mensagens são salvas no localStorage do navegador
- **Reprodução**: Reproduza suas mensagens gravadas a qualquer momento- **Download MP3**: Baixe suas mensagens como arquivos MP3 para o dispositivo- **Organização**: Adicione títulos personalizados às suas mensagens
- **Busca**: Encontre rapidamente mensagens específicas
- **Interface Responsiva**: Funciona perfeitamente em desktop e mobile
- **Timer de Gravação**: Acompanhe o tempo de gravação em tempo real
- **Gerenciamento**: Exclua mensagens individuais ou todas de uma vez

## 🚀 Como Usar

1. **Abrir o Aplicativo**: Abra o arquivo `index.html` em um navegador moderno
2. **Permitir Acesso ao Microfone**: Quando solicitado, permita o acesso ao microfone
3. **Gravar**: Clique em "Iniciar Gravação" para começar a gravar
4. **Parar**: Clique em "Parar Gravação" quando terminar
5. **Reproduzir**: Use o botão "Reproduzir" para ouvir a gravação
7. **Gerenciar**: Use a seção "Mensagens Salvas" para:
7. **Gerenciar**: Use a seção "Mensagens Salvas" para:
   - Reproduzir mensagens
   - Fazer download como MP3
   - Excluir mensagens individuais ou todas
   - Fazer download como MP3
   - Excluir mensagens individuais ou todas
7. **Gerenciar**: Use a seção "Mensagens Salvas" para reproduzir ou excluir mensagens

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Estilização moderna com gradientes e animações
- **JavaScript ES6+**: Lógica da aplicação usando classes e async/await
- **Web APIs**:
  - MediaRecorder API: Para gravação de áudio
  - getUserMedia API: Para acesso ao microfone
  - localStorage API: Para armazenamento local
  - FileReader API: Para conversão de dados

## 📋 Requisitos

- Navegador moderno com suporte às Web APIs (Chrome, Firefox, Safari, Edge)
- Microfone funcional
- Permissão para acesso ao microfone

## 🔧 Estrutura do Projeto

```
voice-recorder/
├── index.html          # Página principal
├── style.css           # Estilos da aplicação
├── script.js           # Lógica JavaScript
└── README.md           # Documentação
```

## 💾 Armazenamento

As mensagens são armazenadas localmente no navegador usando localStorage. Cada mensagem contém:

- **ID único**: Timestamp da criação
- **Título**: Nome personalizado da mensagem
- **Data**: Data e hora da gravação
- **Duração**: Tempo total da gravação
- **Dados de Áudio**: Arquivo de áudio em formato base64

## ⬇️ Download de Áudios

A funcionalidade de download permite salvar suas mensagens como arquivos MP3:

- **Formato**: Os arquivos são baixados com extensão .mp3
- **Nome do Arquivo**: Baseado no título da mensagem (caracteres especiais são removidos)
- **Compatibilidade**: Funciona em todos os navegadores modernos
- **Qualidade**: Mantém a qualidade original da gravação

**Nota**: A conversão atual mantém o formato original do áudio com extensão .mp3. Para conversão real para MP3, seria necessário integrar uma biblioteca especializada como lamejs.

## 🎨 Características da Interface

- **Design Minimalista**: Interface extremamente clean e discreta
- **Cores Neutras**: Paleta monocromática baseada em tons de cinza
- **Sem Elementos Visuais**: Ausência total de emojis e ícones decorativos
- **Tipografia Limpa**: Fontes do sistema para máxima legibilidade
- **Responsiva**: Adapta-se perfeitamente a diferentes tamanhos de tela
- **Transições Sutis**: Animações mínimas e elegantes
- **Feedback Discreto**: Indicadores de status quase imperceptíveis
- **Acessibilidade**: Contraste adequado mantendo a sobriedade

## 🔒 Privacidade

- **100% Local**: Nenhum dado é enviado para servidores externos
- **Sem Rastreamento**: Não há coleta de dados pessoais
- **Controle Total**: Você tem controle completo sobre suas gravações

## 🐛 Solução de Problemas

### Microfone não funciona
- Verifique se o microfone está conectado e funcionando
- Certifique-se de que deu permissão para o site acessar o microfone
- Teste em outro navegador

### Mensagens não salvam
- Verifique se o localStorage está habilitado no navegador
- Certifique-se de que há espaço suficiente no armazenamento local
- Tente limpar o cache do navegador

### Áudio não reproduz
- Verifique se os alto-falantes/fones estão funcionando
- Teste com outras mensagens
- Verifique o volume do sistema
- [x] Download de mensagens como arquivos MP3
- [ ] Conversão real para MP3 usando bibliotecas especializadas (lamejs)
- [ ] Exportar múltiplas mensagens em lote
## 🔄 Futuras Melhorias

- [ ] Exportar mensagens para arquivos de áudio
- [ ] Importar arquivos de áudio existentes
- [ ] Categorização de mensagens
- [ ] Backup e sincronização
- [ ] Compressão de áudio
- [ ] Suporte offline com Service Workers
- [ ] Edição básica de áudio
- [ ] Compartilhamento de mensagens

## 📱 Compatibilidade

| Navegador | Desktop | Mobile |
|-----------|---------|--------|
| Chrome    | ✅      | ✅     |
| Firefox   | ✅      | ✅     |
| Safari    | ✅      | ✅     |
| Edge      | ✅      | ✅     |

## 📄 Licença

Este projeto é de código aberto e pode ser usado livremente para fins pessoais e educacionais.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir novas funcionalidades
- Melhorar a documentação
- Otimizar o código

---

**Desenvolvido com ❤️ para facilitar a gravação e organização de mensagens de voz**