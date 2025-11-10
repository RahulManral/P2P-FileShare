# 🌐 P2P – Peer-to-Peer FileShare

**P2P** is a decentralized file-sharing website that enables users to directly exchange files through a secure peer-to-peer (P2P) connection — no server storage, no sign-up, no hassle.  
Built using **Vite**, **Tailwind CSS**, **WebRTC**, **PeerJS**, and **Node.js**, this project brings simple, private, and high-speed file sharing to your browser.

---

## 🚀 Features

- 🔗 **Direct P2P File Transfer** – Send files directly between peers using WebRTC.
- 🔒 **End-to-End Encryption** – Files are encrypted during transfer for privacy.
- 🌍 **No Central Server** – Data never touches any external storage.
- ⚡ **Fast & Lightweight** – P2P transfer minimizes delays and server load.
- 💻 **Cross-Platform** – Works in any modern browser, no software installation needed.

---

## 🛠️ Tech Stack

- **Frontend:** Vite + Tailwind CSS
- **Backend:** Node.js (for signaling & peer management)
- **P2P Communication:** WebRTC + PeerJS

---

## 📦 Installation & Setup

Clone this repository:

```bash
git clone https://github.com/your-username/p2p-FileShare.git
cd p2p-FileShare
```

Install dependencies:

```bash
npm install
```

### 🧩 Development Server

Start the project in development mode:

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) (default for Vite) in your browser.

### ⚙️ Backend (Signaling Server)

If your project includes a Node.js signaling server for PeerJS:

```bash
cd server
npm install
node index.js
```

By default, it runs on [http://localhost:3000](http://localhost:3000).

---

## 💡 How It Works

1. Each peer connects to a signaling server (via PeerJS) to exchange connection info.
2. The sender selects one or more files to share.
3. The receiver enters the sender’s ID or clicks a shared link.
4. A direct WebRTC connection is established between peers.
5. Files transfer securely — no centralized storage involved.

---

## 🔒 Security & Privacy

- All transfers occur directly over P2P connections.
- Files are encrypted during transmission with WebRTC’s secure protocols.

---

## 🤝 Contributing

Contributions are always welcome!  
Fork this repository, improve the code, and submit a pull request.

---

## 🪪 License

This project is licensed under the [MIT License](LICENSE).

---

### ✨ Made with passion by [Rahuwul](https://github.com/your-username)
