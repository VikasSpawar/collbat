import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Quill from "quill";
import { QuillBinding } from "y-quill";

import "quill/dist/quill.snow.css";

export default function DocumentEditor({ roomName = "default-room" }) {
  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize Yjs document
    ydocRef.current = new Y.Doc();

    // Use y-websocket provider pointing to your backend
 providerRef.current = new WebsocketProvider(
  "ws://localhost:5001/yjs-ws", // <- new Yjs port
  roomName,
  ydocRef.current
);


    // Get shared text type for Quill binding
    const ytext = ydocRef.current.getText("quill");

    // Initialize Quill editor
    editorRef.current = new Quill("#editor", {
      theme: "snow",
      placeholder: "Start collaborating here...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
      },
    });

    // Bind Yjs text to Quill editor and awareness
    bindingRef.current = new QuillBinding(
      ytext,
      editorRef.current,
      providerRef.current.awareness
    );

    // Listen for connection status updates
    providerRef.current.on("status", (event) => {
      setConnected(event.status === "connected");
      console.log("WebSocket connection status:", event.status);
    });

    return () => {
      // Cleanup resources on unmount
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (ydocRef.current) ydocRef.current.destroy();
      if (editorRef.current) editorRef.current = null;
    };
  }, [roomName]);

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6 text-center">Collaborative Docs Editor</h1>

      <div className="mb-3 text-center">
        Connection:{" "}
        <span
          className={
            connected ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
          }
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div id="editor" style={{ height: "400px" }} />
    </div>
  );
}
