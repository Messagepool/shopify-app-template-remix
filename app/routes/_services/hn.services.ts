import { GraphQLClient } from "graphql-request";
import { GET_PRIVILEGES, GET_PRIVILEGES_HASH } from "./queries/hn.queries";
import { authenticate, unauthenticated } from "../../shopify.server";
import type { UserPrivilegeRequest, UserPrivilegeHashRequest } from "./types";

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

export const getUserPrivileges = async (user: string) => {
  const payload: UserPrivilegeRequest = {
    userGroupPrivilegesFilterInput: {
      perPage: 10,
      page: 1,
      username: user,
      applicationId: process.env.APPLICATION_ID ?? "",
    },
  };

  const userPriv: any = await createHnClient().request(GET_PRIVILEGES, payload);
  const { UserGroupPrivileges } = userPriv;
  const data = UserGroupPrivileges.data?.[0];

  if (!data) {
    throw new Error("No user privileges found.");
  }

  return {
    user: {
      id: data.id,
      username: data.username,
    },
    application: data.applications[0],
  };
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
