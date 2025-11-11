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
      this.peer = new Peer({
        host: "0.peerjs.com",
        port: 443,
        path: "/",
        secure: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
        debug: 1,
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
        this.setupConnection(conn);
      });

      this.peer.on("disconnected", () => {
        console.log("Peer disconnected, attempting reconnection...");
        if (!this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  setupConnection(conn) {
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

      // Force binary serialization
      const conn = this.peer.connect(peerId, {
        reliable: true,
        serialization: "binary",
      });

      conn.on("open", () => {
        this.setupConnection(conn);
        resolve(conn);
      });

      conn.on("error", (error) => {
        console.error("Connection error:", error);
        if (this.onError) this.onError(error);
        reject(error);
      });

      setTimeout(() => {
        if (!this.connection || !this.connection.open) {
          reject(new Error("Connection timeout"));
        }
      }, 15000);
    });
  }

  async sendFiles(files) {
    if (!this.connection) {
      throw new Error("No active connection");
    }

    if (!this.connection.open) {
      throw new Error("Connection is not open");
    }

    // Send file list as binary
    const fileList = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    this.sendMetadata({
      type: "file-list",
      files: fileList,
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    for (let i = 0; i < files.length; i++) {
      await this.sendFile(files[i], i);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  sendMetadata(metadata) {
    const json = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(json);

    // Create packet: [0xFF (marker), length (4 bytes), json data]
    const packet = new Uint8Array(5 + jsonBytes.length);
    packet[0] = 0xff; // Metadata marker
    new DataView(packet.buffer).setUint32(1, jsonBytes.length, true);
    packet.set(jsonBytes, 5);

    this.connection.send(packet.buffer);
  }

  async sendFile(file, fileIndex) {
    const chunkSize = 16384; // 16KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Send file start metadata
    this.sendMetadata({
      type: "file-start",
      fileIndex,
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks,
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    let offset = 0;
    let chunkIndex = 0;

    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await slice.arrayBuffer();
      const chunkData = new Uint8Array(arrayBuffer);

      // Create packet: [0x00 (data marker), fileIndex (2 bytes),
      // chunkIndex (4 bytes), data]
      const packet = new Uint8Array(7 + chunkData.length);
      const view = new DataView(packet.buffer);

      packet[0] = 0x00; // Data marker
      view.setUint16(1, fileIndex, true);
      view.setUint32(3, chunkIndex, true);
      packet.set(chunkData, 7);

      this.connection.send(packet.buffer);

      chunkIndex++;
      offset += chunkSize;

      if (this.onProgress) {
        const progress = Math.min((offset / file.size) * 100, 100);
        this.onProgress(fileIndex, progress);
      }

      // Small delay to prevent overwhelming the connection
      if (chunkIndex % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    // Send file end metadata
    this.sendMetadata({
      type: "file-end",
      fileIndex,
    });

    console.log(`File ${fileIndex} sent: ${file.name}`);
  }

  handleReceivedData(data) {
    const packet = new Uint8Array(data);

    if (packet.length === 0) return;

    const marker = packet[0];

    if (marker === 0xff) {
      // Metadata packet
      const view = new DataView(packet.buffer);
      const jsonLength = view.getUint32(1, true);
      const jsonBytes = packet.slice(5, 5 + jsonLength);
      const decoder = new TextDecoder();
      const json = JSON.parse(decoder.decode(jsonBytes));

      this.handleMetadata(json);
    } else if (marker === 0x00) {
      // Data packet
      const view = new DataView(packet.buffer);
      const fileIndex = view.getUint16(1, true);
      const chunkIndex = view.getUint32(3, true);
      const chunkData = packet.slice(7);

      this.handleChunk(fileIndex, chunkIndex, chunkData);
    }
  }

  handleMetadata(json) {
    switch (json.type) {
      case "file-list":
        console.log("Received file list:", json.files);
        if (this.onReceiveFile) {
          this.onReceiveFile({
            type: "list",
            files: json.files,
          });
        }
        break;

      case "file-start":
        console.log("Starting to receive file:", json.name);
        this.currentFile = {
          name: json.name,
          size: json.size,
          type: json.type,
          chunks: new Array(json.totalChunks),
          receivedChunks: 0,
          totalChunks: json.totalChunks,
          fileIndex: json.fileIndex,
        };
        break;

      case "file-end":
        if (this.currentFile && this.currentFile.fileIndex === json.fileIndex) {
          console.log("File transfer complete:", this.currentFile.name);

          // Combine all chunks
          const chunks = this.currentFile.chunks.filter((c) => c !== undefined);
          const blob = new Blob(chunks, { type: this.currentFile.type });

          if (this.onReceiveFile) {
            this.onReceiveFile({
              type: "complete",
              fileIndex: json.fileIndex,
              name: this.currentFile.name,
              blob: blob,
            });
          }

          this.currentFile = null;
        }
        break;
    }
  }

  handleChunk(fileIndex, chunkIndex, chunkData) {
    if (this.currentFile && this.currentFile.fileIndex === fileIndex) {
      this.currentFile.chunks[chunkIndex] = chunkData;
      this.currentFile.receivedChunks++;

      if (this.onProgress) {
        const progress =
          (this.currentFile.receivedChunks / this.currentFile.totalChunks) *
          100;
        this.onProgress(fileIndex, Math.min(progress, 100));
      }
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
    this.currentFile = null;
  }
}

export default new WebRTCService();