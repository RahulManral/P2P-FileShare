import Peer from "peerjs";

class WebRTCService {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.onReceiveFile = null;
    this.onConnectionEstablished = null;
    this.onProgress = null;
    this.onError = null;
    this.currentFile = null;
  }

  initializePeer() {
    return new Promise((resolve, reject) => {
      // Use public PeerJS server - works across different tabs/devices
      this.peer = new Peer({
        host: "0.peerjs.com",
        port: 443,
        path: "/",
        secure: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ],
        },
        debug: 2, // Enable debug logging
      });

      this.peer.on("open", (id) => {
        console.log("Peer ID:", id);
        resolve(id);
      });

      this.peer.on("error", (error) => {
        console.error("Peer error:", error);
        if (this.onError) this.onError(error);
        reject(error);
      });

      this.peer.on("connection", (conn) => {
        console.log("Incoming connection from:", conn.peer);
        this.handleConnection(conn);
      });

      this.peer.on("disconnected", () => {
        console.log("Peer disconnected, attempting reconnection...");
        if (!this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  handleConnection(conn) {
    this.connection = conn;

    conn.on("open", () => {
      console.log("Connection established with:", conn.peer);
      if (this.onConnectionEstablished) {
        this.onConnectionEstablished();
      }
    });

    conn.on("data", (data) => {
      this.handleReceivedData(data);
    });

    conn.on("error", (error) => {
      console.error("Connection error:", error);
      if (this.onError) this.onError(error);
    });

    conn.on("close", () => {
      console.log("Connection closed");
    });
  }

  connectToPeer(peerId) {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer not initialized"));
        return;
      }

      console.log("Attempting to connect to:", peerId);

      const conn = this.peer.connect(peerId, {
        reliable: true,
        serialization: "json",
      });

      conn.on("open", () => {
        this.connection = conn;
        console.log("Connected to peer:", peerId);
        if (this.onConnectionEstablished) {
          this.onConnectionEstablished();
        }
        resolve(conn);
      });

      conn.on("data", (data) => {
        this.handleReceivedData(data);
      });

      conn.on("error", (error) => {
        console.error("Connection error:", error);
        if (this.onError) this.onError(error);
        reject(error);
      });

      // Add timeout
      setTimeout(() => {
        if (!this.connection) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  async sendFiles(files) {
    if (!this.connection) {
      throw new Error("No active connection");
    }

    if (!this.connection.open) {
      throw new Error("Connection is not open");
    }

    const fileList = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    this.connection.send({
      type: "file-list",
      files: fileList,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    for (let i = 0; i < files.length; i++) {
      await this.sendFile(files[i], i);
    }
  }

  async sendFile(file, fileIndex) {
    const chunkSize = 16384; // 16KB chunks
    const chunks = Math.ceil(file.size / chunkSize);

    this.connection.send({
      type: "file-start",
      fileIndex,
      name: file.name,
      size: file.size,
      type: file.type,
      chunks,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const reader = new FileReader();
    let offset = 0;
    let chunkIndex = 0;

    const readChunk = () => {
      return new Promise((resolve, reject) => {
        const slice = file.slice(offset, offset + chunkSize);

        reader.onload = (e) => {
          try {
            // Convert ArrayBuffer to base64 for reliable transmission
            const base64 = btoa(
              String.fromCharCode(...new Uint8Array(e.target.result))
            );

            this.connection.send({
              type: "file-chunk",
              fileIndex,
              chunkIndex,
              data: base64,
            });

            chunkIndex++;
            offset += chunkSize;

            if (this.onProgress) {
              const progress = Math.min((offset / file.size) * 100, 100);
              this.onProgress(fileIndex, progress);
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(slice);
      });
    };

    while (offset < file.size) {
      await readChunk();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    this.connection.send({
      type: "file-end",
      fileIndex,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  handleReceivedData(data) {
    if (!data.type) return;

    switch (data.type) {
      case "file-list":
        if (this.onReceiveFile) {
          this.onReceiveFile({
            type: "list",
            files: data.files,
          });
        }
        break;

      case "file-start":
        console.log("Starting to receive file:", data.name);
        this.currentFile = {
          name: data.name,
          size: data.size,
          type: data.type,
          chunks: [],
          receivedChunks: 0,
          totalChunks: data.chunks,
          fileIndex: data.fileIndex,
        };
        break;

      case "file-chunk":
        if (this.currentFile) {
          // Convert base64 back to ArrayBuffer
          const binary = atob(data.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

          this.currentFile.chunks.push(bytes.buffer);
          this.currentFile.receivedChunks++;

          if (this.onProgress) {
            const progress =
              (this.currentFile.receivedChunks /
                this.currentFile.totalChunks) *
              100;
            this.onProgress(data.fileIndex, Math.min(progress, 100));
          }
        }
        break;

      case "file-end":
        if (this.currentFile) {
          console.log("File transfer complete:", this.currentFile.name);

          const blob = new Blob(this.currentFile.chunks, {
            type: this.currentFile.type,
          });

          if (this.onReceiveFile) {
            this.onReceiveFile({
              type: "complete",
              fileIndex: data.fileIndex,
              name: this.currentFile.name,
              blob: blob,
            });
          }

          this.currentFile = null;
        }
        break;
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export default new WebRTCService();