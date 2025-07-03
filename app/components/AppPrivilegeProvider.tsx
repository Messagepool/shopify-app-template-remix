import { createContext, ReactNode } from "react";
import { useAppPrivilege, Privileges } from "../hooks/useAppPrivilege";
import { useInterval } from "../hooks/useInterval";
import PrivilegeScreen from "./PrivilegeScreen";

export const AppPrivilegeContext = createContext<{
  privileges: Privileges | null;
}>({
  privileges: null,
});

const HASH_CHECK_INTERVAL = 60000;

const AppPrivilegeProvider = ({ children }: { children: ReactNode }) => {
  const {
    initialized,
    isLoading,
    privileges,
    retrievePrivileges,
    syncPrivileges,
  } = useAppPrivilege();

  useInterval(() => {
    syncPrivileges();
  }, HASH_CHECK_INTERVAL);

  if (!initialized) {
    return null;
  }

  return (
    <AppPrivilegeContext.Provider value={{ privileges }}>
      {isLoading || privileges === null ? (
        <PrivilegeScreen
          onLogin={retrievePrivileges}
          reloading={privileges !== null}
        />
      ) : (
        children
      )}
    </AppPrivilegeContext.Provider>
  );
};

export default AppPrivilegeProvider;
