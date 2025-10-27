import React, { useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import { ExcalidrawBinding } from "y-excalidraw";

const YJS_WS_URL = "ws://localhost:5000/yjs-ws";

const CollaborativeWhiteboard = ({ whiteboardId, user }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);

  const [status, setStatus] = useState("connecting");
  const excalidrawContainerRef = useRef(null);

  // Generate consistent user color based on id string
  const generateUserColor = (userId) => {
    const colors = [
      "#14b8a6", // teal-500
      "#45B7D1",
      "#FF6B6B",
      "#82B1FF",
      "#FFD400",
      "#FF8A80",
      "#A7F3D0",
      "#F472B6",
    ];
    if (!userId) return colors[0];
    const index = [...userId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  useEffect(() => {
    if (providerRef.current) providerRef.current.destroy();
    if (bindingRef.current) bindingRef.current.destroy();
    if (ydocRef.current) ydocRef.current.destroy();

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const provider = new WebsocketProvider(
      YJS_WS_URL,
      whiteboardId,
      ydoc
    );
    providerRef.current = provider;

    provider.on("status", (event) => setStatus(event.status));
    provider.awareness.setLocalStateField("user", {
      id: user?.id || "guest",
      name: user?.email || "Guest",
      color: generateUserColor(user?.id || "guest"),
      avatar: user?.user_metadata?.avatar_url
    });

    return () => {
      provider.destroy();
      bindingRef.current?.destroy();
      ydoc.destroy();
    };
  }, [whiteboardId]);

  useEffect(() => {
    if (!excalidrawAPI || !providerRef.current || !ydocRef.current) return;
    bindingRef.current?.destroy();

    const ydoc = ydocRef.current;
    const provider = providerRef.current;
    const yElements = ydoc.getArray("excalidraw");
    const yAssets = ydoc.getMap("assets");

    const binding = new ExcalidrawBinding(
      yElements,
      yAssets,
      excalidrawAPI,
      provider.awareness,
      { excalidrawDom: excalidrawContainerRef.current }
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [excalidrawAPI, whiteboardId]);

  return (
    <div className="whiteboard-page h-full flex flex-col min-h-screen bg-gray-900">
      {/* Live status bar */}
      <div
        className="border-b border-gray-800 p-4 bg-gray-900 flex justify-between items-center shadow-lg sticky top-0 z-10"
        style={{ userSelect: "none" }}
      >
        <span
          className={`text-sm font-semibold flex items-center space-x-3 
            ${status === "connected" ? "text-teal-400" : "text-red-400"}`}
        >
          <span
            className={`block w-3 h-3 rounded-full ${
              status === "connected"
                ? "bg-teal-400"
                : "bg-red-500"
            } ${status === "connecting" ? "animate-pulse" : ""}`}
          />
          <span className="truncate">
            {status === "connected"
              ? "Collaboration Active"
              : `Status: ${status}`}
          </span>
        </span>
        {/* User indicator */}
        <span className="text-teal-300 font-bold text-sm px-3 py-1 rounded-full bg-gray-800 shadow">
          {user?.user_metadata?.full_name || user?.email || 'Guest'} (You)
        </span>
      </div>

      {/* Excalidraw canvas */}
      <div
        className="whiteboard-container flex-grow"
        ref={excalidrawContainerRef}
        style={{ height: "calc(100vh - 64px)" }}
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          name={`Whiteboard - ${whiteboardId}`}
        />
      </div>
    </div>
  );
};

export default CollaborativeWhiteboard;
