import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { workspaceKey, readWorkspace } from '../utils/userWorkspace';

export default function useUserWorkspace(section) {
  const { currentUser } = useApp();
  const key = workspaceKey(currentUser?.id, section);
  const read = () => {
    try { return { key, rows: readWorkspace(localStorage, key), error: '' }; }
    catch { return { key, rows: [], error: 'Saved data could not be loaded in this browser.' }; }
  };
  const [state, setState] = useState(read);
  // Switch immediately when a different user signs in; never expose the last user's data.
  const active = state.key === key ? state : read();
  function save(rows) {
    try {
      if (!currentUser?.id) throw new Error('Sign in first');
      localStorage.setItem(key, JSON.stringify(rows));
      setState({ key, rows, error: '' });
      return true;
    } catch {
      setState({ ...active, error: 'Could not save. Browser storage may be full or disabled.' });
      return false;
    }
  }
  return { rows: active.rows, error: active.error, save };
}
