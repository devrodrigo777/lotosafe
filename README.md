# 🛡️ EasyLOTOTO

**EasyLOTOTO** é uma plataforma avançada de gestão de bloqueio e etiquetagem (LOTO - Lockout-Tagout), projetada para garantir a segurança máxima em ambientes industriais através de tecnologia digital, geolocalização e acesso rápido via QR Code.

![EasyLOTOTO Banner](https://picsum.photos/id/336/1200/400)

## 🚀 Funcionalidades Principais

- **📍 Geolocalização Inteligente (Geofencing):** As instruções de segurança só podem ser acessadas por operadores que estiverem fisicamente dentro do perímetro de segurança da unidade industrial.
- **📲 Acesso via QR Code:** Cada equipamento possui um QR Code exclusivo que direciona instantaneamente para o procedimento de bloqueio atualizado.
- **📊 Dashboard Administrativo:** Monitoramento em tempo real de acessos, feedbacks e estatísticas de crescimento mensal.
- **📝 Editor de Instruções:** Interface intuitiva para criar e editar passos de segurança com suporte a imagens, checklists e múltiplas escolhas.
- **📄 Exportação para PDF:** Gere documentos offline para uso em áreas sem conectividade ou para arquivamento físico.
- **💬 Feedback e Colaboração:** Sistema de comentários para que operadores possam reportar dificuldades ou sugestões diretamente do campo.
- **🖼️ Visualização Ampliada:** Imagens de alta resolução com visualização em tela cheia para identificação precisa de pontos de bloqueio.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript
- **Estilização:** Tailwind CSS + Shadcn/UI
- **Backend/Database:** Firebase Firestore
- **Autenticação:** Firebase Auth
- **Animações:** Framer Motion
- **Gráficos:** Recharts
- **QR Codes:** QRCode.react
- **PDF:** jsPDF + html2canvas

## 📦 Instalação e Configuração

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/easylototo.git
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto com suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=sua_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
   VITE_FIREBASE_PROJECT_ID=seu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## 🛡️ Segurança e Conformidade

O **EasyLOTOTO** foi desenvolvido seguindo as melhores práticas de segurança industrial, ajudando empresas a manterem a conformidade com normas como a **NR-10**, **NR-12** e diretrizes internacionais de segurança do trabalho.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido com ❤ por @RodrigoLCA para salvar vidas e otimizar a segurança operacional. 🛠️🛡️
