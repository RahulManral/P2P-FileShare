import Peer from "peerjs";

class webtrc {
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
    console.log("Setting up connection...");
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
      this.connection = null;
    });
  }

  connectToPeer(peerId) {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer not initialized"));
        return;
      }

      console.log("Connecting to peer:", peerId);

      const conn = this.peer.connect(peerId, {
        reliable: true,
        serialization: "binary",
      });

      let timeoutId;
      let resolved = false;

      conn.on("open", () => {
        console.log("Connection opened successfully!");
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          this.setupConnection(conn);
          resolve(conn);
        }
      });

      conn.on("error", (error) => {
        console.error("Connection error:", error);
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
          console.error("Connection timeout");
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

    console.log("Sending file list...");

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
        `Sending file ${i + 1}/${files.length}: ${files[i].name}`
      );
      await this.sendFile(files[i], i);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log("All files sent!");
  }

  sendMetadata(metadata) {
    const json = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(json);

    const packet = new Uint8Array(5 + jsonBytes.length);
    packet[0] = 0xff;
    new DataView(packet.buffer).setUint32(1, jsonBytes.length, true);
    packet.set(jsonBytes, 5);

    this.connection.send(packet.buffer);
    console.log("Metadata sent:", metadata.type);
  }

  async sendFile(file, fileIndex) {
    const chunkSize = 16384;
    const totalChunks = Math.ceil(file.size / chunkSize);

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

    console.log(`File ${fileIndex} sent: ${file.name}`);
  }

  handleReceivedData(data) {
    const packet = new Uint8Array(data);

    if (packet.length === 0) return;

    const marker = packet[0];

    if (marker === 0xff) {
      const view = new DataView(packet.buffer);
      const jsonLength = view.getUint32(1, true);
      const jsonBytes = packet.slice(5, 5 + jsonLength);
      const decoder = new TextDecoder();
      const json = JSON.parse(decoder.decode(jsonBytes));

      this.handleMetadata(json);
    } else if (marker === 0x00) {
      const view = new DataView(packet.buffer);
      const fileIndex = view.getUint16(1, true);
      const chunkIndex = view.getUint32(3, true);
      const chunkData = packet.slice(7);

      this.handleChunk(fileIndex, chunkIndex, chunkData);
    }
  }

  handleMetadata(json) {
    console.log("Metadata received:", json.type);

    switch (json.type) {
      case "file-list":
        console.log("File list received:", json.files);
        if (this.onReceiveFile) {
          this.onReceiveFile({
            type: "list",
            files: json.files,
          });
        }
        break;

      case "file-start":
        console.log("Starting file receive:", json.name);
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
        if (
          this.currentFile &&
          this.currentFile.fileIndex === json.fileIndex
        ) {
          console.log("File complete:", this.currentFile.name);

          const chunks = this.currentFile.chunks.filter(
            (c) => c !== undefined
          );

          if (chunks.length !== this.currentFile.totalChunks) {
            console.error(
              `Missing chunks! Got ${chunks.length}/${this.currentFile.totalChunks}`
            );
          }

          const blob = new Blob(chunks, { type: this.currentFile.type });
          console.log("Blob created:", blob.size, "bytes");

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

      if (this.currentFile.receivedChunks % 50 === 0) {
        console.log(
          `Progress: ${this.currentFile.receivedChunks}/${this.currentFile.totalChunks} chunks`
        );
      }
    }
  }

  disconnect() {
    console.log("Disconnecting...");
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

export default new webtrc();