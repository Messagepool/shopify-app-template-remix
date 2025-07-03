import { useEffect, useState } from "react";
import { AES, enc } from "crypto-ts";
import { privilegeConfig } from "../configs/privilege.config";

const PRIVILEGE_USER_DATA_KEY = "hn-privilege-user-data";
const PRIVILEGE_USER_DATA_HASH_KEY_PREFIX = "hn-privilege-user-data-hash-";

const getUserPrivilegeHash = async (userId: string) => {
  return fetch(`/api/user/${userId}/privileges/hash`).then((res) => res.json());
};

const getUserPrivileges = async () => {
  return fetch(`/api/user/privileges`).then((res) => res.json());
};

type ApplicationPrivilege = {
  privilege: string;
  read: boolean;
  write: boolean;
};

export type Privileges = {
  userId: string;
  applicationPrivileges: ApplicationPrivilege[];
};

export const useAppPrivilege = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [privileges, setPrivileges] = useState<Privileges | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [privilegeUserId, setPrivilegeUserId] = useState("");

  const encryptionKey = import.meta.env.VITE_PRIVILEGE_ENCRYPTION_KEY;

  const syncPrivileges = () => {
    let userId = privilegeUserId;

    if (!userId) {
      let storedUserId = "";
      const storedPrivilegesRaw = sessionStorage.getItem(
        PRIVILEGE_USER_DATA_KEY,
      );

      if (storedPrivilegesRaw !== null) {
        const decrypted = AES.decrypt(storedPrivilegesRaw, encryptionKey);
        const decryptedString = decrypted.toString(enc.Utf8);
        const storedPrivileges = JSON.parse(decryptedString);

        storedUserId = storedPrivileges.userId;
      }

      if (!storedUserId) {
        return retrievePrivileges();
      }

      userId = storedUserId;
    }

    getUserPrivilegeHash(userId)
      .then(({ hash }) => {
        if (!hash) {
          return;
        }

        const storedHash = sessionStorage.getItem(
          PRIVILEGE_USER_DATA_HASH_KEY_PREFIX.concat(userId),
        );

        if (storedHash !== hash) {
          return retrievePrivileges();
        }
      })
      .catch((error) => shopify.toast.show(error.message, { isError: true }));
  };

  const retrievePrivileges = () => {
    setIsLoading(true);

    let userId = "";

    getUserPrivileges()
      .then((priv) => {
        setPrivileges(priv);

        userId = priv.userId;

        sessionStorage.setItem(
          PRIVILEGE_USER_DATA_KEY,
          AES.encrypt(JSON.stringify(priv), encryptionKey).toString(),
        );

        if (!userId) {
          throw new UserNotFoundError();
        }

        return getUserPrivilegeHash(userId);
      })
      .then(({ hash }) => {
        sessionStorage.setItem(
          PRIVILEGE_USER_DATA_HASH_KEY_PREFIX.concat(userId),
          hash,
        );

        setPrivilegeUserId(userId);
      })
      .catch((error) => {
        if (error instanceof UserNotFoundError) {
          return;
        }

        shopify.toast.show(error.message, { isError: true });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getPrivilegeAccessFor = (privilegeName: string) => {
    let access = {
      read: false,
      write: false,
    };

    if (!privileges) return access;

    const found = privileges.applicationPrivileges.find(
      (item) => item.privilege === privilegeName,
    );

    if (found) {
      access.read = found.read;
      access.write = found.write;
    }

    return access;
  };

  const hasAccessTo = (restrictionItem: string) => {
    let isAccessible = true;

    const restrictionEntry = privilegeConfig.restrictions.find(
      (r) => r.name === restrictionItem,
    );

    if (!restrictionEntry) return isAccessible;

    const requiredPrivileges = restrictionEntry.required ?? [];

    for (
      let requiredPrivilegeIndex = 0;
      requiredPrivilegeIndex < requiredPrivileges.length;
      requiredPrivilegeIndex++
    ) {
      const required = requiredPrivileges[requiredPrivilegeIndex];
      const access = getPrivilegeAccessFor(required.privilege);

      if (access.write) continue;

      required.access.forEach((a) => {
        if (!access[a]) {
          isAccessible = false;

          return;
        }
      });

      if (!isAccessible) break;
    }

    return isAccessible;
  };

  useEffect(() => {
    const storedPrivileges = sessionStorage.getItem(PRIVILEGE_USER_DATA_KEY);

    if (storedPrivileges !== null) {
      const decrypted = AES.decrypt(storedPrivileges, encryptionKey);
      const decryptedString = decrypted.toString(enc.Utf8);

      setPrivileges(JSON.parse(decryptedString));
    } else {
      setPrivileges(null);
    }

    setInitialized(true);
  }, []);

  return {
    isLoading,
    initialized,
    privileges,
    privilegeUserId,
    hasAccessTo,
    retrievePrivileges,
    syncPrivileges,
  };
};

class UserNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "UserNotFoundError";
  }
}
