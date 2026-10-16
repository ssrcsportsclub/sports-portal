import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer, { logout } from "./slices/authSlice";
import equipmentReducer from "./slices/equipmentSlice";
import dashboardReducer from "./slices/dashboardSlice";
import formReducer from "./slices/formSlice";
import { sportsApi } from "./api";

// Drop every cached query on logout so the next user never sees stale
// "my events" / "my team" data from the previous session.
const resetApiOnLogout: Middleware = (api) => (next) => (action) => {
  const result = next(action);
  if (logout.fulfilled.match(action)) {
    api.dispatch(sportsApi.util.resetApiState());
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    equipment: equipmentReducer,
    dashboard: dashboardReducer,
    form: formReducer,
    [sportsApi.reducerPath]: sportsApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(sportsApi.middleware, resetApiOnLogout),
});

// Enables refetchOnFocus / refetchOnReconnect.
setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
