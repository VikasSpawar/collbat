import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.status = 'authenticated';
      state.error = null;
    },
    clearUser(state) {
      state.user = null;
      state.status = 'idle';
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = 'error';
    },
  },
});

export const { setUser, clearUser, setError } = authSlice.actions;
export default authSlice.reducer;
