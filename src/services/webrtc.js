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

    // Use binary serialization for file chunks
    conn.serialization = "binary";

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

      setTimeout(() => {
        if (!this.connection) {
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

    const fileList = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    // Send metadata as JSON string in ArrayBuffer
    const metadata = JSON.stringify({
      type: "file-list",
      files: fileList,
    });
    this.connection.send(new TextEncoder().encode(metadata));

    await new Promise((resolve) => setTimeout(resolve, 200));

    for (let i = 0; i < files.length; i++) {
      await this.sendFile(files[i], i);
    }
  }

  async sendFile(file, fileIndex) {
    const chunkSize = 16384; // 16KB chunks
    const chunks = Math.ceil(file.size / chunkSize);

    // Send file start metadata
    const startMetadata = JSON.stringify({
      type: "file-start",
      fileIndex,
      name: file.name,
      size: file.size,
      type: file.type,
      chunks,
    });
    this.connection.send(new TextEncoder().encode(startMetadata));

    await new Promise((resolve) => setTimeout(resolve, 100));

    let offset = 0;
    let chunkIndex = 0;

    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await slice.arrayBuffer();

      // Create header with metadata
      const header = JSON.stringify({
        type: "file-chunk",
        fileIndex,
        chunkIndex,
      });
      const headerBytes = new TextEncoder().encode(header);

      // Combine header length (4 bytes) + header + data
      const packet = new Uint8Array(
        4 + headerBytes.length + arrayBuffer.byteLength
      );
      const view = new DataView(packet.buffer);
      view.setUint32(0, headerBytes.length);
      packet.set(headerBytes, 4);
      packet.set(new Uint8Array(arrayBuffer), 4 + headerBytes.length);

      this.connection.send(packet.buffer);

      chunkIndex++;
      offset += chunkSize;

      if (this.onProgress) {
        const progress = Math.min((offset / file.size) * 100, 100);
        this.onProgress(fileIndex, progress);
      }

      // Throttle to prevent overwhelming the connection
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Send file end metadata
    const endMetadata = JSON.stringify({
      type: "file-end",
      fileIndex,
    });
    this.connection.send(new TextEncoder().encode(endMetadata));

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  handleReceivedData(data) {
    try {
      // Try to parse as JSON metadata first
      const text = new TextDecoder().decode(data);
      const json = JSON.parse(text);

      switch (json.type) {
        case "file-list":
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
            chunks: [],
            receivedChunks: 0,
            totalChunks: json.chunks,
            fileIndex: json.fileIndex,
          };
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
                fileIndex: json.fileIndex,
                name: this.currentFile.name,
                blob: blob,
              });
            }

            this.currentFile = null;
          }
          break;
      }
    } catch (e) {
      // Not JSON, must be a file chunk
      if (this.currentFile) {
        const packet = new Uint8Array(data);
        const view = new DataView(packet.buffer);
        const headerLength = view.getUint32(0);

        // Extract header
        const headerBytes = packet.slice(4, 4 + headerLength);
        const header = JSON.parse(new TextDecoder().decode(headerBytes));

        // Extract chunk data
        const chunkData = packet.slice(4 + headerLength);

        this.currentFile.chunks.push(chunkData.buffer);
        this.currentFile.receivedChunks++;

        if (this.onProgress) {
          const progress =
            (this.currentFile.receivedChunks / this.currentFile.totalChunks) *
            100;
          this.onProgress(header.fileIndex, Math.min(progress, 100));
        }
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
  }
}

export default new WebRTCService();