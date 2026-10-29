// Polyfill getShaderPrecisionFormat & getParameter to prevent null crash in WebGL environments
if (typeof window !== 'undefined') {
  const targets = [
    window.WebGLRenderingContextBase?.prototype,
    window.WebGL2RenderingContext?.prototype,
    window.WebGLRenderingContext?.prototype
  ].filter(Boolean);

  targets.forEach((proto) => {
    if (proto.getShaderPrecisionFormat) {
      const origPrec = proto.getShaderPrecisionFormat;
      proto.getShaderPrecisionFormat = function (shaderType, precisionType) {
        try {
          const res = origPrec.call(this, shaderType, precisionType);
          return res || { rangeMin: 62, rangeMax: 62, precision: 23 };
        } catch (e) {
          return { rangeMin: 62, rangeMax: 62, precision: 23 };
        }
      };
    }
    if (proto.getParameter) {
      const origParam = proto.getParameter;
      proto.getParameter = function (param) {
        try {
          const res = origParam.call(this, param);
          if (param === 0x1f02 /* VERSION */ && !res) return "WebGL 2.0";
          if ((param === 0x0ba2 /* VIEWPORT (2978) */ || param === 0x0c10 /* SCISSOR_BOX (3088) */) && !res) return new Int32Array([0, 0, 800, 600]);
          if (param === 0x8b4d /* MAX_COMBINED_TEXTURE_IMAGE_UNITS */ && !res) return 16;
          return res;
        } catch (e) {
          if (param === 0x1f02) return "WebGL 2.0";
          if (param === 0x0ba2 || param === 0x0c10) return new Int32Array([0, 0, 800, 600]);
          if (param === 0x8b4d) return 16;
          return null;
        }
      };
    }
  });
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ErrorBoundary } from './ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
