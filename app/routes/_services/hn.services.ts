import { GraphQLClient } from "graphql-request";
import {
  GET_PRIVILEGES,
  GET_PRIVILEGES_HASH,
  UserGroupPrivilegesResponse,
} from "./queries/hn.queries";
import { authenticate } from "../../shopify.server";
import type { UserPrivilegeHashRequest } from "./types";
import _ from "lodash";

const PRIVILEGE_ACTIVE = "A";

export const createHnClient = () => {
  const client = new GraphQLClient(process.env.HN_GRAPHQL_ENDPOINT ?? "", {
    headers: {
      "api-key": process.env.HN_API_KEY ?? "",
      "app-site": process.env.HN_API_APP_SITE ?? "",
    },
  });

  return client;
};

export const getCurrentUser = async (request: any) => {
  const { session } = await authenticate.admin(request);

  const user = session.onlineAccessInfo?.associated_user;

  if (!user) {
    throw new Error("No user found.");
  }

  return {
    id: user.id,
    user: user.email,
    name: `${user.first_name} ${user.last_name}`,
    locale: user.locale,
  };
};

type ApplicationPrivilege = {
  privilege: string;
  read: string;
  write: string;
};

type ApplicationPrivilegeOutput = {
  privilege: string;
  read: boolean;
  write: boolean;
};

type UserStoreDepartment = {
  storeCode: string;
  departments: string[];
};

type UserPrivileges = {
  applicationPrivileges: ApplicationPrivilegeOutput[];
  userStoreDepartments: UserStoreDepartment[];
  userId: string | null;
};

export const getUserPrivileges = async (username: string) => {
  const userPrivileges: UserPrivileges = {
    applicationPrivileges: [],
    userStoreDepartments: [],
    userId: null,
  };

  if (!username) {
    return userPrivileges;
  }

  const applicationId = process.env.APPLICATION_ID;

  const data = (await createHnClient().request(GET_PRIVILEGES, {
    userGroupPrivilegesFilterInput: {
      applicationId,
      username,
    },
  })) as { UserGroupPrivileges: UserGroupPrivilegesResponse };

  const userPrivilegesData = data?.UserGroupPrivileges.data ?? [];

  let mergedApplicationPrivileges: ApplicationPrivilege[] = [];

  let mergedUserStoreDepartments: UserStoreDepartment[] = [];

  userPrivilegesData.forEach((item) => {
    const application = item.applications[0];

    application?.privileges.forEach((privilege) => {
      const foundSimilar = mergedApplicationPrivileges.find(
        (p) => p.privilege === privilege.privilege,
      );

      if (!foundSimilar) {
        mergedApplicationPrivileges.push(privilege);

        return;
      }

      const foundIndex = mergedApplicationPrivileges.findIndex(
        (p) => p.privilege === privilege.privilege,
      );
      let { read, write } = privilege;
      const updatedPrivilege = { ...foundSimilar };

      if (read === PRIVILEGE_ACTIVE) {
        updatedPrivilege.read = read;
      }

      if (write === PRIVILEGE_ACTIVE) {
        updatedPrivilege.write = write;
      }

      mergedApplicationPrivileges[foundIndex] = updatedPrivilege;
    });

    item.userStoreDepartments.forEach((userStore) => {
      if (!userStore.storeCode) return;

      const foundSimilar = mergedUserStoreDepartments.find(
        (s) => s.storeCode === userStore.storeCode,
      );

      if (!foundSimilar) {
        mergedUserStoreDepartments.push(userStore);

        return;
      }

      let { departments } = userStore;

      const mergedDepartments = _.union(departments, foundSimilar.departments);

      const updatedUserStore = { ...foundSimilar };
      updatedUserStore.departments = mergedDepartments;

      const foundIndex = mergedUserStoreDepartments.findIndex(
        (s) => s.storeCode === userStore.storeCode,
      );
      mergedUserStoreDepartments[foundIndex] = updatedUserStore;
    });
  });

  userPrivileges.applicationPrivileges = mergedApplicationPrivileges.map(
    (privilege) => ({
      privilege: privilege.privilege,
      read: privilege.read === PRIVILEGE_ACTIVE,
      write: privilege.write === PRIVILEGE_ACTIVE,
    }),
  );
  userPrivileges.userStoreDepartments = mergedUserStoreDepartments;
  userPrivileges.userId = userPrivilegesData?.[0]?.id ?? "";

  return userPrivileges;
};

export const getUserPrivilegesHash = async (
  userId: string,
  applicationId: string,
) => {
  const payload: UserPrivilegeHashRequest = {
    userId,
    getUserPrivilegesHashInput: {
      applicationId,
    },
  };

  const userPriv: any = await createHnClient().request(
    GET_PRIVILEGES_HASH,
    payload,
  );
  const { GetUserPrivilegesHash } = userPriv;
  return GetUserPrivilegesHash?.hash;
};
