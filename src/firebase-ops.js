// Re-export for components to use without importing firebase.js directly
export { db } from './firebase';
export const clearPhoto = (id) => localStorage.removeItem(`photo_${id}`);
