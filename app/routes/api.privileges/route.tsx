import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import {
  getCurrentUser,
  getUserPrivileges,
  getUserPrivilegesHash,
} from "../_services/hn.services";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const userData = await getCurrentUser(request);
    const privilegesData: any = await getUserPrivileges(userData.user);
    return {
      ...privilegesData,
      userData,
    };
  } catch (error: any) {
    return json({ status: 500, message: error.message });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = await request.json();
    const { userId, appId } = data;
    const hash = await getUserPrivilegesHash(userId, appId);
    return {
      status: 200,
      hash,
    };
  } catch (error: any) {
    return json({ status: 500, message: error.message });
  }
};
