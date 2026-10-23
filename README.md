# X Likes Automator

https://github.com/paladini/x-likes-automator

Extensão Manifest V3, sem etapa de build. Autor: Fernando Paladini. Licença: MIT.

## Português

O X Likes Automator curte posts visíveis que ainda não foram curtidos. Ele age só na aba do X (ou do Twitter) que você já deixou aberta e na qual você já entrou. Não pede senha, não lê cookies e não usa token da API do X.

A sessão não tem um teto fixo de 30 curtidas. O padrão é sem limite, até você parar. Dá para ligar um limite numérico nas configurações. Se a aba ficar oculta ou a janela perder o foco, a curtida para na hora. Quando a aba volta, a mesma sessão continua, com a mesma contagem.

### Carregar sem compactação

Não há build. Abra a pasta que contém o `manifest.json`.

No Chrome:

1. Abra `chrome://extensions`.
2. Ative o Modo do desenvolvedor.
3. Clique em Carregar sem compactação.
4. Selecione esta pasta.

No Brave:

1. Abra `brave://extensions`.
2. Ative o Modo do desenvolvedor.
3. Clique em Carregar sem compactação.
4. Selecione esta pasta.

### Configurações

O popup, em português, guarda as opções em `chrome.storage.local`.

- Intervalo entre curtidas: um inteiro de 1 a 60 segundos. O padrão é 5. Há uma variação pequena para baixo, dentro do intervalo escolhido.
- Sem limite de curtidas: ligado por padrão. Desligue para definir um limite opcional nesta sessão.
- Curtir o post original em uma thread de resposta: ligado por padrão. Na timeline, no perfil e na busca, os posts visíveis ainda não curtidos entram do mesmo jeito.

### Regras do X

Curtidas automáticas podem entrar em conflito com as regras do X. Você é responsável pelo uso.

## English

X Likes Automator likes visible posts that are not liked yet. It uses only the X or Twitter tab you already have open and where you are already logged in. It does not ask for a password, read cookies, or use an X API token.

There is no hardcoded cap of 30 likes. The default session is unlimited until you stop it. You can turn on an optional numeric cap in settings. If the tab is hidden or the window loses focus, liking pauses immediately. When the tab is active again, the same session resumes and the count stays.

### Load unpacked

There is no build step. Open the folder that contains `manifest.json`.

In Chrome:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select this folder.

In Brave:

1. Open `brave://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select this folder.

### Settings

The popup is in Brazilian Portuguese. Settings are stored in `chrome.storage.local`.

- Interval between likes: an integer from 1 to 60 seconds. The default is 5. A small variation stays inside the interval you chose.
- Unlimited likes: on by default. Turn it off to set an optional cap for this session.
- Also like the original post in a reply thread: on by default. On the home timeline, a profile, and search, visible posts that are not liked yet are still eligible.

### X's rules

Automated likes can conflict with X's rules. You are responsible for how you use this extension.

## License

MIT. Copyright (c) 2026 Fernando Paladini. See `LICENSE`.
