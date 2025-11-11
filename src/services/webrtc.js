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
        debug: 2,
      });

      this.peer.on("open", (id) => {
        console.log("[PEER] ID:", id);
        resolve(id);
      });

      this.peer.on("error", (error) => {
        console.error("[PEER] Error:", error);
        if (this.onError) this.onError(error);
        reject(error);
      });

      this.peer.on("connection", (conn) => {
        console.log("[PEER] Incoming connection from:", conn.peer);
        this.setupConnection(conn);
      });

      this.peer.on("disconnected", () => {
        console.log("[PEER] Disconnected, attempting reconnection...");
        if (!this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  setupConnection(conn) {
    console.log("[CONN] Setting up connection...");
    this.connection = conn;

    conn.on("open", () => {
      console.log("[CONN] Connection opened with:", conn.peer);
      console.log("[CONN] Connection reliable:", conn.reliable);
      console.log("[CONN] Connection serialization:", conn.serialization);
      if (this.onConnectionEstablished) {
        this.onConnectionEstablished();
      }
    });

    conn.on("data", (data) => {
      console.log("[CONN] Data received, type:", typeof data, "length:", data.byteLength || data.length);
      this.handleReceivedData(data);
    });

    conn.on("error", (error) => {
      console.error("[CONN] Connection error:", error);
      if (this.onError) this.onError(error);
    });

    conn.on("close", () => {
      console.log("[CONN] Connection closed");
      this.connection = null;
    });
  }

  connectToPeer(peerId) {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer not initialized"));
        return;
      }

      console.log("[CONN] Connecting to peer:", peerId);

      const conn = this.peer.connect(peerId, {
        reliable: true,
        serialization: "binary",
      });

      let timeoutId;
      let resolved = false;

      conn.on("open", () => {
        console.log("[CONN] Connection opened successfully!");
        console.log("[CONN] Serialization mode:", conn.serialization);
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          this.setupConnection(conn);
          resolve(conn);
        }
      });

      conn.on("error", (error) => {
        console.error("[CONN] Connection error:", error);
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          if (this.onError) this.onError(error);
          reject(error);
        }
      });

      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error("[CONN] Connection timeout");
          reject(
            new Error(
              "Connection timeout. Please check the peer ID and try again."
            )
          );
        }
      }, 20000);
    });
  }

  async sendFiles(files) {
    if (!this.connection) {
      throw new Error("No active connection");
    }

    if (!this.connection.open) {
      throw new Error("Connection is not open");
    }

    console.log("[SEND] Sending file list...");

    const fileList = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    this.sendMetadata({
      type: "file-list",
      files: fileList,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    for (let i = 0; i < files.length; i++) {
      console.log(
        "[SEND] Sending file " + (i + 1) + "/" + files.length + ": " + files[i].name
      );
      await this.sendFile(files[i], i);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log("[SEND] All files sent!");
  }

  sendMetadata(metadata) {
    const json = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(json);

    const packet = new Uint8Array(5 + jsonBytes.length);
    packet[0] = 0xff;
    new DataView(packet.buffer).setUint32(1, jsonBytes.length, true);
    packet.set(jsonBytes, 5);

    console.log("[SEND] Sending metadata:", metadata.type, "size:", packet.length);
    this.connection.send(packet.buffer);
  }

  async sendFile(file, fileIndex) {
    const chunkSize = 16384;
    const totalChunks = Math.ceil(file.size / chunkSize);

    console.log("[SEND] File:", file.name, "Size:", file.size, "Chunks:", totalChunks);

    this.sendMetadata({
      type: "file-start",
      fileIndex: fileIndex,
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks: totalChunks,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    let offset = 0;
    let chunkIndex = 0;

    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await slice.arrayBuffer();
      const chunkData = new Uint8Array(arrayBuffer);

      const packet = new Uint8Array(7 + chunkData.length);
      const view = new DataView(packet.buffer);

      packet[0] = 0x00;
      view.setUint16(1, fileIndex, true);
      view.setUint32(3, chunkIndex, true);
      packet.set(chunkData, 7);

      this.connection.send(packet.buffer);

      if (chunkIndex % 100 === 0) {
        console.log("[SEND] Chunk", chunkIndex, "/", totalChunks);
      }

      chunkIndex++;
      offset += chunkSize;

      if (this.onProgress) {
        const progress = Math.min((offset / file.size) * 100, 100);
        this.onProgress(fileIndex, progress);
      }

      if (chunkIndex % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    this.sendMetadata({
      type: "file-end",
      fileIndex: fileIndex,
    });

    console.log("[SEND] File complete:", file.name);
  }

  handleReceivedData(data) {
    try {
      // Ensure we have ArrayBuffer
      let arrayBuffer;
      if (data instanceof ArrayBuffer) {
        arrayBuffer = data;
      } else if (data.buffer instanceof ArrayBuffer) {
        arrayBuffer = data.buffer;
      } else {
        console.error("[RECV] Unknown data type:", typeof data);
        return;
      }

      const packet = new Uint8Array(arrayBuffer);
      console.log("[RECV] Packet size:", packet.length, "First byte:", packet[0]);

      if (packet.length === 0) {
        console.warn("[RECV] Empty packet received");
        return;
      }

      const marker = packet[0];

      if (marker === 0xff) {
        // Metadata packet
        console.log("[RECV] Metadata packet detected");
        const view = new DataView(packet.buffer);
        const jsonLength = view.getUint32(1, true);
        const jsonBytes = packet.slice(5, 5 + jsonLength);
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(jsonBytes);
        console.log("[RECV] Metadata JSON:", jsonStr);
        const json = JSON.parse(jsonStr);

        this.handleMetadata(json);
      } else if (marker === 0x00) {
        // Data packet
        const view = new DataView(packet.buffer);
        const fileIndex = view.getUint16(1, true);
        const chunkIndex = view.getUint32(3, true);
        const chunkData = packet.slice(7);

        console.log("[RECV] Chunk received - File:", fileIndex, "Chunk:", chunkIndex, "Size:", chunkData.length);

        this.handleChunk(fileIndex, chunkIndex, chunkData);
      } else {
        console.warn("[RECV] Unknown marker:", marker);
      }
    } catch (error) {
      console.error("[RECV] Error handling data:", error);
    }
  }

  handleMetadata(json) {
    console.log("[META] Type:", json.type);

    switch (json.type) {
      case "file-list":
        console.log("[META] File list:", json.files);
        if (this.onReceiveFile) {
          this.onReceiveFile({
            type: "list",
            files: json.files,
          });
        }
        break;

      case "file-start":
        console.log("[META] Starting file:", json.name, "Chunks:", json.totalChunks);
        this.currentFile = {
          name: json.name,
          size: json.size,
          type: json.type,
          chunks: new Array(json.totalChunks),
          receivedChunks: 0,
          totalChunks: json.totalChunks,
          fileIndex: json.fileIndex,
        };
        console.log("[META] Current file initialized:", this.currentFile);
        break;

      case "file-end":
        console.log("[META] File end signal for index:", json.fileIndex);
        if (
          this.currentFile &&
          this.currentFile.fileIndex === json.fileIndex
        ) {
          console.log("[META] Processing file completion:", this.currentFile.name);

          const chunks = this.currentFile.chunks.filter(
            (c) => c !== undefined && c !== null
          );

          console.log("[META] Total chunks received:", chunks.length, "/", this.currentFile.totalChunks);

          if (chunks.length !== this.currentFile.totalChunks) {
            console.error(
              "[META] Missing chunks! Got " + chunks.length + "/" + this.currentFile.totalChunks
            );
          }

          const blob = new Blob(chunks, { type: this.currentFile.type });
          console.log("[META] Blob created - Size:", blob.size, "Type:", blob.type);

          if (this.onReceiveFile) {
            this.onReceiveFile({
              type: "complete",
              fileIndex: json.fileIndex,
              name: this.currentFile.name,
              blob: blob,
            });
          }

          this.currentFile = null;
        } else {
          console.warn("[META] File end received but no matching currentFile");
        }
        break;

      default:
        console.warn("[META] Unknown metadata type:", json.type);
    }
  }

  handleChunk(fileIndex, chunkIndex, chunkData) {
    if (!this.currentFile) {
      console.error("[CHUNK] No current file! Chunk index:", chunkIndex);
      return;
    }

    if (this.currentFile.fileIndex !== fileIndex) {
      console.error("[CHUNK] File index mismatch! Expected:", this.currentFile.fileIndex, "Got:", fileIndex);
      return;
    }

    this.currentFile.chunks[chunkIndex] = chunkData;
    this.currentFile.receivedChunks++;

    if (this.currentFile.receivedChunks % 50 === 0 || this.currentFile.receivedChunks === 1) {
      console.log(
        "[CHUNK] Progress: " + this.currentFile.receivedChunks + "/" + this.currentFile.totalChunks
      );
    }

    if (this.onProgress) {
      const progress =
        (this.currentFile.receivedChunks / this.currentFile.totalChunks) *
        100;
      this.onProgress(fileIndex, Math.min(progress, 100));
    }
  }

  disconnect() {
    console.log("[DISC] Disconnecting...");
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