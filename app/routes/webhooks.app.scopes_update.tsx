import type { ActionFunctionArgs } from "react-router";
import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session } = await authenticate.webhook(request);

  const current = payload.current;
  
  if (session) {
    session.scope = current.join(",");
    await sessionStorage.storeSession(session);
  }

  return new Response();
};
