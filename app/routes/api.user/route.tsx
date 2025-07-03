import type { LoaderFunctionArgs } from "@remix-run/node";
import { getCurrentUser } from "../_services/hn.services";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const userData = await getCurrentUser(request);
    return Response.json(userData);
  } catch (error: any) {
    return Response.json({ status: 500, message: error.message });
  }
};
