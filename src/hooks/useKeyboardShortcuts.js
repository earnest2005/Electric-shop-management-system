import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore shortcut triggering if user is typing inside text input/textarea unless it's Escape or F-keys
      const targetTag = e.target.tagName.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      if (e.key === 'F2') {
        e.preventDefault();
        if (shortcuts.onF2) shortcuts.onF2();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (shortcuts.onF4) shortcuts.onF4();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (shortcuts.onF8) shortcuts.onF8();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (shortcuts.onF9) shortcuts.onF9();
      } else if (e.key === 'Escape') {
        if (shortcuts.onEsc) shortcuts.onEsc();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (shortcuts.onCtrlH) shortcuts.onCtrlH();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
