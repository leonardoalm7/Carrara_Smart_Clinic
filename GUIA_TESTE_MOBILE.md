# 📱 Guia de Teste - Menu Mobile no Safari iOS

## Opções de Teste Disponíveis

### 1. 🚀 Live Server (VS Code) - **MAIS RÁPIDO**

**Pré-requisitos:**
- VS Code instalado
- Extensão "Live Server" instalada

**Passos:**
1. Abra o VS Code no projeto
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"
4. O servidor iniciará em `http://127.0.0.1:5500`

**Para testar no iPhone físico:**
1. Certifique-se que iPhone e Mac estão na mesma rede Wi-Fi
2. No iPhone, abra Safari
3. Digite: `http://192.168.1.6:5500` (substitua pelo IP do seu Mac)
4. Teste o menu mobile

**Vantagens:**
- ✅ Rápido e simples
- ✅ Atualização automática ao salvar
- ✅ Funciona com iPhone físico

**Desvantagens:**
- ❌ Precisa estar na mesma rede Wi-Fi
- ❌ Não simula exatamente o Safari iOS

---

### 2. 🍎 Xcode Simulator - **MAIS PRECISO**

**Pré-requisitos:**
- Mac com Xcode instalado
- Xcode Command Line Tools

**Passos:**
1. Abra o Terminal
2. Execute: `open -a Simulator`
3. No Simulator, escolha um iPhone (Device > iOS > iPhone 15 Pro)
4. No Simulator, abra Safari
5. Você precisa servir os arquivos:
   - Opção A: Use Live Server e acesse `http://localhost:5500`
   - Opção B: Use o servidor Node.js (veja opção 3)

**Vantagens:**
- ✅ Simula exatamente o Safari iOS
- ✅ Testa diferentes tamanhos de tela
- ✅ Não precisa de iPhone físico

**Desvantagens:**
- ❌ Requer Xcode (grande download)
- ❌ Mais lento que Live Server

---

### 3. 💻 Servidor Node.js Local - **MAIS FLEXÍVEL**

**Pré-requisitos:**
- Node.js instalado (já tem: v22.18.0)
- Dependências instaladas (`npm install`)

**Configuração:**
O `server.js` já existe, mas precisa servir arquivos estáticos.

**Passos:**
1. Adicione esta linha no `server.js` (antes de `app.listen`):
   ```javascript
   app.use(express.static(__dirname));
   ```

2. Inicie o servidor:
   ```bash
   node server.js
   ```

3. Acesse: `http://localhost:3000` ou `http://192.168.1.6:3000` (no iPhone)

**Vantagens:**
- ✅ Serve arquivos estáticos + API backend
- ✅ Funciona com iPhone físico
- ✅ Mais controle sobre configurações

**Desvantagens:**
- ❌ Requer configuração adicional
- ❌ Mais complexo que Live Server

---

### 4. 🌐 iPhone Físico via Rede Local

**Passos:**
1. Certifique-se que iPhone e Mac estão na mesma rede Wi-Fi
2. No Mac, descubra seu IP local:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   (Seu IP atual: `192.168.1.6`)

3. Use qualquer servidor (Live Server, Node.js, etc.)
4. No iPhone, acesse: `http://192.168.1.6:PORTA`

**Importante:**
- Firewall do Mac pode bloquear conexões
- Se não funcionar, desative temporariamente o firewall:
  ```bash
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
  ```

---

## 🎯 Recomendação

**Para teste rápido:** Use **Live Server** + iPhone físico na mesma rede Wi-Fi

**Para teste preciso:** Use **Xcode Simulator** + Live Server

---

## 🔍 O que testar no menu mobile:

1. ✅ Menu está oculto por padrão (não aparece na tela inicial)
2. ✅ Menu abre ao clicar no botão hamburger (canto superior direito)
3. ✅ Menu desliza suavemente da direita
4. ✅ Botão "X" aparece no canto superior direito do menu
5. ✅ Menu fecha ao clicar no "X"
6. ✅ Menu fecha ao clicar em qualquer link
7. ✅ Menu fecha ao clicar fora dele
8. ✅ Menu não corta o conteúdo da página
9. ✅ Scroll funciona dentro do menu quando há muitos itens
10. ✅ Menu fecha automaticamente ao rotacionar para landscape

---

## 🐛 Troubleshooting

**Menu não aparece:**
- Verifique se o JavaScript está carregando (Console do navegador)
- Verifique se há erros no console

**Menu aparece cortado:**
- Verifique z-index (deve ser 1001, acima do header 1000)
- Verifique se `right: -100%` está aplicado quando inativo

**Menu não fecha:**
- Verifique se o botão "X" tem o ID correto (`menu-close`)
- Verifique se o JavaScript está anexando os event listeners

**Não consigo acessar do iPhone:**
- Verifique se estão na mesma rede Wi-Fi
- Verifique firewall do Mac
- Tente desabilitar temporariamente o firewall

---

*Última atualização: Janeiro 2025*

