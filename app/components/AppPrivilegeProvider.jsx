import { createContext, useEffect, useState } from "react";
import { Outlet } from "@remix-run/react";
import pkg from "crypto-js";
import {
  PRIVILEGE_USER_DATA_KEY,
  PRIVILEGE_USER_DATA_HASH_KEY_PREFIX,
  HASH_CHECK_INTERVAL,
} from "../constants/privileges";
import PrivilegeScreen from "../components/PrivilegeScreen";
import { useInterval } from "../hooks/useInterval";

const { AES, enc } = pkg;

export const AppPrivilegeContext = createContext();

const AppPrivilegeProvider = ({ children }) => {
  const [privileges, setPrivileges] = useState(null);
  const [privilegeSession, setPrivilegeSession] = useState({
    privileges: [],
    applicationName: "",
    appId: "",
    userId: "",
    username: "",
  });
  const [noPrivileges, setNoPrivilege] = useState(false);
  const encryptionKey = import.meta.env.VITE_PRIVILEGE_ENCRYPTION_KEY;

  useEffect(() => {
    if (privilegeSession.appId && privilegeSession.userId) {
      setTimeout(() => {
        storePrivilegeHash(privilegeSession);
        storeUserPrivilegeData(privilegeSession);
      }, 2000);
    }
  }, [privilegeSession]);

  const storePrivilegeHash = (payload) => {
    fetch("/api/privileges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        if (200 === data.status) {
          sessionStorage.setItem(
            PRIVILEGE_USER_DATA_HASH_KEY_PREFIX,
            data.hash,
          );
          setPrivileges(payload.privileges);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const storeUserPrivilegeData = (data) => {
    sessionStorage.setItem(
      PRIVILEGE_USER_DATA_KEY,
      AES.encrypt(JSON.stringify(data), encryptionKey),
    );
  };

  const getStoredPrivileges = () => {
    const userPrivilegesRaw = sessionStorage.getItem(PRIVILEGE_USER_DATA_KEY);
    const decrypted = AES.decrypt(userPrivilegesRaw, encryptionKey);
    const decryptedString = decrypted.toString(enc.Utf8);
    const storedPrivileges = JSON.parse(decryptedString);
    setPrivileges(storedPrivileges);
  };

  const getPrivileges = () => {
    fetch("/api/privileges")
      .then((response) => response.json())
      .then((data) => {
        const { user, application } = data;
        setPrivilegeSession({
          privileges: application?.privileges,
          applicationName: application?.name,
          appId: application?.id,
          userId: user?.id,
          username: user?.username,
        });
      })

      .catch((e) => {
        console.error(e.message);
        setNoPrivilege(true);
      });
  };

  useInterval(() => {
    const storedHash = sessionStorage.getItem(
      PRIVILEGE_USER_DATA_HASH_KEY_PREFIX,
    );
    fetch("/api/privileges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(privilegeSession),
    })
      .then((response) => response.json())
      .then((data) => {
        if (storedHash !== data.hash) {
          getPrivileges();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        setNoPrivilege(true);
      });
  }, HASH_CHECK_INTERVAL);

  const renderPrivilegeScreen = () => {
    if (privileges !== null) {
      const privilegesData = {
        ...privilegeSession,
        ...privileges,
      };
      return (
        <>
          {children}
          <Outlet context={privilegesData} />
        </>
      );
    }

    return (
      <PrivilegeScreen
        setPrivilegeSession={setPrivilegeSession}
        callback={getStoredPrivileges}
        noPrivileges={noPrivileges}
      />
    );
  };

  return (
    <AppPrivilegeContext.Provider value={{ privileges }}>
      {renderPrivilegeScreen()}
    </AppPrivilegeContext.Provider>
  );
};

export default AppPrivilegeProvider;
