/**
 * Cross-platform alert utility.
 *
 * On native (iOS / Android) this delegates to the built-in React Native
 * `Alert.alert`, which renders the platform's native dialog.
 *
 * On web `Alert.alert` is a no-op, so we render a custom overlay directly
 * into document.body via a ReactDOM portal. This guarantees the dialog
 * always sits on top of every other layer — including full-screen modals
 * like TrainerProfileModal — regardless of z-index stacking contexts.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

// Only import ReactDOM on web to keep the native bundle clean
let ReactDOM: typeof import('react-dom') | null = null;
if (Platform.OS === 'web') {
  // Dynamic require so Metro/native bundler never sees this import
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ReactDOM = require('react-dom');
}

// ---------------------------------------------------------------------------
// Types (mirrors the subset of React Native's Alert API we actually use)
// ---------------------------------------------------------------------------

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AlertOptions {
  cancelable?: boolean;
}

// ---------------------------------------------------------------------------
// Web modal state managed through context
// ---------------------------------------------------------------------------

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

const INITIAL_STATE: AlertState = {
  visible: false,
  title: '',
  message: '',
  buttons: [],
};

interface AlertContextValue {
  showWebAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextValue>({
  showWebAlert: () => {},
});

// ---------------------------------------------------------------------------
// AlertProvider – mount once at the app root (wrapping AppNavigator)
// ---------------------------------------------------------------------------

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState>(INITIAL_STATE);
  // A stable ref to a div appended to document.body for the portal
  const portalNodeRef = useRef<HTMLDivElement | null>(null);
  // Track when the portal node is ready so the portal re-renders after mount
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = document.createElement('div');
    node.setAttribute('id', 'alert-portal-root');
    // Sit above everything: full-screen modals in RNW use z-index ~9999
    node.style.position = 'fixed';
    node.style.top = '0';
    node.style.left = '0';
    node.style.right = '0';
    node.style.bottom = '0';
    node.style.zIndex = '2147483647'; // max safe z-index
    node.style.pointerEvents = 'none'; // pass-through when no dialog showing
    document.body.appendChild(node);
    portalNodeRef.current = node;
    setPortalReady(true);
    return () => {
      document.body.removeChild(node);
      portalNodeRef.current = null;
      setPortalReady(false);
    };
  }, []);

  const showWebAlert = useCallback(
    (title: string, message = '', buttons: AlertButton[] = [{ text: 'OK' }]) => {
      setState({ visible: true, title, message, buttons });
      if (portalNodeRef.current) {
        portalNodeRef.current.style.pointerEvents = 'auto';
      }
    },
    []
  );

  const dismiss = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
    if (portalNodeRef.current) {
      portalNodeRef.current.style.pointerEvents = 'none';
    }
  }, []);

  const handlePress = useCallback(
    async (btn: AlertButton) => {
      dismiss();
      if (btn.onPress) {
        await btn.onPress();
      }
    },
    [dismiss]
  );

  // The dialog JSX — shared between portal (web) and inline (native fallback)
  const dialogContent = state.visible ? (
    // Backdrop
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2147483647,
      }}
    >
      {/* Dialog box — stop backdrop click propagation */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: '24px 24px 16px',
          width: '90%',
          maxWidth: 380,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          boxSizing: 'border-box',
        }}
      >
        {state.title ? (
          <p style={{
            margin: '0 0 8px',
            fontSize: 17,
            fontWeight: 700,
            color: '#0F1A13',
            textAlign: 'center',
            lineHeight: '1.3',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {state.title}
          </p>
        ) : null}

        {state.message ? (
          <p style={{
            margin: '0 0 20px',
            fontSize: 14,
            color: '#374151',
            lineHeight: '1.5',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            whiteSpace: 'pre-line',
          }}>
            {state.message}
          </p>
        ) : null}

        <div style={{
          display: 'flex',
          flexDirection: state.buttons.length > 2 ? 'column' : 'row',
          gap: 10,
          justifyContent: 'flex-end',
        }}>
          {state.buttons.map((btn, i) => {
            const isDestructive = btn.style === 'destructive';
            const isCancel = btn.style === 'cancel';
            return (
              <button
                key={i}
                onClick={() => handlePress(btn)}
                style={{
                  flex: state.buttons.length <= 2 ? 1 : undefined,
                  width: state.buttons.length > 2 ? '100%' : undefined,
                  height: 44,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  backgroundColor: isDestructive
                    ? '#DC2626'
                    : isCancel
                    ? '#F1F5F9'
                    : '#1B6B3A',
                  color: isCancel ? '#374151' : '#FFFFFF',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.opacity = '0.85'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
              >
                {btn.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <AlertContext.Provider value={{ showWebAlert }}>
      {children}
      {/* On web: render into a body-level portal so it's always on top */}
      {Platform.OS === 'web' && portalReady && portalNodeRef.current && dialogContent
        ? ReactDOM!.createPortal(dialogContent, portalNodeRef.current)
        : null}
    </AlertContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook – use inside components to imperatively show the web alert
// ---------------------------------------------------------------------------

export const useAlertContext = () => useContext(AlertContext);

// ---------------------------------------------------------------------------
// showAlert – the unified cross-platform replacement for Alert.alert
//
// Usage:
//   import { showAlert } from '../utils/alert';
//   showAlert('Title', 'Message', [{ text: 'OK' }]);
//
// On native it calls Alert.alert directly.
// On web it goes through the AlertProvider context that was registered at
// the app root.
// ---------------------------------------------------------------------------

// Singleton reference to the web alert function set by AlertProvider
let _webAlertFn: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

/** Called internally by AlertProvider to register the web alert handler */
export const _registerWebAlertFn = (
  fn: (title: string, message?: string, buttons?: AlertButton[]) => void
) => {
  _webAlertFn = fn;
};

export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  _options?: AlertOptions
): void => {
  if (Platform.OS !== 'web') {
    // On native, use the built-in Alert directly
    Alert.alert(title, message, buttons as any, _options);
    return;
  }

  // On web, use the registered handler
  if (_webAlertFn) {
    _webAlertFn(title, message, buttons);
  } else {
    // Fallback: browser confirm/alert if provider isn't mounted yet
    if (buttons && buttons.length > 1) {
      const nonCancel = buttons.filter((b) => b.style !== 'cancel');
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      const msg = [title, message].filter(Boolean).join('\n\n');
      if (nonCancel.length > 0) {
        const btnLabels = nonCancel.map((b) => b.text).join(' / ');
        // eslint-disable-next-line no-restricted-globals
        const confirmed = window.confirm(`${msg}\n\n[${btnLabels}]`);
        if (confirmed && nonCancel[0]?.onPress) {
          nonCancel[0].onPress();
        } else if (!confirmed && cancelBtn?.onPress) {
          cancelBtn.onPress();
        }
      }
    } else {
      const msg = [title, message].filter(Boolean).join('\n\n');
      // eslint-disable-next-line no-restricted-globals
      window.alert(msg);
      if (buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  }
};

// ---------------------------------------------------------------------------
// AlertProviderWithRegistration – thin wrapper that also registers the fn
// ---------------------------------------------------------------------------

/**
 * Use this at the app root instead of AlertProvider directly.
 * It both renders the modal overlay AND registers the imperative handler
 * so that `showAlert()` works from any component.
 */
export const AlertProviderWithRegistration: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // We grab the showWebAlert from context via a small inner component
  return (
    <AlertProvider>
      <AlertRegistrar />
      {children}
    </AlertProvider>
  );
};

/** Internal component that registers the alert fn into the module-level singleton */
const AlertRegistrar: React.FC = () => {
  const { showWebAlert } = useAlertContext();
  // Register once on mount
  React.useEffect(() => {
    _registerWebAlertFn(showWebAlert);
    return () => {
      _webAlertFn = null;
    };
  }, [showWebAlert]);
  return null;
};
