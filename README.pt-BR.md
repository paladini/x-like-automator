<div align="center">

# X Likes Automator

**Curtir automaticamente os posts visíveis no X (Twitter) — direto na aba que você já tem aberta.**

[![Licença: MIT](https://img.shields.io/badge/Licença-MIT-yellow.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Manifest%20V3-suportado-brightgreen)
![Build](https://img.shields.io/badge/build-nenhum-blue)
![Versão](https://img.shields.io/badge/versão-1.0.0-lightgrey)

[English](README.md) · **Português**

</div>

---

O **X Likes Automator** é uma extensão Manifest V3 que clica no botão Curtir dos posts
visíveis que ainda não foram curtidos. Ele age apenas na aba do X (ou do Twitter) que
você já deixou aberta e na qual você já entrou. Não pede senha, não lê cookies e não
usa token da API do X — ele simplesmente usa a página como você usaria, no ritmo que
você configurar.

- **Repositório:** <https://github.com/paladini/x-likes-automator>
- **Versão:** [v1.0.0](https://github.com/paladini/x-likes-automator/releases/tag/v1.0.0)
- **Autor:** Fernando Paladini
- **Licença:** MIT

> [!AVISO]
> Curtidas automáticas podem entrar em conflito com as regras do X e com os Termos de Serviço. Você é responsável pelo uso. Sua conta pode sofrer limitações de ritmo, restrições ou suspensão. Leia o [Aviso completo](#aviso--regras-do-x) antes de rodar uma sessão.

---

## Sumário

- [Recursos](#recursos)
- [Como funciona](#como-funciona)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Tutorial — sua primeira sessão](#tutorial--sua-primeira-sessão)
- [Referência das configurações](#referência-das-configurações)
- [Mensagens de status](#mensagens-de-status)
- [Páginas suportadas e não suportadas](#páginas-suportadas-e-não-suportadas)
- [Comportamentos que você deve conhecer](#comportamentos-que-você-deve-conhecer)
- [Privacidade e segurança](#privacidade-e-segurança)
- [Solução de problemas](#solução-de-problemas)
- [Desenvolvimento](#desenvolvimento)
- [Contribuindo](#contribuindo)
- [Aviso — regras do X](#aviso--regras-do-x)
- [Licença](#licença)

---

## Recursos

| | |
|---|---|
| **Curtir só o que é elegível** | Posts visíveis que ainda não foram curtidos. Posts já curtidos nunca são tocados, e um post nunca é curtido duas vezes na mesma sessão. |
| **Roda na sua aba aberta** | Usa a aba do X que você já deixou aberta e na qual você já entrou. Sem fluxo de login, sem credenciais, sem token de API. |
| **Ilimitado por padrão** | A sessão não tem um teto fixo de 30 curtidas. O padrão é sem limite, até você parar. Dá para ligar um limite opcional nas configurações (1 a 1.000.000). |
| **Ritmo humano** | As curtidas são espaçadas pelo intervalo configurado (1 a 60 segundos) com uma variação pequena aleatória, sempre dentro do intervalo escolhido. |
| **Pausa automática imediata** | Se a aba ficar oculta ou a janela perder o foco, a curtida para na hora. Quando a aba volta, a mesma sessão continua, com a mesma contagem. |
| **Rolagem e espera automáticas** | Quando não há post elegível à vista, a extensão rola a timeline atrás de novos posts e, quando acaba, espera com backoff exponencial (até 30 s). |
| **Consciente de thread** | Opção de curtir (ou pular) o post original em uma thread de resposta. Na timeline, no perfil e na busca, os posts visíveis ainda não curtidos entram do mesmo jeito. |
| **Compatível com interface EN/PT** | Detecta o estado do botão de curtida em inglês (`Like` / `Unlike`) e em português (`Curtir` / `Descurtir`), independente do idioma do seu X. |
| **Lista de recusa rígida** | A camada de política só permite a ação `like`. Repostar, responder, seguir, DM, login e coleta de cookies são recusados estruturalmente — a extensão não vira outra coisa por configuração. |
| **Zero build, zero dependências** | JavaScript puro, carregado sem compactação direto do repositório. Os testes rodam no test runner nativo do Node. |

O popup em si é em português do Brasil (`pt-BR`); todos os rótulos estão traduzidos na
[referência das configurações](#referência-das-configurações) abaixo.

---

## Como funciona

A extensão tem três partes que se movem:

```
┌────────────┐  mensagens runtime   ┌──────────────────┐  regras puras   ┌──────────────┐
│   popup    │ ◄───────────────────►│ content script   │ ──────────────► │  policy.js   │
│ (controles,│  start / stop /      │ (leitor +        │  planTick() /   │ (motor de     │
│  opções)   │  status              │  clicador do     │  applyPlan()    │  decisão)     │
└─────┬──────┘                     │  DOM)            │                 └──────────────┘
      │                            └─────────┬────────┘
      │      chrome.storage.local            │  chrome.storage.session
      └───────── configurações ──────────────┴── estado da sessão ao vivo ──┘
```

- **`lib/policy.js`** — um motor de decisão puro e totalmente testado. Valida as
  configurações, classifica a página atual (home, perfil, busca, thread de status ou
  não suportada), escolhe o próximo post elegível, calcula o próximo delay com
  variação e decide entre curtir, rolar, observar, esperar, pausar ou parar.
- **`content/content.js`** — um adaptador de DOM. Coleta os posts da página, lê o
  estado de cada botão de curtida, clica no botão do post escolhido pela política,
  rola quando precisa e escuta os eventos de visibilidade/foco. Não guarda nenhuma
  lógica de decisão própria.
- **`popup/popup.js`** — a interface de controle. Guarda as opções em
  `chrome.storage.local`, envia as mensagens `start` / `stop` ao content script e
  mostra o status da sessão espelhado em `chrome.storage.session`.

Um tick da sessão funciona assim:

```mermaid
sequenceDiagram
    participant U as Usuário
    participant P as Popup
    participant C as Content script
    participant S as chrome.storage

    U->>P: Clica "Iniciar"
    P->>S: Salva configurações (storage.local)
    P->>C: mensagem { type: "start" }
    C->>C: sessão = start() (contagem = 0)
    loop A cada tick (intervalo + variação)
        C->>C: lê posts visíveis, pede a próxima ação à política
        C->>C: clica Curtir no post elegível
        C->>S: publica o estado da sessão (storage.session)
    end
    U->>C: troca de aba / desfoca a janela
    C->>C: pausa na hora
    U->>C: volta para a aba do X
    C->>C: retoma — mesma sessão, mesma contagem
    U->>P: Clica "Parar"
    P->>C: mensagem { type: "stop" }
```

---

## Requisitos

- **Um navegador Chromium com suporte a Manifest V3:** Google Chrome, Brave ou
  Microsoft Edge. A extensão usa o seletor CSS `:has()` para detectar os posts, então
  é preciso **Chrome / Edge 105+** (ou um Brave atual).
- **Uma conta X logada** em uma aba normal do navegador. A extensão nunca faz login e
  nunca toca em credenciais.
- **Node.js não é necessário para rodar.** Node 20+ só para a suíte de testes.

---

## Instalação

Não há etapa de build. Baixe o zip da versão ou clone o repositório, e carregue essa pasta sem compactação. A extensão só curte posts na aba do X que você já deixou aberta. Ela não abre uma janela nova.

### Download

1. Baixe [x-likes-automator-1.0.0.zip](https://github.com/paladini/x-likes-automator/releases/download/v1.0.0/x-likes-automator-1.0.0.zip) na [versão v1.0.0](https://github.com/paladini/x-likes-automator/releases/tag/v1.0.0).
2. Extraia o zip. A pasta precisa ter o `manifest.json` na raiz.
3. Carregue essa pasta sem compactação, pelos passos abaixo.

### Google Chrome

1. Baixe ou clone este repositório:
   ```bash
   git clone https://github.com/paladini/x-likes-automator.git
   ```
2. Abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** (chave no canto superior direito).
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `x-likes-automator` — a que contém o `manifest.json`.
6. (Recomendado) Clique no ícone de quebra-cabeça da barra e **fixe** o *X Likes
   Automator* para o popup ficar a um clique.

### Brave

1. Abra `brave://extensions`.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta que contém o `manifest.json`.

### Microsoft Edge

1. Abra `edge://extensions`.
2. Ative o **Modo do desenvolvedor** (canto inferior esquerdo).
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta que contém o `manifest.json`.

---

## Tutorial — sua primeira sessão

Este passo a passo leva você de uma timeline vazia a uma sessão rodando, pausando e
parando, explicando cada controle pelo caminho.

### Passo 1 — Abra o X em uma aba e entre

Vá para `https://x.com/home` em uma aba normal e confirme que você está logado. Se
aparecer uma parede de login no lugar da timeline, a extensão detecta, mostra
**"Entre no X nesta aba para começar"** e reconfere a cada 2 segundos. Assim que você
entrar, uma sessão em andamento retoma sozinha.

### Passo 2 — Abra o popup

Clique no ícone fixo do *X Likes Automator*. O popup mostra:

- o **status** atual (começa em `Parado`),
- a **contagem de curtidas** da sessão,
- as quatro configurações da [referência abaixo](#referência-das-configurações).

> Abrir o popup **não** pausa a sessão. A extensão sabe que o popup está aberto e
> continua trabalhando enquanto você acompanha o contador.

### Passo 3 — Configure o ritmo

Deixe o **Intervalo entre curtidas** em `5` segundos para uma primeira rodada
conservadora. O delay real entre duas curtidas é aleatório entre **85% e 100% do
intervalo** (4,25–5 s para 5 s configurado), o que mantém o ritmo menos robótico. Um
intervalo de 1 s é 1 s constante.

### Passo 4 — Escolha um limite (ou não)

**Sem limite de curtidas** está **ligado por padrão**: a sessão roda até *você* parar.
Para usar um teto, desligue e defina o **Limite de curtidas nesta sessão** (padrão
100, aceito de 1 a 1.000.000). Ao atingir o limite, a sessão para sozinha e o popup
mostra **"Limite da sessão atingido"**. Apertar Iniciar abre uma sessão nova com a
contagem zerada.

### Passo 5 — Comportamento em thread de resposta

**Curtir o post original em uma thread de resposta** está **ligado por padrão**.
Quando a sessão roda em uma página de post único (`x.com/<usuario>/status/<id>`) com
respostas, a extensão trata o primeiro post não-resposta como o *original* da thread e
o curte junto com as respostas. Desligue para curtir só as respostas e deixar o
original quieto. Na timeline, no perfil e na busca essa opção não muda nada — todo
post visível ainda não curtido é elegível.

### Passo 6 — Aperte "Iniciar"

O status muda para **"Curtindo"**. A extensão percorre os posts visíveis na ordem da
página, clicando Curtir só nos posts ainda não curtidos, no ritmo configurado. Um post
já tratado na sessão nunca é curtido de novo, mesmo se você rolar para cima.

Se a aba ativa não for do X, Iniciar mostra **"Abra uma aba do X para iniciar."** e
nada mais acontece.

### Passo 7 — Deixe rodar: rolagem e espera

Quando todo post elegível da tela já foi curtido, a extensão rola cerca de 80% de uma
viewport (o documento ou a coluna primária do X, o que realmente rola) e observa os
posts recém-carregados. Se nada novo aparecer, espera com backoff exponencial — 2 s,
4 s, 8 s… com teto de 30 s — e o status mostra **"Aguardando novos posts"**. No
primeiro scroll ou carregamento que revelar algo elegível, ela curte na hora e o
backoff zera.

### Passo 8 — Pause e retome, automaticamente

Troque de aba, minimize a janela ou foque outro aplicativo: a curtida **pausa na
hora** e o status vira **"Pausado: a aba do X não está ativa"**. Clique de novo na aba
do X: a *mesma* sessão retoma com a *mesma* contagem. Não existe botão de retomar —
estar presente é o interruptor.

### Passo 9 — Pare a sessão

Clique **Parar**. O status volta para **Parado** e a contagem final continua visível no
popup. O estado da sessão vive em `chrome.storage.session`, então você pode reabrir o
popup mais tarde na mesma execução do navegador e ainda ver a contagem. Reiniciar o
navegador (ou apertar Iniciar de novo) começa uma sessão nova em 0.

### Passo 10 — Confira, ajuste, repita

Abra o popup no meio da sessão e veja o contador subir ao vivo. Ajuste o intervalo ou o
limite e aperte Iniciar de novo — as configurações são salvas a cada Iniciar e valem
para a nova sessão.

---

## Referência das configurações

Todas as opções são persistidas em `chrome.storage.local` e validadas antes de salvar.
Valores inválidos são recusados com erro inline no popup.

| Rótulo do popup | Tipo | Faixa | Padrão |
|---|---|---|---|
| Intervalo entre curtidas (segundos) | inteiro de segundos | 1 – 60 | 5 |
| Sem limite de curtidas | checkbox | ligado / desligado | **ligado** |
| Limite de curtidas nesta sessão (só vale com "sem limite" desligado) | inteiro | 1 – 1.000.000 | 100 |
| Curtir o post original em uma thread de resposta | checkbox | ligado / desligado | **ligado** |

Mensagens de validação mostradas pelo popup:

- *"O intervalo precisa ser um número inteiro de 1 a 60."*
- *"O limite precisa ser um número inteiro de 1 a 1000000."*

---

## Mensagens de status

A linha de status do popup mostra um destes sete estados.

| Popup | Significado |
|---|---|
| `Parado` | Nenhuma sessão em andamento. |
| `Curtindo` | A sessão está ativa e curtindo posts elegíveis. |
| `Pausado: a aba do X não está ativa` | Pausa automática: aba oculta ou janela sem foco. Retoma quando você volta. |
| `Aguardando novos posts` | Nada elegível à vista; a extensão está rolando/esperando (backoff até 30 s). |
| `Entre no X nesta aba para começar` | Parede de login detectada. Reconfere a cada 2 s. |
| `Limite da sessão atingido` | O limite opcional foi atingido; a sessão parou sozinha. |
| `Esta página do X não entra na curtida automática` | Você navegou para uma página não suportada. Reconfere a cada 2 s; voltar a uma página suportada retoma. |

---

## Páginas suportadas e não suportadas

O motor de política classifica a URL atual em uma *superfície*. Só estas estão elegíveis
para a curtida automática:

| Superfície | Exemplos | Observações |
|---|---|---|
| Timeline inicial | `x.com/`, `x.com/home` | O caso de uso clássico. |
| Resultados de busca | `x.com/search?q=…` | Os posts visíveis entram de cima para baixo conforme a rolagem. |
| Perfil | `x.com/<usuario>`, mais as abas `with_replies`, `media` e `likes` | Só há elegibilidade se o post ainda não foi curtido — na aba *Curtidas*, tudo já foi curtido, então nada novo será clicado. |
| Post único / thread | `x.com/<usuario>/status/<id>` | As respostas entram na ordem da página; o original segue a opção da thread. |

Todo o resto — `explore`, `notifications`, `messages`, `settings`, `compose` e
qualquer site fora do X — mostra **"Esta página do X não entra na curtida
automática"** e é reconfere a cada 2 segundos. Volte para uma página suportada e a
sessão continua exatamente de onde parou.

---

## Comportamentos que você deve conhecer

- **Regras de elegibilidade.** Um post só é curtido se estiver renderizado na página,
  ainda não curtido (pelo estado do botão), tiver id numérico de status e não tiver
  sido tratado nesta sessão. Posts citados e embutidos dentro de outro post são
  ignorados — só o post mais externo conta.
- **Visibilidade primeiro.** Antes de clicar, o post é rolado suavemente para a tela
  se estiver só parcialmente visível. Nada é clicado fora da tela.
- **Nunca descurte.** Posts já curtidos são pulados; o botão só é clicado quando seu
  estado é "ainda não curtido".
- **O popup nunca pausa a execução.** Abrir o popup marca a sessão como "popup
  aberto", o que sobrepõe a detecção de perda de foco (há ainda uma tolerância de
  200 ms para abrir o popup nunca disparar pausa).
- **Recarga total da página encerra a sessão.** O runner vive dentro da página.
  Navegação SPA (timeline → perfil → volta) mantém a sessão e a contagem, mas um F5
  reinjeta o content script e a sessão acaba — aperte Iniciar de novo.
- **O clique pode falhar transitoriamente** (o X re-renderizando o post); a extensão
  detecta, trata como "aguardando novos posts" e tenta de novo.
- **Sem histórico persistente de curtidas.** O `seenIds` é por sessão. Uma sessão nova
  pode reencontrar posts já curtidos antes — eles são simplesmente pulados porque já
  estão curtidos.

---

## Privacidade e segurança

A extensão declara o mínimo de APIs do Chrome de que precisa:

| Permissão | Para quê |
|---|---|
| `storage` | Guardar as opções (`storage.local`) e espelhar o estado da sessão ao vivo no popup (`storage.session`). |
| Acesso aos hosts: `https://x.com/*`, `https://twitter.com/*` | O content script precisa rodar nas páginas do X, e o popup precisa mandar mensagens a ele. |

O que ela **nunca** faz:

- ❌ Não lê nem escreve cookies, não vê senhas, não vê tokens de sessão, não usa chave da API do X.
- ❌ Não faz requisições de rede próprias — nada de `fetch`/XHR, analytics ou telemetria. Todo estado fica em `chrome.storage`.
- ❌ Não toca em outros sites. O content script só é injetado em `x.com` e `twitter.com`.
- ❌ Não executa ações inseguras, por construção. A política expõe uma lista de recusa (`repost`, `reply`, `follow`, `dm`, `login`, `collect_cookies`) e `allowedAction()` só retorna `true` para `"like"`.

---

## Solução de problemas

| Sintoma | Causa | Correção |
|---|---|---|
| *"Abra uma aba do X para iniciar."* | A aba ativa não é uma página do X. | Clique Iniciar com uma aba `x.com` / `twitter.com` ativa. |
| *"Recarregue a aba do X e toque em Iniciar de novo."* | O content script não está na página — a aba foi aberta antes de instalar ou atualizar a extensão. | Recarregue a aba do X (F5) e aperte Iniciar. |
| Status fica `Parado` depois de reiniciar o navegador | O estado da sessão vive em `chrome.storage.session`, que é limpo ao fechar o navegador (por design — nada sensível fica persistente). | Aperte Iniciar. As configurações sobrevivem; só o estado da execução é volátil. |
| Nada é curtido com status `Curtindo` | Todos os posts visíveis já foram curtidos, ou a página não tem post elegível. | A extensão rola e espera sozinha; confira a tabela de [páginas suportadas](#páginas-suportadas-e-não-suportadas). |
| `Pausado: a aba do X não está ativa` permanente | A aba do X não é a aba visível/focada. | Clique na aba do X. A sessão retoma com a mesma contagem. |
| `Esta página do X não entra na curtida automática` | Você navegou para explore/notificações/mensagens/configurações ou outro site. | Volte para home, busca, perfil ou thread. |
| Você editou o código e parece defasado | Extensões sem compactação guardam o script antigo nas abas já abertas. | Recarregue a extensão em `chrome://extensions` e **depois** recarregue a aba do X. |
| O X está num terceiro idioma e nada é curtido | A detecção do `aria-label` do botão cobre hoje inglês e português. | Troque o idioma do X para inglês ou português brasileiro, ou abra uma issue com o texto que você vê. |

---

## Desenvolvimento

Sem build, sem dependências de runtime. O repositório inteiro é a extensão.

```bash
git clone https://github.com/paladini/x-likes-automator.git
cd x-likes-automator
npm test        # roda node --test (Node 20+); sem etapa de instalação
```

### Estrutura do repositório

```
x-likes-automator/
├── manifest.json         # Manifest V3: permissões, content script, popup
├── lib/
│   └── policy.js         # Motor de decisão puro (validação, planejamento, regras de sessão)
├── content/
│   └── content.js        # Adaptador de DOM: coleta posts, clica Curtir, rola, escuta eventos
├── popup/
│   ├── popup.html        # Interface do popup (rótulos em português do Brasil)
│   ├── popup.css
│   └── popup.js          # Controlador: I/O das opções, mensagens de start/stop, status ao vivo
├── icons/                # Ícones de 16 / 32 / 48 / 128 px
├── test/                 # Suítes node:test: política, adaptador, popup, manifest, README, ícone
├── LICENSE               # MIT
├── README.md             # este arquivo (inglês)
└── README.pt-BR.md       # tradução para português do Brasil
```

### A regra de arquitetura que mantém os testes honestos

`lib/policy.js` é dono de toda decisão (um loop puro `planTick` → `applyPlan` sem
acesso a DOM), e `content/content.js` é dono de toda interação com o DOM atrás de
funções pequenas injetadas (`readSnapshot`, `clickLike`, `scrollBy`, `publish`,
`scheduler`). Essa costura é o que torna o motor inteiro testável em Node puro —
mantenha lógica de DOM fora da política e lógica de política fora do adaptador.

### Ciclo de desenvolvimento

1. Edite os arquivos (não há nada para compilar).
2. Rode `npm test`.
3. Carregue a pasta sem compactação como em [Instalação](#instalação).
4. Depois de mudar arquivos da extensão: clique em **Recarregar** no cartão da
   extensão em `chrome://extensions` e recarregue a aba do X.
5. Para experimentos rápidos de política, importe `lib/policy.js` no Node e chame
   `globalThis.XLikesPolicy.planTick(state)` direto — é livre de dependências.

---

## Contribuindo

Contribuições são bem-vindas. Fluxo sugerido:

1. Faça um fork do repositório e crie um ramo a partir de `main`.
2. Mantenha mudanças pequenas e focadas; um comportamento por pull request.
3. Adicione ou atualize um teste para cada mudança de comportamento — as suítes rodam
   em `node --test`, sem dependências.
4. Rode `npm test` e deixe tudo verde antes de abrir a PR.
5. Descreva o que mudou e como você verificou. Se mexeu nos seletores de DOM
   (`content/content.js` ou fixtures dos testes do popup), diga em qual variante da
   interface do X você testou.

Abra uma issue antes de qualquer coisa maior que um fix — a lista de recusa e o escopo
"só na aba aberta" são deliberados e improváveis de mudar.

---

## Aviso — regras do X

Curtidas automáticas podem entrar em conflito com as regras do X e com os Termos de
Serviço. Contas que curtem em escala podem sofrer limitação de ritmo ou restrição.
Esta extensão é fornecida como está, para uso educacional e pessoal. Você é responsável pelo uso. Mantenha o intervalo conservador, use um limite na dúvida e
pare imediatamente se o X mostrar qualquer aviso.

---

## Licença

MIT © 2026 [Fernando Paladini](https://github.com/paladini). Veja [LICENSE](LICENSE).
Documentação completa em inglês: [README.md](README.md).
