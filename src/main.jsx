import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import store from './redux/store';
import { AuthProvider } from './features/auth/AuthContext';
import { SocketProvider } from './features/chat/hooks/useSocket';
import './index.css';
// import "@excalidraw/excalidraw/excalidraw.css";

// import '../node_modules/@excalidraw/excalidraw/dist';



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
    </Provider>
  </React.StrictMode>,
);
